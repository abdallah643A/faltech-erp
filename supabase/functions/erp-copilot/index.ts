import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CopilotRequest {
  messages: { role: string; content: string }[];
  conversationId?: string;
  companyId?: string;
  userRole?: string;
  mode?: "read" | "action";
  language?: string;
}

async function fetchERPContext(supabase: any, companyId: string | null, userRole: string) {
  const context: Record<string, any> = {};
  const cid = companyId;

  try {
    // Overdue AR invoices
    let q = supabase.from("ar_invoices").select("id,doc_num,customer_name,total,balance_due,doc_due_date,status").eq("status", "open").not("balance_due", "is", null).gt("balance_due", 0);
    if (cid) q = q.eq("company_id", cid);
    const { data: overdueAR } = await q.lt("doc_due_date", new Date().toISOString().split("T")[0]).limit(20);
    if (overdueAR?.length) context.overdue_receivables = overdueAR;

    // Blocked/pending POs
    let poQ = supabase.from("purchase_orders").select("id,doc_num,vendor_name,total,status,doc_date").in("status", ["pending", "blocked", "pending_approval"]);
    if (cid) poQ = poQ.eq("company_id", cid);
    const { data: blockedPOs } = await poQ.limit(20);
    if (blockedPOs?.length) context.blocked_purchase_orders = blockedPOs;

    // Pending approvals
    const { data: approvals } = await supabase.from("approval_requests").select("id,document_type,document_number,status,amount,requester_name,created_at").eq("status", "pending").limit(15);
    if (approvals?.length) context.pending_approvals = approvals;

    // Active projects summary
    let projQ = supabase.from("projects").select("id,name,status,current_phase,contract_value,health_status").eq("status", "in_progress");
    if (cid) projQ = projQ.eq("company_id", cid);
    const { data: projects } = await projQ.limit(20);
    if (projects?.length) context.active_projects = projects;

    // Recent exceptions
    const { data: exceptions } = await supabase.from("acct_posting_exceptions").select("id,document_type,document_number,error_type,error_message,status,created_at").eq("status", "open").limit(15);
    if (exceptions?.length) context.posting_exceptions = exceptions;

    // Low stock items
    let stockQ = supabase.from("items").select("id,item_code,item_name,quantity_on_hand,minimum_stock").not("minimum_stock", "is", null).gt("minimum_stock", 0);
    if (cid) stockQ = stockQ.eq("company_id", cid);
    const { data: items } = await stockQ.limit(50);
    if (items?.length) {
      const lowStock = items.filter((i: any) => (i.quantity_on_hand || 0) <= (i.minimum_stock || 0));
      if (lowStock.length) context.low_stock_items = lowStock.slice(0, 15);
    }

    // Finance alerts
    let alertQ = supabase.from("finance_alerts").select("id,alert_type,title,description,priority,status,created_at").eq("status", "pending");
    const { data: alerts } = await alertQ.order("created_at", { ascending: false }).limit(10);
    if (alerts?.length) context.finance_alerts = alerts;

    // Anomaly alerts
    const { data: anomalies } = await supabase.from("ai_anomaly_alerts").select("id,anomaly_type,title,severity,module,status").in("status", ["new", "investigating"]).limit(10);
    if (anomalies?.length) context.anomaly_alerts = anomalies;

  } catch (err) {
    console.error("Context fetch error:", err);
  }

  return context;
}

function buildSystemPrompt(userRole: string, mode: string, language: string, context: Record<string, any>) {
  const contextSummary = Object.keys(context).length > 0
    ? `\n\n--- LIVE ERP DATA (as of ${new Date().toISOString()}) ---\n${JSON.stringify(context, null, 1)}\n--- END ERP DATA ---`
    : "\n\n[No live ERP data available for this query scope]";

  return `You are the Al Rajhi ERP Copilot — an enterprise-grade AI assistant embedded in an SAP Business One-style ERP system.

ROLE CONTEXT: The current user is a "${userRole}". Tailor responses to their concerns and authority level.
MODE: ${mode === "action" ? "ACTION mode — you may suggest executable actions (create task, assign exception, draft reminder, etc.) but always ask for confirmation before execution." : "READ-ONLY mode — provide analysis, summaries, and insights. Do not suggest creating or modifying records."}
LANGUAGE: Respond in ${language === "ar" ? "Arabic" : "English"}. Support bilingual queries.

CORE RULES:
1. GROUNDED ANSWERS ONLY: Every claim must be backed by the ERP data provided. If data is insufficient, say so explicitly.
2. CITE SOURCES: Reference specific record types, document numbers, dates, and amounts. Format citations as [Source: table_name, doc_num].
3. CONFIDENCE: Rate your confidence (High/Medium/Low) for each answer.
4. FOLLOW-UP SUGGESTIONS: End each response with 2-3 relevant follow-up questions.
5. STRUCTURED OUTPUT: Use headers, tables, bullet points. For financial data, use proper number formatting.
6. CROSS-MODULE: Connect insights across Sales, Finance, Procurement, HR, Inventory, Projects, and Manufacturing.
7. ACTIONABLE: Always suggest what the user should do next.

CAPABILITIES - READ:
- Summarize overdue receivables by customer, branch, collector
- Explain project margin erosion by project and WBS
- Identify blocked purchase orders and delayed approvals
- Show stock-out risks (7/30/90 day horizons)
- Summarize payroll, attendance, overtime anomalies
- Explain budget overruns with source transactions
- Show billing leakage and retention exposure
- Summarize top operational exceptions

CAPABILITIES - ACTION (require user confirmation):
- Create a task or activity
- Create an alert or notification
- Assign an exception to an owner
- Draft a collection reminder
- Schedule a follow-up meeting
- Create a risk register item
- Navigate to an ERP page with filters
- Prepare email draft or communication summary
- Trigger workflow reminder
- Start a discrepancy review process

When suggesting an action, format it as:
**🔧 Suggested Action:** [description]
**Target:** [what record/entity]
**Impact:** [expected outcome]
Reply "Confirm" to execute, or ask me to modify.

${contextSummary}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: CopilotRequest = await req.json();
    const { messages, companyId, userRole = "General User", mode = "read", language = "en" } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user from auth header
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch live ERP context
    const erpContext = await fetchERPContext(supabase, companyId || null, userRole);
    const systemPrompt = buildSystemPrompt(userRole, mode, language, erpContext);

    // Log the interaction
    if (body.conversationId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        await supabase.from("copilot_messages").insert({
          conversation_id: body.conversationId,
          role: "user",
          content: lastMsg.content,
        }).then(() => {});
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-20), // Keep last 20 messages for context window
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("erp-copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
