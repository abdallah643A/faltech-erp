/**
 * SAP B1-Style Posting Engine
 * 9-step account determination and JE generation
 */
import { supabase } from '@/integrations/supabase/client';

// ===== Constants =====

export const FUNCTIONAL_AREAS = ['sales', 'purchasing', 'general', 'inventory'] as const;
export type FunctionalArea = typeof FUNCTIONAL_AREAS[number];

export const SAP_DOCUMENT_TYPES = [
  // Sales
  { value: 'sales_quotation', label: 'Sales Quotation', area: 'sales', creates_je: false },
  { value: 'sales_order', label: 'Sales Order', area: 'sales', creates_je: false },
  { value: 'delivery', label: 'Delivery', area: 'sales', creates_je: true },
  { value: 'ar_invoice', label: 'A/R Invoice', area: 'sales', creates_je: true },
  { value: 'ar_credit_memo', label: 'A/R Credit Memo', area: 'sales', creates_je: true },
  { value: 'ar_return', label: 'Sales Return', area: 'sales', creates_je: true },
  { value: 'incoming_payment', label: 'Incoming Payment', area: 'sales', creates_je: true },
  { value: 'ar_down_payment_request', label: 'A/R Down Payment Request', area: 'sales', creates_je: false },
  { value: 'ar_down_payment_invoice', label: 'A/R Down Payment Invoice', area: 'sales', creates_je: true },
  // Purchasing
  { value: 'purchase_request', label: 'Purchase Request', area: 'purchasing', creates_je: false },
  { value: 'purchase_order', label: 'Purchase Order', area: 'purchasing', creates_je: false },
  { value: 'goods_receipt_po', label: 'Goods Receipt PO', area: 'purchasing', creates_je: true },
  { value: 'ap_invoice', label: 'A/P Invoice', area: 'purchasing', creates_je: true },
  { value: 'ap_credit_memo', label: 'A/P Credit Memo', area: 'purchasing', creates_je: true },
  { value: 'goods_return', label: 'Goods Return', area: 'purchasing', creates_je: true },
  { value: 'outgoing_payment', label: 'Outgoing Payment', area: 'purchasing', creates_je: true },
  { value: 'ap_down_payment_request', label: 'A/P Down Payment Request', area: 'purchasing', creates_je: false },
  { value: 'ap_down_payment_invoice', label: 'A/P Down Payment Invoice', area: 'purchasing', creates_je: true },
  // Inventory
  { value: 'goods_receipt', label: 'Goods Receipt', area: 'inventory', creates_je: true },
  { value: 'goods_issue', label: 'Goods Issue', area: 'inventory', creates_je: true },
  { value: 'inventory_transfer', label: 'Inventory Transfer', area: 'inventory', creates_je: true },
  { value: 'inventory_transfer_request', label: 'Inventory Transfer Request', area: 'inventory', creates_je: false },
  { value: 'inventory_counting', label: 'Inventory Counting Differences', area: 'inventory', creates_je: true },
  { value: 'inventory_posting', label: 'Inventory Posting', area: 'inventory', creates_je: true },
  { value: 'inventory_revaluation', label: 'Inventory Revaluation', area: 'inventory', creates_je: true },
  { value: 'production_receipt', label: 'Receipt from Production', area: 'inventory', creates_je: true },
  { value: 'production_issue', label: 'Issue for Production', area: 'inventory', creates_je: true },
  { value: 'landed_cost', label: 'Landed Cost', area: 'inventory', creates_je: true },
  // Finance
  { value: 'manual_je', label: 'Manual Journal Entry', area: 'general', creates_je: true },
  { value: 'bank_transaction', label: 'Bank Transaction', area: 'general', creates_je: true },
  { value: 'fx_revaluation', label: 'Exchange Rate Revaluation', area: 'general', creates_je: true },
  { value: 'period_closing', label: 'Period-End Closing', area: 'general', creates_je: true },
  { value: 'allocation_entry', label: 'Allocation Entry', area: 'general', creates_je: true },
  { value: 'accrual_deferral', label: 'Accrual/Deferral Entry', area: 'general', creates_je: true },
] as const;

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  revenue: 'Sales Revenue',
  sales_returns: 'Sales Returns',
  sales_discount: 'Sales Discounts',
  ar_control: 'A/R Control',
  output_vat: 'Output VAT',
  deferred_revenue: 'Deferred Revenue',
  down_payment_clearing_ar: 'Down Payment Clearing (A/R)',
  freight_revenue: 'Freight Revenue',
  rounding_revenue: 'Rounding (Sales)',
  exchange_diff_ar: 'Exchange Diff - A/R',
  write_off_ar: 'Write-off (A/R)',
  purchase: 'Purchase Account',
  purchase_returns: 'Purchase Returns',
  purchase_discount: 'Purchase Discounts',
  ap_control: 'A/P Control',
  input_vat: 'Input VAT',
  expense_clearing: 'Expense Clearing',
  price_difference: 'Price Difference',
  gr_clearing: 'GR/IR Clearing',
  down_payment_clearing_ap: 'Down Payment Clearing (A/P)',
  freight_expense: 'Freight Expense',
  rounding_purchase: 'Rounding (Purchasing)',
  exchange_diff_ap: 'Exchange Diff - A/P',
  cash: 'Cash',
  bank: 'Bank',
  exchange_gain: 'Realized Exchange Gain',
  exchange_loss: 'Realized Exchange Loss',
  unrealized_exchange_gain: 'Unrealized Exchange Gain',
  unrealized_exchange_loss: 'Unrealized Exchange Loss',
  rounding: 'General Rounding',
  allocation: 'Allocation',
  accrual: 'Accrual',
  deferral: 'Deferral',
  intercompany_ar: 'Intercompany A/R',
  intercompany_ap: 'Intercompany A/P',
  inventory: 'Inventory',
  cogs: 'Cost of Goods Sold',
  inventory_offset: 'Inventory Offset / Stock',
  goods_shipped_not_invoiced: 'Goods Shipped Not Invoiced',
  goods_received_not_invoiced: 'Goods Received Not Invoiced',
  wip: 'Work in Progress',
  variance: 'Variance',
  revaluation: 'Inventory Revaluation',
  production_issue: 'Production Issue',
  production_receipt: 'Production Receipt',
  landed_cost: 'Landed Cost Absorption',
  landed_cost_variance: 'Landed Cost Variance',
  inventory_counting_diff: 'Inventory Counting Diff',
  negative_inventory: 'Negative Inventory Adj',
};

