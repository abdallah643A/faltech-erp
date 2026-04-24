import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read mail configuration
    const { data: mailConfig } = await supabase
      .from("mail_configuration")
      .select("*")
      .limit(1)
      .single();

    const fromName = mailConfig?.from_name || "SLA Monitor";
    const fromEmail = mailConfig?.from_email || "onboarding@resend.dev";
    const footerText = mailConfig?.footer_text || "This is an automated daily report from the SLA monitoring system.";

    // Check if emails are globally enabled and daily report is enabled
    if (mailConfig && (!mailConfig.email_enabled || !mailConfig.daily_overdue_report_enabled)) {
      return new Response(
        JSON.stringify({ message: "Daily overdue report emails disabled", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all SLA configs
    const { data: slaConfigs } = await supabase
      .from("phase_sla_config")
      .select("*")
      .eq("is_active", true);

    if (!slaConfigs || slaConfigs.length === 0) {
      return new Response(JSON.stringify({ message: "No SLA configs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slaMap = new Map(slaConfigs.map((c: any) => [c.phase, c]));

    // Get active phases for industrial projects
    const { data: activePhases } = await supabase
      .from("project_phases")
      .select("*, projects!inner(id, name, current_phase, project_type)")
      .eq("status", "in_progress")
      .eq("projects.project_type", "industrial");

    if (!activePhases || activePhases.length === 0) {
      return new Response(JSON.stringify({ message: "No active phases", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const overdueItems: any[] = [];

    for (const phase of activePhases) {
      if (!phase.started_at) continue;
      const sla = slaMap.get(phase.phase);
      if (!sla) continue;

      const startedAt = new Date(phase.started_at);
      const daysElapsed = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24));

      if (daysElapsed > sla.max_days) {
        // Get sales order info
        const { data: so } = await supabase
          .from("sales_orders")
          .select("doc_num, customer_name, contract_number, branch_id")
          .eq("project_id", phase.project_id)
          .limit(1)
          .single();

        overdueItems.push({
          project_id: phase.project_id,
          project_name: phase.projects?.name,
          phase: phase.phase,
          phase_label: sla.phase_label,
          days_elapsed: daysElapsed,
          max_days: sla.max_days,
          days_overdue: daysElapsed - sla.max_days,
          escalation_level: phase.escalation_level || 0,
          so_doc_num: so?.doc_num,
          customer_name: so?.customer_name,
          contract_number: so?.contract_number,
          branch_id: so?.branch_id,
        });
      }
    }

    if (overdueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No overdue phases", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target users: admin, region_manager, general_manager, ceo
    const { data: targetUsers } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "region_manager", "general_manager", "ceo"]);

    if (!targetUsers || targetUsers.length === 0) {
      return new Response(JSON.stringify({ message: "No target users found", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniqueUserIds = [...new Set(targetUsers.map((u: any) => u.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", uniqueUserIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    // Build HTML report
    const overdueRows = overdueItems
      .sort((a: any, b: any) => b.days_overdue - a.days_overdue)
      .map((item: any) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.contract_number || 'SO-' + (item.so_doc_num || 'N/A')}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.customer_name || item.project_name || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.phase_label}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.max_days}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.days_elapsed}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${item.days_overdue} days</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">Level ${item.escalation_level}</td>
        </tr>
      `)
      .join("");

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="background: #991b1b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">⚠️ Daily Overdue Contracts & Stages Report</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="color: #374151; margin-bottom: 16px;">
            <strong>${overdueItems.length}</strong> contract stage${overdueItems.length > 1 ? 's are' : ' is'} currently overdue and require${overdueItems.length === 1 ? 's' : ''} immediate attention.
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Contract</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Customer</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Stage</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">SLA (days)</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Elapsed</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Overdue</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Escalation</th>
              </tr>
            </thead>
            <tbody>
              ${overdueRows}
            </tbody>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            ${footerText}
          </p>
        </div>
      </div>
    `;

    let sentCount = 0;
    const errors: string[] = [];

    for (const userId of uniqueUserIds) {
      const profile = profileMap.get(userId);
      if (!profile?.email) continue;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [profile.email],
            subject: `⚠️ Daily Overdue Report - ${overdueItems.length} Stage${overdueItems.length > 1 ? 's' : ''} Overdue`,
            html: htmlBody,
            ...(mailConfig?.reply_to_email ? { reply_to: mailConfig.reply_to_email } : {}),
          }),
        });

        if (emailRes.ok) {
          sentCount++;
        } else {
          const errBody = await emailRes.text();
          errors.push(`Failed for ${profile.email}: ${errBody}`);
        }
      } catch (e: any) {
        errors.push(`Error for ${profile.email}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, overdue_count: overdueItems.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("Overdue report error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
