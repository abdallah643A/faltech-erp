import { supabase } from '@/integrations/supabase/client';
import { executePosting, type PostingContext, type PostingResult, ACCOUNT_TYPE_LABELS } from './sapPostingEngine';
import type { SimulationInput, SimulationLine, SimulationResult, AcctRule } from './postingEngine';

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  field?: string;
  settingsLink?: string;
}

export interface AccountingValidationResult {
  status: 'valid' | 'warning' | 'error' | 'no_rule';
  simulation: SimulationResult;
  issues: ValidationIssue[];
  canProceed: boolean;
}

const PURPOSE_LABELS: Record<string, string> = {
  revenue: 'Revenue Account',
  inventory: 'Inventory Account',
  cogs: 'Cost of Goods Sold Account',
  grpo_clearing: 'GRPO Clearing Account',
  ar_control: 'Customer Control Account (A/R)',
  ap_control: 'Vendor Control Account (A/P)',
  output_vat: 'Output VAT Account',
  input_vat: 'Input VAT Account',
  payroll_expense: 'Payroll Expense Account',
  payroll_payable: 'Salary Payable Account',
  retention: 'Retention Account',
  contract_liability: 'Contract Liability Account',
  cash_bank: 'Cash / Bank Account',
  depreciation_expense: 'Depreciation Expense Account',
  accumulated_depreciation: 'Accumulated Depreciation Account',
  asset_account: 'Fixed Asset Account',
  discount: 'Discount Account',
  exchange_diff: 'Exchange Difference Account',
  rounding: 'Rounding Account',
  ...ACCOUNT_TYPE_LABELS,
};

const DOC_TYPE_LABELS: Record<string, string> = {
  ar_invoice: 'A/R Invoice',
  ap_invoice: 'A/P Invoice',
  delivery: 'Delivery',
  ar_return: 'Return',
  goods_receipt_po: 'Goods Receipt PO',
  goods_return: 'Goods Return',
  goods_issue: 'Goods Issue',
  goods_receipt: 'Goods Receipt',
  inventory_transfer: 'Inventory Transfer',
  incoming_payment: 'Incoming Payment',
  outgoing_payment: 'Outgoing Payment',
  production_receipt: 'Production Receipt',
  production_issue: 'Production Issue',
  payroll_posting: 'Payroll Posting',
  progress_billing: 'Project Progress Billing',
  fixed_asset_purchase: 'Fixed Asset Purchase',
  depreciation: 'Depreciation',
  credit_memo: 'Credit Memo',
  down_payment: 'Down Payment',
  landed_cost: 'Landed Cost',
  ar_credit_memo: 'A/R Credit Memo',
  ap_credit_memo: 'A/P Credit Memo',
};

function getDocLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] || docType;
}

function getPurposeLabel(purpose: string): string {
  return PURPOSE_LABELS[purpose] || purpose.replace(/_/g, ' ');
}

/**
 * Validates accounting by running the SAP-style posting engine
 * and converting the result to validation issues.
 */