export const ROW_TYPES = ['inventory_item', 'non_inventory_item', 'service', 'fixed_asset', 'resource', 'freight', 'tax'] as const;
export type RowType = typeof ROW_TYPES[number];

// ===== Types =====

export interface GLDefault {
  id: string;
  functional_area: string;
  account_type: string;
  acct_code: string | null;
  acct_name: string | null;
  description: string | null;
  company_id: string | null;
}

export interface AdvancedCriterion {
  id: string;
  criterion_key: string;
  criterion_label: string;
  is_active: boolean;
  priority_order: number;
  depends_on: string | null;
}

export interface AdvancedRule {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string | null;
  priority: number;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
  posting_period: string | null;
  match_type: string;
  criteria_values: Record<string, string>;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  accounts?: RuleAccount[];
}

export interface RuleAccount {
  id?: string;
  rule_id?: string;
  account_type: string;
  acct_code: string;
  acct_name?: string | null;
}

export interface PostingContext {
  document_type: string;
  document_id?: string;
  document_number?: string;
  row_type?: RowType;
  // Amounts
  total: number;
  subtotal: number;
  tax_amount: number;
  discount_amount?: number;
  retention_amount?: number;
  freight_amount?: number;
  line_total?: number;
  price_difference?: number;
  // Criteria for rule matching
  item_group?: string;
  item_code?: string;
  warehouse?: string;
  bp_group?: string;
  bp_code?: string;
  ship_to_country?: string;
  ship_to_state?: string;
  branch?: string;
  project?: string;
  cost_center?: string;
  company?: string;
  // Settings
  perpetual_inventory?: boolean;
  // Dimensions
  dimension_1?: string;
  dimension_2?: string;
  dimension_3?: string;
  dimension_4?: string;
  // BP accounts
  bp_ar_control?: string;
  bp_ap_control?: string;
}

export interface PostingLine {
  line_order: number;
  side: 'debit' | 'credit';
  acct_code: string;
  acct_name: string;
  amount: number;
  account_purpose: string;
  account_source: string; // advanced_rule, default, item_group, warehouse, bp_master, fallback
  source_details: string;
  bp_code?: string;
  project_code?: string;
  cost_center?: string;
  dimension_1?: string;
  dimension_2?: string;
  dimension_3?: string;
  dimension_4?: string;
  tax_code?: string;
  line_memo?: string;
}

export interface CandidateRule {
  rule_id: string;
  rule_code: string;
  rule_name: string;
  priority: number;
  status: 'winner' | 'rejected';
  match_score: number;
  rejection_reason?: string;
  criteria_values: Record<string, string>;
}

