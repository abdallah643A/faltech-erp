import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-webhook-secret",
};

// Receives Meta Lead Ads / LinkedIn Lead Gen webhooks.
// Both providers have very different shapes; we normalize the most common fields
// then forward to crm-capture-lead.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Meta verification handshake (GET)
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("hub.mode") === "subscribe") {
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (token && token === Deno.env.get("META_WEBHOOK_VERIFY_TOKEN")) {
      return new Response(challenge ?? "ok", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const provider: string = url.searchParams.get("provider") ?? "meta";
    const sourceId = url.searchParams.get("source_id") ?? undefined;

    const captures: any[] = [];

    if (provider === "meta") {
      // Meta Lead Ads payload: { entry: [{ changes: [{ value: { leadgen_id, ... } }] }] }
      // For simplicity, accept a normalized fields[] if provided, else raw
      const fields = body.field_data ?? body.fields ?? [];
      const map: Record<string, string> = {};
      for (const f of fields) map[f.name] = Array.isArray(f.values) ? f.values[0] : f.value;
      captures.push({
        source_id: sourceId,
        channel: "meta_lead_ad",
        name: map.full_name || map.name,
        email: map.email,
        phone: map.phone_number || map.phone,
        company: map.company_name,
        campaign: body.campaign_name ?? body.ad_name ?? null,
        raw: body,
      });
    } else if (provider === "linkedin") {
      // LinkedIn Lead Gen Forms payload (simplified)
      const ans: Record<string, string> = {};
      for (const a of body.answers ?? []) ans[a.questionDisplayName ?? a.questionId] = a.answer;
      captures.push({
        source_id: sourceId,
        channel: "linkedin_lead_gen",
        name: ans["First Name"] && ans["Last Name"] ? `${ans["First Name"]} ${ans["Last Name"]}` : ans.name,
        email: ans["Email Address"] || ans.email,
        phone: ans["Phone Number"] || ans.phone,
        company: ans["Company Name"] || ans.company,
        campaign: body.creativeName ?? body.campaignName ?? null,
        raw: body,
      });
    } else {
      // Generic
      captures.push({ source_id: sourceId, channel: provider, raw: body, ...body });
    }

    const results: any[] = [];
    for (const c of captures) {
      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-capture-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify(c),
      });
      results.push(await r.json().catch(() => ({})));
    }

    return new Response(JSON.stringify({ provider, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
