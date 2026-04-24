import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { signoffId, customerPhone, appUrl } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get signoff with questionnaire token
    const { data: signoff, error: signoffErr } = await supabase
      .from("project_signoffs")
      .select("id, questionnaire_token, customer_name, contract_number")
      .eq("id", signoffId)
      .single();

    if (signoffErr || !signoff) throw new Error("Sign-off not found");

    const questionnaireUrl = `${appUrl}/questionnaire?token=${signoff.questionnaire_token}`;

    // Get WhatsApp config
    const { data: config } = await supabase
      .from("whatsapp_config")
      .select("*")
      .limit(1)
      .single();

    if (!config?.is_active) {
      return new Response(JSON.stringify({ questionnaireUrl, sent: false, message: "WhatsApp not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone
    let phone = customerPhone.replace(/[\s\-\(\)]/g, "");
    if (phone.startsWith("0")) phone = "+966" + phone.substring(1);
    if (!phone.startsWith("+")) phone = "+" + phone;

    const message = `Dear ${signoff.customer_name || "Customer"},\n\nWe hope you are satisfied with our services${signoff.contract_number ? ` for contract ${signoff.contract_number}` : ""}.\n\nPlease take a moment to share your feedback by completing our satisfaction questionnaire:\n${questionnaireUrl}\n\nThank you for your valuable feedback!`;

    // Send via WhatsApp
    const apiKey = Deno.env.get("WHATSAPP_API_KEY") || config.api_key;
    const provider = config.provider || "360dialog";

    if (provider === "green_api") {
      const instanceId = Deno.env.get("GREEN_API_INSTANCE_ID") || config.instance_id;
      const apiToken = Deno.env.get("GREEN_API_TOKEN") || apiKey;
      await fetch(`https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: phone.replace("+", "") + "@c.us", message }),
      });
    } else {
      await fetch("https://waba.360dialog.io/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "D-360-API-KEY": apiKey },
        body: JSON.stringify({ to: phone.replace("+", ""), type: "text", text: { body: message } }),
      });
    }

    // Log
    await supabase.from("whatsapp_messages").insert({
      recipient_phone: phone,
      message_text: message,
      document_type: "questionnaire",
      document_id: signoffId,
      status: "sent",
    });

    return new Response(JSON.stringify({ questionnaireUrl, sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
