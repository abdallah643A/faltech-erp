/**
 * Construction Workflow State Machine
 * Full lifecycle from Tender to Project Closing with status transitions,
 * gate validations, and cross-module integration points.
 */

// ===== Project Status Lifecycle =====

export type ProjectLifecycleStatus =
  | 'tender'
  | 'submitted'
  | 'awarded'
  | 'mobilizing'
  | 'active'
  | 'near_completion'
  | 'practical_completion'
  | 'dlp'                    // Defects Liability Period
  | 'commercially_closed'
  | 'financially_closed'
  | 'archived';

export interface StatusTransition {
  from: ProjectLifecycleStatus;
  to: ProjectLifecycleStatus;
  label: string;
  requires_approval: boolean;
  gate_checks: GateCheck[];
  actions_on_transition: TransitionAction[];
  finance_effect: string[];
}

export interface GateCheck {
  id: string;
  description: string;
  check_type: 'mandatory' | 'warning';
  check_fn: string; // Function name to call
}

export interface TransitionAction {
  action: string;
  description: string;
  module: string; // Which module is affected
}

// ===== Tender Management =====

export type TenderStatus = 'draft' | 'in_progress' | 'clarification' | 'submitted' | 'under_evaluation' | 'awarded' | 'lost' | 'no_bid' | 'cancelled';

export interface TenderRecord {
  id?: string;
  tender_number: string;
  project_name: string;
  client_name: string;
  client_id?: string;
  consultant_name?: string;
  project_location?: string;
  tender_type: 'open' | 'invited' | 'negotiated' | 'framework';
  submission_deadline: string;
  estimated_value: number;
  estimated_duration_months: number;
  scope_description?: string;
  bid_bond_required: boolean;
  bid_bond_amount?: number;
  bid_bond_expiry?: string;
  status: TenderStatus;
  current_revision: number;
  assigned_estimator?: string;
  assigned_commercial?: string;
  technical_approved: boolean;
  commercial_approved: boolean;
  currency: string;
  company_id?: string;
  branch_id?: string;
}

export interface TenderEstimate {
  id?: string;
  tender_id: string;
  revision: number;
  status: 'draft' | 'reviewed' | 'approved' | 'frozen';
  direct_cost: TenderCostBreakdown;
  indirect_cost: TenderCostBreakdown;
  overhead_pct: number;
  overhead_amount: number;
  risk_contingency_pct: number;
  risk_contingency_amount: number;
  markup_pct: number;
  markup_amount: number;
  total_cost: number;
  bid_value: number;
  gross_margin: number;
  gross_margin_pct: number;
  escalation_factor_pct: number;
  wastage_factor_pct: number;
}

export interface TenderCostBreakdown {
  material: number;
  labor: number;
  equipment: number;
  subcontract: number;
  total: number;
}

// ===== Status Transition Definitions =====

