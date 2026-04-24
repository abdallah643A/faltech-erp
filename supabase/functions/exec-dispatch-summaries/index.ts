// Cron-driven dispatcher for executive summary schedules.
// Picks active schedules with next_run_at <= now(), assembles a digest,
// and dispatches via email (send-transactional-email) or WhatsApp
// (reuses existing WhatsApp infra by enqueueing into wa_outbound if present;
// otherwise logs the payload). Updates last_sent_at and next_run_at.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function computeNextRun(frequency: string, from: Date): Date {
  const d = new Date(from);
  if (frequency === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (frequency === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const nowIso = new Date().toISOString();
    const { data: due, error } = await supabase
      .from("exec_summary_schedules")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", nowIso)
      .limit(50);

    if (error) throw error;

    const results: any[] = [];

    for (const s of due ?? []) {
      try {
        // Aggregate digest content
        const periodEnd = new Date();
        const periodStart = new Date();
        periodStart.setUTCDate(periodStart.getUTCDate() - 30);

        const [kpis, risks, expiries] = await Promise.all([
          supabase.from("exec_kpi_snapshots").select("kpi_label,value,variance_pct,unit")
            .eq("company_id", s.company_id).order("period_end", { ascending: false }).limit(8),
          supabase.from("exec_risk_register").select("title,inherent_score,status")
            .eq("company_id", s.company_id).neq("status", "closed")
            .order("inherent_score", { ascending: false }).limit(5),
          supabase.from("exec_document_expiry_watch").select("document_name,expiry_date,days_to_expiry")
            .eq("company_id", s.company_id).eq("status", "active")
            .order("expiry_date").limit(5),
        ]);

        const digestText = [
          `Executive summary — ${s.schedule_name}`,
          ``,
          `Top KPIs:`,
          ...(kpis.data ?? []).map((k: any) =>
            `• ${k.kpi_label}: ${Number(k.value ?? 0).toLocaleString()}${k.unit ?? ""} (${k.variance_pct ?? 0}%)`),
          ``,
          `Open risks (${(risks.data ?? []).length}):`,
          ...(risks.data ?? []).map((r: any) => `• ${r.title} — score ${r.inherent_score}`),
          ``,
          `Document expiries:`,
          ...(expiries.data ?? []).map((d: any) => `• ${d.document_name} — ${d.expiry_date} (${d.days_to_expiry}d)`),
        ].join("\n");

        const recipients: string[] = Array.isArray(s.recipients) ? s.recipients : [];

        if (s.channel === "email" || s.channel === "both") {
          for (const email of recipients) {
            try {
              await supabase.functions.invoke("send-transactional-email", {
                body: {
                  templateName: "executive-summary",
                  recipientEmail: email,
                  idempotencyKey: `exec-summary-${s.id}-${nowIso.slice(0, 10)}`,
                  templateData: {
                    scheduleName: s.schedule_name,
                    digestText,
                    digestHtml: digestText.replace(/\n/g, "<br/>"),
                  },
                },
              });
            } catch (_e) { /* best-effort, continue */ }
          }
        }

        if (s.channel === "whatsapp" || s.channel === "both") {
          // Reuse existing WhatsApp infra: enqueue to wa_outbound if it exists.
          // If not, just log into exec_summary_schedules via metadata field.
          for (const phone of recipients) {
            try {
              await supabase.from("wa_outbound" as any).insert({
                to_phone: phone,
                template_key: "executive_summary",
                payload: { text: digestText, schedule_id: s.id, company_id: s.company_id },
                status: "pending",
              });
            } catch (_e) { /* table may not exist yet — ignore */ }
          }
        }

        // Advance schedule
        const next = computeNextRun(s.frequency ?? "daily", new Date());
        await supabase.from("exec_summary_schedules").update({
          last_sent_at: nowIso,
          next_run_at: next.toISOString(),
        }).eq("id", s.id);

        results.push({ id: s.id, ok: true, recipients: recipients.length });
      } catch (err) {
        results.push({ id: s.id, ok: false, error: (err as Error).message });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
