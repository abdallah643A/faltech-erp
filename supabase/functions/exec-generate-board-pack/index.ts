// Generates an executive board pack with AI narrative summaries.
// Aggregates KPI snapshots, executive_kpis, risks (legacy + risk_register),
// decisions, goals, and document expiries for the given period, then asks
// the Lovable AI Gateway (google/gemini-2.5-flash) to produce an executive
// narrative that contextualises the numbers. Returns a structured payload
// the UI can render and print to PDF.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function generateNarrative(input: {
  title: string;
  period_start: string;
  period_end: string;
  data: Record<string, any[]>;
}): Promise<{ executive_summary: string; highlights: string[]; risks_summary: string; outlook: string } | null> {
  if (!LOVABLE_API_KEY) return null;
  const compact = {
    period: `${input.period_start} → ${input.period_end}`,
    kpi_snapshots_count: input.data.kpis?.length ?? 0,
    executive_kpis: (input.data.executive_kpis ?? []).slice(0, 30).map((k: any) => ({
      name: k.kpi_name, code: k.kpi_code, actual: k.actual_value, target: k.target_value,
      unit: k.unit, status: k.status, period: k.period_label,
    })),
    open_risks: (input.data.risk_register ?? []).slice(0, 15).map((r: any) => ({
      code: r.risk_code, title: r.risk_title, likelihood: r.likelihood, impact: r.impact,
      score: r.risk_score, owner: r.owner_name, mitigation: r.mitigation_plan,
    })),
    decisions: (input.data.decisions ?? []).slice(0, 15).map((d: any) => ({
      title: d.title, status: d.status, priority: d.priority, owner: d.owner_name,
    })),
    goals: (input.data.goals ?? []).slice(0, 15).map((g: any) => ({
      title: g.title, current: g.current_value, target: g.target_value, status: g.status,
    })),
    expiries_count: input.data.expiries?.length ?? 0,
  };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a CFO-grade analyst. Produce concise, board-ready commentary in business English. Be specific, cite numbers, and flag concerns." },
          { role: "user", content: `Write a board narrative for "${input.title}". Return STRICT JSON: {"executive_summary":string,"highlights":string[],"risks_summary":string,"outlook":string}. Data:\n${JSON.stringify(compact)}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const txt = json?.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(txt);
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { company_id, title, period_start, period_end, sections } = body || {};
    if (!company_id || !title || !period_start || !period_end) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [kpis, execKpis, legacyRisks, riskReg, decisions, goals, expiries] = await Promise.all([
      supabase.from("exec_kpi_snapshots").select("*").eq("company_id", company_id)
        .gte("period_start", period_start).lte("period_end", period_end).limit(50),
      supabase.from("executive_kpis").select("*").eq("company_id", company_id).limit(60),
      supabase.from("exec_risk_register").select("*").eq("company_id", company_id)
        .neq("status", "closed").order("inherent_score", { ascending: false }).limit(20),
      supabase.from("risk_register").select("*").eq("company_id", company_id)
        .eq("status", "open").order("risk_score", { ascending: false }).limit(30),
      supabase.from("exec_decision_log").select("*").eq("company_id", company_id)
        .gte("decision_date", period_start).lte("decision_date", period_end).limit(50),
      supabase.from("exec_strategic_goals").select("*").eq("company_id", company_id).limit(20),
      supabase.from("exec_document_expiry_watch").select("*").eq("company_id", company_id)
        .eq("status", "active").order("expiry_date").limit(30),
    ]);

    const data = {
      kpis: kpis.data ?? [],
      executive_kpis: execKpis.data ?? [],
      risks: legacyRisks.data ?? [],
      risk_register: riskReg.data ?? [],
      decisions: decisions.data ?? [],
      goals: goals.data ?? [],
      expiries: expiries.data ?? [],
    };

    const narrative = await generateNarrative({ title, period_start, period_end, data });

    const payload = {
      title, period_start, period_end,
      sections: sections ?? ["executive_summary", "kpis", "risks", "decisions", "goals", "expiries", "outlook"],
      data,
      narrative,
    };

    const { data: pack, error } = await supabase.from("exec_board_packs").insert({
      company_id, title, period_start, period_end,
      status: "generated", sections: payload.sections,
      generated_at: new Date().toISOString(),
      notes: `${(execKpis.data?.length ?? 0)} KPIs, ${(riskReg.data?.length ?? 0)} risks, ${(decisions.data?.length ?? 0)} decisions${narrative ? " (AI narrative ✓)" : ""}`,
      payload: payload as any,
    } as any).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, board_pack: pack, payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
