// Bank statement parser: MT940, CAMT.053 (XML), CSV
// Computes dedupe hash per line and inserts into bank_statement_raw_lines.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ParsedLine {
  line_number: number;
  value_date: string;
  posting_date?: string;
  amount: number;
  direction: "debit" | "credit";
  currency: string;
  bank_reference?: string;
  customer_reference?: string;
  counterparty_name?: string;
  counterparty_account?: string;
  description?: string;
  transaction_code?: string;
  raw_data?: Record<string, unknown>;
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseCSV(content: string, currency = "SAR"): ParsedLine[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (k: string) => headers.findIndex((h) => h.includes(k));
  const iDate = idx("date");
  const iAmt = idx("amount");
  const iDesc = idx("desc");
  const iRef = idx("ref");
  const iParty = idx("counter") >= 0 ? idx("counter") : idx("party");

  const out: ParsedLine[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 2) continue;
    const amt = parseFloat(cols[iAmt] || "0");
    if (isNaN(amt) || amt === 0) continue;
    out.push({
      line_number: i,
      value_date: new Date(cols[iDate]).toISOString().slice(0, 10),
      amount: Math.abs(amt),
      direction: amt < 0 ? "debit" : "credit",
      currency,
      description: iDesc >= 0 ? cols[iDesc]?.trim() : undefined,
      bank_reference: iRef >= 0 ? cols[iRef]?.trim() : undefined,
      counterparty_name: iParty >= 0 ? cols[iParty]?.trim() : undefined,
      raw_data: { row: cols },
    });
  }
  return out;
}

function parseMT940(content: string): ParsedLine[] {
  // Simplified MT940: :61: lines = transactions, :86: = description
  const out: ParsedLine[] = [];
  const blocks = content.split(/:61:/).slice(1);
  blocks.forEach((blk, i) => {
    const tx = blk.split(/:86:/);
    const head = tx[0].trim();
    const desc = tx[1]?.split(/:6[12]:/)[0]?.trim();
    // Format: YYMMDD[MMDD]C/D[R]amount...
    const m = head.match(/^(\d{6})(\d{4})?([CD])R?([\d,]+)/);
    if (!m) return;
    const yy = parseInt(m[1].slice(0, 2));
    const year = (yy >= 70 ? 1900 : 2000) + yy;
    const date = `${year}-${m[1].slice(2, 4)}-${m[1].slice(4, 6)}`;
    const dir = m[3] === "D" ? "debit" : "credit";
    const amt = parseFloat(m[4].replace(",", "."));
    out.push({
      line_number: i + 1,
      value_date: date,
      amount: amt,
      direction: dir,
      currency: "SAR",
      description: desc,
      raw_data: { mt940_block: head },
    });
  });
  return out;
}

function parseCAMT053(xml: string): ParsedLine[] {
  // Minimal CAMT.053 parser: extract <Ntry> blocks
  const out: ParsedLine[] = [];
  const entries = xml.split(/<Ntry>/i).slice(1);
  entries.forEach((entry, i) => {
    const block = entry.split(/<\/Ntry>/i)[0];
    const amt = block.match(/<Amt[^>]*Ccy="([^"]+)"[^>]*>([\d.]+)<\/Amt>/i);
    const cdt = block.match(/<CdtDbtInd>(CRDT|DBIT)<\/CdtDbtInd>/i);
    const date = block.match(/<ValDt><Dt>([\d-]+)<\/Dt>/i) ||
      block.match(/<BookgDt><Dt>([\d-]+)<\/Dt>/i);
    const desc = block.match(/<AddtlNtryInf>([^<]+)<\/AddtlNtryInf>/i);
    const ref = block.match(/<EndToEndId>([^<]+)<\/EndToEndId>/i);
    if (!amt || !cdt || !date) return;
    out.push({
      line_number: i + 1,
      value_date: date[1],
      amount: parseFloat(amt[2]),
      currency: amt[1],
      direction: cdt[1] === "DBIT" ? "debit" : "credit",
      description: desc?.[1]?.trim(),
      customer_reference: ref?.[1]?.trim(),
      raw_data: {},
    });
  });
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const {
      file_name,
      file_format,
      content,
      bank_account_id,
      company_id,
      currency = "SAR",
      statement_date,
    } = body;

    if (!file_name || !file_format || !content) {
      return new Response(
        JSON.stringify({ error: "file_name, file_format, content required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create import record
    const { data: imp, error: impErr } = await supabase
      .from("bank_statement_imports")
      .insert({
        file_name,
        file_format,
        bank_account_id,
        company_id,
        currency,
        statement_date,
        status: "parsing",
      })
      .select()
      .single();
    if (impErr) throw impErr;

    let parsed: ParsedLine[] = [];
    try {
      if (file_format === "csv" || file_format === "xlsx") {
        parsed = parseCSV(content, currency);
      } else if (file_format === "mt940") {
        parsed = parseMT940(content);
      } else if (file_format === "camt053") {
        parsed = parseCAMT053(content);
      } else {
        throw new Error(`Unsupported format: ${file_format}`);
      }
    } catch (e) {
      await supabase
        .from("bank_statement_imports")
        .update({ status: "failed", error_message: String(e) })
        .eq("id", imp.id);
      throw e;
    }

    // Compute dedupe hash & detect duplicates
    let duplicateCount = 0;
    const rows = await Promise.all(parsed.map(async (l) => {
      const hashInput = [
        bank_account_id ?? "",
        l.value_date,
        l.amount.toFixed(2),
        l.direction,
        l.bank_reference ?? l.customer_reference ?? l.description ?? "",
      ].join("|");
      const dedupe_hash = await sha256(hashInput);
      return { ...l, dedupe_hash, import_id: imp.id, bank_account_id };
    }));

    // Check existing hashes
    if (bank_account_id) {
      const hashes = rows.map((r) => r.dedupe_hash);
      const { data: existing } = await supabase
        .from("bank_statement_raw_lines")
        .select("dedupe_hash")
        .eq("bank_account_id", bank_account_id)
        .in("dedupe_hash", hashes);
      const existingSet = new Set((existing ?? []).map((r: any) => r.dedupe_hash));
      rows.forEach((r) => {
        if (existingSet.has(r.dedupe_hash)) {
          (r as any).is_duplicate = true;
          duplicateCount++;
        }
      });
    }

    // Insert
    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from("bank_statement_raw_lines")
        .insert(rows);
      if (insErr) throw insErr;
    }

    await supabase
      .from("bank_statement_imports")
      .update({
        status: "parsed",
        total_lines: rows.length,
        duplicate_lines: duplicateCount,
      })
      .eq("id", imp.id);

    return new Response(
      JSON.stringify({
        import_id: imp.id,
        total: rows.length,
        duplicates: duplicateCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("parser error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
