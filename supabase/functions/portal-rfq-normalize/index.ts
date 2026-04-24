// Lovable AI-powered RFQ bid normalization
// Compares supplier/subcontractor RFQ responses, normalizes units & lead times,
// and produces a comparative scorecard with award recommendation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { rfq_id, responses } = await req.json();
    if (!rfq_id || !Array.isArray(responses) || responses.length === 0) {
      return new Response(JSON.stringify({ error: "rfq_id and responses[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt =
      "You are a procurement analyst. Compare supplier/subcontractor bids on the same RFQ. " +
      "Normalize prices to a common unit/currency where obvious, consider lead time, scope coverage, payment terms and notes. " +
      "Score each bid 0-100 and recommend the best award with concise reasoning.";

    const userPrompt = `RFQ ID: ${rfq_id}\nBids:\n${JSON.stringify(responses, null, 2)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "rank_bids",
              description: "Rank and recommend bids",
              parameters: {
                type: "object",
                properties: {
                  scorecard: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        supplier: { type: "string" },
                        normalized_price: { type: "number" },
                        currency: { type: "string" },
                        lead_time_days: { type: "number" },
                        scope_coverage_pct: { type: "number" },
                        score: { type: "number" },
                        notes: { type: "string" },
                      },
                      required: ["supplier", "score"],
                    },
                  },
                  recommendation: {
                    type: "object",
                    properties: {
                      winner: { type: "string" },
                      reasoning: { type: "string" },
                    },
                    required: ["winner", "reasoning"],
                  },
                },
                required: ["scorecard", "recommendation"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "rank_bids" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Lovable AI credits exhausted. Add funds in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiResp.text();
      console.error("ai gateway error", aiResp.status, t);
      throw new Error(`AI gateway ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { scorecard: [], recommendation: {} };

    // Persist normalization
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: row, error } = await supabase
      .from("portal_rfq_ai_normalizations")
      .insert({
        rfq_id,
        scorecard: args.scorecard ?? [],
        recommendations: args.recommendation ?? {},
      })
      .select()
      .single();
    if (error) console.error("persist normalization", error);

    return new Response(JSON.stringify({ normalization: row, ...args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("portal-rfq-normalize error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
