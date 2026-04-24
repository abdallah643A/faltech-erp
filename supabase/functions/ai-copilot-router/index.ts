import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Capability = 'next_best_action' | 'anomaly' | 'forecast' | 'narrative' | 'decision_support';
type Module = 'crm' | 'finance' | 'procurement' | 'cpms' | 'inventory' | 'hr' | 'executive';

const SYSTEM_PROMPTS: Record<Capability, string> = {
  next_best_action:
    'You are an enterprise ERP copilot. Generate 1-5 specific next-best-action suggestions. Each must include a title, one-paragraph summary, an explanation citing exact evidence fields from the provided context, a risk_level (low/medium/high), and a confidence (0-1). Suggest only what the evidence supports. Never invent data.',
  anomaly:
    'You are an enterprise ERP anomaly detector. Inspect the provided context and report unusual patterns. For each anomaly include title, summary of what is unusual, explanation of why (cite the exact data points), risk_level, and confidence. If no anomalies, return an empty array.',
  forecast:
    'You are an enterprise ERP forecaster. Produce 1-3 short-horizon forecasts grounded in the historical context provided. Each item must include title, narrative summary, explanation of methodology and assumptions, risk_level reflecting forecast uncertainty, and confidence.',
  narrative:
    'You are an enterprise ERP narrator. Produce a single concise executive narrative summarizing the provided context. Output exactly one suggestion with title, summary (3-6 sentences), explanation of which data shaped the narrative, risk_level=low, confidence reflecting data completeness.',
  decision_support:
    'You are a controlled ERP decision-support copilot. Create safe draft recommendations only. Include title, summary, evidence-backed explanation, risk_level, confidence, recommended_action, and draft_payload. Never imply a live transaction was changed; every output requires human approval.',
};

