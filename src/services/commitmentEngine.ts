/**
 * Commitment & Budget Control Engine
 * Manages the commitment lifecycle: PO creates → GRPO partially relieves → AP invoice fully relieves
 * Provides budget availability checks with configurable enforcement (warning, soft block, hard block).
 */

import { supabase } from '@/integrations/supabase/client';

// ===== Types =====

export type BudgetControlMode = 'none' | 'warning' | 'soft_block' | 'hard_block';

export type CommitmentSource = 'purchase_order' | 'purchase_request' | 'subcontract' | 'reservation' | 'service_order';

export type CommitmentStatus = 'open' | 'partially_relieved' | 'fully_relieved' | 'cancelled';

export interface CommitmentRecord {
  id?: string;
  project_id: string;
  cost_code?: string;
  wbs_activity?: string;
  source_type: CommitmentSource;
  source_document_id: string;
  source_document_number: string;
  committed_amount: number;
  relieved_amount: number;
  remaining_amount: number;
  status: CommitmentStatus;
  vendor_id?: string;
  vendor_name?: string;
  description?: string;
  branch_id?: string;
  cost_center?: string;
  company_id?: string;
  currency: string;
  created_at?: string;
}

export interface BudgetPosition {
  original_budget: number;
  approved_changes: number;
  revised_budget: number;
  committed: number;
  actual: number;
  accrued: number;
  forecast_to_complete: number;
  estimate_at_completion: number;
  available: number;
  variance: number;
  utilization_pct: number;
}

export interface BudgetCheckResult {
  allowed: boolean;
  mode: BudgetControlMode;
  message: string;
  position: BudgetPosition;
  shortfall: number;
  requires_override: boolean;
}

export interface CommitmentSummary {
  total_committed: number;
  total_relieved: number;
  total_remaining: number;
  by_cost_type: Record<string, { committed: number; relieved: number; remaining: number }>;
  by_source: Record<CommitmentSource, number>;
  open_count: number;
}

// ===== Commitment Lifecycle =====

/**
 * Create a commitment record when a PO or similar commitment document is created/approved.
 */
export async function createCommitment(record: Omit<CommitmentRecord, 'id' | 'remaining_amount' | 'status' | 'created_at'>): Promise<CommitmentRecord> {
  const commitment: CommitmentRecord = {
    ...record,
    remaining_amount: record.committed_amount - record.relieved_amount,
    status: record.relieved_amount >= record.committed_amount ? 'fully_relieved' : record.relieved_amount > 0 ? 'partially_relieved' : 'open',
  };

  // Store in local state or DB — this is a service-layer stub ready for backend
  return commitment;
}

/**
 * Relieve (partially or fully) a commitment when GRPO or AP Invoice is posted.
 * Returns the updated commitment and amount actually relieved.
 */
export function relieveCommitment(
  commitment: CommitmentRecord,
  relieveAmount: number
): { updated: CommitmentRecord; actualRelieved: number } {
  const maxRelief = commitment.remaining_amount;
  const actualRelieved = Math.min(relieveAmount, maxRelief);

  const updated: CommitmentRecord = {
    ...commitment,
    relieved_amount: commitment.relieved_amount + actualRelieved,
    remaining_amount: commitment.remaining_amount - actualRelieved,
    status: (commitment.remaining_amount - actualRelieved) <= 0.01 ? 'fully_relieved' : 'partially_relieved',
  };

  return { updated, actualRelieved };
}

/**
 * Cancel a commitment (e.g., PO cancelled).
 */
export function cancelCommitment(commitment: CommitmentRecord): CommitmentRecord {
  return {
    ...commitment,
    remaining_amount: 0,
    status: 'cancelled',
  };
}

// ===== Budget Position Calculator =====

/**
 * Calculate budget position for a project, cost code, or cost center.
 * Queries CBS items, commitments, and actual costs from the database.
 */
export async function calculateBudgetPosition(
  projectId: string,
  costCode?: string,
  companyId?: string
): Promise<BudgetPosition> {
  // Fetch CBS budget data
  let cbsQuery = supabase
    .from('cpms_cbs_items' as any)
    .select('budget_amount, revised_budget, actual_amount, committed_amount, forecast_amount')
    .eq('project_id', projectId);

  if (costCode) cbsQuery = cbsQuery.eq('cost_code', costCode);
  if (companyId) cbsQuery = cbsQuery.eq('company_id', companyId);

  const { data: cbsItems } = await cbsQuery;
  const items = (cbsItems || []) as any[];

  const originalBudget = items.reduce((s, i) => s + (i.budget_amount || 0), 0);
  const revisedBudget = items.reduce((s, i) => s + (i.revised_budget || i.budget_amount || 0), 0);
  const approvedChanges = revisedBudget - originalBudget;
  const committed = items.reduce((s, i) => s + (i.committed_amount || 0), 0);
  const actual = items.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const forecast = items.reduce((s, i) => s + (i.forecast_amount || 0), 0);

  const accrued = 0; // Placeholder for period-end accruals
  const available = revisedBudget - committed - actual;
  const eac = actual + forecast;
  const variance = revisedBudget - eac;
  const utilization = revisedBudget > 0 ? ((committed + actual) / revisedBudget) * 100 : 0;

  return {
    original_budget: originalBudget,
    approved_changes: approvedChanges,
    revised_budget: revisedBudget,
    committed,
    actual,
    accrued,
    forecast_to_complete: forecast,
    estimate_at_completion: eac,
    available,
    variance,
    utilization_pct: Math.round(utilization * 100) / 100,
  };
}

