/**
 * Typed accessors for the accounting-foundation tables added in the
 * 2026-04-19 governance migration. The single `as any` cast is
 * isolated here so call sites stay typed against
 * `src/types/accounting-contracts.ts`.
 */
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untyped = supabase as any;

export const acctTables = {
  periods:            () => untyped.from('acct_periods'),
  closeChecklist:     () => untyped.from('acct_period_close_checklist'),
  numberingSeries:    () => untyped.from('acct_numbering_series'),
  recurringTemplates: () => untyped.from('acct_recurring_je_templates'),
  recurringLines:     () => untyped.from('acct_recurring_je_lines'),
  intercompanyLinks:  () => untyped.from('acct_intercompany_links'),
  eliminations:       () => untyped.from('acct_consolidation_eliminations'),
  postingLog:         () => untyped.from('acct_posting_log'),
};

export const acctRpc = {
  allocNextNumber:     (seriesId: string) =>
    untyped.rpc('acct_alloc_next_number', { p_series_id: seriesId }),
  mirrorIntercompany:  (originJeId: string, partnerCompanyId: string, notes?: string) =>
    untyped.rpc('acct_mirror_intercompany_je', {
      p_origin_je_id: originJeId,
      p_partner_company_id: partnerCompanyId,
      p_notes: notes ?? null,
    }),
  runRecurring:        (templateId: string) =>
    untyped.rpc('acct_run_recurring_je', { p_template_id: templateId }),
  runDueRecurring:     () => untyped.rpc('acct_run_due_recurring_jes'),
};
