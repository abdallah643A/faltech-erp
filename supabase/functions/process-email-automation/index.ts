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
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "process_all";

    const results: Record<string, any> = {};

    // === MEETING REMINDERS ===
    if (action === "process_all" || action === "meeting_reminders") {
      const now = new Date();
      const reminders = [
        { label: "24h", ms: 24 * 60 * 60 * 1000 },
        { label: "1h", ms: 60 * 60 * 1000 },
        { label: "15m", ms: 15 * 60 * 1000 },
      ];

      let remindersSent = 0;
      for (const r of reminders) {
        const windowStart = new Date(now.getTime() + r.ms - 2.5 * 60 * 1000);
        const windowEnd = new Date(now.getTime() + r.ms + 2.5 * 60 * 1000);

        const { data: activities } = await supabase
          .from("activities")
          .select("*, profiles!activities_assigned_to_fkey(email, full_name, user_id)")
          .in("type", ["meeting", "call"])
          .gte("start_time", windowStart.toISOString())
          .lte("start_time", windowEnd.toISOString())
          .eq("status", "planned");

        for (const act of activities || []) {
          const profile = act.profiles;
          if (!profile?.email || !profile?.user_id) continue;

          // Check user preferences
          const { data: pref } = await supabase
            .from("notification_preferences")
            .select("email_enabled")
            .eq("user_id", profile.user_id)
            .eq("notification_type", "meeting_reminder")
            .maybeSingle();

          if (pref && !pref.email_enabled) continue;

          // Check DND
          const { data: dnd } = await supabase
            .from("notification_dnd_schedule")
            .select("*")
            .eq("user_id", profile.user_id)
            .maybeSingle();

          if (dnd?.dnd_enabled) {
            const nowHour = now.getHours();
            const nowMin = now.getMinutes();
            const [startH, startM] = dnd.dnd_start_time.split(":").map(Number);
            const [endH, endM] = dnd.dnd_end_time.split(":").map(Number);
            const nowMins = nowHour * 60 + nowMin;
            const startMins = startH * 60 + startM;
            const endMins = endH * 60 + endM;

            const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][now.getDay()];
            if ((dnd.dnd_days || []).includes(dayName)) {
              if (startMins < endMins) {
                if (nowMins >= startMins && nowMins < endMins) continue;
              } else {
                if (nowMins >= startMins || nowMins < endMins) continue;
              }
            }
          }

          await supabase.from("workflow_notifications").insert({
            user_id: profile.user_id,
            title: `Reminder: ${act.subject} in ${r.label}`,
            message: `Your ${act.type} "${act.subject}" starts ${r.label === "24h" ? "tomorrow" : `in ${r.label}`}.`,
            notification_type: "reminder",
            phase: "meeting_reminder",
            link_url: "/activities",
          });
          remindersSent++;
        }
      }
      results.meeting_reminders = remindersSent;
    }

    // === DAILY DIGEST ===
    if (action === "process_all" || action === "daily_digest") {
      // Only run if called with daily_digest action or it's morning (7-9 AM UTC)
      const hour = new Date().getUTCHours();
      if (action === "daily_digest" || (hour >= 7 && hour <= 9)) {
        const { data: users } = await supabase.from("profiles").select("user_id, email, full_name");

        let digestsSent = 0;
        for (const u of users || []) {
          const { data: pref } = await supabase
            .from("notification_preferences")
            .select("email_enabled")
            .eq("user_id", u.user_id)
            .eq("notification_type", "daily_digest")
            .maybeSingle();

          if (pref && !pref.email_enabled) continue;

          const today = new Date().toISOString().split("T")[0];
          const { data: todayActivities } = await supabase
            .from("activities")
            .select("subject, type, start_time")
            .eq("assigned_to", u.user_id)
            .gte("start_time", today)
            .lte("start_time", today + "T23:59:59")
            .order("start_time")
            .limit(10);

          const { data: assignedLeads } = await supabase
            .from("business_partners")
            .select("card_name")
            .eq("card_type", "lead")
            .eq("sales_person_code", u.user_id)
            .limit(5);

          if ((!todayActivities || todayActivities.length === 0) && (!assignedLeads || assignedLeads.length === 0)) continue;

          const actList = (todayActivities || []).map((a: any) => `• ${a.type}: ${a.subject}`).join("\n");
          const leadList = (assignedLeads || []).map((l: any) => `• ${l.card_name}`).join("\n");

          await supabase.from("workflow_notifications").insert({
            user_id: u.user_id,
            title: "Daily Digest",
            message: `Today's activities:\n${actList || "None"}\n\nAssigned leads:\n${leadList || "None"}`,
            notification_type: "digest",
            phase: "daily_digest",
            link_url: "/",
          });
          digestsSent++;
        }
        results.daily_digest = digestsSent;
      }
    }

    // === FOLLOW-UP REMINDERS ===
    if (action === "process_all" || action === "follow_up_reminders") {
      const { data: rules } = await supabase
        .from("email_automation_rules")
        .select("*")
        .eq("trigger_type", "lead_inactive")
        .eq("is_active", true);

      let followUpsSent = 0;
      for (const rule of rules || []) {
        const daysInactive = (rule.trigger_config as any)?.days_inactive || 7;
        const cutoff = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000).toISOString();

        const { data: inactiveLeads } = await supabase
          .from("business_partners")
          .select("id, card_name, card_code, sales_person_code")
          .eq("card_type", "lead")
          .lt("updated_at", cutoff)
          .limit(50);

        for (const lead of inactiveLeads || []) {
          if (!lead.sales_person_code) continue;

          await supabase.from("workflow_notifications").insert({
            user_id: lead.sales_person_code,
            title: `Follow-up: ${lead.card_name}`,
            message: `Lead "${lead.card_name}" hasn't been contacted in ${daysInactive} days.`,
            notification_type: "follow_up",
            phase: "follow_up_reminder",
            link_url: "/leads",
          });

          await supabase.from("email_automation_log").insert({
            rule_id: rule.id,
            recipient_email: lead.sales_person_code,
            recipient_name: lead.card_name,
            status: "sent",
          });
          followUpsSent++;
        }
      }
      results.follow_up_reminders = followUpsSent;
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
