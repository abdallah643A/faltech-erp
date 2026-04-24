import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchCRMContext(supabase: any) {
  const results: Record<string, any> = {};

  try {
    const [
      { count: leadsCount },
      { count: customersCount },
      { count: oppsCount },
      { count: activitiesCount },
      { count: salesOrdersCount },
      { data: recentLeads },
      { data: recentOpps },
      { data: leadsbyStatus },
      { data: oppsByStage },
    ] = await Promise.all([
      supabase.from('business_partners').select('*', { count: 'exact', head: true }).eq('card_type', 'lead'),
      supabase.from('business_partners').select('*', { count: 'exact', head: true }).eq('card_type', 'customer'),
      supabase.from('opportunities').select('*', { count: 'exact', head: true }),
      supabase.from('activities').select('*', { count: 'exact', head: true }),
      supabase.from('sales_orders').select('*', { count: 'exact', head: true }),
      supabase.from('business_partners').select('id, card_code, card_name, card_type, status, source, email, phone, created_at').eq('card_type', 'lead').order('created_at', { ascending: false }).limit(10),
      supabase.from('opportunities').select('id, title, stage, expected_revenue, close_date, probability').order('created_at', { ascending: false }).limit(10),
      supabase.from('business_partners').select('status').eq('card_type', 'lead'),
      supabase.from('opportunities').select('stage'),
    ]);

    // Count leads by status
    const leadStatusCounts: Record<string, number> = {};
    leadsbyStatus?.forEach((l: any) => {
      const s = l.status || 'unknown';
      leadStatusCounts[s] = (leadStatusCounts[s] || 0) + 1;
    });

    // Count opps by stage
    const oppStageCounts: Record<string, number> = {};
    oppsByStage?.forEach((o: any) => {
      const s = o.stage || 'unknown';
      oppStageCounts[s] = (oppStageCounts[s] || 0) + 1;
    });

    // Calculate total pipeline value
    const totalPipeline = recentOpps?.reduce((sum: number, o: any) => sum + (o.expected_revenue || 0), 0) || 0;

    results.summary = {
      total_leads: leadsCount || 0,
      total_customers: customersCount || 0,
      total_opportunities: oppsCount || 0,
      total_activities: activitiesCount || 0,
      total_sales_orders: salesOrdersCount || 0,
      leads_by_status: leadStatusCounts,
      opportunities_by_stage: oppStageCounts,
      pipeline_value: totalPipeline,
    };
    results.recent_leads = recentLeads || [];
    results.recent_opportunities = recentOpps || [];
  } catch (err) {
    console.error("Error fetching CRM context:", err);
    results.error = "Could not fetch some data";
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: 'Too many messages (max 50)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const msg of messages) {
      if (!msg.content || typeof msg.content !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid message format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (msg.content.length > 4000) {
        return new Response(JSON.stringify({ error: 'Message too long (max 4000 chars)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch real CRM data for context
    const crmData = await fetchCRMContext(supabase);

    const systemPrompt = `You are a helpful AI assistant for AlRajhi Smart Suite CRM system. You have access to REAL data from the system.

## Current CRM Data Snapshot:
${JSON.stringify(crmData, null, 2)}

## Instructions:
- When users ask about counts, numbers, or data (e.g. "how many leads?"), use the REAL DATA above to answer accurately.
- Provide exact numbers from the data. For example, if total_leads is 25, say "You currently have 25 leads."
- When listing items, use the recent_leads and recent_opportunities data.
- Be professional, concise, and helpful. Use simple language.
- If asked about specific records not in the snapshot, suggest checking the relevant module.
- Support both English and Arabic - respond in the same language the user uses.
- Format responses with markdown for clarity (bold, bullet points, etc.)
- Do NOT say "I don't have access to data" - you DO have real data above.`;

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
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