// ===== Budget Availability Check =====

/**
 * Check if a proposed amount can be committed/spent against the budget.
 * Returns whether the transaction is allowed and the enforcement mode.
 */
export async function checkBudgetAvailability(
  projectId: string,
  proposedAmount: number,
  options?: {
    costCode?: string;
    companyId?: string;
    controlMode?: BudgetControlMode;
    tolerancePct?: number; // Allow slight overrun (e.g., 5%)
  }
): Promise<BudgetCheckResult> {
  const mode = options?.controlMode || 'warning';
  const tolerancePct = options?.tolerancePct || 0;

  const position = await calculateBudgetPosition(projectId, options?.costCode, options?.companyId);

  const effectiveAvailable = position.available + (position.revised_budget * tolerancePct / 100);
  const shortfall = Math.max(0, proposedAmount - effectiveAvailable);
  const allowed = shortfall <= 0.01;

  if (allowed) {
    return {
      allowed: true,
      mode,
      message: `Budget available. Remaining after this transaction: ${(effectiveAvailable - proposedAmount).toFixed(2)}`,
      position,
      shortfall: 0,
      requires_override: false,
    };
  }

  switch (mode) {
    case 'none':
      return { allowed: true, mode, message: 'Budget control disabled', position, shortfall, requires_override: false };

    case 'warning':
      return {
        allowed: true,
        mode,
        message: `⚠️ Budget exceeded by ${shortfall.toFixed(2)}. Transaction allowed with warning.`,
        position,
        shortfall,
        requires_override: false,
      };

    case 'soft_block':
      return {
        allowed: false,
        mode,
        message: `🚫 Budget exceeded by ${shortfall.toFixed(2)}. Manager approval required to proceed.`,
        position,
        shortfall,
        requires_override: true,
      };

    case 'hard_block':
      return {
        allowed: false,
        mode,
        message: `❌ Budget exceeded by ${shortfall.toFixed(2)}. Transaction blocked. Budget revision or Change Order required.`,
        position,
        shortfall,
        requires_override: false,
      };

    default:
      return { allowed: true, mode: 'none', message: '', position, shortfall: 0, requires_override: false };
  }
}

// ===== Commitment Summary =====

/**
 * Get commitment summary for a project.
 */
export function summarizeCommitments(commitments: CommitmentRecord[]): CommitmentSummary {
  const openCommitments = commitments.filter(c => c.status === 'open' || c.status === 'partially_relieved');

  const bySource: Record<CommitmentSource, number> = {
    purchase_order: 0, purchase_request: 0, subcontract: 0, reservation: 0, service_order: 0,
  };

  let totalCommitted = 0, totalRelieved = 0, totalRemaining = 0;
  const byCostType: Record<string, { committed: number; relieved: number; remaining: number }> = {};

  for (const c of commitments) {
    if (c.status === 'cancelled') continue;
    totalCommitted += c.committed_amount;
    totalRelieved += c.relieved_amount;
    totalRemaining += c.remaining_amount;
    bySource[c.source_type] = (bySource[c.source_type] || 0) + c.remaining_amount;

    // Aggregate by cost_code category
    const costKey = c.cost_code || 'uncategorized';
    if (!byCostType[costKey]) {
      byCostType[costKey] = { committed: 0, relieved: 0, remaining: 0 };
    }
    byCostType[costKey].committed += c.committed_amount;
    byCostType[costKey].relieved += c.relieved_amount;
    byCostType[costKey].remaining += c.remaining_amount;
  }

  return {
    total_committed: totalCommitted,
    total_relieved: totalRelieved,
    total_remaining: totalRemaining,
    by_cost_type: byCostType,
    by_source: bySource,
    open_count: openCommitments.length,
  };
}

// ===== Tolerance Checks =====

export interface ToleranceCheckResult {
  within_tolerance: boolean;
  variance_amount: number;
  variance_pct: number;
  message: string;
}