export const PROJECT_TRANSITIONS: StatusTransition[] = [
  {
    from: 'tender', to: 'submitted',
    label: 'Submit Tender',
    requires_approval: true,
    gate_checks: [
      { id: 'est_approved', description: 'Estimate must be approved', check_type: 'mandatory', check_fn: 'checkEstimateApproved' },
      { id: 'tech_review', description: 'Technical review completed', check_type: 'mandatory', check_fn: 'checkTechnicalReview' },
      { id: 'comm_review', description: 'Commercial review completed', check_type: 'mandatory', check_fn: 'checkCommercialReview' },
      { id: 'bid_bond', description: 'Bid bond arranged if required', check_type: 'mandatory', check_fn: 'checkBidBond' },
    ],
    actions_on_transition: [
      { action: 'freeze_estimate', description: 'Freeze current estimate revision', module: 'estimation' },
      { action: 'record_submission', description: 'Record submission date and details', module: 'tender' },
    ],
    finance_effect: ['Updates tender pipeline forecast', 'Bid bond may be tracked as bank guarantee'],
  },
  {
    from: 'submitted', to: 'awarded',
    label: 'Award Contract',
    requires_approval: true,
    gate_checks: [
      { id: 'award_letter', description: 'Award letter received', check_type: 'mandatory', check_fn: 'checkAwardLetter' },
      { id: 'contract_terms', description: 'Contract terms reviewed', check_type: 'mandatory', check_fn: 'checkContractTerms' },
    ],
    actions_on_transition: [
      { action: 'create_project', description: 'Create project from awarded tender', module: 'project' },
      { action: 'create_contract', description: 'Create contract/sales order', module: 'sales' },
      { action: 'set_budget_baseline', description: 'Set project budget baseline from winning estimate', module: 'budget' },
      { action: 'create_billing_schedule', description: 'Create billing milestones', module: 'billing' },
      { action: 'release_bid_bond', description: 'Release bid bond if applicable', module: 'banking' },
    ],
    finance_effect: ['Creates revenue baseline', 'Creates cash inflow forecast', 'Creates budget control framework'],
  },
  {
    from: 'awarded', to: 'mobilizing',
    label: 'Start Mobilization',
    requires_approval: false,
    gate_checks: [
      { id: 'project_created', description: 'Project master record created', check_type: 'mandatory', check_fn: 'checkProjectExists' },
      { id: 'team_assigned', description: 'Core project team assigned', check_type: 'warning', check_fn: 'checkTeamAssigned' },
    ],
    actions_on_transition: [
      { action: 'create_site_warehouse', description: 'Create site warehouse and cost centers', module: 'inventory' },
      { action: 'create_approval_matrix', description: 'Define project approval matrix', module: 'approval' },
      { action: 'create_procurement_packages', description: 'Create procurement packages from budget', module: 'procurement' },
    ],
    finance_effect: ['Mobilization expenses may post to project overhead', 'Equipment allocation creates usage entries'],
  },
  {
    from: 'mobilizing', to: 'active',
    label: 'Activate Project',
    requires_approval: true,
    gate_checks: [
      { id: 'budget_approved', description: 'Budget baseline approved', check_type: 'mandatory', check_fn: 'checkBudgetApproved' },
      { id: 'site_ready', description: 'Site setup completed', check_type: 'warning', check_fn: 'checkSiteReady' },
      { id: 'permits_obtained', description: 'Required permits obtained', check_type: 'warning', check_fn: 'checkPermits' },
    ],
    actions_on_transition: [
      { action: 'open_for_transactions', description: 'Enable project for procurement and cost postings', module: 'finance' },
      { action: 'start_schedule', description: 'Activate project schedule', module: 'planning' },
    ],
    finance_effect: ['Project opens for procurement commitments', 'Budget control enforcement begins'],
  },
  {
    from: 'active', to: 'near_completion',
    label: 'Near Completion',
    requires_approval: false,
    gate_checks: [
      { id: 'progress_threshold', description: 'Physical progress above 90%', check_type: 'warning', check_fn: 'checkProgressThreshold' },
    ],
    actions_on_transition: [
      { action: 'flag_pending_items', description: 'Flag pending procurement and subcontract items', module: 'procurement' },
      { action: 'initiate_snagging', description: 'Create snag list template', module: 'quality' },
    ],
    finance_effect: ['Triggers final account preparation', 'Initiates accrual review'],
  },
  {
    from: 'near_completion', to: 'practical_completion',
    label: 'Practical Completion',
    requires_approval: true,
    gate_checks: [
      { id: 'snag_cleared', description: 'All critical snag items closed', check_type: 'mandatory', check_fn: 'checkSnagsClosed' },
      { id: 'client_certificate', description: 'Client practical completion certificate obtained', check_type: 'mandatory', check_fn: 'checkCompletionCertificate' },
      { id: 'all_invoiced', description: 'All billable work invoiced', check_type: 'warning', check_fn: 'checkAllInvoiced' },
    ],
    actions_on_transition: [
      { action: 'issue_final_billing', description: 'Issue final billing to client', module: 'billing' },
      { action: 'start_dlp', description: 'Start defects liability period', module: 'project' },
      { action: 'partial_retention_release', description: 'Release first portion of retention', module: 'retention' },
    ],
    finance_effect: ['Final billing creates receivable', 'First retention release (typically 50%)', 'WIP reclassification'],
  },
  {
    from: 'practical_completion', to: 'dlp',
    label: 'Enter DLP',
    requires_approval: false,
    gate_checks: [],
    actions_on_transition: [
      { action: 'set_dlp_dates', description: 'Set DLP start and end dates', module: 'project' },
      { action: 'create_warranty_tracker', description: 'Create warranty obligation tracker', module: 'quality' },
    ],
    finance_effect: ['Retention remains held until DLP expiry', 'Warranty provision may be accrued'],
  },
  {
    from: 'dlp', to: 'commercially_closed',
    label: 'Commercial Close',
    requires_approval: true,
    gate_checks: [
      { id: 'final_account', description: 'Final account agreed with client', check_type: 'mandatory', check_fn: 'checkFinalAccount' },
      { id: 'all_variations_resolved', description: 'All variation orders resolved', check_type: 'mandatory', check_fn: 'checkVariationsResolved' },
      { id: 'all_claims_resolved', description: 'All claims settled or withdrawn', check_type: 'mandatory', check_fn: 'checkClaimsResolved' },
      { id: 'subcontracts_settled', description: 'All subcontracts settled', check_type: 'mandatory', check_fn: 'checkSubcontractsSettled' },
      { id: 'retention_released', description: 'All retention released or accrued', check_type: 'warning', check_fn: 'checkRetentionReleased' },
    ],
    actions_on_transition: [
      { action: 'release_remaining_retention', description: 'Release remaining retention', module: 'retention' },
      { action: 'settle_final_account', description: 'Post final account adjustments', module: 'finance' },
      { action: 'close_subcontracts', description: 'Close all subcontract agreements', module: 'procurement' },
    ],
    finance_effect: ['Final retention release creates settlement', 'Clear remaining accruals/provisions', 'Settle GR/IR unmatched items'],
  },
  {
    from: 'commercially_closed', to: 'financially_closed',
    label: 'Financial Close',
    requires_approval: true,
    gate_checks: [
      { id: 'all_po_closed', description: 'All POs closed or cancelled', check_type: 'mandatory', check_fn: 'checkAllPOsClosed' },
      { id: 'all_ap_settled', description: 'All AP invoices received or accrued', check_type: 'mandatory', check_fn: 'checkAPSettled' },
      { id: 'all_ar_collected', description: 'All AR invoices collected or written off', check_type: 'mandatory', check_fn: 'checkARCollected' },
      { id: 'inventory_cleared', description: 'Site inventory cleared or transferred', check_type: 'mandatory', check_fn: 'checkInventoryCleared' },
      { id: 'timesheets_complete', description: 'All timesheets/payroll allocated', check_type: 'mandatory', check_fn: 'checkTimesheetsComplete' },
      { id: 'wip_cleared', description: 'WIP/revenue recognition completed', check_type: 'mandatory', check_fn: 'checkWIPCleared' },
      { id: 'assets_transferred', description: 'All site assets transferred or disposed', check_type: 'mandatory', check_fn: 'checkAssetsTransferred' },
    ],
    actions_on_transition: [
      { action: 'close_project_to_postings', description: 'Close project to new cost postings', module: 'finance' },
      { action: 'freeze_budget', description: 'Freeze all budgets and forecasts', module: 'budget' },
      { action: 'generate_final_report', description: 'Generate final profitability report', module: 'reporting' },
    ],
    finance_effect: ['Project blocked from new postings', 'Final margin calculated', 'Transfer residual stock/equipment', 'Archive project documents'],
  },
  {
    from: 'financially_closed', to: 'archived',
    label: 'Archive Project',
    requires_approval: false,
    gate_checks: [],
    actions_on_transition: [
      { action: 'archive_documents', description: 'Archive all project documents', module: 'document_management' },
    ],
    finance_effect: ['Project is read-only'],
  },
];

