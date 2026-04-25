import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const RECIPIENT = "hilmi.olgun@hotmail.com";

interface ContactPayload {
  name: string;
  email: string;
  message: string;
  website?: string;
  elapsedMs?: number;
  // Resend mode (admin-only): re-send a stored submission
  mode?: "new" | "resend_to_admin" | "reply_to_sender";
  submissionId?: string;
  replyBody?: string;
  replySubject?: string;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const body = (await req.json()) as Partial<ContactPayload>;
    const mode = body.mode ?? "new";

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ---------- Admin resend modes ----------
    if (mode === "resend_to_admin" || mode === "reply_to_sender") {
      // Verify caller is an authenticated admin
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userErr } = await admin.auth.getUser(token);
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: userData.user.id, _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!body.submissionId) {
        return new Response(JSON.stringify({ error: "submissionId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: sub, error: subErr } = await admin
        .from("contact_submissions")
        .select("id, name, email, message, created_at")
        .eq("id", body.submissionId)
        .maybeSingle();
      if (subErr || !sub) throw new Error("Submission not found");

      let to: string;
      let subject: string;
      let html: string;
      let replyTo: string | undefined;

      if (mode === "resend_to_admin") {
        to = RECIPIENT;
        subject = `[Resend] Contact from ${sub.name}`;
        replyTo = sub.email;
        html = `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
            <h2 style="font-weight:500;margin:0 0 16px">Resent message (originally received ${new Date(sub.created_at).toLocaleString()})</h2>
            <p style="margin:0 0 8px"><strong>Name:</strong> ${escapeHtml(sub.name)}</p>
            <p style="margin:0 0 8px"><strong>Email:</strong> ${escapeHtml(sub.email)}</p>
            <p style="margin:16px 0 8px"><strong>Message:</strong></p>
            <div style="white-space:pre-wrap;background:#f7f5f0;padding:16px;border-left:3px solid #8a1a2b">${escapeHtml(sub.message)}</div>
          </div>
        `;
      } else {
        // reply_to_sender
        const replyBody = (body.replyBody ?? "").toString().trim();
        if (!replyBody) {
          return new Response(JSON.stringify({ error: "replyBody required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        to = sub.email;
        subject = (body.replySubject?.toString().trim() || `Re: Your message`).slice(0, 200);
        replyTo = RECIPIENT;
        html = `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
            <p style="margin:0 0 16px">Hi ${escapeHtml(sub.name)},</p>
            <div style="white-space:pre-wrap">${escapeHtml(replyBody)}</div>
            <hr style="border:none;border-top:1px solid #ddd;margin:24px 0" />
            <p style="font-size:12px;color:#666;margin:0">In reply to your message sent on ${new Date(sub.created_at).toLocaleString()}.</p>
          </div>
        `;
      }

      const r = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: "Hilmi Olgun Site <onboarding@resend.dev>",
          to: [to], reply_to: replyTo, subject, html,
        }),
      });
      const rd = await r.json();
      if (!r.ok) throw new Error(`Resend failed [${r.status}]: ${JSON.stringify(rd)}`);

      return new Response(JSON.stringify({ success: true, id: rd.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Default: new submission from public form ----------
    // Spam protection — silently accept honeypot/too-fast submissions
    const honeypot = (body.website ?? "").toString().trim();
    const elapsedMs = typeof body.elapsedMs === "number" ? body.elapsedMs : Number.MAX_SAFE_INTEGER;
    if (honeypot.length > 0 || elapsedMs < 2000) {
      console.log("Spam blocked", { honeypotFilled: honeypot.length > 0, elapsedMs });
      // Return success so bots don't learn they were caught
      return new Response(JSON.stringify({ success: true, id: "spam-ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = (body.name ?? "").toString().trim().slice(0, 200);
    const email = (body.email ?? "").toString().trim().slice(0, 200);
    const message = (body.message ?? "").toString().trim().slice(0, 5000);

    if (!name || !email || !message || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save submission BEFORE sending so we always have a record
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = req.headers.get("user-agent") ?? null;
    const { data: inserted, error: insertErr } = await admin
      .from("contact_submissions")
      .insert({ name, email, message, ip_address: ip, user_agent: ua, sent_status: "pending" })
      .select("id")
      .single();
    if (insertErr) console.error("Insert submission failed:", insertErr);
    const submissionId = inserted?.id;

    const html = `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h2 style="font-weight:500;margin:0 0 16px">New message from your website</h2>
        <p style="margin:0 0 8px"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin:0 0 8px"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin:16px 0 8px"><strong>Message:</strong></p>
        <div style="white-space:pre-wrap;background:#f7f5f0;padding:16px;border-left:3px solid #8a1a2b">${escapeHtml(message)}</div>
      </div>
    `;

    const resendRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Hilmi Olgun Site <onboarding@resend.dev>",
        to: [RECIPIENT],
        reply_to: email,
        subject: `New contact from ${name}`,
        html,
      }),
    });

    const data = await resendRes.json();
    if (!resendRes.ok) {
      console.error("Resend error", resendRes.status, data);
      if (submissionId) {
        await admin.from("contact_submissions")
          .update({ sent_status: "failed", error_message: JSON.stringify(data).slice(0, 1000) })
          .eq("id", submissionId);
      }
      throw new Error(`Resend failed [${resendRes.status}]: ${JSON.stringify(data)}`);
    }

    if (submissionId) {
      await admin.from("contact_submissions")
        .update({ sent_status: "sent" })
        .eq("id", submissionId);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("send-contact-email error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
