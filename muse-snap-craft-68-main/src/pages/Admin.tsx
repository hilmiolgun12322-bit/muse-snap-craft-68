import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Download, LogOut, Mail, Reply, Loader2 } from "lucide-react";

interface Submission {
  id: string;
  name: string;
  email: string;
  message: string;
  sent_status: string;
  error_message: string | null;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState<Submission[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Submission | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as Submission[]);
  }, []);

  useEffect(() => {
    document.title = "Admin — Contact Submissions";
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data: isAdmin, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (error || !isAdmin) {
        toast.error("Admin access required");
        await supabase.auth.signOut();
        navigate("/auth", { replace: true });
        return;
      }
      if (!mounted) return;
      setAuthorized(true);
      await fetchData();
      setLoading(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/auth", { replace: true });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchData, navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const exportCsv = () => {
    const header = ["id", "created_at", "name", "email", "message", "sent_status", "error_message"];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      header.join(","),
      ...rows.map((r) => header.map((h) => escape((r as any)[h])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contact-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resendToAdmin = async (s: Submission) => {
    setBusyId(s.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: { mode: "resend_to_admin", submissionId: s.id },
      });
      if (error || !data?.success) {
        throw new Error(error?.message ?? data?.error ?? "Failed");
      }
      toast.success("Resent to your inbox");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setBusyId(null);
    }
  };

  const openReply = (s: Submission) => {
    setReplyTarget(s);
    setReplySubject(`Re: Your message to Hilmi Olgun`);
    setReplyBody("");
    setReplyOpen(true);
  };

  const sendReply = async () => {
    if (!replyTarget) return;
    if (!replyBody.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }
    setReplySending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          mode: "reply_to_sender",
          submissionId: replyTarget.id,
          replySubject,
          replyBody,
        },
      });
      if (error || !data?.success) {
        throw new Error(error?.message ?? data?.error ?? "Failed");
      }
      toast.success(`Reply sent to ${replyTarget.email}`);
      setReplyOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setReplySending(false);
    }
  };

  if (loading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="container max-w-7xl">
        <header className="flex items-center justify-between mb-12 flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2">Admin</p>
            <h1 className="text-4xl">Contact Submissions</h1>
            <p className="text-sm text-foreground/60 italic mt-2">
              {rows.length} {rows.length === 1 ? "message" : "messages"}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </div>
        </header>

        {rows.length === 0 ? (
          <div className="text-center py-24 text-foreground/50 italic">
            No submissions yet.
          </div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-xs text-foreground/70">
                      {new Date(s.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm">
                      <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-foreground/80 line-clamp-3 whitespace-pre-wrap">
                        {s.message}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.sent_status === "sent" ? "default"
                            : s.sent_status === "failed" ? "destructive"
                            : "secondary"
                        }
                      >
                        {s.sent_status}
                      </Badge>
                      {s.error_message && (
                        <p className="text-xs text-destructive mt-1 line-clamp-2">{s.error_message}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resendToAdmin(s)}
                          disabled={busyId === s.id}
                          title="Resend to your inbox"
                        >
                          {busyId === s.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Mail className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openReply(s)}
                          title="Reply to sender"
                        >
                          <Reply className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to {replyTarget?.name}</DialogTitle>
            <DialogDescription>
              Sends an email to <span className="font-medium">{replyTarget?.email}</span>
            </DialogDescription>
          </DialogHeader>
          {replyTarget && (
            <div className="bg-muted/30 border-l-2 border-border p-3 text-sm text-foreground/70 max-h-32 overflow-auto whitespace-pre-wrap">
              {replyTarget.message}
            </div>
          )}
          <div className="space-y-3">
            <Input
              placeholder="Subject"
              value={replySubject}
              onChange={(e) => setReplySubject(e.target.value)}
            />
            <Textarea
              placeholder="Your reply..."
              rows={8}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReplyOpen(false)} disabled={replySending}>
              Cancel
            </Button>
            <Button onClick={sendReply} disabled={replySending}>
              {replySending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
