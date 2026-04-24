import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all SLA configs
    const { data: slaConfigs } = await supabase
      .from('phase_sla_config')
      .select('*')
      .eq('is_active', true);

    if (!slaConfigs || slaConfigs.length === 0) {
      return new Response(JSON.stringify({ message: 'No SLA configs found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slaMap = new Map(slaConfigs.map((c: any) => [c.phase, c]));

    // Get all in_progress phases
    const { data: activePhases } = await supabase
      .from('project_phases')
      .select('*, projects!inner(id, name, current_phase, project_type)')
      .eq('status', 'in_progress')
      .eq('projects.project_type', 'industrial');

    if (!activePhases || activePhases.length === 0) {
      return new Response(JSON.stringify({ message: 'No active phases to check' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const escalations: any[] = [];

    for (const phase of activePhases) {
      if (!phase.started_at) continue;

      const sla = slaMap.get(phase.phase);
      if (!sla) continue;

      const startedAt = new Date(phase.started_at);
      const daysElapsed = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24));
      const currentEscalation = phase.escalation_level || 0;

      // Determine escalation level needed
      let newLevel = 0;
      let targetRole = '';

      if (daysElapsed >= sla.max_days + sla.escalation_3_days && currentEscalation < 3) {
        newLevel = 3;
        targetRole = 'ceo';
      } else if (daysElapsed >= sla.max_days + sla.escalation_2_days && currentEscalation < 2) {
        newLevel = 2;
        targetRole = 'general_manager';
      } else if (daysElapsed >= sla.max_days + sla.escalation_1_days && currentEscalation < 1) {
        newLevel = 1;
        targetRole = 'region_manager';
      }

      if (newLevel > currentEscalation) {
        // Update escalation level
        await supabase
          .from('project_phases')
          .update({ escalation_level: newLevel, last_escalation_at: now.toISOString() })
          .eq('id', phase.id);

        // Find users with target role
        const { data: targetUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', targetRole);

        // Get project sales order info
        const { data: salesOrder } = await supabase
          .from('sales_orders')
          .select('id, doc_num, customer_name, contract_number')
          .eq('project_id', phase.project_id)
          .limit(1)
          .single();

        const soLabel = salesOrder
          ? `SO-${salesOrder.doc_num} (${salesOrder.customer_name})`
          : phase.projects?.name || 'Project';

        const escalationLabels: Record<number, string> = {
          1: 'Region Manager',
          2: 'General Manager',
          3: 'CEO',
        };

        for (const user of (targetUsers || [])) {
          // Create notification
          await supabase.from('workflow_notifications').insert({
            user_id: user.user_id,
            project_id: phase.project_id,
            sales_order_id: salesOrder?.id,
            phase: phase.phase,
            title: `⚠️ SLA Escalation (Level ${newLevel}) - ${sla.phase_label}`,
            message: `${soLabel} has been in "${sla.phase_label}" for ${daysElapsed} days (SLA: ${sla.max_days} days). `
              + `This is escalated to ${escalationLabels[newLevel]}. Immediate attention required.`,
            notification_type: 'escalation',
            link_url: `/pm/projects/${phase.project_id}`,
          });
        }

        // Log escalation
        await supabase.from('sla_escalation_log').insert({
          project_id: phase.project_id,
          phase: phase.phase,
          escalation_level: newLevel,
          target_role: targetRole,
          days_overdue: daysElapsed - sla.max_days,
          max_days: sla.max_days,
        });

        escalations.push({
          project_id: phase.project_id,
          phase: phase.phase,
          level: newLevel,
          target_role: targetRole,
          days_overdue: daysElapsed - sla.max_days,
        });
      }
    }

    return new Response(
      JSON.stringify({ escalations_sent: escalations.length, details: escalations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('SLA check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
