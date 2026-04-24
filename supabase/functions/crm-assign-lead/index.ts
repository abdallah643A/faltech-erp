import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

// SLA-driven assignment: matches first applicable rule and routes the lead.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { lead_id, process_queue } = await req.json().catch(() => ({}));

    let leadIds: string[] = [];
    if (lead_id) leadIds = [lead_id];
    else if (process_queue) {
      const { data: q } = await supabase
        .from("crm_assignment_queue")
        .select("lead_id")
        .eq("status", "pending")
        .limit(50);
      leadIds = (q ?? []).map((r: any) => r.lead_id);
    }

    if (!leadIds.length) {
      return new Response(JSON.stringify({ assigned: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rules } = await supabase
      .from("crm_sla_rules")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    const results: any[] = [];

    for (const lid of leadIds) {
      const { data: lead } = await supabase.from("crm_leads").select("*").eq("id", lid).maybeSingle();
      if (!lead) continue;

      // pick first matching rule
      const rule = (rules ?? []).find((r: any) => {
        if (r.channel && r.channel !== lead.channel) return false;
        if (r.source && r.source !== lead.source) return false;
        if (r.territory_id && r.territory_id !== lead.territory_id) return false;
        if (r.min_score != null && (lead.score ?? 0) < r.min_score) return false;
        return true;
      });

      // resolve owner
      let assigneeId: string | null = null;
      if (rule) {
        if (rule.routing_strategy === "specific_user" && rule.specific_user_id) {
          assigneeId = rule.specific_user_id;
        } else if (rule.routing_strategy === "owner_of_territory" && lead.territory_id) {
          const { data: terr } = await supabase
            .from("crm_territories").select("owner_id").eq("id", lead.territory_id).maybeSingle();
          assigneeId = terr?.owner_id ?? null;
        } else if (rule.eligible_user_ids?.length) {
          // round-robin: pick one with the fewest open leads
          if (rule.routing_strategy === "load_balanced") {
            const { data: counts } = await supabase
              .from("crm_leads")
              .select("assigned_to")
              .in("assigned_to", rule.eligible_user_ids)
              .in("status", ["assigned", "working"]);
            const tally: Record<string, number> = {};
            for (const u of rule.eligible_user_ids) tally[u] = 0;
            for (const c of counts ?? []) if (c.assigned_to) tally[c.assigned_to] = (tally[c.assigned_to] ?? 0) + 1;
            assigneeId = Object.entries(tally).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
          } else {
            // round-robin by hash
            const idx = Math.abs(hash(lid)) % rule.eligible_user_ids.length;
            assigneeId = rule.eligible_user_ids[idx];
          }
        }
      }

      const sla = rule?.first_response_minutes ?? 60;
      const dueAt = new Date(Date.now() + sla * 60_000).toISOString();

      await supabase.from("crm_leads").update({
        assigned_to: assigneeId,
        assigned_at: assigneeId ? new Date().toISOString() : null,
        sla_first_response_due: dueAt,
        status: assigneeId ? "assigned" : "new",
      }).eq("id", lid);

      await supabase.from("crm_assignment_queue").update({
        status: assigneeId ? "processed" : "failed",
        last_error: assigneeId ? null : "no eligible owner",
        matched_rule_id: rule?.id ?? null,
        processed_at: new Date().toISOString(),
      }).eq("lead_id", lid).eq("status", "pending");

      await supabase.from("crm_lead_activities").insert({
        lead_id: lid,
        activity_type: "assignment",
        subject: assigneeId ? `Assigned to ${assigneeId}` : "Assignment failed (no eligible owner)",
        metadata: { rule_id: rule?.id, sla_minutes: sla },
      });

      results.push({ lead_id: lid, assigned_to: assigneeId, sla_due: dueAt, rule_id: rule?.id });
    }

    return new Response(JSON.stringify({ assigned: results.filter(r => r.assigned_to).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
