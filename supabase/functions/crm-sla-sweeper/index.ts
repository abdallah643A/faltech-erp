import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

// Sweeper: marks SLA breaches and triggers escalation by reassigning the lead.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const now = new Date().toISOString();
    const { data: overdue, error } = await supabase
      .from("business_partners")
      .select("id, sla_due_at, source_channel, assigned_to, sla_breached")
      .lte("sla_due_at", now)
      .eq("sla_breached", false)
      .limit(500);
    if (error) throw error;

    let breached = 0;
    let escalated = 0;
    const { data: policies } = await supabase
      .from("crm_sla_policies")
      .select("*")
      .eq("is_active", true);

    for (const partner of overdue ?? []) {
      const policy = (policies ?? []).find(
        (p: any) =>
          (!p.source_channel || p.source_channel === partner.source_channel) &&
          p.escalate_to_user_id,
      );

      const update: Record<string, unknown> = { sla_breached: true };
      if (policy?.escalate_to_user_id) {
        update.assigned_to = policy.escalate_to_user_id;
        update.assignment_reason = `Auto-escalated: SLA breach (${policy.policy_name})`;
        escalated++;
      }
      const { error: upErr } = await supabase
        .from("business_partners")
        .update(update)
        .eq("id", partner.id);
      if (!upErr) breached++;
    }

    return new Response(JSON.stringify({ checked: overdue?.length ?? 0, breached, escalated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
