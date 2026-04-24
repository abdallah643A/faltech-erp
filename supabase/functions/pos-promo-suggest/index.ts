import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slow_movers = [], segment_history = [], context = "" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Suggest 3-5 retail promotions to move slow inventory and lift basket size.\nSlow movers: ${JSON.stringify(slow_movers).slice(0, 2000)}\nCustomer segment trends: ${JSON.stringify(segment_history).slice(0, 1500)}\nContext: ${context}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a retail merchandising AI. Propose specific, actionable promotions with clear discount mechanics, target segments, and expected lift. Be concise." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "propose_promotions",
            description: "Propose promotions",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      promo_type: { type: "string", enum: ["percent_off", "amount_off", "bogo", "bundle", "tier_discount"] },
                      discount_value: { type: "number" },
                      target_items: { type: "array", items: { type: "string" } },
                      target_segment: { type: "string" },
                      duration_days: { type: "number" },
                      rationale: { type: "string" },
                      expected_lift_percent: { type: "number" },
                    },
                    required: ["name", "promo_type", "rationale"],
                  },
                },
              },
              required: ["suggestions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "propose_promotions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions: any[] = [];
    if (toolCall?.function?.arguments) {
      try { suggestions = JSON.parse(toolCall.function.arguments).suggestions || []; } catch { /* ignore */ }
    }
    return new Response(JSON.stringify({ suggestions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("pos-promo-suggest error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message, suggestions: [] }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
