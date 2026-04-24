import { supabase } from '@/integrations/supabase/client';

export const DOCUMENT_TYPES = [
  { value: 'ar_invoice', label: 'A/R Invoice' },
  { value: 'ap_invoice', label: 'A/P Invoice' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'ar_return', label: 'Return' },
  { value: 'goods_receipt_po', label: 'Goods Receipt PO' },
  { value: 'goods_return', label: 'Goods Return' },
  { value: 'goods_issue', label: 'Goods Issue' },
  { value: 'goods_receipt', label: 'Goods Receipt' },
  { value: 'inventory_transfer', label: 'Inventory Transfer' },
  { value: 'incoming_payment', label: 'Incoming Payment' },
  { value: 'outgoing_payment', label: 'Outgoing Payment' },
  { value: 'production_receipt', label: 'Production Receipt' },
  { value: 'production_issue', label: 'Production Issue' },
  { value: 'payroll_posting', label: 'Payroll Posting' },
  { value: 'progress_billing', label: 'Project Progress Billing' },
  { value: 'fixed_asset_purchase', label: 'Fixed Asset Purchase' },
  { value: 'depreciation', label: 'Depreciation' },
  { value: 'credit_memo', label: 'Credit Memo' },
  { value: 'down_payment', label: 'Down Payment' },
  { value: 'landed_cost', label: 'Landed Cost' },
] as const;

export const ACCOUNT_PURPOSES = [
  'revenue', 'inventory', 'cogs', 'grpo_clearing', 'ar_control', 'ap_control',
  'output_vat', 'input_vat', 'payroll_expense', 'payroll_payable', 'retention',
  'contract_liability', 'rounding', 'cash_bank', 'depreciation_expense',
  'accumulated_depreciation', 'asset_account', 'discount', 'exchange_diff',
] as const;

export const AMOUNT_SOURCES = [
  { value: 'total', label: 'Document Total' },
  { value: 'subtotal', label: 'Subtotal (before tax)' },
  { value: 'tax_amount', label: 'Tax Amount' },
  { value: 'line_total', label: 'Line Total' },
  { value: 'discount_amount', label: 'Discount Amount' },
  { value: 'retention_amount', label: 'Retention Amount' },
  { value: 'formula', label: 'Custom Formula' },
] as const;

export const CONDITION_TYPES = [
  { value: 'item', label: 'Item Code' },
  { value: 'item_group', label: 'Item Group' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'tax_code', label: 'Tax Code' },
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'branch', label: 'Branch' },
  { value: 'project', label: 'Project' },
  { value: 'employee', label: 'Employee' },
  { value: 'company', label: 'Company Default' },
] as const;

export interface AcctRule {
  id: string;
  document_type: string;
  rule_name: string;
  description: string | null;
  priority: number;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  fallback_rule_id: string | null;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcctRuleCondition {
  id: string;
  rule_id: string;
  condition_type: string;
  condition_value: string;
  operator: string;
}

export interface AcctRuleLine {
  id: string;
  rule_id: string;
  line_order: number;
  side: 'debit' | 'credit';
  account_purpose: string;
  default_acct_code: string | null;
  amount_source: string;
  amount_formula: string | null;
  dimension_1: string | null;
  dimension_2: string | null;
  dimension_3: string | null;
  dimension_4: string | null;
  description_template: string | null;
}

export interface SimulationInput {
  document_type: string;
  total: number;
  subtotal: number;
  tax_amount: number;
  line_total?: number;
  discount_amount?: number;
  retention_amount?: number;
  conditions?: Record<string, string>;
}

export interface SimulationResult {
  matched_rule: AcctRule | null;
  lines: SimulationLine[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  errors: string[];
  warnings: string[];
}

export interface SimulationLine {
  line_order: number;
  side: 'debit' | 'credit';
  account_purpose: string;
  acct_code: string;
  acct_name: string;
  amount: number;
  dimension_1?: string;
  dimension_2?: string;
  dimension_3?: string;
  dimension_4?: string;
  description: string;
}

// Rule Resolver: find best matching rule by document type + conditions + priority
export async function resolveRule(
  documentType: string,
  conditions: Record<string, string> = {},
  companyId?: string
): Promise<AcctRule | null> {
  let query = supabase
    .from('acct_determination_rules' as any)
    .select('*')
    .eq('document_type', documentType)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }

  const { data: rules } = await query;
  if (!rules || rules.length === 0) return null;

