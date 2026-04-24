import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "recommendations":
        systemPrompt = `You are an expert asset management analyst. Analyze the provided asset utilization data and generate actionable recommendations. 
        Return a JSON array of recommendations, each with: { "title": string, "description": string, "impact": "high"|"medium"|"low", "category": "reallocate"|"acquire"|"dispose"|"optimize"|"maintain", "savingsEstimate": number }
        Focus on practical, data-driven suggestions. Be specific about which assets and departments.`;
        userPrompt = `Analyze this asset portfolio data and provide recommendations:\n${JSON.stringify(data)}`;
        break;

      case "what_if":
        systemPrompt = `You are an asset portfolio optimization expert. Given the current state and a proposed change scenario, analyze the impact.
        Return a JSON object: { "currentState": { "overallUtilization": number, "totalCost": number, "idleAssets": number }, "projectedState": { "overallUtilization": number, "totalCost": number, "idleAssets": number }, "impact": string, "risks": string[], "benefits": string[], "recommendation": string }`;
        userPrompt = `Current portfolio:\n${JSON.stringify(data.current)}\n\nProposed change: ${data.scenario}`;
        break;

      case "anomaly":
        systemPrompt = `You are an asset anomaly detection specialist. Analyze the usage patterns and identify anomalies that could indicate misuse, theft, or equipment failure.
        Return a JSON array: [{ "assetName": string, "anomalyType": "unusual_spike"|"sudden_drop"|"irregular_pattern"|"off_hours_usage", "severity": "high"|"medium"|"low", "description": string, "suggestedAction": string }]`;
        userPrompt = `Analyze these asset usage patterns for anomalies:\n${JSON.stringify(data)}`;
        break;

      case "optimization":
        systemPrompt = `You are a fleet optimization consultant. Analyze the asset portfolio and suggest rightsizing opportunities.
        Return a JSON object: { "currentFleetSize": number, "optimalFleetSize": number, "excessAssets": number, "suggestions": [{ "action": "remove"|"add"|"upgrade"|"downgrade", "assetCategory": string, "count": number, "reason": string, "annualSavings": number }], "totalPotentialSavings": number }`;
        userPrompt = `Optimize this asset portfolio:\n${JSON.stringify(data)}`;
        break;

      default:
        throw new Error("Unknown analysis type");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [{
          type: "function",
          function: {
            name: "return_analysis",
            description: "Return the analysis results",
            parameters: {
              type: "object",
              properties: {
                result: {
                  type: "object",
                  description: "The analysis result in the format specified by the system prompt"
                }
              },
              required: ["result"],
              additionalProperties: true
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required. Please add funds in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    
    // Extract from tool call
    let result;
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        result = parsed.result || parsed;
      } catch {
        result = toolCall.function.arguments;
      }
    } else {
      // Fallback to content
      const content = aiResult.choices?.[0]?.message?.content || "";
      try {
        result = JSON.parse(content);
      } catch {
        result = { raw: content };
      }
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("asset-ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
