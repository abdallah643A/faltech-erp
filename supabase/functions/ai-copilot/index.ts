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
      case "bid_win_prediction":
        systemPrompt = `You are an expert bid management AI analyst. Analyze the bid data and provide:
1. Win probability (0-100%) with confidence level
2. Key risk factors (list top 3-5)
3. Competitive positioning analysis
4. Specific recommendations to improve win chances
5. Optimal pricing strategy suggestion

Be data-driven, specific, and actionable. Format with clear headers and bullet points.`;
        userPrompt = `Analyze this bid for win probability:\n${JSON.stringify(data, null, 2)}`;
        break;

      case "cost_estimation":
        systemPrompt = `You are a senior construction cost estimation expert. Based on the bid details and line items:
1. Identify potential cost gaps or missing items in the CBS
2. Suggest realistic markup percentages by category
3. Flag items that may be under/over-estimated based on market norms
4. Recommend contingency levels based on project risk profile
5. Provide a confidence assessment of the overall estimate

Be specific with numbers and percentages.`;
        userPrompt = `Review this cost breakdown structure:\n${JSON.stringify(data, null, 2)}`;
        break;

      case "project_health":
        systemPrompt = `You are a PMO project health advisor. Analyze the project data and provide:
1. Overall health score (0-100) with RED/AMBER/GREEN status
2. Schedule risk assessment (SPI analysis)
3. Cost risk assessment (CPI analysis)  
4. Resource utilization concerns
5. Top 3 immediate action items
6. 30/60/90 day outlook prediction

Use EVM terminology where applicable.`;
        userPrompt = `Assess this project's health:\n${JSON.stringify(data, null, 2)}`;
        break;

      case "risk_assessment":
        systemPrompt = `You are a risk management specialist for construction and technology portfolios. Analyze and provide:
1. Risk score (0-100) with severity classification
2. Identified risks categorized by: Technical, Financial, Schedule, Resource, External
3. Risk mitigation strategies for each identified risk
4. Monte Carlo-style probability assessment (qualitative)
5. Interdependency risks across the portfolio
6. Early warning indicators to monitor

Be specific and actionable.`;
        userPrompt = `Perform risk assessment on:\n${JSON.stringify(data, null, 2)}`;
        break;

      case "go_no_go":
        systemPrompt = `You are a strategic bid decision advisor. Based on the evaluation criteria and scores:
1. Provide a clear GO / NO-GO / CONDITIONAL recommendation
2. Explain the rationale with weighted analysis
3. Identify deal-breaker criteria
4. Suggest conditions for a "conditional go"
5. Compare to similar historical bids if data available
6. Estimate resource investment vs. expected return`;
        userPrompt = `Evaluate this Go/No-Go decision:\n${JSON.stringify(data, null, 2)}`;
        break;

      case "resource_optimization":
        systemPrompt = `You are a resource planning optimizer. Analyze the portfolio resource data and provide:
1. Over/under-allocation identification per team member
2. Skill gap analysis
3. Resource leveling recommendations
4. Critical path impact analysis
5. Hiring vs. outsourcing recommendations
6. Optimal resource assignment suggestions`;
        userPrompt = `Optimize resource allocation for:\n${JSON.stringify(data, null, 2)}`;
        break;

      case "lessons_extraction":
        systemPrompt = `You are a knowledge management specialist. From the project data and outcomes:
1. Extract key lessons learned (categorized by phase)
2. Identify root causes for issues encountered
3. Document best practices that emerged
4. Create actionable recommendations for future projects
5. Suggest process improvements
6. Rate impact and applicability to other project types`;
        userPrompt = `Extract lessons from:\n${JSON.stringify(data, null, 2)}`;
        break;

      case "tech_health":
        systemPrompt = `You are a technology portfolio health advisor. Assess the technology assets and provide:
1. Overall technology health score (0-100)
2. Technical debt assessment per asset
3. End-of-life / sunset risk analysis
4. Security vulnerability concerns
5. Modernization priorities (ranked)
6. TCO optimization opportunities
7. Architecture alignment with industry best practices`;
        userPrompt = `Assess technology health for:\n${JSON.stringify(data, null, 2)}`;
        break;

      default:
        systemPrompt = "You are a helpful project management AI assistant. Provide clear, actionable advice.";
        userPrompt = JSON.stringify(data);
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
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
