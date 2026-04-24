import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lead_ids, mode } = await req.json();
    // mode: 'score' (default), 'insights' (single lead deep analysis)

    // Fetch leads to score
    let query = supabase.from("business_partners").select("*").eq("card_type", "lead");
    if (lead_ids?.length) {
      query = query.in("id", lead_ids);
    }
    const { data: leads, error: leadsError } = await query.limit(50);
    if (leadsError) throw leadsError;
    if (!leads?.length) {
      return new Response(JSON.stringify({ error: "No leads found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch related data for context
    const leadIds = leads.map((l: any) => l.id);
    const [
      { data: activities },
      { data: opportunities },
      { count: totalLeads },
    ] = await Promise.all([
      supabase.from("activities").select("*").in("business_partner_id", leadIds).order("created_at", { ascending: false }).limit(200),
      supabase.from("opportunities").select("*").in("business_partner_id", leadIds),
      supabase.from("business_partners").select("*", { count: "exact", head: true }).eq("card_type", "lead"),
    ]);

    // Build context per lead
    const leadContexts = leads.map((lead: any) => {
      const leadActivities = activities?.filter((a: any) => a.business_partner_id === lead.id) || [];
      const leadOpps = opportunities?.filter((o: any) => o.business_partner_id === lead.id) || [];
      const lastActivity = leadActivities[0];
      const daysSinceLastActivity = lastActivity
        ? Math.floor((Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        id: lead.id,
        name: lead.card_name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        industry: lead.industry,
        credit_limit: lead.credit_limit,
        created_at: lead.created_at,
        tags: lead.tags || [],
        activity_count: leadActivities.length,
        opportunity_count: leadOpps.length,
        days_since_last_activity: daysSinceLastActivity,
        has_email: !!lead.email,
        has_phone: !!lead.phone || !!lead.mobile,
        pipeline_value: leadOpps.reduce((sum: number, o: any) => sum + (o.expected_revenue || 0), 0),
      };
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = mode === "insights"
      ? `Analyze this lead deeply and provide actionable insights:
${JSON.stringify(leadContexts[0], null, 2)}

Return a JSON object using the tool provided with:
- score (0-100)
- risk_level: "low", "medium", or "high"
- next_best_action: one specific recommended action
- deal_risk_alerts: array of risk factors (strings)
- strengths: array of positive factors
- recommended_tags: array of suggested tags for this lead
- summary: 2-3 sentence assessment`
      : `Score these ${leadContexts.length} leads (0-100) based on engagement, completeness, recency, and conversion potential.

Leads data:
${JSON.stringify(leadContexts, null, 2)}

For each lead, return score, risk_level, next_best_action, and deal_risk_alerts using the tool.`;

    const tools = mode === "insights"
      ? [{
          type: "function",
          function: {
            name: "score_lead_insights",
            description: "Return detailed lead scoring and insights",
            parameters: {
              type: "object",
              properties: {
                score: { type: "number", minimum: 0, maximum: 100 },
                risk_level: { type: "string", enum: ["low", "medium", "high"] },
                next_best_action: { type: "string" },
                deal_risk_alerts: { type: "array", items: { type: "string" } },
                strengths: { type: "array", items: { type: "string" } },
                recommended_tags: { type: "array", items: { type: "string" } },
                summary: { type: "string" },
              },
              required: ["score", "risk_level", "next_best_action", "deal_risk_alerts", "strengths", "summary"],
              additionalProperties: false,
            },
          },
        }]
      : [{
          type: "function",
          function: {
            name: "score_leads_batch",
            description: "Return scoring results for multiple leads",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      score: { type: "number", minimum: 0, maximum: 100 },
                      risk_level: { type: "string", enum: ["low", "medium", "high"] },
                      next_best_action: { type: "string" },
                      deal_risk_alerts: { type: "array", items: { type: "string" } },
                    },
                    required: ["id", "score", "risk_level", "next_best_action"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["results"],
              additionalProperties: false,
            },
          },
        }];

    const toolChoice = mode === "insights"
      ? { type: "function", function: { name: "score_lead_insights" } }
      : { type: "function", function: { name: "score_leads_batch" } };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a CRM lead scoring AI. Analyze leads objectively based on data signals. Be specific in recommendations." },
          { role: "user", content: prompt },
        ],
        tools,
        tool_choice: toolChoice,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);

    if (mode === "insights") {
      // Update single lead
      const lead = leads[0];
      await supabase.from("business_partners").update({
        score: parsed.score,
        risk_level: parsed.risk_level,
        ai_insights: parsed,
        last_scored_at: new Date().toISOString(),
      }).eq("id", lead.id);

      return new Response(JSON.stringify({ lead_id: lead.id, ...parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Batch update
      const results = parsed.results || [];
      for (const result of results) {
        await supabase.from("business_partners").update({
          score: result.score,
          risk_level: result.risk_level,
          ai_insights: {
            next_best_action: result.next_best_action,
            deal_risk_alerts: result.deal_risk_alerts || [],
          },
          last_scored_at: new Date().toISOString(),
        }).eq("id", result.id);
      }

      return new Response(JSON.stringify({ scored: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Score leads error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