  // For each rule, check if conditions match
  for (const rule of rules as any[]) {
    const { data: ruleConds } = await supabase
      .from('acct_determination_conditions' as any)
      .select('*')
      .eq('rule_id', rule.id);

    if (!ruleConds || ruleConds.length === 0) {
      // No conditions = default/fallback rule
      return rule as AcctRule;
    }

    const allMatch = (ruleConds as any[]).every((c) => {
      const val = conditions[c.condition_type];
      if (!val) return false;
      if (c.operator === 'equals') return val === c.condition_value;
      if (c.operator === 'not_equals') return val !== c.condition_value;
      if (c.operator === 'contains') return val.includes(c.condition_value);
      return false;
    });

    if (allMatch) return rule as AcctRule;
  }

  // Return lowest priority (most general) rule as fallback
  return (rules as any[])[rules.length - 1] as AcctRule;
}

// Amount Calculator
export function calculateAmount(source: string, input: SimulationInput, formula?: string | null): number {
  switch (source) {
    case 'total': return input.total;
    case 'subtotal': return input.subtotal;
    case 'tax_amount': return input.tax_amount;
    case 'line_total': return input.line_total || input.subtotal;
    case 'discount_amount': return input.discount_amount || 0;
    case 'retention_amount': return input.retention_amount || 0;
    case 'formula':
      if (!formula) return 0;
      try {
        // Simple formula evaluation: supports basic math with named vars
        const expr = formula
          .replace(/total/g, String(input.total))
          .replace(/subtotal/g, String(input.subtotal))
          .replace(/tax/g, String(input.tax_amount))
          .replace(/discount/g, String(input.discount_amount || 0))
          .replace(/retention/g, String(input.retention_amount || 0));
        return Function(`"use strict"; return (${expr})`)();
      } catch { return 0; }
    default: return 0;
  }
}

// Posting Simulator
export async function simulatePosting(input: SimulationInput, companyId?: string): Promise<SimulationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rule = await resolveRule(input.document_type, input.conditions, companyId);
  if (!rule) {
    return { matched_rule: null, lines: [], total_debit: 0, total_credit: 0, is_balanced: false, errors: ['No matching rule found for this document type'], warnings };
  }

  const { data: ruleLines } = await supabase
    .from('acct_determination_lines' as any)
    .select('*')
    .eq('rule_id', rule.id)
    .order('line_order');

  if (!ruleLines || ruleLines.length === 0) {
    return { matched_rule: rule, lines: [], total_debit: 0, total_credit: 0, is_balanced: false, errors: ['Rule has no JE line templates'], warnings };
  }

  const simLines: SimulationLine[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  // Collect all account codes to look up names from COA
  const acctCodes = (ruleLines as any[])
    .map(tpl => tpl.default_acct_code)
    .filter(Boolean);

  let acctNameMap: Record<string, string> = {};
  if (acctCodes.length > 0) {
    const { data: coaRows } = await supabase
      .from('chart_of_accounts')
      .select('acct_code, acct_name')
      .in('acct_code', acctCodes);
    if (coaRows) {
      acctNameMap = Object.fromEntries(coaRows.map((r: any) => [r.acct_code, r.acct_name]));
    }
  }

  for (const tpl of ruleLines as any[]) {
    const amount = calculateAmount(tpl.amount_source, input, tpl.amount_formula);
    if (amount === 0) {
      warnings.push(`Line ${tpl.line_order} (${tpl.account_purpose}) has zero amount`);
    }

    const acctCode = tpl.default_acct_code || '';
    if (!acctCode) {
      errors.push(`Line ${tpl.line_order}: No account code for purpose "${tpl.account_purpose}"`);
    }

    const resolvedName = acctNameMap[acctCode] || tpl.account_purpose.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    const line: SimulationLine = {
      line_order: tpl.line_order,
      side: tpl.side,
      account_purpose: tpl.account_purpose,
      acct_code: acctCode,
      acct_name: resolvedName,
      amount: Math.abs(amount),
      dimension_1: tpl.dimension_1 || undefined,
      dimension_2: tpl.dimension_2 || undefined,
      dimension_3: tpl.dimension_3 || undefined,
      dimension_4: tpl.dimension_4 || undefined,
      description: tpl.description_template || tpl.account_purpose,
    };

    if (tpl.side === 'debit') totalDebit += line.amount;
    else totalCredit += line.amount;

    simLines.push(line);
  }

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  if (!isBalanced) {
    errors.push(`Journal entry not balanced: Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}`);
  }

  return { matched_rule: rule, lines: simLines, total_debit: totalDebit, total_credit: totalCredit, is_balanced: isBalanced, errors, warnings };
}
