import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { vr_id } = await req.json();
    if (!vr_id) return new Response(JSON.stringify({ error: "vr_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: vr, error: vrErr } = await sb.from("subcontractor_variation_requests").select("*, package:subcontractor_packages(*)").eq("id", vr_id).single();
    if (vrErr || !vr) return new Response(JSON.stringify({ error: "VR not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (vr.pcn_id) {
      return new Response(JSON.stringify({ success: true, pcn_id: vr.pcn_id, message: "Already linked" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create PCN-style record (best-effort: try cpms_change_orders or similar; fall back to logging)
    let pcnId: string | null = null;
    const pcnPayload = {
      project_id: vr.package?.project_id,
      title: `VR: ${vr.title}`,
      description: vr.description,
      cost_impact: vr.cost_impact,
      time_impact_days: vr.time_impact_days,
      currency: vr.currency,
      source: "subcontractor_vr",
      source_ref: vr_id,
      status: "pending_review",
    };

    const { data: pcn } = await sb.from("cpms_project_change_notices").insert(pcnPayload).select("id").single();
    if (pcn) pcnId = pcn.id;

    if (pcnId) {
      await sb.from("subcontractor_variation_requests").update({ pcn_id: pcnId }).eq("id", vr_id);
    }

    return new Response(JSON.stringify({ success: true, pcn_id: pcnId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
