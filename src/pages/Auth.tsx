import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Admin sign in — Hilmi Olgun";
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/admin", { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/admin", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Account created. You can now sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <p className="eyebrow mb-4">Admin</p>
          <h1 className="text-4xl mb-3">{mode === "signin" ? "Sign In" : "Create Account"}</h1>
          <p className="text-sm text-foreground/60 italic">Restricted to site administrator</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-input/50 border border-border px-5 py-4 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-foreground/60 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="w-full bg-input/50 border border-border px-5 py-4 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-foreground/60 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full border border-foreground/60 px-5 py-4 text-sm tracking-[0.25em] uppercase hover:bg-foreground hover:text-background transition-all duration-500 disabled:opacity-60"
          >
            {loading ? "..." : mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>
        <p className="text-center text-sm text-foreground/60 mt-6">
          {mode === "signin" ? (
            <>No account? <button onClick={() => setMode("signup")} className="underline hover:text-foreground">Sign up</button></>
          ) : (
            <>Have an account? <button onClick={() => setMode("signin")} className="underline hover:text-foreground">Sign in</button></>
          )}
        </p>
        <p className="text-center text-xs text-foreground/40 mt-8">
          <a href="/" className="hover:text-foreground/70">← Back to site</a>
        </p>
      </div>
    </div>
  );
};

export default Auth;
