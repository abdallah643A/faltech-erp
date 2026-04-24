import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { basket_items, company_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Given these items in a POS basket: ${JSON.stringify(basket_items)}, suggest 2-3 cross-sell or upsell items. Consider accessories, related products, service plans, or bundles. Return practical suggestions for a retail/commercial environment.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a retail cross-sell recommendation engine. Suggest practical upsell and cross-sell items based on what's in the customer's basket. Be specific with item names." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_items",
            description: "Return cross-sell/upsell suggestions",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item_name: { type: "string" },
                      item_code: { type: "string" },
                      rule_type: { type: "string", enum: ["related", "accessory", "upgrade", "bundle", "service_plan"] },
                      reason: { type: "string" },
                      confidence: { type: "number" },
                    },
                    required: ["item_name", "rule_type", "reason"],
                  },
                },
              },
              required: ["recommendations"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_items" } },
      }),
    });

    if (!response.ok) {
      console.error("AI error:", response.status);
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let recommendations = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        recommendations = parsed.recommendations || [];
      } catch { /* ignore */ }
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message, recommendations: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