// ===== Transition Validation =====

/**
 * Get available transitions for a project in a given status.
 */
export function getAvailableTransitions(currentStatus: ProjectLifecycleStatus): StatusTransition[] {
  return PROJECT_TRANSITIONS.filter(t => t.from === currentStatus);
}

/**
 * Validate if a transition is allowed based on gate checks.
 * Returns pass/fail for each gate check.
 */
export function validateTransition(
  transition: StatusTransition,
  gateResults: Record<string, boolean>
): { allowed: boolean; failed_mandatory: GateCheck[]; failed_warnings: GateCheck[] } {
  const failedMandatory: GateCheck[] = [];
  const failedWarnings: GateCheck[] = [];

  for (const check of transition.gate_checks) {
    const passed = gateResults[check.id] ?? false;
    if (!passed) {
      if (check.check_type === 'mandatory') failedMandatory.push(check);
      else failedWarnings.push(check);
    }
  }

  return {
    allowed: failedMandatory.length === 0,
    failed_mandatory: failedMandatory,
    failed_warnings: failedWarnings,
  };
}

/**
 * Get the full lifecycle path with current position highlighted.
 */
export function getLifecyclePath(currentStatus: ProjectLifecycleStatus): Array<{ status: ProjectLifecycleStatus; label: string; isCurrent: boolean; isPast: boolean }> {
  const statuses: Array<{ status: ProjectLifecycleStatus; label: string }> = [
    { status: 'tender', label: 'Tender' },
    { status: 'submitted', label: 'Submitted' },
    { status: 'awarded', label: 'Awarded' },
    { status: 'mobilizing', label: 'Mobilizing' },
    { status: 'active', label: 'Active' },
    { status: 'near_completion', label: 'Near Completion' },
    { status: 'practical_completion', label: 'Practical Completion' },
    { status: 'dlp', label: 'DLP' },
    { status: 'commercially_closed', label: 'Commercially Closed' },
    { status: 'financially_closed', label: 'Financially Closed' },
    { status: 'archived', label: 'Archived' },
  ];

  const currentIndex = statuses.findIndex(s => s.status === currentStatus);

  return statuses.map((s, i) => ({
    ...s,
    isCurrent: i === currentIndex,
    isPast: i < currentIndex,
  }));
}

