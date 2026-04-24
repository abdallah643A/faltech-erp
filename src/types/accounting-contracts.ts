/**
 * Typed contracts for the accounting-foundation tables.
 * Mirrors the columns created in the 2026-04-19 migration.
 */

export type AcctPeriodStatus = 'open' | 'soft_closed' | 'closed';

export interface AcctPeriod {
  id: string;
  company_id: string | null;
  fiscal_year: number;
  period_number: number;
  period_name: string;
  start_date: string;
  end_date: string;
  status: AcctPeriodStatus;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CloseChecklistStatus =
  | 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

export interface AcctCloseChecklistItem {
  id: string;
  period_id: string;
  category: string;
  task_title: string;
  task_title_ar: string | null;
  description: string | null;
  owner_id: string | null;
  owner_name: string | null;
  due_date: string | null;
  status: CloseChecklistStatus;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AcctNumberingSeries {
  id: string;
  company_id: string | null;
  doc_type: string;
  series_name: string;
  prefix: string | null;
  suffix: string | null;
  next_number: number;
  first_number: number;
  last_number: number | null;
  pad_length: number;
  is_default: boolean;
  is_locked: boolean;
  is_active: boolean;
  fiscal_year: number | null;
  created_at: string;
  updated_at: string;
}

export type RecurringFrequency =
  | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly';

export interface AcctRecurringTemplate {
  id: string;
  company_id: string | null;
  template_name: string;
  description: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  last_run_date: string | null;
  last_run_je_id: string | null;
  is_active: boolean;
  auto_post: boolean;
  total_runs: number;
  max_runs: number | null;
  reference_template: string | null;
  memo: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcctRecurringLine {
  id: string;
  template_id: string;
  line_num: number;
  account_code: string;
  account_name: string | null;
  debit_amount: number;
  credit_amount: number;
  cost_center: string | null;
  project_code: string | null;
  dimension_1: string | null;
  dimension_2: string | null;
  dimension_3: string | null;
  description: string | null;
  created_at: string;
}

export type IcLinkType = 'auto_mirror' | 'manual' | 'allocation';
export type IcLinkStatus = 'active' | 'reversed' | 'reconciled';

export interface AcctIntercompanyLink {
  id: string;
  origin_je_id: string;
  origin_company_id: string;
  mirror_je_id: string | null;
  mirror_company_id: string;
  total_amount: number;
  currency: string;
  link_type: IcLinkType;
  status: IcLinkStatus;
  reconciled_at: string | null;
  reconciled_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EliminationType =
  | 'ic_revenue' | 'ic_cogs' | 'ic_ar_ap' | 'ic_loan' | 'investment' | 'other';

export interface AcctElimination {
  id: string;
  consolidation_run_id: string | null;
  fiscal_year: number;
  period_number: number | null;
  elimination_type: EliminationType;
  description: string | null;
  origin_company_id: string | null;
  partner_company_id: string | null;
  account_code: string;
  debit_amount: number;
  credit_amount: number;
  source_link_id: string | null;
  created_by: string | null;
  created_at: string;
}

export type PostingLogAction =
  | 'post' | 'reverse' | 'period_lock' | 'period_unlock'
  | 'period_close' | 'period_reopen' | 'recurring_run' | 'intercompany_mirror';

export interface AcctPostingLogEntry {
  id: string;
  company_id: string | null;
  je_id: string | null;
  doc_number: string | null;
  action: PostingLogAction;
  posting_date: string | null;
  total_debit: number | null;
  total_credit: number | null;
  is_balanced: boolean | null;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_at: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
}
