import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const now = new Date().toISOString();

    // Find tickets with SLA past due that aren't yet flagged
    const { data: breached, error } = await supabase
      .from('svc_tickets')
      .select('id, ticket_number, priority, due_resolution_at, assigned_technician_id, is_breached')
      .lte('due_resolution_at', now)
      .eq('is_breached', false)
      .not('status', 'in', '(resolved,closed,cancelled)');

    if (error) throw error;

    let escalated = 0;
    for (const t of breached ?? []) {
      await supabase.from('svc_tickets').update({ is_breached: true }).eq('id', t.id);
      await supabase.from('svc_escalations').insert({
        ticket_id: t.id,
        escalation_level: 1,
        reason: `SLA resolution breach (priority: ${t.priority})`,
        triggered_by: 'sla_breach',
        status: 'open',
      });
      escalated++;
    }

    return new Response(JSON.stringify({ checked_at: now, breached: escalated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('svc-sla-monitor error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
