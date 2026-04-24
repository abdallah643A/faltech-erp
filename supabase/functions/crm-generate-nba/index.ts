import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

// Generate Next-Best-Action recommendations using Lovable AI.
// Modes: on-demand (entity_type+entity_id) OR nightly (process top stale leads/opps).
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
    const { entity_type, entity_id, batch } = await req.json().catch(() => ({}));
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    type Target = { entity_type: "lead" | "opportunity"; entity_id: string; context: any };
    const targets: Target[] = [];

    if (entity_type && entity_id) {
      const tbl = entity_type === "lead" ? "crm_leads" : "opportunities";
      const { data } = await supabase.from(tbl).select("*").eq("id", entity_id).maybeSingle();
      if (data) targets.push({ entity_type, entity_id, context: data });
    } else if (batch) {
      // Nightly mode: stale assigned leads + open opportunities
      const { data: leads } = await supabase
        .from("crm_leads").select("*")
        .in("status", ["assigned", "working"])
        .order("updated_at", { ascending: true })
        .limit(20);
      for (const l of leads ?? []) targets.push({ entity_type: "lead", entity_id: l.id, context: l });

      const { data: opps } = await supabase
        .from("opportunities").select("*")
        .neq("stage", "Closed Won").neq("stage", "Closed Lost")
        .order("updated_at", { ascending: true })
        .limit(20);
      for (const o of opps ?? []) targets.push({ entity_type: "opportunity", entity_id: o.id, context: o });
    }

    if (!targets.length) {
      return new Response(JSON.stringify({ generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generated: any[] = [];
    for (const t of targets) {
      const prompt = `Recommend 1-3 next best actions for this ${t.entity_type}. Be specific and actionable.\n\nData: ${JSON.stringify(t.context).slice(0, 4000)}`;

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a senior B2B sales coach. Recommend concrete next steps with rationale." },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "next_best_actions",
              description: "Return 1-3 prioritized next best actions",
              parameters: {
                type: "object",
                properties: {
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action_type: { type: "string", enum: ["call", "email", "whatsapp", "meeting", "send_quote", "nurture", "escalate"] },
                        title: { type: "string" },
                        rationale: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                        due_in_hours: { type: "number" },
                      },
                      required: ["action_type", "title", "rationale", "priority", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["actions"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "next_best_actions" } },
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429 || resp.status === 402) {
          return new Response(JSON.stringify({ error: resp.status === 429 ? "rate_limited" : "credits_exhausted" }), {
            status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        continue;
      }

      const j = await resp.json();
      const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) continue;
      const parsed = JSON.parse(args);

      // Dismiss prior open AI actions for this entity to avoid stack-up
      await supabase.from("crm_next_best_actions")
        .update({ status: "dismissed" })
        .eq("entity_type", t.entity_type)
        .eq("entity_id", t.entity_id)
        .eq("status", "open")
        .eq("source", "ai");

      const rows = (parsed.actions ?? []).map((a: any) => ({
        entity_type: t.entity_type,
        entity_id: t.entity_id,
        action_type: a.action_type,
        title: a.title,
        rationale: a.rationale,
        priority: a.priority,
        confidence: a.confidence,
        due_at: a.due_in_hours ? new Date(Date.now() + a.due_in_hours * 3600_000).toISOString() : null,
        source: "ai",
        status: "open",
      }));
      if (rows.length) {
        await supabase.from("crm_next_best_actions").insert(rows);
        generated.push(...rows);
      }
    }

    return new Response(JSON.stringify({ generated: generated.length, actions: generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
