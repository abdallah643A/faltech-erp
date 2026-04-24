import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  documentType: "ar_invoice" | "sales_order" | "quote";
  documentId: string;
  documentNumber: string;
  customerName: string;
  recipientPhone: string;
  message: string;
  sapDocEntry: string;
  total: number;
  pdfBase64?: string;
  pdfStoragePath?: string; // Storage path for uploaded PDF
}

// Send via 360dialog API
async function sendVia360Dialog(
  apiKey: string,
  phone: string,
  message: string,
  pdfBase64: string | null,
  filename: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const formattedPhone = phone.replace("+", "");

  let whatsappPayload: any;

  if (pdfBase64) {
    // Upload media first
    const mediaUploadResponse = await fetch(
      `https://waba.360dialog.io/v1/media`,
      {
        method: "POST",
        headers: {
          "D360-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          type: "document",
          document: {
            link: `data:application/pdf;base64,${pdfBase64}`,
            filename: filename,
          },
        }),
      }
    );

    if (mediaUploadResponse.ok) {
      const mediaData = await mediaUploadResponse.json();
      whatsappPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "document",
        document: {
          id: mediaData.id,
          caption: message,
          filename: filename,
        },
      };
    } else {
      // Fallback to text only
      whatsappPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { body: message },
      };
    }
  } else {
    whatsappPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "text",
      text: { body: message },
    };
  }

  const response = await fetch(`https://waba.360dialog.io/v1/messages`, {
    method: "POST",
    headers: {
      "D360-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(whatsappPayload),
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, error: result.error?.message || "Failed to send via 360dialog" };
  }

  return { success: true, messageId: result.messages?.[0]?.id };
}

