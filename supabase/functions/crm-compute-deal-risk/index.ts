import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { opportunityId } = await req.json();
    if (!opportunityId) throw new Error("opportunityId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: opp, error: oppErr } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", opportunityId)
      .single();
    if (oppErr) throw oppErr;

    // Deactivate previous signals
    await supabase
      .from("crm_deal_risk_signals")
      .update({ is_active: false, resolved_at: new Date().toISOString() })
      .eq("opportunity_id", opportunityId)
      .eq("is_active", true);

    const signals: Array<{ signal_type: string; severity: string; signal_label: string; signal_description: string; weight: number }> = [];

    // Stale opportunity
    const updatedDays = opp.updated_at
      ? Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / 86400000)
      : 0;
    if (updatedDays > 30) {
      signals.push({
        signal_type: "stale",
        severity: updatedDays > 60 ? "high" : "medium",
        signal_label: `No activity for ${updatedDays} days`,
        signal_description: "Opportunity has not been updated recently",
        weight: updatedDays > 60 ? 25 : 15,
      });
    }

    // Past close date
    if (opp.close_date && new Date(opp.close_date) < new Date() && opp.status !== "won" && opp.status !== "lost") {
      signals.push({
        signal_type: "overdue_close",
        severity: "high",
        signal_label: "Close date passed",
        signal_description: `Expected close was ${opp.close_date}`,
        weight: 20,
      });
    }

    // Low probability + late stage
    if ((opp.probability ?? 0) < 30 && (opp.stage === "negotiation" || opp.stage === "proposal")) {
      signals.push({
        signal_type: "low_confidence",
        severity: "medium",
        signal_label: "Low probability in late stage",
        signal_description: `${opp.probability}% probability at ${opp.stage}`,
        weight: 15,
      });
    }

    // No assigned owner
    if (!opp.assigned_to && !opp.sales_employee) {
      signals.push({
        signal_type: "unassigned",
        severity: "medium",
        signal_label: "No owner assigned",
        signal_description: "Opportunity lacks an accountable owner",
        weight: 10,
      });
    }

    // Insert signals
    if (signals.length > 0) {
      await supabase.from("crm_deal_risk_signals").insert(
        signals.map((s) => ({ ...s, opportunity_id: opportunityId }))
      );
    }

    const totalRisk = Math.min(100, signals.reduce((sum, s) => sum + s.weight, 0));

    await supabase
      .from("opportunities")
      .update({ risk_score: totalRisk })
      .eq("id", opportunityId);

    return new Response(JSON.stringify({ risk_score: totalRisk, signals }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compute-deal-risk error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
