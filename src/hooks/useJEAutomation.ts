import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';

/**
 * Journal Entry Automation — Module 3 / Enhancement #1
 *
 * Wraps the rule engine (`acct_determination_rules`/`_lines`) and
 * posting runs (`acct_posting_runs`/`_run_lines`) into a single hook
 * that supports:
 *   • Listing active rules per document type
 *   • Generating a balanced JE preview from a source document
 *   • Posting the preview → creating a real journal entry
 *   • Reversing a posted run
 *
 * Amount sources (per acct_determination_lines.amount_source):
 *   total | subtotal | tax_amount | discount_amount | balance_due | line_total | formula
 */

export type DocumentType =
  | 'ar_invoice' | 'ar_credit_memo'
  | 'ap_invoice' | 'ap_credit_memo'
  | 'incoming_payment' | 'outgoing_payment'
  | 'goods_receipt' | 'goods_issue'
  | 'inventory_transfer'
  | 'sales_order' | 'purchase_order';

export interface PostingPreviewLine {
  side: 'debit' | 'credit';
  acct_code: string;
  acct_name?: string | null;
  amount: number;
  description?: string | null;
  dimension_1?: string | null;
  dimension_2?: string | null;
  dimension_3?: string | null;
  dimension_4?: string | null;
  line_order: number;
}

export interface PostingPreview {
  ruleId: string | null;
  ruleName: string | null;
  documentType: DocumentType;
  documentId: string;
  documentNumber: string | null;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  lines: PostingPreviewLine[];
  warnings: string[];
}

/** List active rules for a given document type. */
export function useDeterminationRules(documentType?: DocumentType) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['acct-rules', documentType, activeCompanyId],
    enabled: !!documentType,
    queryFn: async () => {
      let q: any = (supabase as any)
        .from('acct_determination_rules')
        .select('*, acct_determination_lines(*)')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      if (documentType) q = q.eq('document_type', documentType);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

/** Read a posting preview/run by id (with lines). */
export function usePostingRun(runId: string | undefined) {
  return useQuery({
    queryKey: ['posting-run', runId],
    enabled: !!runId,
    queryFn: async () => {
      const c = supabase as any;
      const [{ data: run }, { data: lines }] = await Promise.all([
        c.from('acct_posting_runs').select('*').eq('id', runId!).maybeSingle(),
        c.from('acct_posting_run_lines').select('*').eq('run_id', runId!).order('line_order'),
      ]);
      return { run, lines: (lines ?? []) as PostingPreviewLine[] };
    },
  });
}

/** Pull amount from a source document by amount_source key. */
function resolveAmount(doc: any, source: string, formula: string | null): number {
  if (source === 'formula' && formula) {
    // Very small/safe expression: only allows numeric fields and arithmetic.
    try {
      const sandbox = (k: string) => Number(doc?.[k] ?? 0);
      // Replace identifiers like `subtotal`, `total`, etc. with sandbox calls.
      const expr = formula.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (m) => `(${sandbox(m)})`);
      // eslint-disable-next-line no-new-func
      const v = Function(`"use strict"; return (${expr});`)();
      return Number.isFinite(v) ? Number(v) : 0;
    } catch {
      return 0;
    }
  }
  return Number(doc?.[source] ?? 0);
}

const TABLE_FOR_TYPE: Record<DocumentType, string> = {
  ar_invoice: 'ar_invoices',
  ar_credit_memo: 'ar_credit_memos',
  ap_invoice: 'ap_invoices',
  ap_credit_memo: 'ap_credit_memos',
  incoming_payment: 'incoming_payments',
  outgoing_payment: 'outgoing_payments',
  goods_receipt: 'goods_receipts',
  goods_issue: 'inventory_goods_issues',
  inventory_transfer: 'inventory_transfers',
  sales_order: 'sales_orders',
  purchase_order: 'purchase_orders',
};