export interface ConfigSnapshot {
  defaults: Array<{ account_type: string; acct_code: string | null; acct_name: string | null; functional_area: string }>;
  advanced_rules_count: number;
  snapshot_at: string;
}

export interface PostingResult {
  status: 'success' | 'error' | 'warning';
  lines: PostingLine[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  matched_rule: AdvancedRule | null;
  used_defaults: boolean;
  account_source: string;
  resolution_path: ResolutionStep[];
  candidate_rules: CandidateRule[];
  config_snapshot: ConfigSnapshot | null;
  errors: string[];
  warnings: string[];
  posting_rationale: string;
}

export interface ResolutionStep {
  step: number;
  action: string;
  source: string;
  details: string;
  result?: string;
}

// ===== Engine =====

/**
 * Step 1: Identify document type and whether it creates a JE
 */
function identifyDocumentType(docType: string) {
  const doc = SAP_DOCUMENT_TYPES.find(d => d.value === docType);
  return {
    label: doc?.label || docType,
    area: doc?.area || 'general',
    creates_je: doc?.creates_je ?? true,
  };
}

/**
 * Step 2: Classify row type
 */
function classifyRowType(ctx: PostingContext): RowType {
  return ctx.row_type || 'inventory_item';
}

/**
 * Step 3: Resolve advanced rules (most specific match wins)
 */
async function resolveAdvancedRule(
  ctx: PostingContext,
  activeCriteria: AdvancedCriterion[],
  companyId?: string
): Promise<{ rule: AdvancedRule | null; steps: ResolutionStep[]; candidates: CandidateRule[] }> {
  const steps: ResolutionStep[] = [];
  const candidates: CandidateRule[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Build criteria values from context
  const contextCriteria: Record<string, string> = {};
  if (ctx.item_group) contextCriteria.item_group = ctx.item_group;
  if (ctx.item_code) contextCriteria.item_code = ctx.item_code;
  if (ctx.warehouse) contextCriteria.warehouse = ctx.warehouse;
  if (ctx.bp_group) contextCriteria.bp_group = ctx.bp_group;
  if (ctx.bp_code) contextCriteria.bp_code = ctx.bp_code;
  if (ctx.ship_to_country) contextCriteria.ship_to_country = ctx.ship_to_country;
  if (ctx.ship_to_state) contextCriteria.ship_to_state = ctx.ship_to_state;
  if (ctx.document_type) contextCriteria.document_type = ctx.document_type;
  if (ctx.branch) contextCriteria.branch = ctx.branch;
  if (ctx.project) contextCriteria.project = ctx.project;
  if (ctx.cost_center) contextCriteria.cost_center = ctx.cost_center;
  if (ctx.company) contextCriteria.company = ctx.company;

  steps.push({
    step: 3,
    action: 'Resolve Advanced Rules',
    source: 'gl_advanced_rules',
    details: `Context criteria: ${JSON.stringify(contextCriteria)}`,
  });

  // Fetch active rules ordered by priority
  let query = supabase
    .from('gl_advanced_rules' as any)
    .select('*')
    .eq('status', 'active')
    .order('priority', { ascending: true });

  if (companyId) {
    query = (query as any).or(`company_id.eq.${companyId},company_id.is.null`);
  }

  const { data: rules } = await query;
  if (!rules || rules.length === 0) {
    steps.push({ step: 3, action: 'No advanced rules found', source: 'gl_advanced_rules', details: 'Falling back to defaults' });
    return { rule: null, steps, candidates };
  }

  // Evaluate ALL rules and track candidates
  const activeKeys = activeCriteria.filter(c => c.is_active).map(c => c.criterion_key);
  let bestRule: any = null;
  let bestScore = -1;
  let bestSpecificity = 0;

  for (const rule of (rules as any[])) {
    // Check effective dates
    if (rule.effective_from && today < rule.effective_from) {
      candidates.push({
        rule_id: rule.id, rule_code: rule.rule_code, rule_name: rule.rule_name,
        priority: rule.priority, status: 'rejected', match_score: 0,
        rejection_reason: `Not yet effective (starts ${rule.effective_from})`,
        criteria_values: rule.criteria_values || {},
      });
      continue;
    }
    if (rule.effective_to && today > rule.effective_to) {
      candidates.push({
        rule_id: rule.id, rule_code: rule.rule_code, rule_name: rule.rule_name,
        priority: rule.priority, status: 'rejected', match_score: 0,
        rejection_reason: `Expired (ended ${rule.effective_to})`,
        criteria_values: rule.criteria_values || {},
      });
      continue;
    }

    const ruleCV = rule.criteria_values || {};
    const ruleKeys = Object.keys(ruleCV);
    
    // All criteria in rule must match context
    let matches = true;
    let matchCount = 0;
    let failedCriterion = '';
    
    for (const key of ruleKeys) {
      if (!activeKeys.includes(key)) continue;
      const ruleVal = ruleCV[key];
      const ctxVal = contextCriteria[key];
      
      if (!ctxVal) {
        if (rule.match_type === 'exact') { matches = false; failedCriterion = `${key}: required but not in context`; break; }
        continue;
      }
      
      if (ruleVal === ctxVal) {
        matchCount++;
      } else if (rule.match_type === 'partial' && ctxVal.includes(ruleVal)) {
        matchCount++;
      } else {
        matches = false;
        failedCriterion = `${key}: expected "${ruleVal}" but got "${ctxVal}"`;
        break;
      }
    }

    if (!matches || matchCount === 0) {
      candidates.push({
        rule_id: rule.id, rule_code: rule.rule_code, rule_name: rule.rule_name,
        priority: rule.priority, status: 'rejected', match_score: matchCount,
        rejection_reason: failedCriterion || 'No criteria matched',
        criteria_values: ruleCV,
      });
      continue;
    }

    // This rule matched - track as candidate
    candidates.push({
      rule_id: rule.id, rule_code: rule.rule_code, rule_name: rule.rule_name,
      priority: rule.priority, status: 'rejected', // tentatively rejected, winner updated below
      match_score: matchCount,
      rejection_reason: '', // will be filled if it loses
      criteria_values: ruleCV,
    });

    if (matchCount > bestSpecificity || (matchCount === bestSpecificity && rule.priority < (bestRule?.priority || 999))) {
      bestRule = rule;
      bestScore = matchCount;
      bestSpecificity = matchCount;
    }
  }

  if (bestRule) {
    // Mark the winner and explain why others lost
    for (const c of candidates) {
      if (c.rule_id === bestRule.id) {
        c.status = 'winner';
        c.rejection_reason = undefined;
      } else if (!c.rejection_reason) {
        // Matched but lost on specificity/priority
        if (c.match_score < bestSpecificity) {
          c.rejection_reason = `Lower specificity (${c.match_score} vs ${bestSpecificity} criteria matched)`;
        } else {
          c.rejection_reason = `Lower priority (${c.priority} vs winner's ${bestRule.priority})`;
        }
      }
    }

    // Fetch accounts for this rule
    const { data: accounts } = await supabase
      .from('gl_advanced_rule_accounts' as any)
      .select('*')
      .eq('rule_id', bestRule.id);
    
    bestRule.accounts = accounts || [];
    steps.push({
      step: 3,
      action: `Matched advanced rule: ${bestRule.rule_name}`,
      source: 'advanced_rule',
      details: `Rule ${bestRule.rule_code} matched ${bestSpecificity} criteria with priority ${bestRule.priority}. ${candidates.length - 1} other rules evaluated.`,
      result: bestRule.id,
    });
    return { rule: bestRule as AdvancedRule, steps, candidates };
  }

  steps.push({ step: 3, action: 'No matching advanced rule', source: 'gl_advanced_rules', details: `Checked ${(rules as any[]).length} rules, none matched. Falling back to defaults.` });
  return { rule: null, steps, candidates };
}

/**
 * Step 4: Resolve BP control accounts
 */
function resolveBPAccounts(ctx: PostingContext, defaults: GLDefault[]): { ar_control: string; ap_control: string; steps: ResolutionStep[] } {
  const steps: ResolutionStep[] = [];
  
  // Use BP master if provided, else use defaults
  const arDefault = defaults.find(d => d.account_type === 'ar_control')?.acct_code || '';
  const apDefault = defaults.find(d => d.account_type === 'ap_control')?.acct_code || '';
  
  const ar = ctx.bp_ar_control || arDefault;
  const ap = ctx.bp_ap_control || apDefault;
  
  steps.push({
    step: 4,
    action: 'Resolve BP Control Accounts',
    source: ctx.bp_ar_control ? 'bp_master' : 'default',
    details: `A/R Control: ${ar || 'MISSING'}, A/P Control: ${ap || 'MISSING'}`,
  });

  return { ar_control: ar, ap_control: ap, steps };
}

/**
 * Step 5-6: Resolve account for a given purpose using priority chain:
 * Advanced Rule → Default G/L → Fallback
 */
function resolveAccount(
  purpose: string,
  advancedRule: AdvancedRule | null,
  defaults: GLDefault[],
  ctx: PostingContext
): { acct_code: string; acct_name: string; source: string; details: string } {
  // 1. Try advanced rule accounts
  if (advancedRule?.accounts) {
    const ruleAcct = advancedRule.accounts.find(a => a.account_type === purpose);
    if (ruleAcct) {
      return {
        acct_code: ruleAcct.acct_code,
        acct_name: ruleAcct.acct_name || ACCOUNT_TYPE_LABELS[purpose] || purpose,
        source: 'advanced_rule',
        details: `From advanced rule "${advancedRule.rule_name}" (${advancedRule.rule_code})`,
      };
    }
  }

  // 2. Try default G/L accounts
  const defaultAcct = defaults.find(d => d.account_type === purpose);
  if (defaultAcct?.acct_code) {
    return {
      acct_code: defaultAcct.acct_code,
      acct_name: defaultAcct.acct_name || ACCOUNT_TYPE_LABELS[purpose] || purpose,
      source: 'default',
      details: `From default G/L account determination (${defaultAcct.functional_area})`,
    };
  }

  // 3. Fallback - no account found
  return {
    acct_code: '',
    acct_name: ACCOUNT_TYPE_LABELS[purpose] || purpose,
    source: 'fallback',
    details: `No account configured for "${ACCOUNT_TYPE_LABELS[purpose] || purpose}". Please configure in Account Determination Settings.`,
  };
}

/**
 * Get document-specific JE template based on SAP B1 logic
 */
function getDocumentPostingTemplate(docType: string, rowType: RowType, ctx: PostingContext): Array<{ purpose: string; side: 'debit' | 'credit'; amountKey: string }> {
  switch (docType) {
    case 'ar_invoice':
      if (rowType === 'service' || rowType === 'non_inventory_item') {
        return [
          { purpose: 'ar_control', side: 'debit', amountKey: 'total' },
          { purpose: 'revenue', side: 'credit', amountKey: 'subtotal' },
          { purpose: 'output_vat', side: 'credit', amountKey: 'tax_amount' },
        ];
      }
      // Inventory item
      return [
        { purpose: 'ar_control', side: 'debit', amountKey: 'total' },
        { purpose: 'revenue', side: 'credit', amountKey: 'subtotal' },
        { purpose: 'output_vat', side: 'credit', amountKey: 'tax_amount' },
        ...(ctx.perpetual_inventory !== false ? [
          { purpose: 'cogs', side: 'debit' as const, amountKey: 'line_total' },
          { purpose: 'inventory', side: 'credit' as const, amountKey: 'line_total' },
        ] : []),
      ];

    case 'delivery':
      if (ctx.perpetual_inventory === false) return [];
      return [
        { purpose: 'cogs', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'inventory', side: 'credit', amountKey: 'subtotal' },
      ];

    case 'ar_credit_memo':
      return [
        { purpose: 'revenue', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'output_vat', side: 'debit', amountKey: 'tax_amount' },
        { purpose: 'ar_control', side: 'credit', amountKey: 'total' },
        ...(rowType === 'inventory_item' && ctx.perpetual_inventory !== false ? [
          { purpose: 'inventory', side: 'debit' as const, amountKey: 'line_total' },
          { purpose: 'cogs', side: 'credit' as const, amountKey: 'line_total' },
        ] : []),
      ];

    case 'ar_return':
      return [
        { purpose: 'revenue', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'output_vat', side: 'debit', amountKey: 'tax_amount' },
        { purpose: 'ar_control', side: 'credit', amountKey: 'total' },
        ...(ctx.perpetual_inventory !== false ? [
          { purpose: 'inventory', side: 'debit' as const, amountKey: 'subtotal' },
          { purpose: 'cogs', side: 'credit' as const, amountKey: 'subtotal' },
        ] : []),
      ];

    case 'incoming_payment':
      return [
        { purpose: 'cash', side: 'debit', amountKey: 'total' },
        { purpose: 'ar_control', side: 'credit', amountKey: 'total' },
      ];

    case 'ar_down_payment_invoice':
      return [
        { purpose: 'ar_control', side: 'debit', amountKey: 'total' },
        { purpose: 'down_payment_clearing_ar', side: 'credit', amountKey: 'subtotal' },
        { purpose: 'output_vat', side: 'credit', amountKey: 'tax_amount' },
      ];

    case 'goods_receipt_po':
      return [
        { purpose: 'inventory', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'gr_clearing', side: 'credit', amountKey: 'subtotal' },
      ];

    case 'ap_invoice':
      return [
        { purpose: 'gr_clearing', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'input_vat', side: 'debit', amountKey: 'tax_amount' },
        { purpose: 'ap_control', side: 'credit', amountKey: 'total' },
        ...(ctx.price_difference ? [
          { purpose: 'price_difference', side: 'debit' as const, amountKey: 'price_difference' },
        ] : []),
      ];

    case 'ap_credit_memo':
      return [
        { purpose: 'ap_control', side: 'debit', amountKey: 'total' },
        { purpose: 'gr_clearing', side: 'credit', amountKey: 'subtotal' },
        { purpose: 'input_vat', side: 'credit', amountKey: 'tax_amount' },
      ];

    case 'goods_return':
      return [
        { purpose: 'gr_clearing', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'inventory', side: 'credit', amountKey: 'subtotal' },
      ];

    case 'outgoing_payment':
      return [
        { purpose: 'ap_control', side: 'debit', amountKey: 'total' },
        { purpose: 'bank', side: 'credit', amountKey: 'total' },
      ];

    case 'ap_down_payment_invoice':
      return [
        { purpose: 'down_payment_clearing_ap', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'input_vat', side: 'debit', amountKey: 'tax_amount' },
        { purpose: 'ap_control', side: 'credit', amountKey: 'total' },
      ];

    case 'goods_receipt':
      return [
        { purpose: 'inventory', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'inventory_offset', side: 'credit', amountKey: 'subtotal' },
      ];

    case 'goods_issue':
      return [
        { purpose: 'cogs', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'inventory', side: 'credit', amountKey: 'subtotal' },
      ];

    case 'inventory_transfer':
      return [
        { purpose: 'inventory', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'inventory', side: 'credit', amountKey: 'subtotal' },
      ];

    case 'inventory_counting':
      return [
        { purpose: 'inventory_counting_diff', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'inventory', side: 'credit', amountKey: 'subtotal' },
      ];

    case 'inventory_revaluation':
      return [
        { purpose: 'inventory', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'revaluation', side: 'credit', amountKey: 'subtotal' },
      ];

    case 'production_receipt':
      return [
        { purpose: 'inventory', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'wip', side: 'credit', amountKey: 'subtotal' },
      ];

    case 'production_issue':
      return [
        { purpose: 'wip', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'inventory', side: 'credit', amountKey: 'subtotal' },
      ];

    case 'landed_cost':
      return [
        { purpose: 'inventory', side: 'debit', amountKey: 'subtotal' },
        { purpose: 'landed_cost', side: 'credit', amountKey: 'subtotal' },
      ];

    case 'fx_revaluation':
      return [
        { purpose: 'unrealized_exchange_gain', side: 'credit', amountKey: 'subtotal' },
        { purpose: 'ar_control', side: 'debit', amountKey: 'subtotal' },
      ];

    default:
      return [];
  }
}

function getAmount(key: string, ctx: PostingContext): number {
  switch (key) {
    case 'total': return ctx.total || 0;
    case 'subtotal': return ctx.subtotal || 0;
    case 'tax_amount': return ctx.tax_amount || 0;
    case 'line_total': return ctx.line_total || ctx.subtotal || 0;
    case 'discount_amount': return ctx.discount_amount || 0;
    case 'retention_amount': return ctx.retention_amount || 0;
    case 'freight_amount': return ctx.freight_amount || 0;
    case 'price_difference': return ctx.price_difference || 0;
    default: return 0;
  }
}

function buildConfigSnapshot(defaults: GLDefault[]): ConfigSnapshot {
  return {
    defaults: defaults.map(d => ({ account_type: d.account_type, acct_code: d.acct_code, acct_name: d.acct_name, functional_area: d.functional_area })),
    advanced_rules_count: 0, // filled after rule resolution
    snapshot_at: new Date().toISOString(),
  };
}

/**
 * Main Posting Engine - 9 Step Algorithm
 */
export async function executePosting(ctx: PostingContext, companyId?: string): Promise<PostingResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allSteps: ResolutionStep[] = [];

  // Step 1: Identify document type
  const docInfo = identifyDocumentType(ctx.document_type);
  allSteps.push({
    step: 1,
    action: 'Identify Document Type',
    source: 'system',
    details: `${docInfo.label} (${docInfo.area}), Creates JE: ${docInfo.creates_je}`,
  });

  if (!docInfo.creates_je) {
    return {
      status: 'success',
      lines: [],
      total_debit: 0,
      total_credit: 0,
      is_balanced: true,
      matched_rule: null,
      used_defaults: false,
      account_source: 'none',
      resolution_path: allSteps,
      candidate_rules: [],
      config_snapshot: null,
      errors: [],
      warnings: [`${docInfo.label} does not create a journal entry`],
      posting_rationale: `${docInfo.label} is informational only and does not affect accounting.`,
    };
  }

  // Step 2: Classify row type
  const rowType = classifyRowType(ctx);
  allSteps.push({
    step: 2,
    action: 'Classify Row Type',
    source: 'system',
    details: `Row type: ${rowType}`,
  });

  // Fetch active criteria
  const { data: criteriaData } = await supabase
    .from('gl_advanced_criteria' as any)
    .select('*')
    .order('priority_order');
  const activeCriteria = (criteriaData || []) as unknown as AdvancedCriterion[];

  // Fetch default accounts
  let defaultsQuery = supabase
    .from('gl_account_defaults' as any)
    .select('*');
  if (companyId) {
    defaultsQuery = (defaultsQuery as any).or(`company_id.eq.${companyId},company_id.is.null`);
  }
  const { data: defaultsData } = await defaultsQuery;
  const defaults = (defaultsData || []) as unknown as GLDefault[];

  allSteps.push({
    step: 3,
    action: 'Load Configuration',
    source: 'system',
    details: `${activeCriteria.filter(c => c.is_active).length} active criteria, ${defaults.filter(d => d.acct_code).length} default accounts configured`,
  });

  // Step 3: Resolve advanced rules
  const { rule: advancedRule, steps: ruleSteps, candidates: candidateRules } = await resolveAdvancedRule(ctx, activeCriteria, companyId);
  allSteps.push(...ruleSteps);

  // Step 4: Resolve BP control accounts
  const { ar_control, ap_control, steps: bpSteps } = resolveBPAccounts(ctx, defaults);
  allSteps.push(...bpSteps);

  // Step 5-6: Get posting template and resolve accounts
  const template = getDocumentPostingTemplate(ctx.document_type, rowType, ctx);
  if (template.length === 0) {
    errors.push(`No posting template defined for document type "${docInfo.label}" with row type "${rowType}"`);
    return {
      status: 'error',
      lines: [],
      total_debit: 0,
      total_credit: 0,
      is_balanced: false,
      matched_rule: advancedRule,
      used_defaults: !advancedRule,
      account_source: advancedRule ? 'advanced_rule' : 'default',
      resolution_path: allSteps,
      candidate_rules: candidateRules,
      config_snapshot: buildConfigSnapshot(defaults),
      errors,
      warnings,
      posting_rationale: errors.join('; '),
    };
  }

  // Step 7: Generate JE lines
  const lines: PostingLine[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < template.length; i++) {
    const tpl = template[i];
    const amount = Math.abs(getAmount(tpl.amountKey, ctx));

    // Special handling for control accounts
    let resolved;
    if (tpl.purpose === 'ar_control') {
      resolved = { acct_code: ar_control, acct_name: 'A/R Control', source: ctx.bp_ar_control ? 'bp_master' : 'default', details: 'From BP master or default' };
    } else if (tpl.purpose === 'ap_control') {
      resolved = { acct_code: ap_control, acct_name: 'A/P Control', source: ctx.bp_ap_control ? 'bp_master' : 'default', details: 'From BP master or default' };
    } else {
      resolved = resolveAccount(tpl.purpose, advancedRule, defaults, ctx);
    }

    if (!resolved.acct_code) {
      errors.push(`Missing account for "${ACCOUNT_TYPE_LABELS[tpl.purpose] || tpl.purpose}". Configure in Account Determination Settings.`);
    }

    if (amount === 0 && tpl.amountKey !== 'price_difference') {
      warnings.push(`${ACCOUNT_TYPE_LABELS[tpl.purpose] || tpl.purpose}: zero amount (${tpl.amountKey})`);
    }

    const line: PostingLine = {
      line_order: i + 1,
      side: tpl.side,
      acct_code: resolved.acct_code,
      acct_name: resolved.acct_name,
      amount,
      account_purpose: tpl.purpose,
      account_source: resolved.source,
      source_details: resolved.details,
      bp_code: ctx.bp_code,
      project_code: ctx.project,
      cost_center: ctx.cost_center,
      dimension_1: ctx.dimension_1,
      dimension_2: ctx.dimension_2,
      dimension_3: ctx.dimension_3,
      dimension_4: ctx.dimension_4,
      line_memo: `${docInfo.label} - ${ACCOUNT_TYPE_LABELS[tpl.purpose] || tpl.purpose}`,
    };

    if (tpl.side === 'debit') totalDebit += amount;
    else totalCredit += amount;

    lines.push(line);
  }

  allSteps.push({
    step: 7,
    action: 'Generate JE Lines',
    source: 'posting_engine',
    details: `Generated ${lines.length} lines: Debit ${totalDebit.toFixed(2)}, Credit ${totalCredit.toFixed(2)}`,
  });

  // Step 8: Validate
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  if (!isBalanced) {
    errors.push(`Journal entry not balanced: Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}`);
  }

  // Check for active accounts
  const acctCodes = lines.map(l => l.acct_code).filter(Boolean);
  if (acctCodes.length > 0) {
    const { data: activeAccts } = await supabase
      .from('chart_of_accounts')
      .select('acct_code, acct_name, is_active')
      .in('acct_code', acctCodes);
    
    if (activeAccts) {
      const activeSet = new Set(activeAccts.filter((a: any) => a.is_active).map((a: any) => a.acct_code));
      const nameMap = Object.fromEntries(activeAccts.map((a: any) => [a.acct_code, a.acct_name]));
      
      for (const line of lines) {
        if (line.acct_code && !activeSet.has(line.acct_code) && activeAccts.some((a: any) => a.acct_code === line.acct_code)) {
          errors.push(`Account ${line.acct_code} is inactive`);
        }
        // Enrich names from COA
        if (line.acct_code && nameMap[line.acct_code]) {
          line.acct_name = nameMap[line.acct_code];
        }
      }
    }
  }

  allSteps.push({
    step: 8,
    action: 'Validate',
    source: 'posting_engine',
    details: `Balanced: ${isBalanced}, Errors: ${errors.length}, Warnings: ${warnings.length}`,
  });

  // Step 9: Build posting rationale
  const usedDefaults = !advancedRule;
  const accountSource = advancedRule ? 'advanced_rule' : 'default';
  const rationale = advancedRule
    ? `Accounts determined by advanced rule "${advancedRule.rule_name}" (${advancedRule.rule_code}), priority ${advancedRule.priority}`
    : `Accounts determined by default G/L account determination (no matching advanced rule)`;

  allSteps.push({
    step: 9,
    action: 'Posting Rationale',
    source: accountSource,
    details: rationale,
  });

  const hasErrors = errors.length > 0;
  const snapshot = buildConfigSnapshot(defaults);
  snapshot.advanced_rules_count = candidateRules.length;

  return {
    status: hasErrors ? 'error' : warnings.length > 0 ? 'warning' : 'success',
    lines,
    total_debit: totalDebit,
    total_credit: totalCredit,
    is_balanced: isBalanced,
    matched_rule: advancedRule,
    used_defaults: usedDefaults,
    account_source: accountSource,
    resolution_path: allSteps,
    candidate_rules: candidateRules,
    config_snapshot: snapshot,
    errors,
    warnings,
    posting_rationale: rationale,
  };
}

/**
 * Store posting log
 */
export async function storePostingLog(result: PostingResult, ctx: PostingContext, companyId?: string, userId?: string) {
  const { data: log } = await (supabase.from('gl_posting_log' as any).insert({
    document_type: ctx.document_type,
    document_id: ctx.document_id,
    document_number: ctx.document_number,
    row_type: ctx.row_type || 'inventory_item',
    resolution_path: result.resolution_path,
    matched_rule_id: result.matched_rule?.id || null,
    used_defaults: result.used_defaults,
    account_source: result.account_source,
    posting_rationale: result.posting_rationale,
    status: result.status === 'error' ? 'error' : 'posted',
    total_debit: result.total_debit,
    total_credit: result.total_credit,
    is_balanced: result.is_balanced,
    company_id: companyId,
    created_by: userId,
    config_snapshot: result.config_snapshot,
    candidate_rules: result.candidate_rules,
  } as any) as any).select().single();

  if (log && result.lines.length > 0) {
    const logLines = result.lines.map(l => ({
      log_id: (log as any).id,
      line_order: l.line_order,
      side: l.side,
      acct_code: l.acct_code,
      acct_name: l.acct_name,
      amount: l.amount,
      account_purpose: l.account_purpose,
      account_source: l.account_source,
      source_details: l.source_details,
      bp_code: l.bp_code,
      project_code: l.project_code,
      cost_center: l.cost_center,
      dimension_1: l.dimension_1,
      dimension_2: l.dimension_2,
      dimension_3: l.dimension_3,
      dimension_4: l.dimension_4,
      tax_code: l.tax_code,
      line_memo: l.line_memo,
    }));
    await supabase.from('gl_posting_log_lines' as any).insert(logLines as any);
  }

  return log;
}
