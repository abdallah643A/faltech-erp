import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

// Hybrid scoring: rules from crm_scoring_rules + AI signal via Lovable AI gateway.
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
    const { lead_id, lead_ids } = await req.json();
    const ids: string[] = lead_id ? [lead_id] : (Array.isArray(lead_ids) ? lead_ids : []);
    if (!ids.length) {
      return new Response(JSON.stringify({ error: "lead_id or lead_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: leads } = await supabase.from("crm_leads").select("*").in("id", ids);
    if (!leads?.length) {
      return new Response(JSON.stringify({ scored: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rules } = await supabase
      .from("crm_scoring_rules")
      .select("*")
      .eq("is_active", true);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const results: any[] = [];

    for (const lead of leads) {
      // ---- Rule scoring ----
      let ruleScore = 0;
      const signals: any[] = [];
      for (const r of rules ?? []) {
        const field = r.condition_field as string | null;
        if (!field) continue;
        const val = (lead as any)[field];
        let match = false;
        if (val !== null && val !== undefined && val !== "") match = true;
        if (match) {
          const w = Number(r.weight) || 0;
          ruleScore += w;
          signals.push({ source: "rule", rule_id: r.id, signal_name: r.rule_name, weight: w, reason: `field ${field} present` });
        }
      }
      // baseline signals
      if (lead.email) { ruleScore += 5; signals.push({ source: "rule", signal_name: "has_email", weight: 5, reason: "email present" }); }
      if (lead.phone) { ruleScore += 5; signals.push({ source: "rule", signal_name: "has_phone", weight: 5, reason: "phone present" }); }
      if (lead.company_name) { ruleScore += 10; signals.push({ source: "rule", signal_name: "has_company", weight: 10, reason: "company provided" }); }
      if (lead.consent_email || lead.consent_whatsapp) { ruleScore += 5; signals.push({ source: "rule", signal_name: "consent_given", weight: 5, reason: "channel consent" }); }

      // ---- AI scoring ----
      let aiScore = 0;
      let aiExplanation = "";
      if (LOVABLE_API_KEY) {
        try {
          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "Score B2B sales leads 0-100 on conversion likelihood. Be concise." },
                { role: "user", content: `Lead: ${JSON.stringify({
                  name: lead.full_name, company: lead.company_name, title: lead.job_title,
                  email: lead.email, phone: lead.phone, channel: lead.channel, source: lead.source,
                  campaign: lead.campaign, country: lead.country_code, notes: lead.notes,
                })}` },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "score_lead",
                  description: "Return AI score and explanation",
                  parameters: {
                    type: "object",
                    properties: {
                      score: { type: "number", minimum: 0, maximum: 100 },
                      grade: { type: "string", enum: ["A", "B", "C", "D"] },
                      explanation: { type: "string" },
                      strengths: { type: "array", items: { type: "string" } },
                      risks: { type: "array", items: { type: "string" } },
                    },
                    required: ["score", "grade", "explanation"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "score_lead" } },
            }),
          });
          if (resp.ok) {
            const j = await resp.json();
            const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
            if (args) {
              const parsed = JSON.parse(args);
              aiScore = Math.round(Number(parsed.score) || 0);
              aiExplanation = parsed.explanation || "";
              signals.push({ source: "ai", signal_name: "ai_score", weight: aiScore, reason: aiExplanation });
            }
          }
        } catch (e) {
          console.error("AI scoring failed", e);
        }
      }

      // Combined score (weighted: 40% rules, 60% AI; cap 100)
      const combined = Math.min(100, Math.round(ruleScore * 0.4 + aiScore * 0.6));
      const grade = combined >= 80 ? "A" : combined >= 60 ? "B" : combined >= 40 ? "C" : "D";

      // Persist
      await supabase.from("crm_leads").update({
        score: combined,
        rule_score: ruleScore,
        ai_score: aiScore,
        ai_score_explanation: aiExplanation,
        grade,
      }).eq("id", lead.id);

      // Save signals
      if (signals.length) {
        await supabase.from("crm_lead_scoring_signals").insert(
          signals.map((s) => ({ ...s, lead_id: lead.id })),
        );
      }
      await supabase.from("crm_lead_activities").insert({
        lead_id: lead.id,
        activity_type: "score_change",
        subject: `Score updated to ${combined} (${grade})`,
        body: aiExplanation,
        metadata: { rule_score: ruleScore, ai_score: aiScore },
      });

      results.push({ lead_id: lead.id, score: combined, grade, rule_score: ruleScore, ai_score: aiScore });
    }

    return new Response(JSON.stringify({ scored: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
