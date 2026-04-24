import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  documentType: "ar_invoice" | "sales_order" | "quote";
  sapDocEntry: string;
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

    // Auth client to verify user
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get request body
    const body: RequestBody = await req.json();
    const { documentType, sapDocEntry } = body;

    if (!documentType || !sapDocEntry) {
      throw new Error("Missing required fields: documentType, sapDocEntry");
    }

    // Get SAP credentials
    let sapUrl = Deno.env.get("SAP_B1_SERVICE_LAYER_URL");
    const sapUsername = Deno.env.get("SAP_B1_USERNAME");
    const sapPassword = Deno.env.get("SAP_B1_PASSWORD");
    const sapCompanyDb = Deno.env.get("SAP_B1_COMPANY_DB");

    if (!sapUrl || !sapUsername || !sapPassword || !sapCompanyDb) {
      throw new Error("SAP credentials not configured");
    }
    
    // Normalize SAP URL - ensure it ends with /b1s/v1 (not duplicated)
    sapUrl = sapUrl.replace(/\/+$/, ''); // Remove trailing slashes
    if (!sapUrl.endsWith('/b1s/v1')) {
      sapUrl = sapUrl + '/b1s/v1';
    }

    // Login to SAP
    console.log("Attempting SAP login to:", `${sapUrl}/Login`);
    
    let loginResponse;
    try {
      loginResponse = await fetch(`${sapUrl}/Login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          UserName: sapUsername,
          Password: sapPassword,
          CompanyDB: sapCompanyDb,
        }),
      });
    } catch (fetchError: any) {
      console.error("SAP connection error:", fetchError.message);
      throw new Error(`Cannot connect to SAP: ${fetchError.message}`);
    }

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error("SAP login failed:", loginResponse.status, errorText);
      throw new Error(`SAP authentication failed (${loginResponse.status}): ${errorText}`);
    }

    const cookies = loginResponse.headers.get("set-cookie");

    // SAP Document entities
    const sapObjectTypes: Record<string, { entity: string; objectType: number }> = {
      ar_invoice: { entity: "Invoices", objectType: 13 },
      sales_order: { entity: "Orders", objectType: 17 },
      quote: { entity: "Quotations", objectType: 23 },
    };

    const { entity, objectType } = sapObjectTypes[documentType];

    // Try different methods to get PDF
    let pdfBase64: string | null = null;
    let pdfError: string | null = null;

    // Method 1: Try using PDF export from sap.print service (SAP B1 10.0+)
    const printUrl = `${sapUrl}/sap.print.service/Pdf.xsjs`;
    console.log("Trying PDF generation via:", printUrl);
    
    try {
      const pdfResponse = await fetch(printUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies || "",
        },
        body: JSON.stringify({
          ObjectType: objectType,
          DocEntry: parseInt(sapDocEntry),
        }),
      });

      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer();
        if (pdfBuffer.byteLength > 0) {
          pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
        }
      } else {
        pdfError = await pdfResponse.text();
        console.log("PDF service not available:", pdfError);
      }
    } catch (err: any) {
      console.log("PDF service error:", err.message);
      pdfError = err.message;
    }

    // Method 2: Try using ReportLayoutsService (if Method 1 failed)
    if (!pdfBase64) {
      const reportUrl = `${sapUrl}/ReportLayoutsService_ExportToPdf`;
      console.log("Trying ReportLayoutsService:", reportUrl);
      
      try {
        const reportResponse = await fetch(reportUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookies || "",
          },
          body: JSON.stringify({
            ReportParams: {
              ObjectId: objectType.toString(),
              ObjectKey: sapDocEntry,
            }
          }),
        });

        if (reportResponse.ok) {
          const pdfBuffer = await reportResponse.arrayBuffer();
          if (pdfBuffer.byteLength > 0) {
            pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
          }
        } else {
          const errorText = await reportResponse.text();
          console.log("ReportLayoutsService not available:", errorText);
          pdfError = pdfError || errorText;
        }
      } catch (err: any) {
        console.log("ReportLayoutsService error:", err.message);
      }
    }

    // Logout from SAP
    try {
      await fetch(`${sapUrl}/Logout`, {
        method: "POST",
        headers: { Cookie: cookies || "" },
      });
    } catch (e) {
      console.log("Logout error (ignored):", e);
    }

    if (!pdfBase64) {
      // PDF not available - provide a helpful error message
      throw new Error(
        `PDF generation is not available on your SAP server. ` +
        `This feature requires Crystal Reports integration or SAP Print Service to be configured. ` +
        `Please contact your SAP administrator to enable PDF export via Service Layer. ` +
        `Technical details: ${pdfError || "No PDF service endpoint responded"}`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        pdfBase64,
        contentType: "application/pdf",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error fetching PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
