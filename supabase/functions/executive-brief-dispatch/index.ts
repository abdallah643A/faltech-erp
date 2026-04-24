// Edge function: executive-brief-dispatch
// --------------------------------
// Triggered by pg_cron every day at 04:00 UTC (07:00 KSA).
// 1. Loads every active company from sap_companies.
// 2. For each company, calls the SQL aggregator `compute_executive_brief(company_id)`
//    to upsert today's snapshot row (cash, AR/AP, approvals, projects, sales, ZATCA).
// 3. Looks up subscribers in `executive_brief_subscriptions` (one row per user
//    who opted in) and dispatches an email digest via the existing
//    `send-workflow-email` function (per project memory: SMTP/API mail engine).
// 4. Inserts a `workflow_notifications` entry per recipient so the in-app
//    notification center surfaces the brief immediately.
//
// Idempotent: re-running on the same day overwrites the snapshot but does
// not double-send emails (we check `last_emailed_date` on the subscription).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Snapshot {
  company_id: string;
  snapshot_date: string;
  ar_open_total: number;
  ar_overdue_total: number;
  ar_overdue_count: number;
  ar_top_overdue_customer: string | null;
  ar_top_overdue_amount: number;
  ap_open_total: number;
  ap_overdue_total: number;
  ap_overdue_count: number;
  approvals_pending_count: number;
  approvals_oldest_hours: number;
  projects_at_risk_count: number;
  projects_red_count: number;
  projects_amber_count: number;
  sales_orders_today: number;
  sales_revenue_today: number;
  sales_revenue_mtd: number;
  zatca_failed_24h: number;
  status: string;
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n || 0);
}

