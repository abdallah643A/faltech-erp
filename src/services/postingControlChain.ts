/**
 * Pre-Posting Validation Chain
 * Validates all prerequisites before a finance-impacting document can be posted.
 * Implements SAP B1-style posting controls.
 */

import { supabase } from '@/integrations/supabase/client';
import { newTables } from '@/integrations/supabase/new-tables';
import type { PostingPeriod } from '@/types/data-contracts';
import { getPostingControlRules, getFinanceEffectFlags, requiresApproval } from './documentFinanceEngine';
import { checkBudgetAvailability, type BudgetControlMode } from './commitmentEngine';

// ===== Types =====

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface PostingValidation {
  id: string;
  check: string;
  severity: ValidationSeverity;
  passed: boolean;
  message: string;
  details?: string;
  action_required?: string;
  link?: string;
}

export interface PostingValidationResult {
  can_post: boolean;
  validations: PostingValidation[];
  errors: PostingValidation[];
  warnings: PostingValidation[];
  infos: PostingValidation[];
}

export interface PostingContext {
  document_type: string;
  document_id?: string;
  document_number?: string;
  posting_date: string;
  document_date: string;
  amount: number;
  currency: string;
  company_id?: string;
  branch_id?: string;
  project_id?: string;
  cost_center?: string;
  dimensions?: Record<string, string>;
  tax_code?: string;
  base_document_type?: string;
  base_document_id?: string;
  approval_status?: string;
  created_by?: string;
}

// ===== Validation Functions =====

/**
 * Check if posting period is open for the given date and company.
 */
async function validatePostingPeriod(ctx: PostingContext): Promise<PostingValidation> {
  const period = ctx.posting_date.substring(0, 7); // YYYY-MM

  try {
    const { data } = await newTables
      .postingPeriods()
      .select('id, period_name, status')
      .eq('period_name', period)
      .maybeSingle();

    if (!data) {
      return {
        id: 'period_check', check: 'Posting Period', severity: 'warning', passed: true,
        message: `No period record found for ${period}. Posting allowed by default.`,
      };
    }

    const periodData = data as Pick<PostingPeriod, 'id' | 'period_name' | 'status'>;
    if (periodData.status === 'closed' || periodData.status === 'locked') {
      return {
        id: 'period_check', check: 'Posting Period', severity: 'error', passed: false,
        message: `Posting period ${period} is ${periodData.status}. Cannot post to a closed period.`,
        action_required: 'Reopen the period or change the posting date.',
        link: '/posting-periods',
      };
    }

    return {
      id: 'period_check', check: 'Posting Period', severity: 'info', passed: true,
      message: `Posting period ${period} is open.`,
    };
  } catch {
    return {
      id: 'period_check', check: 'Posting Period', severity: 'info', passed: true,
      message: 'Period check skipped (table not configured).',
    };
  }
}

/**
 * Check if branch is active.
 */
async function validateBranch(ctx: PostingContext): Promise<PostingValidation> {
  if (!ctx.branch_id) {
    return {
      id: 'branch_check', check: 'Branch', severity: 'warning', passed: true,
      message: 'No branch specified. Using company default.',
    };
  }

  try {
    const { data } = await supabase
      .from('branches')
      .select('id, name, is_active')
      .eq('id', ctx.branch_id)
      .single();

    if (!data) {
      return {
        id: 'branch_check', check: 'Branch', severity: 'error', passed: false,
        message: 'Branch not found.',
      };
    }

    if (!(data as any).is_active) {
      return {
        id: 'branch_check', check: 'Branch', severity: 'error', passed: false,
        message: `Branch "${(data as any).name}" is inactive. Cannot post to an inactive branch.`,
        action_required: 'Activate the branch or select a different branch.',
      };
    }

    return {
      id: 'branch_check', check: 'Branch', severity: 'info', passed: true,
      message: `Branch "${(data as any).name}" is active.`,
    };
  } catch {
    return {
      id: 'branch_check', check: 'Branch', severity: 'info', passed: true,
      message: 'Branch validation skipped.',
    };
  }
}

/**
 * Check if account determination exists for this document type.
 */
