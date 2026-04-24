/**
 * Document Finance Classification Engine
 * Classifies every ERP document type with finance effect flags,
 * posting control rules, and project cost impact metadata.
 * 
 * SAP B1-style: every document clearly defines its accounting behavior.
 */

// ===== Document Classification =====

export type DocumentCategory =
  | 'master_config'           // Non-financial master/configuration document
  | 'commitment'              // Commitment document (PO, subcontract, reservation)
  | 'operational_qty'         // Operational with quantity effect only
  | 'operational_stock_value' // Operational with stock value effect
  | 'financial_journal'       // Financial document with journal impact
  | 'payment_cash'            // Payment/cash movement document
  | 'project_cost'            // Project cost document
  | 'controlling_budget'      // Controlling/budget document
  | 'adjustment_recon';       // Adjustment/reconciliation document

export type CostType = 'labor' | 'material' | 'equipment' | 'subcontract' | 'overhead' | 'misc';

export interface FinanceEffectFlags {
  creates_journal_entry: boolean;
  updates_receivable: boolean;
  updates_payable: boolean;
  updates_inventory_qty: boolean;
  updates_inventory_valuation: boolean;
  updates_fixed_asset_register: boolean;
  updates_depreciation_schedule: boolean;
  updates_project_cost: boolean;
  updates_wip: boolean;
  updates_cash_flow_forecast: boolean;
  updates_tax_report: boolean;
  updates_budget_consumed: boolean;
  updates_commitment_amount: boolean;
  updates_retention_balance: boolean;
  updates_subcontract_liability: boolean;
  updates_sales_forecast: boolean;
  updates_credit_exposure: boolean;
  creates_commitment: boolean;
  reserves_stock: boolean;
}

export interface PostingControlRules {
  requires_open_period: boolean;
  requires_active_branch: boolean;
  requires_account_determination: boolean;
  requires_cost_center: boolean;
  requires_project: boolean;
  requires_dimensions: boolean;
  requires_exchange_rate: boolean;
  requires_tax_code: boolean;
  requires_budget_check: boolean;
  requires_approval: boolean;
  requires_base_document: boolean;
  requires_duplicate_check: boolean;
  approval_amount_threshold: number | null; // null = always, number = only above threshold
}

export interface CancellationRules {
  direct_cancel_allowed: boolean;
  reverse_journal_required: boolean;
  reversal_date_must_match_original: boolean;
  requires_credit_note_or_return: boolean;
  downstream_documents_block_cancel: boolean;
  requires_approval_for_reversal: boolean;
  allowed_reversal_methods: ('cancel' | 'reverse_je' | 'credit_note' | 'return' | 'adjustment')[];
}

export interface ProjectCostImpact {
  updates_budget_committed: boolean;
  updates_budget_actual: boolean;
  updates_cost_by_code: boolean;
  cost_types: CostType[];
  updates_retention_receivable: boolean;
  updates_retention_payable: boolean;
  updates_wip_or_earned_value: boolean;
  requires_cost_code: boolean;
  requires_wbs_activity: boolean;
}

export interface TypicalJournalEntry {
  description: string;
  entries: Array<{ side: 'Dr' | 'Cr'; account_purpose: string; amount_source: string }>;
}

export interface DocumentFinanceProfile {
  document_type: string;
  label: string;
  category: DocumentCategory;
  functional_area: 'sales' | 'purchasing' | 'inventory' | 'banking' | 'fixed_assets' | 'payroll' | 'construction' | 'general';
  business_purpose: string;
  finance_effect_flags: FinanceEffectFlags;
  posting_control: PostingControlRules;
  cancellation_rules: CancellationRules;
  project_cost_impact: ProjectCostImpact;
  typical_journal: TypicalJournalEntry | null;
  downstream_documents: string[];
  upstream_documents: string[];
}

// ===== Default Finance Effect Flags (all false) =====

const NO_EFFECT: FinanceEffectFlags = {
  creates_journal_entry: false, updates_receivable: false, updates_payable: false,
  updates_inventory_qty: false, updates_inventory_valuation: false,
  updates_fixed_asset_register: false, updates_depreciation_schedule: false,
  updates_project_cost: false, updates_wip: false, updates_cash_flow_forecast: false,
  updates_tax_report: false, updates_budget_consumed: false, updates_commitment_amount: false,
  updates_retention_balance: false, updates_subcontract_liability: false,
  updates_sales_forecast: false, updates_credit_exposure: false,
  creates_commitment: false, reserves_stock: false,
};

const NO_PROJECT_IMPACT: ProjectCostImpact = {
  updates_budget_committed: false, updates_budget_actual: false, updates_cost_by_code: false,
  cost_types: [], updates_retention_receivable: false, updates_retention_payable: false,
  updates_wip_or_earned_value: false, requires_cost_code: false, requires_wbs_activity: false,
};

const STANDARD_POSTING_CONTROL: PostingControlRules = {
  requires_open_period: true, requires_active_branch: true, requires_account_determination: true,
  requires_cost_center: false, requires_project: false, requires_dimensions: false,
  requires_exchange_rate: false, requires_tax_code: true, requires_budget_check: false,
  requires_approval: false, requires_base_document: false, requires_duplicate_check: true,
  approval_amount_threshold: null,
};

