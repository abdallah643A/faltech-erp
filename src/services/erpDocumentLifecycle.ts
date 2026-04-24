/**
 * ERP Document Lifecycle Engine
 * Provides status flow, copy-from/to mapping, finance effect classification,
 * approval hooks, and audit trail behavior for all ERP document types.
 */

// ─── Document Status Flow ─────────────────────────────────────────
export type DocumentStatus =
  | 'draft' | 'pending_approval' | 'approved' | 'open'
  | 'partially_processed' | 'closed' | 'canceled' | 'rejected' | 'reversed';

export interface StatusTransition {
  from: DocumentStatus;
  to: DocumentStatus;
  requiresApproval?: boolean;
  requiresReason?: boolean;
  allowedRoles?: string[];
  validationFn?: string; // name of validation to run
}

export interface DocumentTypeConfig {
  id: string;
  module: string;
  label: string;
  category: 'master_data' | 'commitment' | 'quantity_only' | 'stock_value' | 'financial' | 'payment' | 'project_cost' | 'controlling' | 'adjustment' | 'planning';
  financeEffect: FinanceEffectFlags;
  statusFlow: StatusTransition[];
  copyFrom: string[];
  copyTo: string[];
  requiredDimensions: ('branch' | 'project' | 'cost_center' | 'department' | 'cost_code' | 'activity' | 'warehouse')[];
  approvalConditions: ApprovalCondition[];
  cancellationRules: CancellationRules;
  auditFields: string[];
}

export interface FinanceEffectFlags {
  creates_journal_entry: boolean;
  updates_receivable: boolean;
  updates_payable: boolean;
  updates_inventory_qty: boolean;
  updates_inventory_value: boolean;
  updates_fixed_asset: boolean;
  updates_depreciation: boolean;
  updates_project_cost: boolean;
  updates_wip: boolean;
  updates_cash_flow: boolean;
  updates_tax_report: boolean;
  updates_budget_consumed: boolean;
  creates_commitment: boolean;
  updates_retention: boolean;
  updates_subcontract_liability: boolean;
  updates_revenue: boolean;
  updates_cogs: boolean;
}

export interface ApprovalCondition {
  type: 'amount_exceeds' | 'margin_below' | 'discount_above' | 'budget_exceeded' | 'price_variance' | 'quantity_variance' | 'sensitive_item' | 'project_scope' | 'branch_restriction';
  threshold?: number;
  description: string;
}

export interface CancellationRules {
  direct_cancel_allowed: boolean;
  requires_reversal_journal: boolean;
  reversal_date_rule: 'same_date' | 'current_date' | 'user_specified';
  requires_credit_note: boolean;
  blocks_if_downstream: boolean;
  requires_approval: boolean;
  downstream_doc_types: string[];
}

// ─── No-Effect Flags (convenience) ────────────────────────────────
const NO_FINANCE_EFFECT: FinanceEffectFlags = {
  creates_journal_entry: false, updates_receivable: false, updates_payable: false,
  updates_inventory_qty: false, updates_inventory_value: false, updates_fixed_asset: false,
  updates_depreciation: false, updates_project_cost: false, updates_wip: false,
  updates_cash_flow: false, updates_tax_report: false, updates_budget_consumed: false,
  creates_commitment: false, updates_retention: false, updates_subcontract_liability: false,
  updates_revenue: false, updates_cogs: false,
};

// ─── Standard Status Flows ────────────────────────────────────────
const STANDARD_DOC_FLOW: StatusTransition[] = [
  { from: 'draft', to: 'pending_approval' },
  { from: 'pending_approval', to: 'approved' },
  { from: 'pending_approval', to: 'rejected', requiresReason: true },
  { from: 'approved', to: 'open' },
  { from: 'open', to: 'partially_processed' },
  { from: 'open', to: 'closed' },
  { from: 'partially_processed', to: 'closed' },
  { from: 'open', to: 'canceled', requiresReason: true },
  { from: 'draft', to: 'canceled' },
];