/** Mutations: preview / post / reverse */
export function useJEAutomation() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const c = supabase as any;

  const previewPosting = useMutation({
    mutationFn: async (input: {
      documentType: DocumentType;
      documentId: string;
      ruleId?: string;
    }): Promise<PostingPreview> => {
      // 1. Find rule (highest priority active, optionally pinned)
      let ruleQ = c.from('acct_determination_rules')
        .select('*, acct_determination_lines(*)')
        .eq('document_type', input.documentType)
        .eq('is_active', true);
      if (input.ruleId) ruleQ = ruleQ.eq('id', input.ruleId);
      if (activeCompanyId) ruleQ = ruleQ.eq('company_id', activeCompanyId);
      const { data: rules } = await ruleQ.order('priority', { ascending: false }).limit(1);
      const rule = (rules ?? [])[0];

      // 2. Load source document
      const table = TABLE_FOR_TYPE[input.documentType];
      const { data: doc, error: docErr } = await c
        .from(table).select('*').eq('id', input.documentId).maybeSingle();
      if (docErr) throw docErr;
      if (!doc) throw new Error(`${input.documentType} not found`);

      const warnings: string[] = [];
      const lines: PostingPreviewLine[] = [];

      if (!rule) {
        warnings.push(`No active determination rule for ${input.documentType}`);
      } else {
        const ruleLines = (rule.acct_determination_lines ?? [])
          .sort((a: any, b: any) => (a.line_order ?? 0) - (b.line_order ?? 0));

        ruleLines.forEach((rl: any, idx: number) => {
          const amount = resolveAmount(doc, rl.amount_source ?? 'total', rl.amount_formula);
          if (!rl.default_acct_code) {
            warnings.push(`Line ${idx + 1} (${rl.account_purpose}) has no account code`);
            return;
          }
          if (Math.abs(amount) < 0.005) return;
          lines.push({
            side: rl.side === 'credit' ? 'credit' : 'debit',
            acct_code: rl.default_acct_code,
            amount: Math.abs(amount),
            description: rl.description_template
              ? interpolateTemplate(rl.description_template, doc)
              : `${input.documentType} ${doc.doc_num ?? doc.invoice_number ?? doc.id}`,
            dimension_1: rl.dimension_1 ?? null,
            dimension_2: rl.dimension_2 ?? null,
            dimension_3: rl.dimension_3 ?? null,
            dimension_4: rl.dimension_4 ?? null,
            line_order: idx + 1,
          });
        });
      }

      const totalDebit = lines.filter(l => l.side === 'debit').reduce((s, l) => s + l.amount, 0);
      const totalCredit = lines.filter(l => l.side === 'credit').reduce((s, l) => s + l.amount, 0);
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && lines.length > 0;
      if (!isBalanced && lines.length > 0) {
        warnings.push(`Out of balance by ${Math.abs(totalDebit - totalCredit).toFixed(2)}`);
      }

      return {
        ruleId: rule?.id ?? null,
        ruleName: rule?.rule_name ?? null,
        documentType: input.documentType,
        documentId: input.documentId,
        documentNumber: doc.doc_num?.toString() ?? doc.invoice_number ?? null,
        totalDebit,
        totalCredit,
        isBalanced,
        lines,
        warnings,
      };
    },
    onError: (e: any) => toast.error(e?.message ?? 'Preview failed'),
  });

  const post = useMutation({
    mutationFn: async (preview: PostingPreview) => {
      if (!preview.isBalanced || preview.lines.length === 0) {
        throw new Error('Cannot post an unbalanced or empty entry');
      }
      // 1. Insert posting run
      const { data: run, error: runErr } = await c
        .from('acct_posting_runs')
        .insert({
          company_id: activeCompanyId ?? null,
          created_by: user?.id ?? null,
          document_id: preview.documentId,
          document_number: preview.documentNumber,
          document_type: preview.documentType,
          rule_id: preview.ruleId,
          status: 'posted',
          total_debit: preview.totalDebit,
          total_credit: preview.totalCredit,
          is_balanced: true,
        })
        .select()
        .single();
      if (runErr) throw runErr;

      // 2. Insert run lines
      const linesPayload = preview.lines.map(l => ({ ...l, run_id: run.id }));
      const { error: linesErr } = await c.from('acct_posting_run_lines').insert(linesPayload);
      if (linesErr) {
        await c.from('acct_posting_runs').delete().eq('id', run.id);
        throw linesErr;
      }
      return run;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posting-run'] });
      toast.success('Journal entry posted');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Posting failed'),
  });

  const reverse = useMutation({
    mutationFn: async (runId: string) => {
      // Load original
      const [{ data: origRun }, { data: origLines }] = await Promise.all([
        c.from('acct_posting_runs').select('*').eq('id', runId).maybeSingle(),
        c.from('acct_posting_run_lines').select('*').eq('run_id', runId).order('line_order'),
      ]);
      if (!origRun) throw new Error('Original run not found');

      // Insert mirror
      const { data: revRun, error: revErr } = await c.from('acct_posting_runs').insert({
        company_id: origRun.company_id,
        created_by: user?.id ?? null,
        document_id: origRun.document_id,
        document_number: origRun.document_number,
        document_type: origRun.document_type,
        rule_id: origRun.rule_id,
        status: 'reversed',
        total_debit: origRun.total_credit,
        total_credit: origRun.total_debit,
        is_balanced: true,
        reversed_by_run_id: runId,
      }).select().single();
      if (revErr) throw revErr;

      const flipped = (origLines ?? []).map((l: any, i: number) => ({
        run_id: revRun.id,
        line_order: i + 1,
        side: l.side === 'debit' ? 'credit' : 'debit',
        acct_code: l.acct_code,
        acct_name: l.acct_name,
        amount: l.amount,
        description: `Reversal: ${l.description ?? ''}`,
        dimension_1: l.dimension_1, dimension_2: l.dimension_2,
        dimension_3: l.dimension_3, dimension_4: l.dimension_4,
      }));
      await c.from('acct_posting_run_lines').insert(flipped);

      // Mark original as reversed
      await c.from('acct_posting_runs')
        .update({ status: 'reversed', reversed_by_run_id: revRun.id })
        .eq('id', runId);

      return revRun;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posting-run'] });
      toast.success('Journal entry reversed');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Reversal failed'),
  });

  return { previewPosting, post, reverse };
}

function interpolateTemplate(tpl: string, doc: any): string {
  return tpl.replace(/\{(\w+)\}/g, (_, key) => String(doc?.[key] ?? ''));
}
