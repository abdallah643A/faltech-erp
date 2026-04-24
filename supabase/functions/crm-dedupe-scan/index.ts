import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const minScore: number = Number(body.min_score ?? 0.6);
    const limit: number = Math.min(Number(body.limit ?? 500), 2000);

    // Pull recent partners only (cap for performance)
    const { data: partners, error: pErr } = await supabase
      .from("business_partners")
      .select("id, card_name, email, phone, mobile, tax_id, company_id, merged_into_partner_id")
      .is("merged_into_partner_id", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (pErr) throw pErr;

    const norm = (s?: string | null) => (s ?? "").toLowerCase().replace(/\s+/g, "").trim();
    const phoneNorm = (p?: string | null) => (p ?? "").replace(/[^\d]/g, "").slice(-10);

    const candidates: any[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < (partners?.length ?? 0); i++) {
      for (let j = i + 1; j < (partners?.length ?? 0); j++) {
        const a = partners![i];
        const b = partners![j];
        const signals: Record<string, unknown> = {};
        let score = 0;

        if (a.email && b.email && norm(a.email) === norm(b.email)) {
          score += 0.6; signals.email = "exact";
        }
        const aPhone = phoneNorm(a.phone) || phoneNorm(a.mobile);
        const bPhone = phoneNorm(b.phone) || phoneNorm(b.mobile);
        if (aPhone && bPhone && aPhone === bPhone) {
          score += 0.5; signals.phone = "exact";
        }
        if (a.tax_id && b.tax_id && norm(a.tax_id) === norm(b.tax_id)) {
          score += 0.7; signals.tax_id = "exact";
        }
        // Fuzzy name similarity (cheap Levenshtein-like)
        if (a.card_name && b.card_name) {
          const an = norm(a.card_name), bn = norm(b.card_name);
          if (an && bn) {
            const longer = an.length >= bn.length ? an : bn;
            const shorter = an.length < bn.length ? an : bn;
            const inc = shorter && longer.includes(shorter) ? 0.3 : 0;
            score += inc;
            if (inc) signals.name = "substring";
          }
        }
        if (score >= minScore) {
          const key = [a.id, b.id].sort().join(":");
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push({
            company_id: a.company_id ?? b.company_id ?? null,
            master_partner_id: a.id,
            duplicate_partner_id: b.id,
            score: Math.min(1, score) * 100,
            match_signals: signals,
          });
        }
      }
    }

    // Upsert (ignore duplicates)
    let inserted = 0;
    if (candidates.length) {
      const { data, error } = await supabase
        .from("crm_dedupe_candidates")
        .upsert(candidates, { onConflict: "master_partner_id,duplicate_partner_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      inserted = data?.length ?? 0;
    }

    return new Response(
      JSON.stringify({ scanned: partners?.length ?? 0, candidates_found: candidates.length, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