const SIMPLE_FLOW: StatusTransition[] = [
  { from: 'draft', to: 'open' },
  { from: 'open', to: 'closed' },
  { from: 'open', to: 'canceled', requiresReason: true },
];

const STANDARD_CANCEL: CancellationRules = {
  direct_cancel_allowed: true, requires_reversal_journal: false,
  reversal_date_rule: 'current_date', requires_credit_note: false,
  blocks_if_downstream: true, requires_approval: false, downstream_doc_types: [],
};

const FINANCIAL_CANCEL: CancellationRules = {
  direct_cancel_allowed: false, requires_reversal_journal: true,
  reversal_date_rule: 'current_date', requires_credit_note: true,
  blocks_if_downstream: true, requires_approval: true, downstream_doc_types: [],
};

// ─── Document Type Registry ───────────────────────────────────────
export const documentTypeRegistry: Record<string, DocumentTypeConfig> = {
  // ── Sales ──
  sales_quotation: {
    id: 'sales_quotation', module: 'sales', label: 'Sales Quotation',
    category: 'planning',
    financeEffect: NO_FINANCE_EFFECT,
    statusFlow: [...STANDARD_DOC_FLOW],
    copyFrom: [], copyTo: ['sales_order'],
    requiredDimensions: [],
    approvalConditions: [
      { type: 'margin_below', threshold: 15, description: 'Margin below 15% requires approval' },
      { type: 'discount_above', threshold: 20, description: 'Discount above 20% requires approval' },
    ],
    cancellationRules: { ...STANDARD_CANCEL },
    auditFields: ['status', 'total', 'discount_percent'],
  },
  sales_order: {
    id: 'sales_order', module: 'sales', label: 'Sales Order',
    category: 'commitment',
    financeEffect: { ...NO_FINANCE_EFFECT, creates_commitment: true },
    statusFlow: [...STANDARD_DOC_FLOW],
    copyFrom: ['sales_quotation'], copyTo: ['delivery', 'ar_invoice', 'ar_down_payment'],
    requiredDimensions: ['branch'],
    approvalConditions: [
      { type: 'amount_exceeds', threshold: 500000, description: 'Orders above 500K require approval' },
    ],
    cancellationRules: { ...STANDARD_CANCEL, downstream_doc_types: ['delivery', 'ar_invoice'] },
    auditFields: ['status', 'total', 'customer_code'],
  },
  delivery: {
    id: 'delivery', module: 'sales', label: 'Delivery',
    category: 'stock_value',
    financeEffect: {
      ...NO_FINANCE_EFFECT, updates_inventory_qty: true, updates_inventory_value: true,
      updates_cogs: true, creates_journal_entry: true, updates_project_cost: true,
    },
    statusFlow: [...SIMPLE_FLOW],
    copyFrom: ['sales_order'], copyTo: ['ar_invoice', 'return'],
    requiredDimensions: ['warehouse'],
    approvalConditions: [],
    cancellationRules: { ...FINANCIAL_CANCEL, downstream_doc_types: ['ar_invoice'] },
    auditFields: ['status', 'warehouse'],
  },
  ar_invoice: {
    id: 'ar_invoice', module: 'sales', label: 'AR Invoice',
    category: 'financial',
    financeEffect: {
      ...NO_FINANCE_EFFECT, creates_journal_entry: true, updates_receivable: true,
      updates_revenue: true, updates_tax_report: true, updates_cash_flow: true,
      updates_project_cost: true, updates_retention: true,
    },
    statusFlow: [...SIMPLE_FLOW],
    copyFrom: ['delivery', 'sales_order'], copyTo: ['ar_credit_memo', 'incoming_payment'],
    requiredDimensions: ['branch'],
    approvalConditions: [],
    cancellationRules: { ...FINANCIAL_CANCEL, downstream_doc_types: ['incoming_payment'] },
    auditFields: ['status', 'total', 'tax_amount'],
  },
  ar_credit_memo: {
    id: 'ar_credit_memo', module: 'sales', label: 'AR Credit Memo',
    category: 'financial',
    financeEffect: {
      ...NO_FINANCE_EFFECT, creates_journal_entry: true, updates_receivable: true,
      updates_revenue: true, updates_tax_report: true,
    },
    statusFlow: [...SIMPLE_FLOW],
    copyFrom: ['ar_invoice', 'return'], copyTo: [],
    requiredDimensions: ['branch'],
    approvalConditions: [{ type: 'amount_exceeds', threshold: 100000, description: 'Credit memos above 100K require approval' }],
    cancellationRules: { ...FINANCIAL_CANCEL },
    auditFields: ['status', 'total', 'reason_code'],
  },
  incoming_payment: {
    id: 'incoming_payment', module: 'sales', label: 'Incoming Payment',
    category: 'payment',
    financeEffect: {
      ...NO_FINANCE_EFFECT, creates_journal_entry: true, updates_receivable: true,
      updates_cash_flow: true,
    },
    statusFlow: [...SIMPLE_FLOW],
    copyFrom: ['ar_invoice'], copyTo: [],
    requiredDimensions: [],
    approvalConditions: [],
    cancellationRules: { ...FINANCIAL_CANCEL },
    auditFields: ['status', 'amount', 'payment_method'],
  },

  // ── Purchasing ──
  purchase_request: {
    id: 'purchase_request', module: 'purchasing', label: 'Purchase Request',
    category: 'planning',
    financeEffect: { ...NO_FINANCE_EFFECT },
    statusFlow: [...STANDARD_DOC_FLOW],
    copyFrom: [], copyTo: ['purchase_quotation', 'purchase_order'],
    requiredDimensions: ['department'],
    approvalConditions: [
      { type: 'amount_exceeds', threshold: 50000, description: 'PRs above 50K require approval' },
      { type: 'budget_exceeded', description: 'PR exceeding budget requires approval' },
    ],
    cancellationRules: { ...STANDARD_CANCEL },
    auditFields: ['status', 'total', 'requester'],
  },
  purchase_order: {
    id: 'purchase_order', module: 'purchasing', label: 'Purchase Order',
    category: 'commitment',
    financeEffect: { ...NO_FINANCE_EFFECT, creates_commitment: true, updates_budget_consumed: true },
    statusFlow: [...STANDARD_DOC_FLOW],
    copyFrom: ['purchase_request', 'purchase_quotation'], copyTo: ['goods_receipt_po', 'ap_invoice'],
    requiredDimensions: ['branch', 'project', 'cost_center'],
    approvalConditions: [
      { type: 'amount_exceeds', threshold: 100000, description: 'POs above 100K require approval' },
      { type: 'budget_exceeded', description: 'PO exceeding budget requires approval' },
    ],
    cancellationRules: { ...STANDARD_CANCEL, downstream_doc_types: ['goods_receipt_po', 'ap_invoice'] },
    auditFields: ['status', 'total', 'vendor_code'],
  },
  goods_receipt_po: {
    id: 'goods_receipt_po', module: 'purchasing', label: 'Goods Receipt PO',
    category: 'stock_value',
    financeEffect: {
      ...NO_FINANCE_EFFECT, creates_journal_entry: true, updates_inventory_qty: true,
      updates_inventory_value: true, updates_project_cost: true,
    },
    statusFlow: [...SIMPLE_FLOW],
    copyFrom: ['purchase_order'], copyTo: ['ap_invoice', 'goods_return'],
    requiredDimensions: ['warehouse'],
    approvalConditions: [{ type: 'quantity_variance', threshold: 10, description: 'Quantity variance >10% requires approval' }],
    cancellationRules: { ...FINANCIAL_CANCEL, downstream_doc_types: ['ap_invoice'] },
    auditFields: ['status', 'warehouse'],
  },
  ap_invoice: {
    id: 'ap_invoice', module: 'purchasing', label: 'AP Invoice',
    category: 'financial',
    financeEffect: {
      ...NO_FINANCE_EFFECT, creates_journal_entry: true, updates_payable: true,
      updates_tax_report: true, updates_cash_flow: true, updates_project_cost: true,
      updates_budget_consumed: true, updates_retention: true,
    },
    statusFlow: [...SIMPLE_FLOW],
    copyFrom: ['goods_receipt_po', 'purchase_order'], copyTo: ['ap_credit_memo', 'outgoing_payment'],
    requiredDimensions: ['branch', 'cost_center'],
    approvalConditions: [
      { type: 'price_variance', threshold: 5, description: 'Price variance >5% from PO requires approval' },
    ],
    cancellationRules: { ...FINANCIAL_CANCEL, downstream_doc_types: ['outgoing_payment'] },
    auditFields: ['status', 'total', 'tax_amount', 'vendor_code'],
  },

  // ── Inventory ──
  goods_receipt: {
    id: 'goods_receipt', module: 'inventory', label: 'Goods Receipt',
    category: 'stock_value',
    financeEffect: {
      ...NO_FINANCE_EFFECT, creates_journal_entry: true, updates_inventory_qty: true,
      updates_inventory_value: true, updates_project_cost: true,
    },
    statusFlow: [...SIMPLE_FLOW],
    copyFrom: [], copyTo: [],
    requiredDimensions: ['warehouse'],
    approvalConditions: [],
    cancellationRules: { ...FINANCIAL_CANCEL },
    auditFields: ['status', 'warehouse', 'total'],
  },
  goods_issue: {
    id: 'goods_issue', module: 'inventory', label: 'Goods Issue',
    category: 'stock_value',
    financeEffect: {
      ...NO_FINANCE_EFFECT, creates_journal_entry: true, updates_inventory_qty: true,
      updates_inventory_value: true, updates_project_cost: true, updates_budget_consumed: true,
    },
    statusFlow: [...SIMPLE_FLOW],
    copyFrom: [], copyTo: [],
    requiredDimensions: ['warehouse', 'project', 'cost_code'],
    approvalConditions: [{ type: 'budget_exceeded', description: 'Issue exceeding project budget requires approval' }],
    cancellationRules: { ...FINANCIAL_CANCEL },
    auditFields: ['status', 'warehouse', 'project'],
  },
  inventory_transfer: {
    id: 'inventory_transfer', module: 'inventory', label: 'Inventory Transfer',
    category: 'quantity_only',
    financeEffect: { ...NO_FINANCE_EFFECT, updates_inventory_qty: true },
    statusFlow: [...STANDARD_DOC_FLOW],
    copyFrom: ['inventory_transfer_request'], copyTo: [],
    requiredDimensions: ['warehouse'],
    approvalConditions: [],
    cancellationRules: { ...STANDARD_CANCEL },
    auditFields: ['status', 'from_warehouse', 'to_warehouse'],
  },
  inventory_counting: {
    id: 'inventory_counting', module: 'inventory', label: 'Inventory Counting',
    category: 'adjustment',
    financeEffect: NO_FINANCE_EFFECT, // posting creates the effect
    statusFlow: [
      { from: 'draft', to: 'open' },
      { from: 'open', to: 'closed' }, // triggers posting
      { from: 'open', to: 'canceled' },
    ],
    copyFrom: [], copyTo: ['inventory_posting'],
    requiredDimensions: ['warehouse'],
    approvalConditions: [],
    cancellationRules: { ...STANDARD_CANCEL },
    auditFields: ['status', 'warehouse', 'counted_by'],
  },

  // ── Manufacturing ──
  production_order: {
    id: 'production_order', module: 'manufacturing', label: 'Production Order',
    category: 'commitment',
    financeEffect: { ...NO_FINANCE_EFFECT, creates_commitment: true },
    statusFlow: [
      { from: 'draft', to: 'pending_approval' },
      { from: 'pending_approval', to: 'approved' },
      { from: 'approved', to: 'open' }, // released
      { from: 'open', to: 'partially_processed' }, // in production
      { from: 'partially_processed', to: 'closed' },
      { from: 'open', to: 'closed' },
      { from: 'open', to: 'canceled', requiresReason: true },
    ],
    copyFrom: ['bill_of_materials'], copyTo: ['issue_for_production', 'receipt_from_production'],
    requiredDimensions: ['warehouse', 'cost_center'],
    approvalConditions: [],
    cancellationRules: { ...STANDARD_CANCEL, downstream_doc_types: ['issue_for_production'] },
    auditFields: ['status', 'item_code', 'planned_qty', 'actual_qty'],
  },
  issue_for_production: {
    id: 'issue_for_production', module: 'manufacturing', label: 'Issue for Production',
    category: 'stock_value',
    financeEffect: {
      ...NO_FINANCE_EFFECT, creates_journal_entry: true, updates_inventory_qty: true,
      updates_inventory_value: true, updates_wip: true,
    },
    statusFlow: [...SIMPLE_FLOW],
    copyFrom: ['production_order'], copyTo: [],
    requiredDimensions: ['warehouse'],
    approvalConditions: [],
    cancellationRules: { ...FINANCIAL_CANCEL },
    auditFields: ['status', 'production_order', 'item_code'],
  },
  receipt_from_production: {
    id: 'receipt_from_production', module: 'manufacturing', label: 'Receipt from Production',
    category: 'stock_value',
    financeEffect: {
      ...NO_FINANCE_EFFECT, creates_journal_entry: true, updates_inventory_qty: true,
      updates_inventory_value: true, updates_wip: true,
    },
    statusFlow: [...SIMPLE_FLOW],
    copyFrom: ['production_order'], copyTo: [],
    requiredDimensions: ['warehouse'],
    approvalConditions: [],
    cancellationRules: { ...FINANCIAL_CANCEL },
    auditFields: ['status', 'production_order', 'yield_qty', 'scrap_qty'],
  },

  // ── Construction ──
  tender: {
    id: 'tender', module: 'construction', label: 'Tender',
    category: 'planning',
    financeEffect: NO_FINANCE_EFFECT,
    statusFlow: [
      { from: 'draft', to: 'pending_approval' },
      { from: 'pending_approval', to: 'approved' },
      { from: 'approved', to: 'open' }, // submitted
      { from: 'open', to: 'closed' }, // awarded or lost
      { from: 'draft', to: 'canceled' },
    ],
    copyFrom: [], copyTo: ['project', 'contract'],
    requiredDimensions: ['branch'],
    approvalConditions: [
      { type: 'amount_exceeds', threshold: 1000000, description: 'Tenders above 1M require senior approval' },
    ],
    cancellationRules: { ...STANDARD_CANCEL },
    auditFields: ['status', 'bid_value', 'estimated_cost', 'margin'],
  },
  subcontract_agreement: {
    id: 'subcontract_agreement', module: 'construction', label: 'Subcontract Agreement',
    category: 'commitment',
    financeEffect: { ...NO_FINANCE_EFFECT, creates_commitment: true, updates_subcontract_liability: true },
    statusFlow: [...STANDARD_DOC_FLOW],
    copyFrom: ['subcontract_rfq'], copyTo: ['subcontract_ipc', 'subcontract_variation'],
    requiredDimensions: ['project', 'cost_code', 'branch'],
    approvalConditions: [
      { type: 'amount_exceeds', threshold: 500000, description: 'Subcontracts above 500K require approval' },
      { type: 'budget_exceeded', description: 'Subcontract exceeding project budget requires approval' },
    ],
    cancellationRules: { ...STANDARD_CANCEL, downstream_doc_types: ['subcontract_ipc'] },
    auditFields: ['status', 'total', 'subcontractor', 'project'],
  },
  subcontract_ipc: {
    id: 'subcontract_ipc', module: 'construction', label: 'Subcontract IPC',
    category: 'financial',
    financeEffect: {
      ...NO_FINANCE_EFFECT, creates_journal_entry: true, updates_payable: true,
      updates_project_cost: true, updates_retention: true, updates_subcontract_liability: true,
      updates_budget_consumed: true,
    },
    statusFlow: [...STANDARD_DOC_FLOW],
    copyFrom: ['subcontract_agreement'], copyTo: ['ap_invoice'],
    requiredDimensions: ['project', 'cost_code', 'branch'],
    approvalConditions: [],
    cancellationRules: { ...FINANCIAL_CANCEL },
    auditFields: ['status', 'certified_amount', 'retention', 'advance_recovery'],
  },
  client_ipc: {
    id: 'client_ipc', module: 'construction', label: 'Client IPC / Valuation',
    category: 'financial',
    financeEffect: {
      ...NO_FINANCE_EFFECT, creates_journal_entry: true, updates_receivable: true,
      updates_revenue: true, updates_tax_report: true, updates_retention: true,
      updates_project_cost: true, updates_cash_flow: true,
    },
    statusFlow: [...STANDARD_DOC_FLOW],
    copyFrom: ['billing_plan'], copyTo: ['ar_invoice'],
    requiredDimensions: ['project', 'branch'],
    approvalConditions: [],
    cancellationRules: { ...FINANCIAL_CANCEL },
    auditFields: ['status', 'certified_amount', 'retention_deducted', 'advance_recovered'],
  },
  variation_order: {
    id: 'variation_order', module: 'construction', label: 'Variation Order',
    category: 'planning',
    financeEffect: NO_FINANCE_EFFECT,
    statusFlow: [
      { from: 'draft', to: 'pending_approval', requiresApproval: true },
      { from: 'pending_approval', to: 'approved' },
      { from: 'pending_approval', to: 'rejected', requiresReason: true },
      { from: 'approved', to: 'closed' },
      { from: 'draft', to: 'canceled' },
    ],
    copyFrom: [], copyTo: [],
    requiredDimensions: ['project'],
    approvalConditions: [{ type: 'project_scope', description: 'All variation orders require project manager approval' }],
    cancellationRules: { ...STANDARD_CANCEL },
    auditFields: ['status', 'original_value', 'revised_value', 'cost_impact', 'revenue_impact'],
  },
};

