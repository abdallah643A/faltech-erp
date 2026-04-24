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
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { activities, language = 'en' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Input validation
    if (!activities || !Array.isArray(activities) || activities.length === 0) {
      return new Response(JSON.stringify({ error: "No activities provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (activities.length > 100) {
      return new Response(JSON.stringify({ error: "Too many activities (max 100)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate each activity structure
    for (const activity of activities) {
      if (typeof activity !== 'object' || activity === null) {
        return new Response(JSON.stringify({ error: "Invalid activity format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt = language === 'ar' 
      ? `أنت محلل مبيعات متخصص. قم بتحليل أنشطة المبيعات وتقديم ملخص موجز وأفكار قابلة للتنفيذ.
      
قم بتوفير:
1. **ملخص تنفيذي**: نظرة عامة مختصرة على الأنشطة
2. **الإنجازات الرئيسية**: ما تم إنجازه
3. **البنود العاجلة**: ما يحتاج اهتمامًا فوريًا
4. **التوصيات**: خطوات محددة لتحسين الأداء

كن موجزًا ومهنيًا.`
      : `You are an expert sales analyst. Analyze sales activities and provide a concise summary with actionable insights.

Provide:
1. **Executive Summary**: Brief overview of activity patterns
2. **Key Accomplishments**: What has been completed
3. **Action Items**: What needs immediate attention
4. **Recommendations**: Specific steps to improve performance

Be concise and professional. Use bullet points for clarity.`;

    const activitiesData = JSON.stringify(activities.slice(0, 100).map((a: any) => ({
      type: a.type,
      subject: a.subject,
      status: a.status,
      priority: a.priority,
      relatedTo: a.relatedTo,
      dueDate: a.dueDate,
    })));

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
          { role: "user", content: `Analyze these sales activities and provide insights:\n\n${activitiesData}` },
        ],
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
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Unable to generate summary";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Summarize activities error:", error);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