export async function validateAccounting(
  input: SimulationInput,
  companyId?: string,
  options?: {
    checkActiveAccounts?: boolean;
    checkDimensions?: boolean;
    documentId?: string;
  }
): Promise<AccountingValidationResult> {
  const issues: ValidationIssue[] = [];
  const docLabel = getDocLabel(input.document_type);

  // Build PostingContext from SimulationInput
  const ctx: PostingContext = {
    document_type: input.document_type,
    document_id: options?.documentId,
    total: input.total,
    subtotal: input.subtotal,
    tax_amount: input.tax_amount,
    discount_amount: input.discount_amount || 0,
    retention_amount: input.retention_amount || 0,
    line_total: input.line_total,
  };

  // Run SAP posting engine
  const postingResult = await executePosting(ctx, companyId);

  // Convert PostingResult errors/warnings to ValidationIssues
  for (const err of postingResult.errors) {
    const isMissing = err.includes('Missing account');
    const purposeMatch = err.match(/Missing account for "(.+?)"/);
    const purpose = purposeMatch?.[1] || '';
    
    issues.push({
      type: 'error',
      code: isMissing ? 'MISSING_ACCOUNT' : 'POSTING_ERROR',
      message: isMissing
        ? `Cannot post ${docLabel} because ${purpose} is not assigned. Please update the account mapping in G/L Account Determination settings.`
        : `Cannot post ${docLabel}: ${err}`,
      field: purpose,
      settingsLink: '/accounting-determination',
    });
  }

  for (const warn of postingResult.warnings) {
    issues.push({
      type: 'warning',
      code: 'POSTING_WARNING',
      message: warn,
    });
  }

  // Check for inactive accounts
  for (const line of postingResult.lines) {
    if (line.acct_code && line.account_source === 'fallback') {
      // Already captured as missing
    }
  }

  // Check dimension requirements and control account from chart_of_accounts
  const acctCodes = [...new Set(postingResult.lines.map(l => l.acct_code).filter(Boolean))];
  if (acctCodes.length > 0) {
    const { data: coaRows } = await supabase
      .from('chart_of_accounts')
      .select('acct_code, acct_type, require_dim1, require_dim2, require_dim3, require_dim4, require_dim5, is_control_account')
      .in('acct_code', acctCodes);

    if (coaRows) {
      const coaMap = new Map(coaRows.map(r => [r.acct_code, r]));
      for (const line of postingResult.lines) {
        const coa = coaMap.get(line.acct_code || '');
        if (!coa) continue;

        // Block control accounts from manual journal entries
        if (coa.is_control_account) {
          issues.push({
            type: 'error',
            code: 'CONTROL_ACCOUNT',
            message: `Account ${line.acct_code} (${line.acct_name || ''}) is a Control Account and cannot be used in manual journal entries.`,
            field: 'acct_code',
            settingsLink: '/chart-of-accounts',
          });
        }

        const dimChecks = [
          { flag: coa.require_dim1, field: 'dimension_1', num: 1 },
          { flag: coa.require_dim2, field: 'dimension_2', num: 2 },
          { flag: coa.require_dim3, field: 'dimension_3', num: 3 },
          { flag: coa.require_dim4, field: 'dimension_4', num: 4 },
          { flag: coa.require_dim5, field: 'dimension_5' as any, num: 5 },
        ];
        for (const dc of dimChecks) {
          if (dc.flag && !(line as any)[dc.field]) {
            issues.push({
              type: 'error',
              code: 'MISSING_DIMENSION',
              message: `Account ${line.acct_code} (${line.acct_name || coa.acct_type}) requires Dimension ${dc.num} to be filled.`,
              field: dc.field,
              settingsLink: '/chart-of-accounts',
            });
          }
        }
      }
    }
  }

  // Check for duplicate posting
  if (options?.documentId) {
    const { data: existingRuns } = await supabase
      .from('acct_posting_runs' as any)
      .select('id, status')
      .eq('document_id', options.documentId)
      .eq('status', 'posted');
    if (existingRuns && existingRuns.length > 0) {
      issues.push({
        type: 'warning',
        code: 'ALREADY_POSTED',
        message: `This ${docLabel} has already been posted. Posting again may create a duplicate journal entry.`,
      });
    }
  }

  // Convert PostingLines to SimulationLines for the modal
  const simLines: SimulationLine[] = postingResult.lines.map(l => ({
    line_order: l.line_order,
    side: l.side,
    account_purpose: l.account_purpose,
    acct_code: l.acct_code || '',
    acct_name: l.acct_name || getPurposeLabel(l.account_purpose),
    amount: l.amount,
    dimension_1: l.dimension_1,
    dimension_2: l.dimension_2,
    dimension_3: l.dimension_3,
    dimension_4: l.dimension_4,
    description: l.line_memo || l.account_purpose,
  }));

  // Build a fake matched rule for display
  const matchedRule: AcctRule | null = postingResult.matched_rule
    ? {
        id: postingResult.matched_rule.id,
        document_type: input.document_type,
        rule_name: postingResult.matched_rule.rule_name,
        description: postingResult.matched_rule.description,
        priority: postingResult.matched_rule.priority,
        is_active: true,
        effective_from: postingResult.matched_rule.effective_from,
        effective_to: postingResult.matched_rule.effective_to,
        fallback_rule_id: null,
        company_id: postingResult.matched_rule.company_id,
        created_by: postingResult.matched_rule.created_by,
        created_at: postingResult.matched_rule.created_at,
        updated_at: postingResult.matched_rule.created_at,
      }
    : null;

  // If using defaults (no advanced rule), show the source
  const displayRuleName = postingResult.matched_rule
    ? postingResult.matched_rule.rule_name
    : 'Default G/L Account Determination';

  const hasErrors = issues.some(i => i.type === 'error');
  const hasWarnings = issues.some(i => i.type === 'warning');
  const status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'valid';

  return {
    status,
    simulation: {
      matched_rule: matchedRule || { 
        id: 'default', document_type: input.document_type, rule_name: displayRuleName,
        description: null, priority: 0, is_active: true, effective_from: null,
        effective_to: null, fallback_rule_id: null, company_id: null,
        created_by: null, created_at: '', updated_at: '',
      },
      lines: simLines,
      total_debit: postingResult.total_debit,
      total_credit: postingResult.total_credit,
      is_balanced: postingResult.is_balanced,
      errors: issues.filter(i => i.type === 'error').map(i => i.message),
      warnings: issues.filter(i => i.type === 'warning').map(i => i.message),
    },
    issues,
    canProceed: !hasErrors,
  };
}