const TOOL_SCHEMA = {
  type: 'function',
  function: {
    name: 'emit_suggestions',
    description: 'Return structured copilot suggestions',
    parameters: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              summary: { type: 'string' },
              explanation: { type: 'string' },
              risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
              confidence: { type: 'number' },
              evidence: { type: 'object', additionalProperties: true },
              recommended_action: { type: 'object', additionalProperties: true },
              draft_payload: { type: 'object', additionalProperties: true },
              permission_scope: { type: 'array', items: { type: 'string' } },
            },
            required: ['title', 'summary', 'explanation', 'risk_level', 'confidence'],
            additionalProperties: false,
          },
        },
      },
      required: ['suggestions'],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let runId: string | null = null;

  try {
    const body = await req.json();
    const {
      module, capability, company_id, context, prompt,
    }: {
      module: Module; capability: Capability; company_id?: string;
      context?: Record<string, unknown>; prompt?: string;
    } = body;

    if (!module || !capability) {
      return new Response(JSON.stringify({ error: 'module and capability required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const { data } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = data?.user?.id ?? null;
    }

    const { data: run, error: runErr } = await supabase.from('ai_copilot_runs').insert({
      company_id, module, capability, prompt,
      context_snapshot: context ?? {},
      requested_by: userId, status: 'running',
    }).select().single();
    if (runErr) throw runErr;
    runId = run.id;

    const t0 = Date.now();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[capability] },
          { role: 'user', content:
              `Module: ${module}\nCompany: ${company_id ?? 'n/a'}\n` +
              (prompt ? `User prompt: ${prompt}\n` : '') +
              `Context (JSON):\n${JSON.stringify(context ?? {}, null, 2)}` },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: 'function', function: { name: 'emit_suggestions' } },
      }),
    });

    if (aiResp.status === 429) {
      await supabase.from('ai_copilot_runs').update({
        status: 'failed', error_message: 'rate_limited', latency_ms: Date.now() - t0,
      }).eq('id', runId);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded, please retry shortly.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiResp.status === 402) {
      await supabase.from('ai_copilot_runs').update({
        status: 'failed', error_message: 'payment_required', latency_ms: Date.now() - t0,
      }).eq('id', runId);
      return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in Settings → Workspace → Usage.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`AI gateway error ${aiResp.status}: ${t.slice(0, 200)}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { suggestions: [] };
    const usage = aiJson.usage ?? null;

    const rows = (args.suggestions ?? []).map((s: any) => ({
      run_id: runId, company_id, module, capability,
      title: s.title, summary: s.summary, explanation: s.explanation,
      evidence: s.evidence ?? {}, recommended_action: s.recommended_action ?? null,
      draft_payload: s.draft_payload ?? s.recommended_action ?? {},
      draft_entity_type: s.recommended_action?.entity_type ?? null,
      requires_review: true,
      approved_for_execution: false,
      permission_scope: Array.isArray(s.permission_scope) ? s.permission_scope : [`${module}:${capability}:review`],
      risk_level: s.risk_level ?? 'low',
      confidence: typeof s.confidence === 'number' ? s.confidence : null,
      status: 'pending',
    }));
    let inserted: any[] = [];
    if (rows.length) {
      const { data: ins, error: insErr } = await supabase
        .from('ai_copilot_suggestions').insert(rows).select();
      if (insErr) throw insErr;
      inserted = ins ?? [];
      await supabase.from('ai_copilot_audit_log').insert(
        inserted.map((s: any) => ({
          suggestion_id: s.id, run_id: runId, company_id, module,
          event: 'generated', actor_id: userId, payload: { capability },
        }))
      );
    }

    await supabase.from('ai_copilot_runs').update({
      status: 'completed', latency_ms: Date.now() - t0,
      token_usage: usage, model: 'google/gemini-3-flash-preview',
    }).eq('id', runId);

    if (inserted.length && ['forecast', 'narrative', 'decision_support'].includes(capability)) {
      await persistSpecializedArtifacts(supabase, { inserted, capability, module, company_id: company_id ?? null, userId });
    }

    return new Response(JSON.stringify({
      run_id: runId, suggestions: inserted, count: inserted.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    if (runId) {
      await supabase.from('ai_copilot_runs').update({
        status: 'failed', error_message: e.message ?? String(e),
      }).eq('id', runId);
    }
    return new Response(JSON.stringify({ error: e.message ?? 'Copilot failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function persistSpecializedArtifacts(
  supabase: any,
  { inserted, capability, module, company_id, userId }: { inserted: any[]; capability: Capability; module: Module; company_id: string | null; userId: string | null },
) {
  if (!['finance', 'crm', 'procurement', 'cpms', 'inventory', 'hr'].includes(module)) return;

  if (capability === 'forecast') {
    await supabase.from('ai_forecast_runs').insert(inserted.map((s) => ({
      company_id, module, forecast_name: s.title, forecast_output: s.recommended_action ?? {},
      assumptions: s.evidence ?? {}, confidence: s.confidence, explanation: s.explanation,
      status: 'pending_review', requested_by: userId,
    })));
  }
  if (capability === 'narrative') {
    await supabase.from('ai_narrative_reports').insert(inserted.map((s) => ({
      company_id, module, report_name: s.title, narrative: s.summary,
      highlights: s.recommended_action?.highlights ?? [], risks: s.recommended_action?.risks ?? [],
      recommendations: s.recommended_action?.recommendations ?? [], evidence: s.evidence ?? {},
      confidence: s.confidence, status: 'pending_review', requested_by: userId,
    })));
  }
  if (capability === 'decision_support') {
    await supabase.from('ai_decision_support_cases').insert(inserted.map((s) => ({
      company_id, module, case_title: s.title, case_type: s.recommended_action?.type ?? 'decision_support',
      business_context: s.evidence ?? {}, options: s.recommended_action?.options ?? [],
      recommendation: s.recommended_action ?? {}, evidence: s.evidence ?? {}, risk_level: s.risk_level,
      confidence: s.confidence, draft_payload: s.draft_payload ?? {}, status: 'pending_review', requested_by: userId,
    })));
  }
}