// ─── Helper Functions ─────────────────────────────────────────────
export function getDocumentConfig(docType: string): DocumentTypeConfig | undefined {
  return documentTypeRegistry[docType];
}

export function getValidTransitions(docType: string, currentStatus: DocumentStatus): StatusTransition[] {
  const config = documentTypeRegistry[docType];
  if (!config) return [];
  return config.statusFlow.filter(t => t.from === currentStatus);
}

export function canTransition(docType: string, from: DocumentStatus, to: DocumentStatus): { allowed: boolean; reason?: string } {
  const config = documentTypeRegistry[docType];
  if (!config) return { allowed: false, reason: 'Unknown document type' };
  const transition = config.statusFlow.find(t => t.from === from && t.to === to);
  if (!transition) return { allowed: false, reason: `Transition from ${from} to ${to} is not allowed` };
  return { allowed: true };
}

export function getCopyFromOptions(docType: string): string[] {
  return documentTypeRegistry[docType]?.copyFrom || [];
}

export function getCopyToOptions(docType: string): string[] {
  return documentTypeRegistry[docType]?.copyTo || [];
}

export function getFinanceEffect(docType: string): FinanceEffectFlags | undefined {
  return documentTypeRegistry[docType]?.financeEffect;
}

export function hasFinanceEffect(docType: string): boolean {
  const flags = getFinanceEffect(docType);
  if (!flags) return false;
  return flags.creates_journal_entry || flags.updates_receivable || flags.updates_payable ||
    flags.updates_inventory_value || flags.updates_project_cost || flags.updates_wip;
}

