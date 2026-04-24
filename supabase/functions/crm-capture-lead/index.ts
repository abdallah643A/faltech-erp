import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-webhook-secret",
};

interface CapturePayload {
  source_id?: string;
  channel?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  country_code?: string;
  city?: string;
  language?: string;
  notes?: string;
  campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  consent_email?: boolean;
  consent_sms?: boolean;
  consent_whatsapp?: boolean;
  consent_call?: boolean;
  raw?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = (await req.json()) as CapturePayload;
    const channel = body.channel ?? "web_form";

    // Optional webhook secret check if source_id provided
    let source: any = null;
    if (body.source_id) {
      const { data } = await supabase
        .from("crm_capture_sources")
        .select("*")
        .eq("id", body.source_id)
        .maybeSingle();
      source = data;
      if (source?.webhook_secret) {
        const incoming = req.headers.get("x-webhook-secret");
        if (incoming !== source.webhook_secret) {
          return new Response(JSON.stringify({ error: "invalid webhook secret" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const normalized = {
      name: body.name?.trim(),
      email: body.email?.toLowerCase().trim(),
      phone: body.phone?.replace(/[^\d+]/g, ""),
      company: body.company?.trim(),
      notes: body.notes,
      campaign: body.campaign,
    };

    if (!normalized.name && !normalized.email && !normalized.phone) {
      return new Response(JSON.stringify({ error: "name/email/phone required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log first
    const { data: logRow } = await supabase
      .from("crm_capture_log")
      .insert({
        source_id: body.source_id ?? null,
        channel,
        raw_payload: body.raw ?? body,
        normalized_payload: normalized,
        status: "received",
      })
      .select()
      .maybeSingle();

    // ---- Insert into new crm_leads table (omnichannel inbox) ----
    const leadCode = `LD-${Date.now().toString().slice(-8)}`;
    const { data: leadRow, error: leadErr } = await supabase
      .from("crm_leads")
      .insert({
        lead_code: leadCode,
        full_name: normalized.name ?? normalized.email ?? normalized.phone ?? "Unknown",
        email: normalized.email,
        phone: normalized.phone,
        company_name: normalized.company,
        job_title: body.job_title,
        country_code: body.country_code,
        city: body.city,
        language: body.language ?? "en",
        channel,
        source: source?.source_name ?? channel,
        campaign: normalized.campaign,
        utm_source: body.utm_source,
        utm_medium: body.utm_medium,
        utm_campaign: body.utm_campaign,
        utm_term: body.utm_term,
        utm_content: body.utm_content,
        consent_email: body.consent_email ?? false,
        consent_sms: body.consent_sms ?? false,
        consent_whatsapp: body.consent_whatsapp ?? false,
        consent_call: body.consent_call ?? false,
        status: "new",
        raw_payload: body.raw ?? body,
        notes: normalized.notes,
      })
      .select()
      .single();
    if (leadErr) throw leadErr;

    // Enqueue for SLA assignment
    await supabase.from("crm_assignment_queue").insert({
      lead_id: leadRow.id,
      status: "pending",
    });

    // Initial activity
    await supabase.from("crm_lead_activities").insert({
      lead_id: leadRow.id,
      activity_type: "status_change",
      direction: "in",
      subject: `Lead captured via ${channel}`,
      body: normalized.notes ?? null,
      metadata: { source: source?.source_name ?? channel, campaign: normalized.campaign },
    });

    // Update log
    if (logRow) {
      await supabase.from("crm_capture_log")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .eq("id", logRow.id);
    }

    if (source) {
      await supabase.from("crm_capture_sources")
        .update({
          last_received_at: new Date().toISOString(),
          total_received: (source.total_received ?? 0) + 1,
        })
        .eq("id", source.id);
    }

    // Fire-and-forget: kick off scoring + assignment
    const baseUrl = Deno.env.get("SUPABASE_URL")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    fetch(`${baseUrl}/functions/v1/crm-score-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
      body: JSON.stringify({ lead_id: leadRow.id }),
    }).catch(() => {});
    fetch(`${baseUrl}/functions/v1/crm-assign-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
      body: JSON.stringify({ lead_id: leadRow.id }),
    }).catch(() => {});

    return new Response(JSON.stringify({ status: "received", lead_id: leadRow.id, lead_code: leadCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
