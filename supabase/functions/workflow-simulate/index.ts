import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Step {
  id: string;
  type: string; // condition | action | approval | notify | delay
  name?: string;
  config?: Record<string, unknown>;
  next?: string | null;
  branches?: { when: string; next: string }[];
}

interface SimulateBody {
  workflow_key: string;
  workflow_version?: number;
  scenario_name?: string;
  steps: Step[];
  input: Record<string, unknown>;
  start_step_id?: string;
}

function evalCondition(expr: string, ctx: Record<string, unknown>): boolean {
  try {
    // Very small safe evaluator: supports `${var} op value` patterns
    // Replace ${name} with JSON.stringified context value
    const safe = expr.replace(/\$\{([\w.]+)\}/g, (_m, k) => {
      const path = (k as string).split(".");
      let v: any = ctx;
      for (const p of path) v = v?.[p];
      return JSON.stringify(v ?? null);
    });
    // Allow only basic comparison chars
    if (!/^[\s0-9a-zA-Z_'"<>=!&|().+\-*/,:\[\]{}]+$/.test(safe)) return false;
    // eslint-disable-next-line no-new-func
    return Boolean(new Function(`return (${safe});`)());
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const started = Date.now();
  try {
    const body = (await req.json()) as SimulateBody;
    if (!body?.workflow_key || !Array.isArray(body?.steps)) {
      return new Response(JSON.stringify({ error: "workflow_key and steps[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data?.user?.id ?? null;
    }

    // Insert run row
    const { data: runRow, error: insErr } = await supabase
      .from("workflow_simulation_runs")
      .insert({
        workflow_key: body.workflow_key,
        workflow_version: body.workflow_version ?? null,
        scenario_name: body.scenario_name ?? null,
        input_payload: body.input ?? {},
        steps_total: body.steps.length,
        status: "running",
        created_by: userId,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    const trace: any[] = [];
    const ctx: Record<string, unknown> = { ...(body.input ?? {}) };
    const stepsById = Object.fromEntries(body.steps.map((s) => [s.id, s]));
    let current: Step | undefined =
      stepsById[body.start_step_id ?? body.steps[0].id];
    let executed = 0;
    const maxSteps = 100;

    while (current && executed < maxSteps) {
      const stepStart = Date.now();
      const entry: any = { step_id: current.id, type: current.type, name: current.name };
      try {
        switch (current.type) {
          case "condition": {
            const expr = String(current.config?.expression ?? "true");
            const result = evalCondition(expr, ctx);
            entry.expression = expr;
            entry.result = result;
            const branch = current.branches?.find((b) => (b.when === "true") === result);
            current = branch?.next ? stepsById[branch.next] : undefined;
            break;
          }
          case "action": {
            entry.action = current.config?.action ?? "noop";
            entry.params = current.config?.params ?? {};
            current = current.next ? stepsById[current.next] : undefined;
            break;
          }
          case "approval": {
            entry.approver = current.config?.approver ?? "unassigned";
            entry.simulated = "auto-approved";
            current = current.next ? stepsById[current.next] : undefined;
            break;
          }
          case "notify": {
            entry.channel = current.config?.channel ?? "email";
            entry.template = current.config?.template ?? null;
            current = current.next ? stepsById[current.next] : undefined;
            break;
          }
          case "delay": {
            entry.duration_seconds = current.config?.duration_seconds ?? 0;
            current = current.next ? stepsById[current.next] : undefined;
            break;
          }
          default: {
            entry.warning = `Unknown step type: ${current.type}`;
            current = current.next ? stepsById[current.next] : undefined;
          }
        }
        entry.duration_ms = Date.now() - stepStart;
        trace.push(entry);
        executed++;
      } catch (stepErr) {
        entry.error = String(stepErr);
        trace.push(entry);
        await supabase
          .from("workflow_simulation_runs")
          .update({
            status: "failed",
            error_message: String(stepErr),
            trace,
            steps_executed: executed,
            duration_ms: Date.now() - started,
            finished_at: new Date().toISOString(),
          })
          .eq("id", runRow.id);
        return new Response(JSON.stringify({ run_id: runRow.id, status: "failed", trace }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const truncated = executed >= maxSteps;
    await supabase
      .from("workflow_simulation_runs")
      .update({
        status: truncated ? "failed" : "success",
        error_message: truncated ? "Step limit exceeded (possible loop)" : null,
        trace,
        output_payload: ctx,
        steps_executed: executed,
        duration_ms: Date.now() - started,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    return new Response(
      JSON.stringify({
        run_id: runRow.id,
        status: truncated ? "failed" : "success",
        steps_executed: executed,
        trace,
        output: ctx,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