// ===== Project Closing Checklist =====

export interface ClosingChecklistItem {
  id: string;
  category: 'procurement' | 'subcontract' | 'inventory' | 'payroll' | 'finance' | 'billing' | 'claims' | 'assets' | 'documentation';
  description: string;
  is_mandatory: boolean;
  auto_check_fn?: string;
  status: 'pending' | 'completed' | 'not_applicable' | 'waived';
  notes?: string;
  completed_by?: string;
  completed_at?: string;
}

export const PROJECT_CLOSING_CHECKLIST: Omit<ClosingChecklistItem, 'status' | 'notes' | 'completed_by' | 'completed_at'>[] = [
  { id: 'po_closed', category: 'procurement', description: 'All purchase orders closed or cancelled', is_mandatory: true, auto_check_fn: 'checkAllPOsClosed' },
  { id: 'pr_closed', category: 'procurement', description: 'All purchase requests resolved', is_mandatory: true },
  { id: 'sub_settled', category: 'subcontract', description: 'All subcontracts settled and final accounts agreed', is_mandatory: true },
  { id: 'sub_retention', category: 'subcontract', description: 'All subcontractor retention released or accrued', is_mandatory: true },
  { id: 'site_inventory', category: 'inventory', description: 'All site inventory cleared or transferred', is_mandatory: true },
  { id: 'material_returns', category: 'inventory', description: 'Surplus materials returned or disposed', is_mandatory: false },
  { id: 'timesheets', category: 'payroll', description: 'All timesheets submitted and allocated', is_mandatory: true },
  { id: 'payroll_allocated', category: 'payroll', description: 'All payroll costs allocated to project', is_mandatory: true },
  { id: 'ap_received', category: 'finance', description: 'All vendor invoices received or accrued', is_mandatory: true },
  { id: 'ar_issued', category: 'finance', description: 'All client invoices issued', is_mandatory: true },
  { id: 'collections', category: 'finance', description: 'All collections tracked and retention recorded', is_mandatory: true },
  { id: 'wip_cleared', category: 'finance', description: 'WIP/revenue recognition completed', is_mandatory: true },
  { id: 'accruals_cleared', category: 'finance', description: 'All accruals and provisions cleared', is_mandatory: true },
  { id: 'budgets_frozen', category: 'finance', description: 'All budgets and forecasts frozen', is_mandatory: true },
  { id: 'billing_complete', category: 'billing', description: 'Final billing submitted and certified', is_mandatory: true },
  { id: 'retention_released', category: 'billing', description: 'All client retention released', is_mandatory: true },
  { id: 'variations_resolved', category: 'claims', description: 'All variation orders resolved', is_mandatory: true },
  { id: 'claims_resolved', category: 'claims', description: 'All claims status recorded (settled/withdrawn)', is_mandatory: true },
  { id: 'assets_transferred', category: 'assets', description: 'All fixed assets/site assets transferred or disposed', is_mandatory: true },
  { id: 'equipment_returned', category: 'assets', description: 'All rented equipment returned', is_mandatory: false },
  { id: 'docs_archived', category: 'documentation', description: 'All project documents archived', is_mandatory: false },
  { id: 'final_report', category: 'documentation', description: 'Final profitability report generated', is_mandatory: true },
];

/**
 * Initialize a closing checklist for a project.
 */
export function initializeClosingChecklist(): ClosingChecklistItem[] {
  return PROJECT_CLOSING_CHECKLIST.map(item => ({
    ...item,
    status: 'pending' as const,
  }));
}

/**
 * Calculate closing readiness percentage.
 */
export function calculateClosingReadiness(checklist: ClosingChecklistItem[]): {
  total: number;
  completed: number;
  mandatory_total: number;
  mandatory_completed: number;
  readiness_pct: number;
  can_close: boolean;
} {
  const mandatory = checklist.filter(c => c.is_mandatory);
  const mandatoryCompleted = mandatory.filter(c => c.status === 'completed' || c.status === 'not_applicable');
  const allCompleted = checklist.filter(c => c.status === 'completed' || c.status === 'not_applicable' || c.status === 'waived');

  return {
    total: checklist.length,
    completed: allCompleted.length,
    mandatory_total: mandatory.length,
    mandatory_completed: mandatoryCompleted.length,
    readiness_pct: checklist.length > 0 ? (allCompleted.length / checklist.length) * 100 : 0,
    can_close: mandatoryCompleted.length === mandatory.length,
  };
}
