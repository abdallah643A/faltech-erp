// OCR extraction via Lovable AI Gateway (Gemini multimodal)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OcrRequest {
  capture_id?: string;
  file_url: string;
  document_type: string;
  file_name?: string;
  company_id?: string;
}

const FIELD_PROFILES: Record<string, { name: string; label: string }[]> = {
  ap_invoice: [
    { name: "vendor_name", label: "Vendor Name" },
    { name: "invoice_number", label: "Invoice Number" },
    { name: "invoice_date", label: "Invoice Date" },
    { name: "due_date", label: "Due Date" },
    { name: "subtotal", label: "Subtotal" },
    { name: "tax_amount", label: "Tax / VAT Amount" },
    { name: "total_amount", label: "Total Amount" },
    { name: "currency", label: "Currency" },
    { name: "vat_number", label: "Vendor VAT Number" },
  ],
  receipt: [
    { name: "merchant", label: "Merchant" },
    { name: "date", label: "Date" },
    { name: "total_amount", label: "Total Amount" },
    { name: "tax_amount", label: "Tax Amount" },
    { name: "currency", label: "Currency" },
  ],
  contract: [
    { name: "party_a", label: "Party A" },
    { name: "party_b", label: "Party B" },
    { name: "contract_number", label: "Contract Number" },
    { name: "start_date", label: "Start Date" },
    { name: "end_date", label: "End Date" },
    { name: "value", label: "Contract Value" },
  ],
  general: [
    { name: "title", label: "Document Title" },
    { name: "date", label: "Document Date" },
    { name: "reference", label: "Reference" },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = (await req.json()) as OcrRequest;
    if (!body.file_url) throw new Error("file_url required");

    const profile = FIELD_PROFILES[body.document_type] ?? FIELD_PROFILES.general;

    // Create capture record if not provided
    let captureId = body.capture_id;
    if (!captureId) {
      const { data: rec, error } = await supabase
        .from("ocr_capture_records")
        .insert({
          company_id: body.company_id ?? null,
          document_type: body.document_type,
          file_url: body.file_url,
          file_name: body.file_name ?? "document",
          status: "processing",
        })
        .select("id")
        .single();
      if (error) throw error;
      captureId = rec.id;
    }

    // Build extraction tool schema
    const properties: Record<string, unknown> = {};
    profile.forEach((f) => {
      properties[f.name] = {
        type: "object",
        properties: {
          value: { type: "string", description: `Extracted ${f.label}, empty string if not present` },
          confidence: { type: "number", description: "0..1 confidence" },
        },
        required: ["value", "confidence"],
        additionalProperties: false,
      };
    });

    const tool = {
      type: "function",
      function: {
        name: "extract_fields",
        description: `Extract fields from a ${body.document_type} document image.`,
        parameters: {
          type: "object",
          properties: { fields: { type: "object", properties, required: profile.map((f) => f.name) } },
          required: ["fields"],
          additionalProperties: false,
        },
      },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an expert OCR extraction engine for business documents. Extract the requested fields exactly as they appear. If a field is not present, return an empty string with confidence 0.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Extract fields from this ${body.document_type}.` },
              { type: "image_url", image_url: { url: body.file_url } },
            ],
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "extract_fields" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      await supabase
        .from("ocr_capture_records")
        .update({ status: "failed" })
        .eq("id", captureId);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI error ${aiResp.status}: ${txt}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { fields: {} };
    const fields = args.fields ?? {};

    // Persist extracted fields
    const fieldRows = profile.map((f) => {
      const v = fields[f.name] ?? { value: "", confidence: 0 };
      return {
        capture_id: captureId,
        field_name: f.name,
        field_label: f.label,
        extracted_value: String(v.value ?? ""),
        confidence: Number(v.confidence ?? 0),
        needs_review: Number(v.confidence ?? 0) < 0.85,
      };
    });

    await supabase.from("ocr_extracted_fields").delete().eq("capture_id", captureId);
    if (fieldRows.length) await supabase.from("ocr_extracted_fields").insert(fieldRows);

    const overall =
      fieldRows.reduce((s, r) => s + r.confidence, 0) / Math.max(fieldRows.length, 1);
    const status = overall >= 0.85 ? "extracted" : "needs_review";

    await supabase
      .from("ocr_capture_records")
      .update({ status, overall_confidence: overall, updated_at: new Date().toISOString() })
      .eq("id", captureId);

    return new Response(
      JSON.stringify({ capture_id: captureId, status, overall_confidence: overall, fields: fieldRows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ocr-extract error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