export function getApprovalConditions(docType: string): ApprovalCondition[] {
  return documentTypeRegistry[docType]?.approvalConditions || [];
}

export function getCancellationRules(docType: string): CancellationRules | undefined {
  return documentTypeRegistry[docType]?.cancellationRules;
}

export function getRequiredDimensions(docType: string): string[] {
  return documentTypeRegistry[docType]?.requiredDimensions || [];
}

// ─── Document Flow Map (for relationship visualization) ───────────
export const documentFlowMap: Record<string, { upstream: string[]; downstream: string[] }> = {
  sales_quotation: { upstream: [], downstream: ['sales_order'] },
  sales_order: { upstream: ['sales_quotation'], downstream: ['delivery', 'ar_invoice', 'ar_down_payment'] },
  delivery: { upstream: ['sales_order'], downstream: ['ar_invoice', 'return'] },
  ar_invoice: { upstream: ['delivery', 'sales_order'], downstream: ['ar_credit_memo', 'incoming_payment'] },
  ar_credit_memo: { upstream: ['ar_invoice', 'return'], downstream: [] },
  incoming_payment: { upstream: ['ar_invoice'], downstream: [] },
  purchase_request: { upstream: [], downstream: ['purchase_quotation', 'purchase_order'] },
  purchase_order: { upstream: ['purchase_request', 'purchase_quotation'], downstream: ['goods_receipt_po', 'ap_invoice'] },
  goods_receipt_po: { upstream: ['purchase_order'], downstream: ['ap_invoice', 'goods_return'] },
  ap_invoice: { upstream: ['goods_receipt_po', 'purchase_order'], downstream: ['ap_credit_memo', 'outgoing_payment'] },
  tender: { upstream: [], downstream: ['project', 'contract'] },
  subcontract_agreement: { upstream: ['subcontract_rfq'], downstream: ['subcontract_ipc', 'subcontract_variation'] },
  subcontract_ipc: { upstream: ['subcontract_agreement'], downstream: ['ap_invoice'] },
  client_ipc: { upstream: ['billing_plan'], downstream: ['ar_invoice'] },
  production_order: { upstream: ['bill_of_materials'], downstream: ['issue_for_production', 'receipt_from_production'] },
};

