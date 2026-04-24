// CRM AI Insights — on-demand next-best-action and churn-risk
// Calls Lovable AI Gateway (Gemini) and caches the result in crm_ai_insights.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  business_partner_id: string;
  insight_type: "next_best_action" | "churn_risk";
  force_refresh?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as ReqBody;
    if (!body?.business_partner_id || !body?.insight_type) {
      return json({ error: "business_partner_id and insight_type required" }, 400);
    }

    // Cache check (24h freshness unless forced)
    if (!body.force_refresh) {
      const { data: cached } = await supabase
        .from("crm_ai_insights")
        .select("*")
        .eq("business_partner_id", body.business_partner_id)
        .eq("insight_type", body.insight_type)
        .gt("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached) return json({ cached: true, insight: cached });
    }

    // Build context snapshot
    const [{ data: bp }, { data: invoices }, { data: activities }, { data: orders }] =
      await Promise.all([
        supabase.from("business_partners").select("*").eq("id", body.business_partner_id).maybeSingle(),
        supabase.from("ar_invoices").select("doc_date, doc_due_date, total, balance_due, status")
          .eq("customer_id", body.business_partner_id).order("doc_date", { ascending: false }).limit(20),
        supabase.from("activities").select("type, subject, status, created_at, completed_at")
          .eq("business_partner_id", body.business_partner_id).order("created_at", { ascending: false }).limit(15),
        supabase.from("sales_orders").select("doc_date, total, status")
          .eq("customer_id", body.business_partner_id).order("doc_date", { ascending: false }).limit(10),
      ]);

    if (!bp) return json({ error: "business partner not found" }, 404);

    const snapshot = {
      partner: { name: bp.card_name, type: bp.card_type, status: bp.status, created: bp.created_at },
      invoice_summary: {
        count: invoices?.length ?? 0,
        total_value: (invoices ?? []).reduce((s: number, i: any) => s + Number(i.total ?? 0), 0),
        unpaid_count: (invoices ?? []).filter((i: any) => Number(i.balance_due ?? 0) > 0.01).length,
        last_invoice_date: invoices?.[0]?.doc_date ?? null,
      },
      activity_summary: {
        count: activities?.length ?? 0,
        last_activity: activities?.[0] ?? null,
        open_tasks: (activities ?? []).filter((a: any) => a.status !== 'completed').length,
      },
      order_summary: {
        count: orders?.length ?? 0,
        last_order_date: orders?.[0]?.doc_date ?? null,
      },
    };

    const systemPrompt = body.insight_type === "next_best_action"
      ? "You are a CRM advisor. Given a customer snapshot, recommend the single highest-impact next action (call, email, meeting, quote, escalation, etc.) in 1-2 sentences. Be specific and actionable."
      : "You are a churn risk analyst. Score churn risk 0-100 and assign a band (low/medium/high/critical). Explain the top 1-2 drivers in 1-2 sentences.";

    const userPrompt = `Customer snapshot:\n${JSON.stringify(snapshot, null, 2)}\n\nRespond as JSON: ${
      body.insight_type === "next_best_action"
        ? '{"recommendation": string, "rationale": string, "confidence": number 0-100}'
        : '{"risk_score": number 0-100, "risk_band": "low"|"medium"|"high"|"critical", "rationale": string, "confidence": number 0-100}'
    }`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limited, try again shortly" }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!aiResp.ok) return json({ error: `AI error: ${await aiResp.text()}` }, 502);

    const aiJson = await aiResp.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { recommendation: raw, rationale: "" }; }

    const insertRow: any = {
      business_partner_id: body.business_partner_id,
      insight_type: body.insight_type,
      recommendation: parsed.recommendation ?? null,
      rationale: parsed.rationale ?? null,
      confidence: parsed.confidence ?? null,
      risk_score: parsed.risk_score ?? null,
      risk_band: parsed.risk_band ?? null,
      model_used: "google/gemini-2.5-flash",
      inputs_snapshot: snapshot,
      generated_by: claims.claims.sub,
    };

    const { data: saved, error: insErr } = await supabase
      .from("crm_ai_insights")
      .insert(insertRow)
      .select()
      .single();
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ cached: false, insight: saved });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