function buildHtml(companyName: string, snap: Snapshot): string {
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const row = (label: string, value: string, accent = "#1a3a5c") =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">${label}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:${accent};">${value}</td></tr>`;

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;padding:20px;color:#222;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:#1a3a5c;color:#fff;padding:20px 24px;">
      <div style="font-size:13px;opacity:.85;">${date}</div>
      <h1 style="margin:6px 0 0;font-size:20px;">Executive Morning Brief</h1>
      <div style="font-size:13px;opacity:.85;margin-top:2px;">${companyName}</div>
    </div>
    <div style="padding:20px 24px;">
      <h2 style="font-size:14px;color:#1a3a5c;margin:0 0 8px;border-bottom:2px solid #1a3a5c;padding-bottom:4px;">💰 Cash & Receivables</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        ${row("Open AR", fmtMoney(snap.ar_open_total))}
        ${row("Overdue AR", fmtMoney(snap.ar_overdue_total), "#c0392b")}
        ${row("Overdue invoices", String(snap.ar_overdue_count))}
        ${snap.ar_top_overdue_customer ? row(`Top overdue: ${snap.ar_top_overdue_customer}`, fmtMoney(snap.ar_top_overdue_amount), "#c0392b") : ""}
      </table>

      <h2 style="font-size:14px;color:#1a3a5c;margin:0 0 8px;border-bottom:2px solid #1a3a5c;padding-bottom:4px;">📥 Payables</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        ${row("Open AP", fmtMoney(snap.ap_open_total))}
        ${row("Overdue AP", fmtMoney(snap.ap_overdue_total), snap.ap_overdue_total > 0 ? "#c0392b" : "#1a3a5c")}
        ${row("Overdue invoices", String(snap.ap_overdue_count))}
      </table>

      <h2 style="font-size:14px;color:#1a3a5c;margin:0 0 8px;border-bottom:2px solid #1a3a5c;padding-bottom:4px;">📝 Approvals Waiting</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        ${row("Pending requests", String(snap.approvals_pending_count), snap.approvals_pending_count > 0 ? "#e67e22" : "#27ae60")}
        ${row("Oldest waiting", `${snap.approvals_oldest_hours.toFixed(1)} hrs`, snap.approvals_oldest_hours > 48 ? "#c0392b" : "#1a3a5c")}
      </table>

      <h2 style="font-size:14px;color:#1a3a5c;margin:0 0 8px;border-bottom:2px solid #1a3a5c;padding-bottom:4px;">🚧 Projects at Risk</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        ${row("Red (overdue)", String(snap.projects_red_count), "#c0392b")}
        ${row("Amber (at risk)", String(snap.projects_amber_count), "#e67e22")}
      </table>

      <h2 style="font-size:14px;color:#1a3a5c;margin:0 0 8px;border-bottom:2px solid #1a3a5c;padding-bottom:4px;">📈 Sales</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        ${row("Orders today", String(snap.sales_orders_today))}
        ${row("Revenue today", fmtMoney(snap.sales_revenue_today))}
        ${row("Revenue MTD", fmtMoney(snap.sales_revenue_mtd), "#27ae60")}
      </table>

      <h2 style="font-size:14px;color:#1a3a5c;margin:0 0 8px;border-bottom:2px solid #1a3a5c;padding-bottom:4px;">🇸🇦 ZATCA Compliance</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">
        ${row("Clearance failures (24h)", String(snap.zatca_failed_24h), snap.zatca_failed_24h > 0 ? "#c0392b" : "#27ae60")}
      </table>

      <p style="margin:24px 0 0;font-size:11px;color:#999;text-align:center;">
        Snapshot generated automatically at 7:00 AM Riyadh time.<br/>
        Open the ERP for live drill-downs and full executive dashboard.
      </p>
    </div>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const today = new Date().toISOString().slice(0, 10);

  try {
    // 1. Active companies
    const { data: companies, error: cErr } = await supabase
      .from("sap_companies")
      .select("id, name, is_active")
      .eq("is_active", true);
    if (cErr) throw cErr;

    let computed = 0;
    let emailsSent = 0;
    let notificationsCreated = 0;
    const errors: string[] = [];

    for (const company of companies ?? []) {
      try {
        // 2. Build snapshot
        const { data: snapData, error: sErr } = await supabase
          .rpc("compute_executive_brief", { p_company_id: company.id });
        if (sErr) throw sErr;
        const snap = snapData as Snapshot;
        computed++;

        // 3. Subscribers
        const { data: subs } = await supabase
          .from("executive_brief_subscriptions")
          .select("user_id, email, channel_email, channel_inapp, last_emailed_date")
          .eq("company_id", company.id)
          .eq("is_active", true);

        const html = buildHtml(company.name ?? "Company", snap);
        const subject = `Morning Brief — ${company.name ?? ""} — ${today}`;

        for (const sub of subs ?? []) {
          // In-app notification (always)
          if (sub.channel_inapp && sub.user_id) {
            const { error: nErr } = await supabase.from("workflow_notifications").insert({
              user_id: sub.user_id,
              title: subject,
              message: `Cash overdue: ${fmtMoney(snap.ar_overdue_total)} • Approvals pending: ${snap.approvals_pending_count} • Projects at risk: ${snap.projects_at_risk_count}`,
              notification_type: "executive_brief",
              link_url: "/executive-brief",
              is_read: false,
            } as any);
            if (!nErr) notificationsCreated++;
          }

          // Email (skip if already sent today)
          if (sub.channel_email && sub.email && sub.last_emailed_date !== today) {
            try {
              await supabase.functions.invoke("send-workflow-email", {
                body: { to: sub.email, subject, html },
              });
              emailsSent++;
              await supabase
                .from("executive_brief_subscriptions")
                .update({ last_emailed_date: today } as any)
                .eq("user_id", sub.user_id)
                .eq("company_id", company.id);
            } catch (e) {
              errors.push(`email ${sub.email}: ${(e as Error).message}`);
            }
          }
        }
      } catch (e) {
        errors.push(`company ${company.id}: ${(e as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, date: today, computed, emailsSent, notificationsCreated, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
