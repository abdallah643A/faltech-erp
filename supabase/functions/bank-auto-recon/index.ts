// Auto-reconciliation: rules + fuzzy + Lovable AI confidence
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = a.toLowerCase().trim();
  const B = b.toLowerCase().trim();
  if (A === B) return 100;
  const maxLen = Math.max(A.length, B.length);
  return Math.round((1 - levenshtein(A, B) / maxLen) * 100);
}

interface Candidate {
  raw_line_id: string;
  ledger_doc_type: string;
  ledger_doc_id: string;
  ledger_doc_number: string;
  ledger_amount: number;
  ledger_date: string;
  ledger_party: string;
  match_source: string;
  confidence_score: number;
  rationale: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const { import_id, bank_account_id, company_id } = await req.json();
    if (!import_id) {
      return new Response(JSON.stringify({ error: "import_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const t0 = Date.now();
    const { data: run } = await supabase.from("bank_auto_recon_runs").insert({
      import_id, bank_account_id, company_id, status: "running",
    }).select().single();

    // Fetch unmatched lines
    const { data: lines, error: linesErr } = await supabase
      .from("bank_statement_raw_lines")
      .select("*")
      .eq("import_id", import_id)
      .eq("match_status", "unmatched")
      .eq("is_duplicate", false);
    if (linesErr) throw linesErr;

    // Fetch candidate ledger entries (open AR + AP invoices, +/- 30 days)
    const dates = (lines ?? []).map((l: any) => l.value_date).sort();
    const minD = dates[0], maxD = dates[dates.length - 1];
    const lookback = new Date(new Date(minD).getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const lookahead = new Date(new Date(maxD).getTime() + 30 * 86400000).toISOString().slice(0, 10);

    const { data: arInv } = await supabase
      .from("ar_invoices")
      .select("id, invoice_number, total, doc_date, customer_name, balance_due")
      .gte("doc_date", lookback).lte("doc_date", lookahead)
      .gt("balance_due", 0);
    const { data: apInv } = await supabase
      .from("ap_invoices")
      .select("id, invoice_number, total, doc_date, vendor_name, status")
      .gte("doc_date", lookback).lte("doc_date", lookahead)
      .eq("status", "open");

    const ledger = [
      ...(arInv ?? []).map((i: any) => ({
        type: "ar_invoice", id: i.id, number: i.invoice_number,
        amount: i.balance_due ?? i.total, date: i.doc_date, party: i.customer_name,
      })),
      ...(apInv ?? []).map((i: any) => ({
        type: "ap_invoice", id: i.id, number: i.invoice_number,
        amount: i.total, date: i.doc_date, party: i.vendor_name,
      })),
    ];

    const candidates: Candidate[] = [];
    let ruleCount = 0, fuzzyCount = 0, aiCount = 0;

    for (const line of lines ?? []) {
      const ranked: Candidate[] = [];
      for (const led of ledger) {
        const amtMatch = Math.abs(Number(led.amount) - Number(line.amount)) < 0.01;
        const dateDiff = Math.abs(new Date(led.date).getTime() - new Date(line.value_date).getTime()) / 86400000;
        const refMatch = line.bank_reference && led.number &&
          (line.bank_reference.includes(led.number) || (line.description ?? "").includes(led.number));
        const partySim = similarity(line.counterparty_name ?? line.description ?? "", led.party ?? "");

        let score = 0, source = "fuzzy", rationale = "";
        if (amtMatch && refMatch) {
          score = 99; source = "rule_exact";
          rationale = `Exact amount + reference match (${led.number})`;
          ruleCount++;
        } else if (amtMatch && dateDiff <= 3) {
          score = 85 + (3 - dateDiff) * 2; source = "rule_amount_date";
          rationale = `Amount match, date within ${Math.round(dateDiff)} days`;
          ruleCount++;
        } else if (amtMatch && partySim > 60) {
          score = 60 + partySim * 0.3; source = "fuzzy";
          rationale = `Amount match + party similarity ${partySim}%`;
          fuzzyCount++;
        } else if (Math.abs(Number(led.amount) - Number(line.amount)) / Number(line.amount) < 0.02 && partySim > 70) {
          score = 50 + partySim * 0.2; source = "fuzzy";
          rationale = `Near-amount + party ${partySim}%`;
          fuzzyCount++;
        } else continue;

        ranked.push({
          raw_line_id: line.id,
          ledger_doc_type: led.type, ledger_doc_id: led.id,
          ledger_doc_number: led.number, ledger_amount: Number(led.amount),
          ledger_date: led.date, ledger_party: led.party,
          match_source: source, confidence_score: Math.min(99, Math.round(score)),
          rationale,
        });
      }
      ranked.sort((a, b) => b.confidence_score - a.confidence_score);

      // For ambiguous cases (top score 60-80, multiple close), call AI
      if (LOVABLE_API_KEY && ranked.length > 1 && ranked[0].confidence_score < 85 &&
          ranked[0].confidence_score - (ranked[1]?.confidence_score ?? 0) < 10) {
        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "You score bank reconciliation matches. Return JSON only." },
                {
                  role: "user",
                  content: `Bank line: amount=${line.amount} ${line.direction} date=${line.value_date} party="${line.counterparty_name ?? ""}" desc="${line.description ?? ""}" ref="${line.bank_reference ?? ""}"

Top candidates:
${ranked.slice(0, 3).map((c, i) => `${i + 1}. ${c.ledger_doc_type} ${c.ledger_doc_number} amt=${c.ledger_amount} date=${c.ledger_date} party="${c.ledger_party}"`).join("\n")}

Return {"best_index":0|1|2,"confidence":0-100,"reason":"..."}`,
                },
              ],
              response_format: { type: "json_object" },
            }),
          });
          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const content = aiData.choices?.[0]?.message?.content;
            if (content) {
              const parsed = JSON.parse(content);
              const idx = parsed.best_index ?? 0;
              if (ranked[idx]) {
                ranked[idx].confidence_score = Math.min(99, parsed.confidence ?? ranked[idx].confidence_score);
                ranked[idx].match_source = "ai";
                ranked[idx].rationale = `AI: ${parsed.reason}`;
                aiCount++;
              }
            }
          }
        } catch (e) {
          console.error("AI scoring failed:", e);
        }
      }

      candidates.push(...ranked.slice(0, 3));
      if (ranked.length > 0) {
        await supabase.from("bank_statement_raw_lines")
          .update({ match_status: "suggested" })
          .eq("id", line.id);
      }
    }

    if (candidates.length > 0) {
      await supabase.from("bank_match_candidates").insert(candidates);
    }

    // Create exceptions for lines with no candidates
    const matchedLineIds = new Set(candidates.map((c) => c.raw_line_id));
    const unresolved = (lines ?? []).filter((l: any) => !matchedLineIds.has(l.id));
    if (unresolved.length > 0) {
      await supabase.from("bank_exceptions").insert(unresolved.map((l: any) => ({
        company_id, raw_line_id: l.id,
        exception_type: "unmatched", severity: "medium",
        description: `No ledger match for ${l.amount} ${l.currency} on ${l.value_date}`,
      })));
      await supabase.from("bank_statement_raw_lines")
        .update({ match_status: "exception" })
        .in("id", unresolved.map((l: any) => l.id));
    }

    await supabase.from("bank_auto_recon_runs").update({
      total_lines: lines?.length ?? 0,
      rule_matched: ruleCount,
      fuzzy_matched: fuzzyCount,
      ai_suggested: aiCount,
      unresolved: unresolved.length,
      duration_ms: Date.now() - t0,
      status: "completed",
    }).eq("id", run!.id);

    return new Response(JSON.stringify({
      run_id: run!.id,
      total: lines?.length ?? 0,
      candidates: candidates.length,
      rule_matched: ruleCount,
      fuzzy_matched: fuzzyCount,
      ai_suggested: aiCount,
      unresolved: unresolved.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("auto-recon error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
