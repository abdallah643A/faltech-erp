import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendViaSmtp(
  mailConfig: any,
  to: string,
  subject: string,
  html: string,
  replyTo?: string
) {
  const transporter = nodemailer.createTransport({
    host: mailConfig.smtp_host || "smtp.office365.com",
    port: mailConfig.smtp_port || 587,
    secure: false,
    auth: {
      user: mailConfig.smtp_username,
      pass: mailConfig.smtp_password,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });

  const mailOptions: any = {
    from: `${mailConfig.from_name || "Workflow"} <${mailConfig.smtp_username || mailConfig.from_email}>`,
    to,
    subject,
    html,
  };
  if (replyTo) mailOptions.replyTo = replyTo;

  await transporter.sendMail(mailOptions);
}

async function sendViaApi(
  mailConfig: any,
  to: string,
  subject: string,
  html: string,
  replyTo?: string
) {
  const apiProvider = mailConfig.api_provider || "resend";
  const apiKey = mailConfig.api_key;
  const fromName = mailConfig.from_name || "Workflow";
  const fromEmail = mailConfig.from_email || "onboarding@resend.dev";

  if (!apiKey) {
    throw new Error("API key not configured. Please set your API key in Mail Configuration.");
  }

  if (apiProvider === "resend") {
    const payload: any = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    };
    if (replyTo) payload.reply_to = replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Resend API error: ${errBody}`);
    }
  } else if (apiProvider === "sendgrid") {
    const payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [{ type: "text/html", value: html }],
    };
    if (replyTo) {
      (payload as any).reply_to = { email: replyTo };
    }

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`SendGrid API error: ${errBody}`);
    }
  } else if (apiProvider === "mailgun") {
    // Extract domain from fromEmail
    const domain = fromEmail.split("@")[1];
    if (!domain) {
      throw new Error("Invalid From Email — cannot extract domain for Mailgun.");
    }

    const formData = new FormData();
    formData.append("from", `${fromName} <${fromEmail}>`);
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("html", html);
    if (replyTo) formData.append("h:Reply-To", replyTo);

    const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Mailgun API error: ${errBody}`);
    }
  } else {
    throw new Error(`Unsupported API provider: ${apiProvider}`);
  }
}

async function sendEmail(
  mailConfig: any,
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
  resendApiKeyEnv?: string
) {
  const provider = mailConfig?.mail_provider || (mailConfig?.use_custom_smtp ? "smtp" : "api");

  if (provider === "smtp") {
    if (!mailConfig?.smtp_username || !mailConfig?.smtp_password) {
      throw new Error("SMTP credentials not configured. Please set SMTP username and password in Mail Configuration.");
    }
    await sendViaSmtp(mailConfig, to, subject, html, replyTo);
  } else {
    // API provider
    if (mailConfig?.api_key) {
      await sendViaApi(mailConfig, to, subject, html, replyTo);
    } else if (resendApiKeyEnv) {
      // Fallback to env RESEND_API_KEY for backward compatibility
      const fromName = mailConfig?.from_name || "Workflow";
      const fromEmail = mailConfig?.from_email || "onboarding@resend.dev";
      const payload: any = {
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
      };
      if (replyTo) payload.reply_to = replyTo;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKeyEnv}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Resend API error: ${errBody}`);
      }
    } else {
      throw new Error("No email provider configured. Set an API key in Mail Configuration or configure SMTP.");
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKeyEnv = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));

    const { data: mailConfig } = await supabase
      .from("mail_configuration")
      .select("*")
      .limit(1)
      .single();

    const fromName = mailConfig?.from_name || "Workflow";
    const fromEmail = mailConfig?.from_email || "onboarding@resend.dev";
    const footerText = mailConfig?.footer_text || "This is an automated notification from the workflow system.";

    // === TEST EMAIL MODE ===
    if (body.test === true) {
      const testRecipient = body.test_recipient;
      if (!testRecipient) {
        return new Response(
          JSON.stringify({ error: "No test recipient specified" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const provider = mailConfig?.mail_provider || (mailConfig?.use_custom_smtp ? "smtp" : "api");
      const providerLabel = provider === "smtp"
        ? `Custom SMTP (${mailConfig?.smtp_host || "N/A"})`
        : `${(mailConfig?.api_provider || "resend").charAt(0).toUpperCase() + (mailConfig?.api_provider || "resend").slice(1)} API`;

      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e3a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">✅ Test Email - Configuration Working</h2>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
            <p>This is a test email from your CRM system.</p>
            <p><strong>Sending method:</strong> ${providerLabel}</p>
            <p><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af;">${footerText}</p>
          </div>
        </div>
      `;

      try {
        await sendEmail(mailConfig, testRecipient, "Test Email - CRM Configuration", testHtml, mailConfig?.reply_to_email, resendApiKeyEnv);
        return new Response(
          JSON.stringify({ message: "Test email sent successfully", recipient: testRecipient }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e: any) {
        return new Response(
          JSON.stringify({ error: `Failed to send test email: ${e.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // === NORMAL WORKFLOW EMAIL MODE ===
    if (mailConfig && (!mailConfig.email_enabled || !mailConfig.workflow_notifications_enabled)) {
      return new Response(
        JSON.stringify({ message: "Workflow emails disabled in configuration", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: notifications, error } = await supabase
      .from("workflow_notifications")
      .select("*")
      .eq("email_sent", false)
      .limit(50);

    if (error) throw error;

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending emails", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = [...new Set(notifications.map((n: any) => n.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    let sentCount = 0;
    const errors: string[] = [];

    for (const notif of notifications) {
      const profile = profileMap.get(notif.user_id);
      if (!profile?.email) continue;

      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e3a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">Workflow Notification</h2>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
              <p>Hello ${profile.full_name || "User"},</p>
              <h3 style="color: #1e3a5f;">${notif.title}</h3>
              <p style="color: #6b7280;">${notif.message || ""}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 12px; color: #9ca3af;">${footerText}</p>
            </div>
          </div>
        `;

        const subject = `[Action Required] ${notif.title}`;
        await sendEmail(mailConfig, profile.email, subject, emailHtml, mailConfig?.reply_to_email, resendApiKeyEnv);

        await supabase
          .from("workflow_notifications")
          .update({ email_sent: true })
          .eq("id", notif.id);
        sentCount++;
      } catch (e: any) {
        errors.push(`Error for ${profile.email}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
