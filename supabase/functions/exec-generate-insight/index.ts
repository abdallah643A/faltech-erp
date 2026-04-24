// Generates an AI narrative insight using Lovable AI Gateway.
// Pulls recent KPIs/risks/decisions for context, calls google/gemini-2.5-flash,
// and stores the result in exec_ai_insights.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { company_id, insight_type, scope, context } = body || {};
    if (!company_id || !insight_type) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Build context
    const [kpis, risks] = await Promise.all([
      supabase.from("exec_kpi_snapshots").select("kpi_key,kpi_label,value,target,variance_pct,period_end")
        .eq("company_id", company_id).order("period_start", { ascending: false }).limit(20),
      supabase.from("exec_risk_register").select("title,inherent_score,status,category")
        .eq("company_id", company_id).neq("status", "closed")
        .order("inherent_score", { ascending: false }).limit(10),
    ]);

    const prompt = `You are an executive analyst. Produce a concise (max 180 words) narrative insight for an executive dashboard.

Insight type: ${insight_type}
Scope: ${scope ?? "company-wide"}
Recent KPIs: ${JSON.stringify(kpis.data ?? [])}
Open risks: ${JSON.stringify(risks.data ?? [])}
Additional context: ${JSON.stringify(context ?? {})}

Return JSON with keys: title, narrative, highlights (array of 3 bullet strings), recommendations (array of up to 3 bullet strings).`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a precise executive analyst. Always respond in valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway error: ${aiRes.status} ${t}`);
    }
    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    const { data: insight, error } = await supabase.from("exec_ai_insights").insert({
      company_id,
      insight_type,
      scope: scope ?? "company",
      title: parsed.title ?? `${insight_type} insight`,
      narrative: parsed.narrative ?? "",
      highlights: parsed.highlights ?? [],
      recommendations: parsed.recommendations ?? [],
      model: "google/gemini-2.5-flash",
      confidence: 0.8,
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