/**
 * Check price variance between PO and AP Invoice (three-way matching).
 */
export function checkPriceVariance(
  poUnitPrice: number,
  invoiceUnitPrice: number,
  tolerancePct: number = 5,
  toleranceAmt: number = 100
): ToleranceCheckResult {
  const diff = invoiceUnitPrice - poUnitPrice;
  const pct = poUnitPrice > 0 ? (diff / poUnitPrice) * 100 : 0;

  const withinPct = Math.abs(pct) <= tolerancePct;
  const withinAmt = Math.abs(diff) <= toleranceAmt;

  return {
    within_tolerance: withinPct || withinAmt,
    variance_amount: diff,
    variance_pct: pct,
    message: withinPct || withinAmt
      ? `Price variance ${pct.toFixed(1)}% (${diff.toFixed(2)}) within tolerance`
      : `⚠️ Price variance ${pct.toFixed(1)}% (${diff.toFixed(2)}) exceeds tolerance of ${tolerancePct}% / ${toleranceAmt}`,
  };
}

/**
 * Check quantity variance between PO and GRPO (goods receipt matching).
 */
export function checkQuantityVariance(
  orderedQty: number,
  receivedQty: number,
  tolerancePct: number = 10
): ToleranceCheckResult {
  const diff = receivedQty - orderedQty;
  const pct = orderedQty > 0 ? (diff / orderedQty) * 100 : 0;

  return {
    within_tolerance: Math.abs(pct) <= tolerancePct,
    variance_amount: diff,
    variance_pct: pct,
    message: Math.abs(pct) <= tolerancePct
      ? `Quantity variance ${pct.toFixed(1)}% within tolerance`
      : `⚠️ Quantity variance ${pct.toFixed(1)}% exceeds tolerance of ${tolerancePct}%`,
  };
}

/**
 * Check progress billing vs certified progress tolerance.
 */
export function checkBillingTolerance(
  certifiedAmount: number,
  billedAmount: number,
  tolerancePct: number = 5
): ToleranceCheckResult {
  const diff = billedAmount - certifiedAmount;
  const pct = certifiedAmount > 0 ? (diff / certifiedAmount) * 100 : 0;

  return {
    within_tolerance: pct <= tolerancePct,
    variance_amount: diff,
    variance_pct: pct,
    message: pct <= tolerancePct
      ? `Billing within ${tolerancePct}% of certified amount`
      : `⚠️ Overbilling: billed ${billedAmount.toFixed(2)} vs certified ${certifiedAmount.toFixed(2)} (${pct.toFixed(1)}% over)`,
  };
}

// ===== Credit Control =====

export interface CreditCheckResult {
  allowed: boolean;
  customer_balance: number;
  open_orders: number;
  total_exposure: number;
  credit_limit: number;
  available_credit: number;
  message: string;
}

/**
 * Check customer credit exposure before allowing a sales document.
 */
export async function checkCreditLimit(
  customerId: string,
  proposedAmount: number,
  companyId?: string
): Promise<CreditCheckResult> {
  // Fetch BP credit limit
  let bpQuery = supabase
    .from('business_partners')
    .select('credit_limit, balance')
    .eq('id', customerId)
    .single();

  const { data: bp } = await bpQuery;
  const creditLimit = (bp as any)?.credit_limit || 0;
  const balance = (bp as any)?.balance || 0;

  // Fetch open sales orders
  let soQuery = supabase
    .from('sales_orders')
    .select('total')
    .eq('customer_id', customerId)
    .in('status', ['open', 'approved', 'partially_delivered']);
  if (companyId) soQuery = soQuery.eq('company_id', companyId);

  const { data: openOrders } = await soQuery;
  const openOrderTotal = (openOrders || []).reduce((s: number, o: any) => s + (o.total || 0), 0);

  const totalExposure = balance + openOrderTotal + proposedAmount;
  const availableCredit = creditLimit - totalExposure + proposedAmount; // Before this transaction

  if (creditLimit <= 0) {
    return {
      allowed: true, customer_balance: balance, open_orders: openOrderTotal,
      total_exposure: totalExposure, credit_limit: 0, available_credit: 0,
      message: 'No credit limit configured',
    };
  }

  return {
    allowed: totalExposure <= creditLimit,
    customer_balance: balance,
    open_orders: openOrderTotal,
    total_exposure: totalExposure,
    credit_limit: creditLimit,
    available_credit: creditLimit - totalExposure,
    message: totalExposure <= creditLimit
      ? `Credit OK. Available: ${(creditLimit - totalExposure).toFixed(2)}`
      : `❌ Credit limit exceeded. Limit: ${creditLimit.toFixed(2)}, Exposure: ${totalExposure.toFixed(2)}`,
  };
}