const STANDARD_CANCEL: CancellationRules = {
  direct_cancel_allowed: false, reverse_journal_required: true,
  reversal_date_must_match_original: false, requires_credit_note_or_return: false,
  downstream_documents_block_cancel: true, requires_approval_for_reversal: false,
  allowed_reversal_methods: ['reverse_je'],
};

// ===== Complete Document Finance Registry =====

export const DOCUMENT_FINANCE_REGISTRY: Record<string, DocumentFinanceProfile> = {
  // ============ MASTER DATA ============
  chart_of_accounts: {
    document_type: 'chart_of_accounts', label: 'Chart of Accounts',
    category: 'master_config', functional_area: 'general',
    business_purpose: 'Controls all account mapping used by transactional screens. Account type drives allowed usage in AP, AR, inventory, assets, payroll, tax, bank, WIP.',
    finance_effect_flags: NO_EFFECT,
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_tax_code: false },
    cancellation_rules: { ...STANDARD_CANCEL, direct_cancel_allowed: false, downstream_documents_block_cancel: true, allowed_reversal_methods: [] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: null, downstream_documents: [], upstream_documents: [],
  },
  business_partner: {
    document_type: 'business_partner', label: 'Business Partner Master',
    category: 'master_config', functional_area: 'general',
    business_purpose: 'No journal at creation, but affects future AR/AP postings. Control account, payment terms, tax group, credit limit, and retention settings drive downstream behavior.',
    finance_effect_flags: { ...NO_EFFECT, updates_credit_exposure: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_tax_code: false },
    cancellation_rules: { ...STANDARD_CANCEL, allowed_reversal_methods: [] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: null, downstream_documents: ['sales_quotation', 'sales_order', 'purchase_order'], upstream_documents: [],
  },
  item_master: {
    document_type: 'item_master', label: 'Item Master',
    category: 'master_config', functional_area: 'inventory',
    business_purpose: 'No journal at creation, but drives inventory and COGS postings. Item group and valuation method determine stock accounts.',
    finance_effect_flags: NO_EFFECT,
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_tax_code: false },
    cancellation_rules: { ...STANDARD_CANCEL, allowed_reversal_methods: [] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: null, downstream_documents: ['delivery', 'goods_receipt_po', 'goods_issue'], upstream_documents: [],
  },
  warehouse_master: {
    document_type: 'warehouse_master', label: 'Warehouse Master',
    category: 'master_config', functional_area: 'inventory',
    business_purpose: 'Warehouse may override inventory accounts. Branch linkage controls financial branch dimension. Transit warehouse logic affects transfer accounting.',
    finance_effect_flags: NO_EFFECT,
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_tax_code: false },
    cancellation_rules: { ...STANDARD_CANCEL, allowed_reversal_methods: [] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: null, downstream_documents: [], upstream_documents: [],
  },
  fixed_asset_master: {
    document_type: 'fixed_asset_master', label: 'Fixed Asset Master',
    category: 'master_config', functional_area: 'fixed_assets',
    business_purpose: 'Creation may not post immediately unless capitalization occurs. Asset class determines acquisition, accumulated depreciation, depreciation expense, and retirement accounts.',
    finance_effect_flags: { ...NO_EFFECT, updates_fixed_asset_register: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_tax_code: false },
    cancellation_rules: { ...STANDARD_CANCEL, allowed_reversal_methods: [] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: null, downstream_documents: ['depreciation', 'asset_disposal'], upstream_documents: [],
  },
  employee_master: {
    document_type: 'employee_master', label: 'Employee Master',
    category: 'master_config', functional_area: 'payroll',
    business_purpose: 'No journal at creation, but affects payroll posting. Branch/department/cost center determine payroll expense allocation. Project/site assignment may route labor cost to project.',
    finance_effect_flags: NO_EFFECT,
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_tax_code: false },
    cancellation_rules: { ...STANDARD_CANCEL, allowed_reversal_methods: [] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: null, downstream_documents: ['payroll_posting'], upstream_documents: [],
  },
  project_master: {
    document_type: 'project_master', label: 'Project Master',
    category: 'master_config', functional_area: 'construction',
    business_purpose: 'No journal at creation. Acts as controlling object for all project costs/revenues. Links budget, commitment, actual cost, billing, WIP, retention, subcontract, and cash flow.',
    finance_effect_flags: NO_EFFECT,
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_tax_code: false },
    cancellation_rules: { ...STANDARD_CANCEL, allowed_reversal_methods: [] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: null, downstream_documents: ['purchase_order', 'progress_billing', 'goods_issue'], upstream_documents: ['tender_award'],
  },

  // ============ SALES CYCLE ============
  sales_quotation: {
    document_type: 'sales_quotation', label: 'Sales Quotation',
    category: 'master_config', functional_area: 'sales',
    business_purpose: 'No journal entry, no receivable. May update sales forecast and project revenue forecast. Approval may be required for discount/margin deviations.',
    finance_effect_flags: { ...NO_EFFECT, updates_sales_forecast: true, updates_cash_flow_forecast: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_approval: true, approval_amount_threshold: null },
    cancellation_rules: { ...STANDARD_CANCEL, direct_cancel_allowed: true, reverse_journal_required: false, allowed_reversal_methods: ['cancel'] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: null,
    downstream_documents: ['sales_order'], upstream_documents: [],
  },
  sales_order: {
    document_type: 'sales_order', label: 'Sales Order',
    category: 'commitment', functional_area: 'sales',
    business_purpose: 'Normally no journal entry. Creates commercial commitment. Can reserve stock, consume project sales budget, trigger credit exposure increase. For construction, may represent contract value.',
    finance_effect_flags: { ...NO_EFFECT, creates_commitment: true, reserves_stock: true, updates_credit_exposure: true, updates_cash_flow_forecast: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_approval: true, approval_amount_threshold: 50000 },
    cancellation_rules: { ...STANDARD_CANCEL, direct_cancel_allowed: true, reverse_journal_required: false, downstream_documents_block_cancel: true, allowed_reversal_methods: ['cancel'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_committed: true },
    typical_journal: null,
    downstream_documents: ['delivery', 'ar_invoice', 'ar_down_payment_invoice'], upstream_documents: ['sales_quotation'],
  },
  delivery: {
    document_type: 'delivery', label: 'Delivery',
    category: 'operational_stock_value', functional_area: 'sales',
    business_purpose: 'Reduces inventory quantity and valuation. Creates COGS entry. Updates project material issue cost if linked to project/site.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_inventory_qty: true, updates_inventory_valuation: true, updates_project_cost: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_base_document: true },
    cancellation_rules: { ...STANDARD_CANCEL, requires_credit_note_or_return: true, downstream_documents_block_cancel: true, allowed_reversal_methods: ['return', 'reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true, updates_cost_by_code: true, cost_types: ['material'] },
    typical_journal: { description: 'Delivery posting', entries: [
      { side: 'Dr', account_purpose: 'cogs', amount_source: 'subtotal' },
      { side: 'Cr', account_purpose: 'inventory', amount_source: 'subtotal' },
    ]},
    downstream_documents: ['ar_invoice'], upstream_documents: ['sales_order'],
  },
  ar_invoice: {
    document_type: 'ar_invoice', label: 'A/R Invoice',
    category: 'financial_journal', functional_area: 'sales',
    business_purpose: 'Creates receivable, posts revenue, tax, and possibly COGS. Updates customer balance, sales analysis, project revenue actual. May update retention receivable for construction billing.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_receivable: true, updates_tax_report: true, updates_project_cost: true, updates_retention_balance: true, updates_cash_flow_forecast: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_base_document: false },
    cancellation_rules: { ...STANDARD_CANCEL, requires_credit_note_or_return: true, downstream_documents_block_cancel: true, allowed_reversal_methods: ['credit_note', 'reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true, updates_retention_receivable: true, updates_wip_or_earned_value: true },
    typical_journal: { description: 'A/R Invoice posting', entries: [
      { side: 'Dr', account_purpose: 'ar_control', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'revenue', amount_source: 'subtotal' },
      { side: 'Cr', account_purpose: 'output_vat', amount_source: 'tax_amount' },
    ]},
    downstream_documents: ['incoming_payment', 'ar_credit_memo'], upstream_documents: ['delivery', 'sales_order'],
  },
  ar_credit_memo: {
    document_type: 'ar_credit_memo', label: 'A/R Credit Memo',
    category: 'financial_journal', functional_area: 'sales',
    business_purpose: 'Reduces receivable. Reverses revenue and tax partially or fully. May return inventory and reverse COGS. May adjust project billed revenue.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_receivable: true, updates_tax_report: true, updates_inventory_qty: true, updates_inventory_valuation: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_base_document: true, requires_approval: true },
    cancellation_rules: { ...STANDARD_CANCEL, direct_cancel_allowed: false, reverse_journal_required: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true },
    typical_journal: { description: 'A/R Credit Memo posting', entries: [
      { side: 'Dr', account_purpose: 'revenue', amount_source: 'subtotal' },
      { side: 'Dr', account_purpose: 'output_vat', amount_source: 'tax_amount' },
      { side: 'Cr', account_purpose: 'ar_control', amount_source: 'total' },
    ]},
    downstream_documents: [], upstream_documents: ['ar_invoice'],
  },
  incoming_payment: {
    document_type: 'incoming_payment', label: 'Incoming Payment',
    category: 'payment_cash', functional_area: 'sales',
    business_purpose: 'Reduces receivable, increases bank/cash. May record bank charges, discounts, exchange differences. Updates cash flow actual.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_receivable: true, updates_cash_flow_forecast: true },
    posting_control: STANDARD_POSTING_CONTROL,
    cancellation_rules: { ...STANDARD_CANCEL, reverse_journal_required: true, requires_approval_for_reversal: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: { description: 'Incoming Payment posting', entries: [
      { side: 'Dr', account_purpose: 'cash_bank', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'ar_control', amount_source: 'total' },
    ]},
    downstream_documents: [], upstream_documents: ['ar_invoice'],
  },
  ar_down_payment_invoice: {
    document_type: 'ar_down_payment_invoice', label: 'A/R Down Payment Invoice',
    category: 'financial_journal', functional_area: 'sales',
    business_purpose: 'Creates advance receivable. Posts to down payment clearing account. Tax may apply. Used for construction advance billing.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_receivable: true, updates_tax_report: true, updates_retention_balance: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_approval: true },
    cancellation_rules: { ...STANDARD_CANCEL, requires_credit_note_or_return: true, allowed_reversal_methods: ['credit_note', 'reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_retention_receivable: true },
    typical_journal: { description: 'A/R Down Payment Invoice', entries: [
      { side: 'Dr', account_purpose: 'ar_control', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'down_payment_clearing_ar', amount_source: 'subtotal' },
      { side: 'Cr', account_purpose: 'output_vat', amount_source: 'tax_amount' },
    ]},
    downstream_documents: ['incoming_payment'], upstream_documents: ['sales_order'],
  },

  // ============ PURCHASING CYCLE ============
  purchase_request: {
    document_type: 'purchase_request', label: 'Purchase Request',
    category: 'commitment', functional_area: 'purchasing',
    business_purpose: 'No journal. May create internal commitment. Can consume budget reservation. Approval required based on amount, project, or material type.',
    finance_effect_flags: { ...NO_EFFECT, creates_commitment: true, updates_budget_consumed: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_approval: true, requires_budget_check: true },
    cancellation_rules: { ...STANDARD_CANCEL, direct_cancel_allowed: true, reverse_journal_required: false, allowed_reversal_methods: ['cancel'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_committed: true, requires_cost_code: true },
    typical_journal: null,
    downstream_documents: ['purchase_order'], upstream_documents: [],
  },
  purchase_quotation: {
    document_type: 'purchase_quotation', label: 'Purchase Quotation',
    category: 'master_config', functional_area: 'purchasing',
    business_purpose: 'No journal, no payable. May update procurement comparison analytics only.',
    finance_effect_flags: NO_EFFECT,
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_tax_code: false },
    cancellation_rules: { ...STANDARD_CANCEL, direct_cancel_allowed: true, reverse_journal_required: false, allowed_reversal_methods: ['cancel'] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: null,
    downstream_documents: ['purchase_order'], upstream_documents: ['purchase_request'],
  },
  purchase_order: {
    document_type: 'purchase_order', label: 'Purchase Order',
    category: 'commitment', functional_area: 'purchasing',
    business_purpose: 'Usually no journal. Creates commitment amount. Updates committed cost against budget/project/cost code. For subcontract PO, updates subcontract commitment separately.',
    finance_effect_flags: { ...NO_EFFECT, creates_commitment: true, updates_commitment_amount: true, updates_cash_flow_forecast: true, updates_budget_consumed: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_approval: true, requires_budget_check: true, approval_amount_threshold: 10000 },
    cancellation_rules: { ...STANDARD_CANCEL, direct_cancel_allowed: true, reverse_journal_required: false, downstream_documents_block_cancel: true, allowed_reversal_methods: ['cancel'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_committed: true, requires_cost_code: true, cost_types: ['material', 'equipment', 'subcontract'] },
    typical_journal: null,
    downstream_documents: ['goods_receipt_po', 'ap_invoice'], upstream_documents: ['purchase_request', 'purchase_quotation'],
  },
  goods_receipt_po: {
    document_type: 'goods_receipt_po', label: 'Goods Receipt PO',
    category: 'operational_stock_value', functional_area: 'purchasing',
    business_purpose: 'Increases inventory quantity and valuation. Creates GR/IR clearing liability. Updates project committed-to-actual material cost if linked to project/site.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_inventory_qty: true, updates_inventory_valuation: true, updates_payable: true, updates_project_cost: true, updates_commitment_amount: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_base_document: true },
    cancellation_rules: { ...STANDARD_CANCEL, downstream_documents_block_cancel: true, allowed_reversal_methods: ['return', 'reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_committed: true, updates_budget_actual: true, updates_cost_by_code: true, cost_types: ['material'] },
    typical_journal: { description: 'GRPO posting', entries: [
      { side: 'Dr', account_purpose: 'inventory', amount_source: 'subtotal' },
      { side: 'Cr', account_purpose: 'gr_clearing', amount_source: 'subtotal' },
    ]},
    downstream_documents: ['ap_invoice'], upstream_documents: ['purchase_order'],
  },
  ap_invoice: {
    document_type: 'ap_invoice', label: 'A/P Invoice',
    category: 'financial_journal', functional_area: 'purchasing',
    business_purpose: 'Creates vendor payable. Recognizes expense or clears GR/IR. Posts input tax. Updates vendor aging, project actual cost, retention payable for subcontractors.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_payable: true, updates_tax_report: true, updates_project_cost: true, updates_commitment_amount: true, updates_retention_balance: true, updates_subcontract_liability: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_base_document: false },
    cancellation_rules: { ...STANDARD_CANCEL, requires_credit_note_or_return: true, downstream_documents_block_cancel: true, allowed_reversal_methods: ['credit_note', 'reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true, updates_cost_by_code: true, updates_retention_payable: true, cost_types: ['material', 'subcontract', 'equipment', 'overhead'] },
    typical_journal: { description: 'A/P Invoice from GRPO', entries: [
      { side: 'Dr', account_purpose: 'gr_clearing', amount_source: 'subtotal' },
      { side: 'Dr', account_purpose: 'input_vat', amount_source: 'tax_amount' },
      { side: 'Cr', account_purpose: 'ap_control', amount_source: 'total' },
    ]},
    downstream_documents: ['outgoing_payment', 'ap_credit_memo'], upstream_documents: ['goods_receipt_po', 'purchase_order'],
  },
  ap_credit_memo: {
    document_type: 'ap_credit_memo', label: 'A/P Credit Memo',
    category: 'financial_journal', functional_area: 'purchasing',
    business_purpose: 'Reduces payable. Reverses expense or inventory accrual. Adjusts project cost if linked.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_payable: true, updates_tax_report: true, updates_project_cost: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_base_document: true, requires_approval: true },
    cancellation_rules: { ...STANDARD_CANCEL, reverse_journal_required: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true },
    typical_journal: { description: 'A/P Credit Memo', entries: [
      { side: 'Dr', account_purpose: 'ap_control', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'gr_clearing', amount_source: 'subtotal' },
      { side: 'Cr', account_purpose: 'input_vat', amount_source: 'tax_amount' },
    ]},
    downstream_documents: [], upstream_documents: ['ap_invoice'],
  },
  outgoing_payment: {
    document_type: 'outgoing_payment', label: 'Outgoing Payment',
    category: 'payment_cash', functional_area: 'purchasing',
    business_purpose: 'Reduces payable, decreases bank/cash. Posts bank fees, discounts received, FX differences. Can settle retention payable only when release conditions are met.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_payable: true, updates_cash_flow_forecast: true, updates_retention_balance: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_approval: true },
    cancellation_rules: { ...STANDARD_CANCEL, reverse_journal_required: true, requires_approval_for_reversal: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: { description: 'Outgoing Payment posting', entries: [
      { side: 'Dr', account_purpose: 'ap_control', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'cash_bank', amount_source: 'total' },
    ]},
    downstream_documents: [], upstream_documents: ['ap_invoice'],
  },
  ap_down_payment: {
    document_type: 'ap_down_payment', label: 'A/P Down Payment Invoice',
    category: 'financial_journal', functional_area: 'purchasing',
    business_purpose: 'Creates advance payable. Posts to down payment clearing account. Used for subcontractor/supplier advances.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_payable: true, updates_tax_report: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_approval: true },
    cancellation_rules: { ...STANDARD_CANCEL, requires_credit_note_or_return: true, allowed_reversal_methods: ['credit_note', 'reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_retention_payable: true },
    typical_journal: { description: 'A/P Down Payment', entries: [
      { side: 'Dr', account_purpose: 'down_payment_clearing_ap', amount_source: 'subtotal' },
      { side: 'Dr', account_purpose: 'input_vat', amount_source: 'tax_amount' },
      { side: 'Cr', account_purpose: 'ap_control', amount_source: 'total' },
    ]},
    downstream_documents: ['outgoing_payment'], upstream_documents: ['purchase_order'],
  },

  // ============ INVENTORY ============
  goods_receipt: {
    document_type: 'goods_receipt', label: 'Goods Receipt',
    category: 'operational_stock_value', functional_area: 'inventory',
    business_purpose: 'Without PO, may debit inventory and credit offset account. May be used for opening, adjustment, or internal receipt. If project-linked, material actual cost updates project.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_inventory_qty: true, updates_inventory_valuation: true, updates_project_cost: true },
    posting_control: STANDARD_POSTING_CONTROL,
    cancellation_rules: { ...STANDARD_CANCEL, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true, updates_cost_by_code: true, cost_types: ['material'] },
    typical_journal: { description: 'Goods Receipt', entries: [
      { side: 'Dr', account_purpose: 'inventory', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'inventory_offset', amount_source: 'total' },
    ]},
    downstream_documents: [], upstream_documents: [],
  },
  goods_issue: {
    document_type: 'goods_issue', label: 'Goods Issue',
    category: 'operational_stock_value', functional_area: 'inventory',
    business_purpose: 'Credits inventory and debits expense/project cost/variance/COGS. Common for site material issue in construction. Mandatory project and cost code may be required.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_inventory_qty: true, updates_inventory_valuation: true, updates_project_cost: true, updates_budget_consumed: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_project: true, requires_cost_center: true },
    cancellation_rules: { ...STANDARD_CANCEL, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true, updates_cost_by_code: true, cost_types: ['material'], requires_cost_code: true, requires_wbs_activity: true },
    typical_journal: { description: 'Goods Issue to project/site', entries: [
      { side: 'Dr', account_purpose: 'cogs', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'inventory', amount_source: 'total' },
    ]},
    downstream_documents: [], upstream_documents: [],
  },
  inventory_transfer: {
    document_type: 'inventory_transfer', label: 'Inventory Transfer',
    category: 'operational_qty', functional_area: 'inventory',
    business_purpose: 'Usually quantity movement only between warehouses. No financial effect if same valuation scope. May affect branch/inter-branch clearing if crossing legal entity/branch.',
    finance_effect_flags: { ...NO_EFFECT, updates_inventory_qty: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_account_determination: false },
    cancellation_rules: { ...STANDARD_CANCEL, direct_cancel_allowed: true, reverse_journal_required: false, allowed_reversal_methods: ['cancel', 'reverse_je'] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: null,
    downstream_documents: [], upstream_documents: [],
  },
  inventory_counting: {
    document_type: 'inventory_counting', label: 'Inventory Counting / Posting',
    category: 'operational_stock_value', functional_area: 'inventory',
    business_purpose: 'Stock gain/loss posting. Updates inventory valuation. Variance posted to inventory gain/loss account. If project stock, discrepancy may affect project cost variance.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_inventory_qty: true, updates_inventory_valuation: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_approval: true },
    cancellation_rules: { ...STANDARD_CANCEL, reverse_journal_required: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: { description: 'Inventory Counting Adjustment', entries: [
      { side: 'Dr', account_purpose: 'inventory', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'variance', amount_source: 'total' },
    ]},
    downstream_documents: [], upstream_documents: [],
  },
  landed_cost: {
    document_type: 'landed_cost', label: 'Landed Costs',
    category: 'operational_stock_value', functional_area: 'inventory',
    business_purpose: 'Capitalizes additional cost into inventory. Adjusts inventory value and future COGS. If related items already issued/sold, variance allocation logic may be needed.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_inventory_valuation: true, updates_project_cost: true },
    posting_control: STANDARD_POSTING_CONTROL,
    cancellation_rules: { ...STANDARD_CANCEL, reverse_journal_required: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true, cost_types: ['material', 'overhead'] },
    typical_journal: { description: 'Landed Cost Allocation', entries: [
      { side: 'Dr', account_purpose: 'inventory', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'landed_cost', amount_source: 'total' },
    ]},
    downstream_documents: [], upstream_documents: ['goods_receipt_po'],
  },

  // ============ BANKING ============
  bank_deposit: {
    document_type: 'bank_deposit', label: 'Bank Deposit',
    category: 'payment_cash', functional_area: 'banking',
    business_purpose: 'Transfers cash/checks to bank. Clears undeposited funds. Updates cash flow actual.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_cash_flow_forecast: true },
    posting_control: STANDARD_POSTING_CONTROL,
    cancellation_rules: { ...STANDARD_CANCEL, reverse_journal_required: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: { description: 'Bank Deposit', entries: [
      { side: 'Dr', account_purpose: 'bank', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'cash', amount_source: 'total' },
    ]},
    downstream_documents: [], upstream_documents: [],
  },

  // ============ FIXED ASSETS ============
  fixed_asset_purchase: {
    document_type: 'fixed_asset_purchase', label: 'Asset Acquisition',
    category: 'financial_journal', functional_area: 'fixed_assets',
    business_purpose: 'Capitalize asset from AP invoice or manual capitalization. Creates asset cost in fixed asset register. May clear construction-in-progress or vendor payable.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_fixed_asset_register: true, updates_payable: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_approval: true },
    cancellation_rules: { ...STANDARD_CANCEL, reverse_journal_required: true, requires_approval_for_reversal: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true, cost_types: ['equipment'] },
    typical_journal: { description: 'Asset Acquisition', entries: [
      { side: 'Dr', account_purpose: 'asset_account', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'ap_control', amount_source: 'total' },
    ]},
    downstream_documents: ['depreciation'], upstream_documents: ['ap_invoice'],
  },
  depreciation: {
    document_type: 'depreciation', label: 'Depreciation Run',
    category: 'financial_journal', functional_area: 'fixed_assets',
    business_purpose: 'Periodic posting. Must respect open periods and asset status.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_depreciation_schedule: true, updates_project_cost: true },
    posting_control: STANDARD_POSTING_CONTROL,
    cancellation_rules: { ...STANDARD_CANCEL, reverse_journal_required: true, requires_approval_for_reversal: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true, cost_types: ['equipment'] },
    typical_journal: { description: 'Depreciation', entries: [
      { side: 'Dr', account_purpose: 'depreciation_expense', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'accumulated_depreciation', amount_source: 'total' },
    ]},
    downstream_documents: [], upstream_documents: ['fixed_asset_purchase'],
  },
  asset_disposal: {
    document_type: 'asset_disposal', label: 'Asset Retirement / Disposal',
    category: 'financial_journal', functional_area: 'fixed_assets',
    business_purpose: 'Remove asset cost and accumulated depreciation. Recognize gain/loss on disposal. Possible cash proceeds entry if sold.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_fixed_asset_register: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_approval: true },
    cancellation_rules: { ...STANDARD_CANCEL, reverse_journal_required: true, requires_approval_for_reversal: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: { description: 'Asset Disposal', entries: [
      { side: 'Dr', account_purpose: 'accumulated_depreciation', amount_source: 'subtotal' },
      { side: 'Dr', account_purpose: 'cash_bank', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'asset_account', amount_source: 'total' },
    ]},
    downstream_documents: [], upstream_documents: [],
  },

  // ============ PAYROLL ============
  payroll_posting: {
    document_type: 'payroll_posting', label: 'Payroll Processing',
    category: 'financial_journal', functional_area: 'payroll',
    business_purpose: 'Payroll posting creates expense and liability. Can split by department, project, branch, site, cost center.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_payable: true, updates_tax_report: true, updates_project_cost: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_approval: true, requires_cost_center: true },
    cancellation_rules: { ...STANDARD_CANCEL, reverse_journal_required: true, requires_approval_for_reversal: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true, updates_cost_by_code: true, cost_types: ['labor'] },
    typical_journal: { description: 'Payroll Posting', entries: [
      { side: 'Dr', account_purpose: 'payroll_expense', amount_source: 'subtotal' },
      { side: 'Cr', account_purpose: 'payroll_payable', amount_source: 'subtotal' },
    ]},
    downstream_documents: ['outgoing_payment'], upstream_documents: [],
  },

  // ============ CONSTRUCTION / PROJECT ============
  progress_billing: {
    document_type: 'progress_billing', label: 'Progress Billing (Client IPC)',
    category: 'financial_journal', functional_area: 'construction',
    business_purpose: 'AR invoice for construction progress. Posts revenue and receivable. May create retention receivable and advance recovery. Updates contract consumed value and certified billing.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_receivable: true, updates_tax_report: true, updates_project_cost: true, updates_retention_balance: true, updates_wip: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_approval: true, requires_project: true, requires_cost_center: true },
    cancellation_rules: { ...STANDARD_CANCEL, requires_credit_note_or_return: true, requires_approval_for_reversal: true, allowed_reversal_methods: ['credit_note', 'reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_actual: true, updates_retention_receivable: true, updates_wip_or_earned_value: true },
    typical_journal: { description: 'Progress Billing', entries: [
      { side: 'Dr', account_purpose: 'ar_control', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'revenue', amount_source: 'subtotal' },
      { side: 'Cr', account_purpose: 'output_vat', amount_source: 'tax_amount' },
      { side: 'Cr', account_purpose: 'retention', amount_source: 'retention_amount' },
    ]},
    downstream_documents: ['incoming_payment'], upstream_documents: ['sales_order'],
  },
  subcontract_ipc: {
    document_type: 'subcontract_ipc', label: 'Subcontractor IPC / Certification',
    category: 'financial_journal', functional_area: 'construction',
    business_purpose: 'Certifies subcontractor progress. Creates payable with retention deduction and advance recovery. Updates project subcontract cost and commitment.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_payable: true, updates_tax_report: true, updates_project_cost: true, updates_commitment_amount: true, updates_retention_balance: true, updates_subcontract_liability: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_approval: true, requires_project: true },
    cancellation_rules: { ...STANDARD_CANCEL, requires_credit_note_or_return: true, requires_approval_for_reversal: true, allowed_reversal_methods: ['credit_note', 'reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_committed: true, updates_budget_actual: true, updates_cost_by_code: true, updates_retention_payable: true, cost_types: ['subcontract'], requires_cost_code: true },
    typical_journal: { description: 'Subcontractor IPC', entries: [
      { side: 'Dr', account_purpose: 'cogs', amount_source: 'subtotal' },
      { side: 'Dr', account_purpose: 'input_vat', amount_source: 'tax_amount' },
      { side: 'Cr', account_purpose: 'ap_control', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'retention', amount_source: 'retention_amount' },
    ]},
    downstream_documents: ['outgoing_payment'], upstream_documents: ['purchase_order'],
  },
  variation_order: {
    document_type: 'variation_order', label: 'Variation / Change Order',
    category: 'controlling_budget', functional_area: 'construction',
    business_purpose: 'No direct journal on approval alone. Changes contract value, budget, forecast, procurement ceiling, and billing potential.',
    finance_effect_flags: { ...NO_EFFECT, updates_budget_consumed: true, updates_commitment_amount: true, updates_cash_flow_forecast: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_approval: true, requires_project: true },
    cancellation_rules: { ...STANDARD_CANCEL, direct_cancel_allowed: true, reverse_journal_required: false, allowed_reversal_methods: ['cancel'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_budget_committed: true },
    typical_journal: null,
    downstream_documents: ['progress_billing', 'purchase_order'], upstream_documents: ['sales_order'],
  },
  project_budget: {
    document_type: 'project_budget', label: 'Project Budget',
    category: 'controlling_budget', functional_area: 'construction',
    business_purpose: 'No journal. Defines control baseline. Budget availability checked by procurement, subcontract, inventory issue, labor, expense, equipment usage.',
    finance_effect_flags: NO_EFFECT,
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_open_period: false, requires_account_determination: false, requires_approval: true, requires_project: true },
    cancellation_rules: { ...STANDARD_CANCEL, direct_cancel_allowed: false, allowed_reversal_methods: [] },
    project_cost_impact: NO_PROJECT_IMPACT,
    typical_journal: null,
    downstream_documents: ['purchase_order', 'goods_issue', 'subcontract_ipc'], upstream_documents: ['tender_award'],
  },
  wip_recognition: {
    document_type: 'wip_recognition', label: 'WIP / Revenue Recognition',
    category: 'financial_journal', functional_area: 'construction',
    business_purpose: 'Construction revenue recognized by progress. Supports cost-to-cost, progress certification, and milestone methods. Reclassifies cost or recognizes unbilled revenue / deferred revenue.',
    finance_effect_flags: { ...NO_EFFECT, creates_journal_entry: true, updates_wip: true, updates_project_cost: true },
    posting_control: { ...STANDARD_POSTING_CONTROL, requires_approval: true, requires_project: true },
    cancellation_rules: { ...STANDARD_CANCEL, reverse_journal_required: true, allowed_reversal_methods: ['reverse_je'] },
    project_cost_impact: { ...NO_PROJECT_IMPACT, updates_wip_or_earned_value: true },
    typical_journal: { description: 'WIP Revenue Recognition', entries: [
      { side: 'Dr', account_purpose: 'wip', amount_source: 'total' },
      { side: 'Cr', account_purpose: 'revenue', amount_source: 'total' },
    ]},
    downstream_documents: [], upstream_documents: [],
  },
};

// ===== Lookup Functions =====

export function getDocumentFinanceProfile(documentType: string): DocumentFinanceProfile | null {
  return DOCUMENT_FINANCE_REGISTRY[documentType] || null;
}

export function getFinanceEffectFlags(documentType: string): FinanceEffectFlags {
  return DOCUMENT_FINANCE_REGISTRY[documentType]?.finance_effect_flags || NO_EFFECT;
}

export function getPostingControlRules(documentType: string): PostingControlRules {
  return DOCUMENT_FINANCE_REGISTRY[documentType]?.posting_control || STANDARD_POSTING_CONTROL;
}

export function getCancellationRules(documentType: string): CancellationRules {
  return DOCUMENT_FINANCE_REGISTRY[documentType]?.cancellation_rules || STANDARD_CANCEL;
}

export function getProjectCostImpact(documentType: string): ProjectCostImpact {
  return DOCUMENT_FINANCE_REGISTRY[documentType]?.project_cost_impact || NO_PROJECT_IMPACT;
}

export function isFinanceImpacting(documentType: string): boolean {
  const profile = DOCUMENT_FINANCE_REGISTRY[documentType];
  return profile?.finance_effect_flags.creates_journal_entry || false;
}

export function requiresApproval(documentType: string, amount?: number): boolean {
  const rules = DOCUMENT_FINANCE_REGISTRY[documentType]?.posting_control;
  if (!rules?.requires_approval) return false;
  if (rules.approval_amount_threshold !== null && amount !== undefined) {
    return amount >= rules.approval_amount_threshold;
  }
  return true;
}

export function getDownstreamDocuments(documentType: string): string[] {
  return DOCUMENT_FINANCE_REGISTRY[documentType]?.downstream_documents || [];
}

export function getUpstreamDocuments(documentType: string): string[] {
  return DOCUMENT_FINANCE_REGISTRY[documentType]?.upstream_documents || [];
}

/**
 * Returns all document types that create journal entries
 */
export function getJournalCreatingDocuments(): string[] {
  return Object.entries(DOCUMENT_FINANCE_REGISTRY)
    .filter(([, p]) => p.finance_effect_flags.creates_journal_entry)
    .map(([k]) => k);
}

/**
 * Returns all document types by category
 */
export function getDocumentsByCategory(category: DocumentCategory): DocumentFinanceProfile[] {
  return Object.values(DOCUMENT_FINANCE_REGISTRY).filter(p => p.category === category);
}

/**
 * Returns active finance effect flags as a human-readable summary
 */
export function getFinanceEffectSummary(documentType: string): string[] {
  const flags = getFinanceEffectFlags(documentType);
  const summary: string[] = [];
  if (flags.creates_journal_entry) summary.push('Creates Journal Entry');
  if (flags.updates_receivable) summary.push('Updates Accounts Receivable');
  if (flags.updates_payable) summary.push('Updates Accounts Payable');
  if (flags.updates_inventory_qty) summary.push('Updates Inventory Quantity');
  if (flags.updates_inventory_valuation) summary.push('Updates Inventory Valuation');
  if (flags.updates_fixed_asset_register) summary.push('Updates Fixed Asset Register');
  if (flags.updates_depreciation_schedule) summary.push('Updates Depreciation Schedule');
  if (flags.updates_project_cost) summary.push('Updates Project Cost');
  if (flags.updates_wip) summary.push('Updates Work in Progress');
  if (flags.updates_cash_flow_forecast) summary.push('Updates Cash Flow Forecast');
  if (flags.updates_tax_report) summary.push('Updates Tax Report');
  if (flags.updates_budget_consumed) summary.push('Updates Budget Consumed');
  if (flags.updates_commitment_amount) summary.push('Updates Commitment Amount');
  if (flags.updates_retention_balance) summary.push('Updates Retention Balance');
  if (flags.updates_subcontract_liability) summary.push('Updates Subcontract Liability');
  if (flags.creates_commitment) summary.push('Creates Commitment');
  if (flags.reserves_stock) summary.push('Reserves Stock');
  if (flags.updates_credit_exposure) summary.push('Updates Credit Exposure');
  if (flags.updates_sales_forecast) summary.push('Updates Sales Forecast');
  return summary;
}