async function validateAccountDetermination(ctx: PostingContext): Promise<PostingValidation> {
  try {
    let query = supabase
      .from('acct_determination_rules' as any)
      .select('id, rule_name')
      .eq('document_type', ctx.document_type)
      .eq('is_active', true)
      .limit(1);

    if (ctx.company_id) {
      query = query.or(`company_id.eq.${ctx.company_id},company_id.is.null`);
    }

    const { data } = await query;

    if (!data || data.length === 0) {
      // Check GL defaults as fallback
      const { data: defaults } = await supabase
        .from('gl_account_defaults' as any)
        .select('id')
        .limit(1);

      if (!defaults || defaults.length === 0) {
        return {
          id: 'acct_det_check', check: 'Account Determination', severity: 'error', passed: false,
          message: `No account determination rules found for "${ctx.document_type}".`,
          action_required: 'Configure account determination rules in G/L Account Determination settings.',
          link: '/accounting-determination',
        };
      }

      return {
        id: 'acct_det_check', check: 'Account Determination', severity: 'info', passed: true,
        message: 'Using default G/L account determination.',
      };
    }

    return {
      id: 'acct_det_check', check: 'Account Determination', severity: 'info', passed: true,
      message: `Account determination rule found: ${(data as any[])[0].rule_name}`,
    };
  } catch {
    return {
      id: 'acct_det_check', check: 'Account Determination', severity: 'warning', passed: true,
      message: 'Account determination check skipped.',
    };
  }
}

/**
 * Check exchange rate for foreign currency transactions.
 */
async function validateExchangeRate(ctx: PostingContext): Promise<PostingValidation> {
  if (!ctx.currency || ctx.currency === 'SAR') {
    return {
      id: 'fx_check', check: 'Exchange Rate', severity: 'info', passed: true,
      message: 'Local currency transaction. No exchange rate required.',
    };
  }

  try {
    const { data } = await supabase
      .from('exchange_rates' as any)
      .select('rate')
      .eq('from_currency', ctx.currency)
      .eq('to_currency', 'SAR')
      .order('effective_date', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return {
        id: 'fx_check', check: 'Exchange Rate', severity: 'error', passed: false,
        message: `No exchange rate found for ${ctx.currency} → SAR.`,
        action_required: 'Configure exchange rate in Administration > Exchange Rates.',
        link: '/exchange-rates',
      };
    }

    return {
      id: 'fx_check', check: 'Exchange Rate', severity: 'info', passed: true,
      message: `Exchange rate for ${ctx.currency}: ${(data as any[])[0].rate}`,
    };
  } catch {
    return {
      id: 'fx_check', check: 'Exchange Rate', severity: 'warning', passed: true,
      message: 'Exchange rate check skipped.',
    };
  }
}

/**
 * Check budget availability if required.
 */
async function validateBudget(ctx: PostingContext): Promise<PostingValidation> {
  if (!ctx.project_id) {
    return {
      id: 'budget_check', check: 'Budget', severity: 'info', passed: true,
      message: 'No project linked. Budget check not applicable.',
    };
  }

  try {
    const result = await checkBudgetAvailability(ctx.project_id, ctx.amount, {
      companyId: ctx.company_id,
      controlMode: 'warning' as BudgetControlMode,
    });

    return {
      id: 'budget_check', check: 'Budget Availability', severity: result.allowed ? 'info' : 'warning',
      passed: result.allowed,
      message: result.message,
      details: `Budget: ${result.position.revised_budget.toFixed(2)} | Committed: ${result.position.committed.toFixed(2)} | Actual: ${result.position.actual.toFixed(2)} | Available: ${result.position.available.toFixed(2)}`,
    };
  } catch {
    return {
      id: 'budget_check', check: 'Budget', severity: 'info', passed: true,
      message: 'Budget check skipped (no budget data).',
    };
  }
}

/**
 * Check approval status.
 */
function validateApproval(ctx: PostingContext): PostingValidation {
  const needsApproval = requiresApproval(ctx.document_type, ctx.amount);

  if (!needsApproval) {
    return {
      id: 'approval_check', check: 'Approval', severity: 'info', passed: true,
      message: 'No approval required for this document type/amount.',
    };
  }

  if (ctx.approval_status === 'approved') {
    return {
      id: 'approval_check', check: 'Approval', severity: 'info', passed: true,
      message: 'Document approved.',
    };
  }

  return {
    id: 'approval_check', check: 'Approval', severity: 'error', passed: false,
    message: `Document requires approval before posting. Current status: ${ctx.approval_status || 'not submitted'}`,
    action_required: 'Submit document for approval.',
    link: '/approval/status-report',
  };
}

