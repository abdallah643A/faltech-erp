import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify 360dialog webhook signature using HMAC SHA-256
async function verify360DialogSignature(
  bodyText: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expectedSig = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(bodyText)
    );

    const expectedHex =
      "sha256=" +
      Array.from(new Uint8Array(expectedSig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedHex.length) return false;
    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expectedHex.charCodeAt(i);
    }
    return mismatch === 0;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Handle webhook verification (GET request)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      // Verify the token matches our configured verify token
      const expectedVerifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
      if (mode === "subscribe") {
        if (expectedVerifyToken && token !== expectedVerifyToken) {
          console.warn("Webhook verification failed: token mismatch");
          return new Response("Forbidden", { status: 403 });
        }
        console.log("Webhook verified");
        return new Response(challenge, { status: 200 });
      }

      return new Response("Forbidden", { status: 403 });
    }

    // Handle webhook events (POST request)
    // Read body as text first for signature verification
    const bodyText = await req.text();

    // --- Signature Verification ---
    const dialog360Secret = Deno.env.get("WHATSAPP_360DIALOG_WEBHOOK_SECRET");
    const greenApiToken = Deno.env.get("WHATSAPP_GREENAPI_WEBHOOK_TOKEN");
    const hubSignature = req.headers.get("X-Hub-Signature-256");

    let verified = false;

    if (hubSignature && dialog360Secret) {
      // 360dialog sends X-Hub-Signature-256 header
      verified = await verify360DialogSignature(bodyText, hubSignature, dialog360Secret);
      if (!verified) {
        console.warn("360dialog webhook signature verification failed");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (!dialog360Secret && !greenApiToken) {
      // No secrets configured - log warning but allow (backward compatibility during setup)
      console.warn(
        "No webhook verification secrets configured. Set WHATSAPP_360DIALOG_WEBHOOK_SECRET or WHATSAPP_GREENAPI_WEBHOOK_TOKEN for security."
      );
      verified = true; // Allow during initial setup
    }

    const body = JSON.parse(bodyText);

    // For Green API, verify webhookToken if configured
    if (!verified && greenApiToken && body.instanceData) {
      // Green API sends a stateInstance or webhookToken
      if (body.webhookToken && body.webhookToken === greenApiToken) {
        verified = true;
      } else if (!body.webhookToken) {
        // Some Green API versions don't send webhookToken, fall back to instance check
        console.warn("Green API webhook received without webhookToken");
        verified = true; // Allow if token field is absent (backward compat)
      } else {
        console.warn("Green API webhook token verification failed");
        return new Response(
          JSON.stringify({ error: "Invalid webhook token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If we still haven't verified and secrets ARE configured, reject
    if (!verified && (dialog360Secret || greenApiToken)) {
      console.warn("Webhook request could not be verified");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Webhook received:", JSON.stringify(body).slice(0, 500));

    // Process status updates from 360dialog or Green API
    if (body.statuses) {
      // 360dialog format
      for (const status of body.statuses) {
        const messageId = status.id;
        const statusValue = status.status; // sent, delivered, read, failed

        const updateData: Record<string, any> = {
          status: statusValue,
        };

        if (statusValue === "delivered") {
          updateData.delivered_at = new Date().toISOString();
        } else if (statusValue === "read") {
          updateData.read_at = new Date().toISOString();
        } else if (statusValue === "failed") {
          updateData.failed_at = new Date().toISOString();
          if (status.errors && status.errors.length > 0) {
            updateData.error_message = status.errors[0].message || status.errors[0].title;
          }
        }

        await serviceClient
          .from("whatsapp_logs")
          .update(updateData)
          .eq("whatsapp_message_id", messageId);

        console.log(`Updated message ${messageId} status to ${statusValue}`);
      }
    } else if (body.typeWebhook && body.instanceData) {
      // Green API format
      const typeWebhook = body.typeWebhook;

      if (typeWebhook === "outgoingMessageStatus") {
        const messageId = body.idMessage;
        const statusValue = body.status; // sent, delivered, read, failed

        const updateData: Record<string, any> = {
          status: statusValue,
        };

        if (statusValue === "delivered") {
          updateData.delivered_at = new Date().toISOString();
        } else if (statusValue === "read") {
          updateData.read_at = new Date().toISOString();
        } else if (statusValue === "failed") {
          updateData.failed_at = new Date().toISOString();
        }

        await serviceClient
          .from("whatsapp_logs")
          .update(updateData)
          .eq("whatsapp_message_id", messageId);

        console.log(`Updated Green API message ${messageId} status to ${statusValue}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
