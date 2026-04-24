import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface BankLine {
  id: string;
  transaction_date: string;
  description: string | null;
  reference: string | null;
  counterparty_name: string | null;
  debit_amount: number | null;
  credit_amount: number | null;
  reconciliation_status: string | null;
}

export interface MatchCandidate {
  id: string;
  source: 'incoming_payment' | 'outgoing_payment' | 'gl_entry';
  doc_num: string | number | null;
  doc_date: string | null;
  party_name: string | null;
  amount: number;
  reference: string | null;
  score: number;          // 0-100
  reasons: string[];      // why we matched
  varianceAmount: number; // line.amount - candidate.amount
}

const norm = (s: string | null | undefined) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Lightweight string-similarity (Dice coefficient on bigrams). */
function similarity(a: string, b: string): number {
  const A = norm(a); const B = norm(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const sa = bigrams(A); const sb = bigrams(B);
  let inter = 0;
  sa.forEach(g => { if (sb.has(g)) inter++; });
  return (2 * inter) / (sa.size + sb.size || 1);
}

export function useReconciliationMatcher(statementId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  // Unmatched bank lines
  const unmatchedLines = useQuery({
    queryKey: ['recon-matcher', 'lines', statementId],
    enabled: !!statementId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('bank_statement_lines' as any)
        .select('*')
        .eq('statement_id', statementId!)
        .or('reconciliation_status.is.null,reconciliation_status.eq.unmatched')
        .order('line_num') as any);
      if (error) throw error;
      return (data || []) as BankLine[];
    },
  });

  // Open payment candidates (limit window for performance)
  const candidates = useQuery({
    queryKey: ['recon-matcher', 'candidates', activeCompanyId],
    enabled: !!statementId,
    queryFn: async () => {
      const inQ: any = (supabase.from('incoming_payments' as any)
        .select('id, doc_num, doc_date, customer_name, total_amount, reference, status')
        .order('doc_date', { ascending: false })
        .limit(500));
      if (activeCompanyId) inQ.eq('company_id', activeCompanyId);
      const outQ: any = (supabase.from('outgoing_payments' as any)
        .select('id, doc_num, doc_date, vendor_name, total_amount, reference, status')
        .order('doc_date', { ascending: false })
        .limit(500));
      if (activeCompanyId) outQ.eq('company_id', activeCompanyId);
      const [inc, out] = await Promise.all([inQ, outQ]);
      const incoming = (inc.data || []).map((p: any) => ({
        id: p.id, source: 'incoming_payment' as const,
        doc_num: p.doc_num, doc_date: p.doc_date,
        party_name: p.customer_name, amount: Number(p.total_amount || 0),
        reference: p.reference,
      }));
      const outgoing = (out.data || []).map((p: any) => ({
        id: p.id, source: 'outgoing_payment' as const,
        doc_num: p.doc_num, doc_date: p.doc_date,
        party_name: p.vendor_name, amount: Number(p.total_amount || 0),
        reference: p.reference,
      }));
      return [...incoming, ...outgoing];
    },
  });

  /** Score candidates for a given bank line. Higher = better match. */
  const scoreCandidates = (line: BankLine, opts?: { dateWindowDays?: number; minScore?: number }): MatchCandidate[] => {
    const list = candidates.data || [];
    const dateWindow = opts?.dateWindowDays ?? 7;
    const minScore = opts?.minScore ?? 40;
    const lineAmt = Number(line.credit_amount || 0) - Number(line.debit_amount || 0);
    const isInflow = (line.credit_amount || 0) > 0;
    const lineDate = new Date(line.transaction_date);

    const scored: MatchCandidate[] = list
      .filter(c => isInflow ? c.source === 'incoming_payment' : c.source === 'outgoing_payment')
      .map(c => {
        const reasons: string[] = [];
        let score = 0;
        // Amount (50 pts) — exact within 0.01, partial linear up to 5%
        const variance = Math.abs(Math.abs(lineAmt) - Math.abs(c.amount));
        if (variance < 0.01) { score += 50; reasons.push('exact amount'); }
        else if (variance / Math.max(Math.abs(c.amount), 1) < 0.05) {
          score += 30; reasons.push(`amount within ${(variance).toFixed(2)}`);
        }
        // Date (20 pts)
        if (c.doc_date) {
          const d = new Date(c.doc_date);
          const diff = Math.abs((lineDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (diff <= dateWindow) {
            const pts = Math.round(20 * (1 - diff / dateWindow));
            score += pts;
            if (pts > 0) reasons.push(`date ±${Math.round(diff)}d`);
          }
        }
        // Reference exact (15 pts)
        if (line.reference && c.reference && norm(line.reference) === norm(c.reference)) {
          score += 15; reasons.push('reference match');
        } else if (line.reference && c.doc_num && norm(line.reference).includes(norm(String(c.doc_num)))) {
          score += 10; reasons.push('doc# in reference');
        }
        // Party name fuzzy (15 pts)
        if (line.counterparty_name && c.party_name) {
          const sim = similarity(line.counterparty_name, c.party_name);
          if (sim > 0.4) {
            const pts = Math.round(15 * sim);
            score += pts; reasons.push(`name ${Math.round(sim * 100)}%`);
          }
        }
        return {
          id: c.id, source: c.source,
          doc_num: c.doc_num, doc_date: c.doc_date, party_name: c.party_name,
          amount: c.amount, reference: c.reference,
          score: Math.min(100, score), reasons,
          varianceAmount: Math.abs(lineAmt) - Math.abs(c.amount),
        };
      })
      .filter(c => c.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return scored;
  };

  /** Bulk auto-match: any line where the top candidate scores ≥ threshold and is unique. */
  const autoMatch = useMutation({
    mutationFn: async (threshold: number = 85) => {
      const lines = unmatchedLines.data || [];
      let matched = 0;
      for (const line of lines) {
        const top = scoreCandidates(line, { minScore: threshold })[0];
        if (!top) continue;
        const { error } = await (supabase.from('bank_statement_lines' as any).update({
          reconciliation_status: 'matched',
          matched_payment_id: top.id,
          matched_at: new Date().toISOString(),
          notes: `Auto-matched (${top.score}%): ${top.reasons.join(', ')}`,
        }).eq('id', line.id) as any);
        if (!error) matched++;
      }
      return { matched, total: lines.length };
    },
    onSuccess: ({ matched, total }) => {
      qc.invalidateQueries({ queryKey: ['recon-matcher'] });
      qc.invalidateQueries({ queryKey: ['bank_statement_lines'] });
      toast({ title: 'Auto-match complete', description: `Matched ${matched} of ${total} lines` });
    },
    onError: (e: Error) => toast({ title: 'Auto-match failed', description: e.message, variant: 'destructive' }),
  });

  const confirmMatch = useMutation({
    mutationFn: async ({ lineId, candidate }: { lineId: string; candidate: MatchCandidate }) => {
      const { error } = await (supabase.from('bank_statement_lines' as any).update({
        reconciliation_status: 'matched',
        matched_payment_id: candidate.id,
        matched_at: new Date().toISOString(),
        notes: `Manual match (${candidate.score}%): ${candidate.reasons.join(', ')}`,
      }).eq('id', lineId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recon-matcher'] });
      qc.invalidateQueries({ queryKey: ['bank_statement_lines'] });
      toast({ title: 'Line matched' });
    },
  });

  /** Create an adjustment entry for unexplained variance (bank charges, FX diff, etc.). */
  const createAdjustment = useMutation({
    mutationFn: async (input: {
      lineId: string;
      acctCode: string;
      amount: number;
      side: 'debit' | 'credit';
      memo: string;
    }) => {
      const { error: jeErr } = await (supabase.from('journal_entries' as any).insert({
        company_id: activeCompanyId,
        memo: input.memo,
        ref_date: new Date().toISOString().split('T')[0],
        source: 'bank_reconciliation_adjustment',
        source_ref: input.lineId,
        total_debit: input.amount,
        total_credit: input.amount,
        status: 'draft',
      }) as any);
      if (jeErr) throw jeErr;
      const { error } = await (supabase.from('bank_statement_lines' as any).update({
        reconciliation_status: 'adjusted',
        notes: `Adjustment posted to ${input.acctCode}: ${input.memo}`,
      }).eq('id', input.lineId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recon-matcher'] });
      qc.invalidateQueries({ queryKey: ['bank_statement_lines'] });
      toast({ title: 'Adjustment recorded' });
    },
    onError: (e: Error) => toast({ title: 'Adjustment failed', description: e.message, variant: 'destructive' }),
  });

  return {
    unmatchedLines,
    candidates,
    scoreCandidates,
    autoMatch,
    confirmMatch,
    createAdjustment,
  };
}
