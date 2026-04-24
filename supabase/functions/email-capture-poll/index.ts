// IMAP polling for email-to-ECM capture.
// Connects to configured IMAP servers, fetches new messages since last_uid,
// classifies them via Lovable AI, and inserts into email_capture_records.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ImapFlow } from "https://esm.sh/imapflow@1.0.158";
import { simpleParser } from "https://esm.sh/mailparser@3.6.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function classify(subject: string, body: string, from: string, apiKey: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content:
            "Classify the incoming business email into one of: ap_invoice, supplier_quotation, customer_inquiry, service_request, support_case, other. Respond using the tool.",
        },
        { role: "user", content: `From: ${from}\nSubject: ${subject}\n\n${body.slice(0, 2000)}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classify_email",
            description: "Suggest an ERP document type",
            parameters: {
              type: "object",
              properties: {
                document_type: {
                  type: "string",
                  enum: [
                    "ap_invoice",
                    "supplier_quotation",
                    "customer_inquiry",
                    "service_request",
                    "support_case",
                    "other",
                  ],
                },
                confidence: { type: "number" },
              },
              required: ["document_type", "confidence"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "classify_email" } },
    }),
  });
  if (!resp.ok) return { document_type: "other", confidence: 0 };
  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  return args ? JSON.parse(args) : { document_type: "other", confidence: 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Allow optional config_id targeting
    let configId: string | null = null;
    try {
      const body = await req.json();
      configId = body?.config_id ?? null;
    } catch { /* no body */ }

    const query = supabase.from("ecm_email_imap_config").select("*").eq("is_enabled", true);
    const { data: configs, error } = configId
      ? await query.eq("id", configId)
      : await query;
    if (error) throw error;

    const results: Array<Record<string, unknown>> = [];

    for (const cfg of configs ?? []) {
      const password = Deno.env.get(cfg.imap_password_secret_name);
      if (!password) {
        results.push({ config: cfg.config_name, error: `Missing secret ${cfg.imap_password_secret_name}` });
        continue;
      }

      const client = new ImapFlow({
        host: cfg.imap_host,
        port: cfg.imap_port,
        secure: cfg.use_ssl,
        auth: { user: cfg.imap_username, pass: password },
        logger: false,
      });

      let inserted = 0;
      let lastUid = cfg.last_uid ?? 0;
      try {
        await client.connect();
        const lock = await client.getMailboxLock(cfg.folder);
        try {
          const range = `${(cfg.last_uid ?? 0) + 1}:*`;
          for await (const msg of client.fetch(range, { source: true, uid: true, envelope: true })) {
            if (!msg.source) continue;
            const parsed = await simpleParser(msg.source);
            const fromEmail = parsed.from?.value?.[0]?.address ?? "unknown@unknown";
            const fromName = parsed.from?.value?.[0]?.name ?? null;
            const subject = parsed.subject ?? "(no subject)";
            const text = (parsed.text ?? "").slice(0, 1000);

            const classification = await classify(subject, text, fromEmail, LOVABLE_API_KEY);

            const attachments =
              parsed.attachments?.map((a) => ({
                filename: a.filename,
                content_type: a.contentType,
                size: a.size,
              })) ?? [];

            await supabase.from("email_capture_records").insert({
              company_id: cfg.company_id,
              from_email: fromEmail,
              from_name: fromName,
              subject,
              body_preview: text,
              received_at: parsed.date?.toISOString() ?? new Date().toISOString(),
              attachments,
              suggested_document_type: classification.document_type,
              confidence_score: classification.confidence,
              status: "pending",
            });
            inserted++;
            if (msg.uid > lastUid) lastUid = msg.uid;
          }
        } finally {
          lock.release();
        }
        await client.logout();
      } catch (e) {
        results.push({ config: cfg.config_name, error: e instanceof Error ? e.message : String(e) });
        continue;
      }

      await supabase
        .from("ecm_email_imap_config")
        .update({ last_polled_at: new Date().toISOString(), last_uid: lastUid })
        .eq("id", cfg.id);

      results.push({ config: cfg.config_name, inserted, last_uid: lastUid });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("email-capture-poll error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