// Send via Green API
async function sendViaGreenAPI(
  instanceId: string,
  apiKey: string,
  phone: string,
  message: string,
  pdfBase64: string | null,
  filename: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Format phone for Green API (remove + and add @c.us for individual chats)
  const formattedPhone = phone.replace(/[^0-9]/g, "") + "@c.us";
  const normalizedMessage = (message || "").normalize("NFC");

  let messageId = "";

  // If we have PDF, send it as a file with caption (message included)
  if (pdfBase64) {
    try {
      // Decode base64 to binary
      const binaryStr = atob(pdfBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });

      // Use sendFileByUpload with FormData (binary upload)
      const formData = new FormData();
      formData.append("chatId", formattedPhone);
      formData.append("file", blob, filename);
      formData.append("fileName", filename);

      const fileResponse = await fetch(
        `https://api.green-api.com/waInstance${instanceId}/sendFileByUpload/${apiKey}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const fileResultText = await fileResponse.text();
      console.log("Green API sendFileByUpload response:", fileResponse.status, fileResultText);

      if (fileResponse.ok) {
        const fileResult = fileResultText ? JSON.parse(fileResultText) : {};
        messageId = fileResult.idMessage;

        // Send Arabic/Unicode message as a separate JSON text message to avoid caption encoding issues
        if (normalizedMessage.trim()) {
          const captionAsTextResponse = await fetch(
            `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatId: formattedPhone,
                message: normalizedMessage,
              }),
            }
          );

          if (captionAsTextResponse.ok) {
            const captionAsTextResult = await captionAsTextResponse.json();
            return { success: true, messageId: captionAsTextResult.idMessage || messageId };
          }

          const captionError = await captionAsTextResponse.text();
          console.warn("Green API text-after-file failed:", captionError);
        }

        return { success: true, messageId };
      } else {
        console.warn("Green API sendFileByUpload failed:", fileResultText);
        // Fall back to text-only message
      }
    } catch (fileError) {
      console.warn("Error sending file via Green API:", fileError);
      // Fall back to text-only message
    }
  }

  // Send text message (either as fallback or if no PDF)
  const sendMessageUrl = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiKey}`;
  console.log("Green API sendMessage URL:", sendMessageUrl.replace(apiKey, "***"));
  console.log("Green API sendMessage payload:", JSON.stringify({ chatId: formattedPhone, message: normalizedMessage.substring(0, 50) + "..." }));

  const textResponse = await fetch(sendMessageUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId: formattedPhone,
      message: normalizedMessage,
    }),
  });

  const textResponseText = await textResponse.text();
  console.log("Green API sendMessage response:", textResponse.status, textResponseText);

  if (!textResponse.ok) {
    let errorMsg = textResponseText || `Green API returned status ${textResponse.status} with empty body`;
    try {
      const error = JSON.parse(textResponseText);
      errorMsg = error.message || error.stateMessage || JSON.stringify(error);
    } catch { /* use raw text */ }
    return { success: false, error: errorMsg };
  }

  const textResult = textResponseText ? JSON.parse(textResponseText) : {};
  messageId = textResult.idMessage;

  return { success: true, messageId };
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client to verify user
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for DB operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check user role
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "manager", "sales_rep"]);

    if (!roleData || roleData.length === 0) {
      throw new Error("Insufficient permissions");
    }

    // Get request body
    const body: RequestBody = await req.json();
    const { documentType, documentId, documentNumber, customerName, recipientPhone, message, sapDocEntry, total, pdfBase64: providedPdf, pdfStoragePath } = body;

    // Validate required fields
    if (!documentType || !documentId || !recipientPhone || !message) {
      throw new Error("Missing required fields");
    }

    // Get WhatsApp config
    const { data: configData, error: configError } = await serviceClient
      .from("whatsapp_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (configError || !configData) {
      throw new Error("WhatsApp is not configured or inactive");
    }

    const apiProvider = configData.api_provider || "360dialog";
    let pdfBase64: string | null = providedPdf || null;

    // If PDF uploaded to storage, download it
    if (!pdfBase64 && pdfStoragePath) {
      try {
        const { data: fileData, error: dlError } = await serviceClient.storage
          .from("project-documents")
          .download(pdfStoragePath);
        if (!dlError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          pdfBase64 = btoa(binary);
        }
      } catch (storageErr) {
        console.warn("Could not download PDF from storage:", storageErr);
      }
    }

    // If PDF not provided, fetch from SAP
    if (!pdfBase64) {
      let sapUrl = Deno.env.get("SAP_B1_SERVICE_LAYER_URL");
      const sapUsername = Deno.env.get("SAP_B1_USERNAME");
      const sapPassword = Deno.env.get("SAP_B1_PASSWORD");
      const sapCompanyDb = Deno.env.get("SAP_B1_COMPANY_DB");

      if (sapUrl && sapUsername && sapPassword && sapCompanyDb) {
        // Normalize SAP URL - ensure it ends with /b1s/v1
        sapUrl = sapUrl.replace(/\/+$/, ''); // Remove trailing slashes
        if (!sapUrl.endsWith('/b1s/v1')) {
          sapUrl = sapUrl + '/b1s/v1';
        }
        
        try {
          const loginResponse = await fetch(`${sapUrl}/Login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              UserName: sapUsername,
              Password: sapPassword,
              CompanyDB: sapCompanyDb,
            }),
          });

          if (loginResponse.ok) {
            const cookies = loginResponse.headers.get("set-cookie");

            const sapObjectTypes: Record<string, { entity: string; layoutCode: string }> = {
              ar_invoice: { entity: "Invoices", layoutCode: "INV1" },
              sales_order: { entity: "Orders", layoutCode: "ORDR" },
              quote: { entity: "Quotations", layoutCode: "OQUT" },
            };

            const { entity, layoutCode } = sapObjectTypes[documentType];

            const pdfResponse = await fetch(
              `${sapUrl}/${entity}(${sapDocEntry})/Print`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Cookie: cookies || "",
                },
                body: JSON.stringify({
                  LayoutCode: layoutCode,
                  OutputType: "PDF",
                }),
              }
            );

            if (pdfResponse.ok) {
              const pdfBuffer = await pdfResponse.arrayBuffer();
              pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
            }

            await fetch(`${sapUrl}/Logout`, {
              method: "POST",
              headers: { Cookie: cookies || "" },
            });
          }
        } catch (sapError) {
          console.warn("Could not fetch PDF from SAP:", sapError);
        }
      }
    }

    const filename = `${documentType === 'ar_invoice' ? 'Invoice' : documentType === 'sales_order' ? 'SalesOrder' : 'Quote'}_${documentNumber}.pdf`;

    let sendResult: { success: boolean; messageId?: string; error?: string };

    if (apiProvider === "greenapi") {
      // Use Green API - read API key from secrets, not database
      const instanceId = configData.instance_id;
      const apiKey = Deno.env.get("WHATSAPP_GREENAPI_API_KEY");

      if (!instanceId) {
        throw new Error("Green API instance ID not configured");
      }
      if (!apiKey) {
        throw new Error("Green API key not configured in secrets. Please set WHATSAPP_GREENAPI_API_KEY.");
      }

      sendResult = await sendViaGreenAPI(instanceId, apiKey, recipientPhone, message, pdfBase64, filename);
    } else {
      // Use 360dialog - read API key from secrets, not database
      const apiKey = Deno.env.get("WHATSAPP_360DIALOG_API_KEY");
      if (!apiKey) {
        throw new Error("360dialog API key not configured in secrets. Please set WHATSAPP_360DIALOG_API_KEY.");
      }
      sendResult = await sendVia360Dialog(apiKey, recipientPhone, message, pdfBase64, filename);
    }

    if (!sendResult.success) {
      throw new Error(sendResult.error || "Failed to send WhatsApp message");
    }

    // Log the message
    await serviceClient.from("whatsapp_logs").insert({
      document_type: documentType,
      document_id: documentId,
      document_number: documentNumber,
      recipient_phone: recipientPhone,
      recipient_name: customerName,
      message_text: message,
      status: "sent",
      whatsapp_message_id: sendResult.messageId,
      sent_at: new Date().toISOString(),
      created_by: user.id,
    });

    // Cleanup temp PDF from storage
    if (pdfStoragePath) {
      await serviceClient.storage.from("project-documents").remove([pdfStoragePath]);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: sendResult.messageId,
        provider: apiProvider,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending WhatsApp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
