import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { assessment_id } = await req.json();
    if (!assessment_id) return new Response(JSON.stringify({ error: "assessment_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    const { data: assessment } = await sb.from("supplier_prequalification_assessments").select("*").eq("id", assessment_id).single();
    if (!assessment) return new Response(JSON.stringify({ error: "assessment not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: answers } = await sb.from("supplier_prequalification_answers").select("*").eq("assessment_id", assessment_id);

    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiKey) return new Response(JSON.stringify({ error: "AI key missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const summary = (answers || []).map((a: any) => `- [${a.category || 'general'}] ${a.question_text}: ${a.answer_value} (score=${a.answer_score}, weight=${a.weight})`).join("\n");

    const prompt = `You are a procurement risk analyst. Analyze the following supplier prequalification responses and provide:
1) A concise risk narrative (max 5 sentences)
2) Top 3 risk factors
3) Recommendation: approve | conditional_approve | request_info | reject
4) Risk level: low | medium | high | critical

Aggregate score: ${assessment.score_pct?.toFixed(1)}% (${assessment.total_score}/${assessment.max_score})
Current calculated risk: ${assessment.risk_level}

Answers:
${summary}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior procurement risk analyst. Be concise, specific, and actionable." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    const content = aiData?.choices?.[0]?.message?.content || "";

    const recoMatch = content.match(/(approve|conditional_approve|request_info|reject)/i);
    const riskMatch = content.match(/\b(low|medium|high|critical)\b/i);

    await sb.from("supplier_prequalification_assessments").update({
      ai_risk_summary: content,
      ai_recommendation: recoMatch ? recoMatch[1].toLowerCase() : null,
      risk_level: riskMatch ? riskMatch[1].toLowerCase() : assessment.risk_level,
      ai_generated_at: new Date().toISOString(),
      ai_model: "google/gemini-3-flash-preview",
      updated_at: new Date().toISOString(),
    }).eq("id", assessment_id);

    return new Response(JSON.stringify({ success: true, summary: content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