// ─── Finance Effect Summary for UI ────────────────────────────────
export function getFinanceEffectSummary(docType: string): string[] {
  const flags = getFinanceEffect(docType);
  if (!flags) return ['No finance effect'];
  const effects: string[] = [];
  if (flags.creates_journal_entry) effects.push('Creates Journal Entry');
  if (flags.updates_receivable) effects.push('Updates Receivable');
  if (flags.updates_payable) effects.push('Updates Payable');
  if (flags.updates_inventory_qty) effects.push('Updates Inventory Qty');
  if (flags.updates_inventory_value) effects.push('Updates Inventory Value');
  if (flags.updates_revenue) effects.push('Updates Revenue');
  if (flags.updates_cogs) effects.push('Updates COGS');
  if (flags.updates_project_cost) effects.push('Updates Project Cost');
  if (flags.updates_wip) effects.push('Updates WIP');
  if (flags.updates_cash_flow) effects.push('Updates Cash Flow');
  if (flags.updates_tax_report) effects.push('Updates Tax');
  if (flags.updates_budget_consumed) effects.push('Updates Budget');
  if (flags.creates_commitment) effects.push('Creates Commitment');
  if (flags.updates_retention) effects.push('Updates Retention');
  if (flags.updates_subcontract_liability) effects.push('Updates Subcontract Liability');
  if (flags.updates_fixed_asset) effects.push('Updates Fixed Assets');
  if (flags.updates_depreciation) effects.push('Updates Depreciation');
  return effects.length > 0 ? effects : ['No finance effect'];
}
