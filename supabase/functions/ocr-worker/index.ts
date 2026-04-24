// OCR worker — async background processor.
// Picks up queued ecm_ocr_jobs, downloads file from storage, calls Lovable AI
// (Gemini vision) for OCR + key field extraction, writes results back.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const MODEL = "google/gemini-2.5-flash";
const BATCH_SIZE = 5;

async function processJob(supabase: any, job: any) {
  const startedAt = Date.now();
  await supabase
    .from("ecm_ocr_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      attempts: (job.attempts ?? 0) + 1,
      model_used: MODEL,
    })
    .eq("id", job.id);

  try {
    // Try common buckets where uploads land
    let signed: string | null = null;
    for (const bucket of ["ecm-documents", "attachments", "correspondence"]) {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(job.file_path, 600);
      if (data?.signedUrl) {
        signed = data.signedUrl;
        break;
      }
    }
    if (!signed) throw new Error(`File not found in known buckets: ${job.file_path}`);

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are an OCR + document extraction engine. Extract the full readable text and key business fields (e.g. document_number, date, amount, vendor, customer, reference). Detect language. Respond ONLY by calling the extract function.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract text and key fields from this document." },
              { type: "image_url", image_url: { url: signed } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract",
              description: "Return OCR text + structured fields",
              parameters: {
                type: "object",
                properties: {
                  ocr_text: { type: "string" },
                  language: { type: "string" },
                  confidence: { type: "number" },
                  page_count: { type: "number" },
                  fields: {
                    type: "object",
                    additionalProperties: { type: "string" },
                  },
                },
                required: ["ocr_text", "language"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`AI gateway ${aiResp.status}: ${t.slice(0, 300)}`);
    }
    const aiData = await aiResp.json();
    const args =
      aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
    const parsed = typeof args === "string" ? JSON.parse(args) : args;

    await supabase
      .from("ecm_ocr_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        ocr_text: parsed.ocr_text ?? null,
        extracted_fields: parsed.fields ?? {},
        language_detected: parsed.language ?? null,
        confidence_score: parsed.confidence ?? null,
        page_count: parsed.page_count ?? null,
        processing_time_ms: Date.now() - startedAt,
      })
      .eq("id", job.id);

    return { id: job.id, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const failed = (job.attempts ?? 0) + 1 >= (job.max_attempts ?? 3);
    await supabase
      .from("ecm_ocr_jobs")
      .update({
        status: failed ? "failed" : "queued",
        error_message: msg,
        processing_time_ms: Date.now() - startedAt,
      })
      .eq("id", job.id);
    return { id: job.id, ok: false, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: jobs, error } = await supabase
      .from("ecm_ocr_jobs")
      .select("*")
      .eq("status", "queued")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);
    if (error) throw error;

    const results = [];
    for (const job of jobs ?? []) {
      results.push(await processJob(supabase, job));
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
