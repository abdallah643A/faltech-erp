import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { ticket_id } = await req.json();
    if (!ticket_id) return new Response(JSON.stringify({ error: 'ticket_id required' }), { status: 400, headers: corsHeaders });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

    const { data: ticket } = await supabase.from('svc_tickets').select('*').eq('id', ticket_id).single();
    const { data: techs } = await supabase.from('svc_technicians').select('id, technician_name, skills, zones, daily_capacity_hours').eq('is_active', true);

    const { data: load } = await supabase
      .from('svc_field_visits')
      .select('technician_id')
      .gte('scheduled_start', new Date().toISOString().slice(0, 10))
      .lte('scheduled_start', new Date(Date.now() + 7 * 86400000).toISOString());

    const loadMap: Record<string, number> = {};
    (load ?? []).forEach((v: any) => { loadMap[v.technician_id] = (loadMap[v.technician_id] ?? 0) + 1; });

    const candidates = (techs ?? []).map((t: any) => ({
      ...t, current_load: loadMap[t.id] ?? 0,
    }));

    const prompt = `Given service ticket and available technicians, rank top 3 best matches.
Ticket: title="${ticket.title}", category="${ticket.category}", priority=${ticket.priority}, asset=${ticket.asset_code ?? 'n/a'}
Technicians: ${JSON.stringify(candidates)}
Return JSON only: {"recommendations":[{"technician_id":"...","technician_name":"...","score":0-100,"reason":"..."}]}`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a field-service dispatcher. Return strict JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: 'Rate limit' }), { status: 429, headers: corsHeaders });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: 'Add AI credits' }), { status: 402, headers: corsHeaders });
      throw new Error(`AI: ${txt}`);
    }
    const ai = await aiResp.json();
    const raw = ai.choices?.[0]?.message?.content ?? '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