/**
 * Check for duplicate posting.
 */
async function validateNoDuplicate(ctx: PostingContext): Promise<PostingValidation> {
  if (!ctx.document_id) {
    return {
      id: 'duplicate_check', check: 'Duplicate Check', severity: 'info', passed: true,
      message: 'New document. No duplicate check needed.',
    };
  }

  try {
    const { data } = await supabase
      .from('acct_posting_runs' as any)
      .select('id, status')
      .eq('document_id', ctx.document_id)
      .eq('status', 'posted');

    if (data && data.length > 0) {
      return {
        id: 'duplicate_check', check: 'Duplicate Check', severity: 'warning', passed: true,
        message: `⚠️ This document has been posted ${data.length} time(s) before. Posting again will create a duplicate.`,
      };
    }

    return {
      id: 'duplicate_check', check: 'Duplicate Check', severity: 'info', passed: true,
      message: 'No existing posting found.',
    };
  } catch {
    return {
      id: 'duplicate_check', check: 'Duplicate Check', severity: 'info', passed: true,
      message: 'Duplicate check skipped.',
    };
  }
}

/**
 * Check mandatory dimensions (cost center, project, etc.)
 */
function validateDimensions(ctx: PostingContext): PostingValidation {
  const rules = getPostingControlRules(ctx.document_type);
  const missing: string[] = [];

  if (rules.requires_cost_center && !ctx.cost_center) missing.push('Cost Center');
  if (rules.requires_project && !ctx.project_id) missing.push('Project');

  if (missing.length > 0) {
    return {
      id: 'dimension_check', check: 'Mandatory Dimensions', severity: 'error', passed: false,
      message: `Missing mandatory dimensions: ${missing.join(', ')}`,
      action_required: `Please fill in: ${missing.join(', ')}`,
    };
  }

  return {
    id: 'dimension_check', check: 'Mandatory Dimensions', severity: 'info', passed: true,
    message: 'All mandatory dimensions provided.',
  };
}

// ===== Main Validation Chain =====

/**
 * Run the full pre-posting validation chain for a document.
 * Returns a comprehensive result with pass/fail for each check.
 */
export async function runPostingValidationChain(ctx: PostingContext): Promise<PostingValidationResult> {
  const rules = getPostingControlRules(ctx.document_type);
  const flags = getFinanceEffectFlags(ctx.document_type);

  // Only run validations relevant to this document type
  const validations: PostingValidation[] = [];

  // Parallel async checks
  const asyncChecks: Promise<PostingValidation>[] = [];

  if (rules.requires_open_period) asyncChecks.push(validatePostingPeriod(ctx));
  if (rules.requires_active_branch) asyncChecks.push(validateBranch(ctx));
  if (rules.requires_account_determination && flags.creates_journal_entry) asyncChecks.push(validateAccountDetermination(ctx));
  if (rules.requires_exchange_rate) asyncChecks.push(validateExchangeRate(ctx));
  if (rules.requires_budget_check) asyncChecks.push(validateBudget(ctx));
  if (rules.requires_duplicate_check) asyncChecks.push(validateNoDuplicate(ctx));

  // Run all async checks in parallel
  const asyncResults = await Promise.all(asyncChecks);
  validations.push(...asyncResults);

  // Sync checks
  if (rules.requires_approval) validations.push(validateApproval(ctx));
  if (rules.requires_dimensions || rules.requires_cost_center || rules.requires_project) {
    validations.push(validateDimensions(ctx));
  }

  // Categorize results
  const errors = validations.filter(v => !v.passed && v.severity === 'error');
  const warnings = validations.filter(v => v.severity === 'warning');
  const infos = validations.filter(v => v.severity === 'info');

  return {
    can_post: errors.length === 0,
    validations,
    errors,
    warnings,
    infos,
  };
}

/**
 * Quick check: can this document type be posted at all?
 */
export function canDocumentTypePost(documentType: string): boolean {
  const flags = getFinanceEffectFlags(documentType);
  return flags.creates_journal_entry;
}
