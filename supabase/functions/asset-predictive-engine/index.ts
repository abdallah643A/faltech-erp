import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface SignalDraft {
  equipment_id: string;
  asset_id: string | null;
  company_id: string | null;
  signal_type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence_score: number;
  detection_source: "rule" | "ai";
  title: string;
  description: string;
  recommended_action: string;
  detected_value?: number;
  threshold_value?: number;
  metadata?: Record<string, unknown>;
}

async function callAI(equipment: any, signals: SignalDraft[]): Promise<{ confidence: number; reason: string } | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a predictive maintenance analyst. Score the failure risk for an asset given its rule-based signals. Respond ONLY via the score_risk tool.",
          },
          {
            role: "user",
            content: `Asset: ${JSON.stringify({
              name: equipment.name,
              code: equipment.code,
              age_years: equipment.age_years,
              total_downtime_hours: equipment.total_downtime_hours,
              meter_reading: equipment.last_meter_reading,
            })}\n\nDetected signals:\n${JSON.stringify(signals)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "score_risk",
              description: "Return AI-assessed failure risk",
              parameters: {
                type: "object",
                properties: {
                  confidence: { type: "number", description: "0-100 risk confidence" },
                  reason: { type: "string", description: "Short justification" },
                },
                required: ["confidence", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "score_risk" } },
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    const parsed = JSON.parse(args);
    return { confidence: Number(parsed.confidence) || 0, reason: String(parsed.reason || "") };
  } catch (e) {
    console.error("AI call failed", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startedAt = Date.now();
  try {
    const { company_id } = await req.json().catch(() => ({}));
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let eqQuery = supabase
      .from("cpms_equipment")
      .select("id, name, code, company_id, purchase_date, total_downtime_hours, last_meter_reading, expected_life_years");
    if (company_id) eqQuery = eqQuery.eq("company_id", company_id);
    const { data: equipment, error } = await eqQuery.limit(500);
    if (error) throw error;

    const allSignals: SignalDraft[] = [];
    let aiCalls = 0;
    const now = Date.now();

    for (const eq of equipment || []) {
      const draftsForEq: SignalDraft[] = [];
      const ageYears = eq.purchase_date
        ? (now - new Date(eq.purchase_date).getTime()) / (365.25 * 86400000)
        : 0;

      // Rule 1: end-of-life
      if (eq.expected_life_years && ageYears >= eq.expected_life_years * 0.85) {
        draftsForEq.push({
          equipment_id: eq.id,
          asset_id: null,
          company_id: eq.company_id,
          signal_type: "end_of_life",
          severity: ageYears >= eq.expected_life_years ? "critical" : "high",
          confidence_score: 90,
          detection_source: "rule",
          title: `Approaching end-of-life (${ageYears.toFixed(1)} / ${eq.expected_life_years}y)`,
          description: `Asset has reached ${((ageYears / eq.expected_life_years) * 100).toFixed(0)}% of expected life`,
          recommended_action: "Schedule replacement evaluation",
          detected_value: ageYears,
          threshold_value: eq.expected_life_years,
        });
      }

      // Rule 2: high downtime
      if (eq.total_downtime_hours && eq.total_downtime_hours > 200) {
        draftsForEq.push({
          equipment_id: eq.id,
          asset_id: null,
          company_id: eq.company_id,
          signal_type: "high_downtime",
          severity: eq.total_downtime_hours > 500 ? "critical" : "high",
          confidence_score: 80,
          detection_source: "rule",
          title: `Elevated downtime: ${eq.total_downtime_hours}h cumulative`,
          description: "Downtime exceeds operational threshold",
          recommended_action: "Inspect critical components and review failure history",
          detected_value: eq.total_downtime_hours,
          threshold_value: 200,
        });
      }

      // Rule 3: abnormal meter jump (last 7 days)
      const { data: meters } = await supabase
        .from("asset_meter_readings")
        .select("reading_value, reading_date")
        .eq("equipment_id", eq.id)
        .order("reading_date", { ascending: false })
        .limit(10);
      if (meters && meters.length >= 2) {
        const diff = Number(meters[0].reading_value) - Number(meters[1].reading_value);
        const daysBetween = Math.max(
          1,
          (new Date(meters[0].reading_date).getTime() - new Date(meters[1].reading_date).getTime()) / 86400000,
        );
        const ratePerDay = diff / daysBetween;
        if (ratePerDay > 200) {
          draftsForEq.push({
            equipment_id: eq.id,
            asset_id: null,
            company_id: eq.company_id,
            signal_type: "meter_anomaly",
            severity: "medium",
            confidence_score: 70,
            detection_source: "rule",
            title: `Abnormal meter jump (${ratePerDay.toFixed(0)}/day)`,
            description: "Meter usage spike vs prior baseline",
            recommended_action: "Verify reading accuracy; consider preventive maintenance",
            detected_value: ratePerDay,
            threshold_value: 200,
          });
        }
      }

      // AI escalation if multiple ambiguous signals
      if (draftsForEq.length >= 2 && LOVABLE_API_KEY) {
        aiCalls++;
        const ai = await callAI({ ...eq, age_years: ageYears.toFixed(1) }, draftsForEq);
        if (ai && ai.confidence >= 70) {
          draftsForEq.push({
            equipment_id: eq.id,
            asset_id: null,
            company_id: eq.company_id,
            signal_type: "ai_failure_risk",
            severity: ai.confidence >= 85 ? "critical" : "high",
            confidence_score: ai.confidence,
            detection_source: "ai",
            title: `AI failure-risk score: ${ai.confidence.toFixed(0)}`,
            description: ai.reason,
            recommended_action: "Prioritize for inspection or replacement evaluation",
            metadata: { rule_signals: draftsForEq.length },
          });
        }
      }

      allSignals.push(...draftsForEq);
    }

    if (allSignals.length) {
      await supabase.from("asset_predictive_signals").insert(allSignals);
    }

    const duration = Date.now() - startedAt;
    await supabase.from("asset_predictive_runs").insert({
      company_id: company_id || null,
      run_type: "manual",
      status: "completed",
      assets_scanned: equipment?.length || 0,
      signals_created: allSignals.length,
      ai_calls: aiCalls,
      duration_ms: duration,
      completed_at: new Date().toISOString(),
      summary: {
        critical: allSignals.filter((s) => s.severity === "critical").length,
        high: allSignals.filter((s) => s.severity === "high").length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        assets_scanned: equipment?.length || 0,
        signals_created: allSignals.length,
        ai_calls: aiCalls,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("predictive run error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
