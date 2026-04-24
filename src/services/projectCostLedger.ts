/**
 * Project Cost Ledger Service
 * Tracks all cost-bearing transactions against projects with cost code breakdown,
 * WIP calculations, earned value metrics, and accrual management.
 */

import { supabase } from '@/integrations/supabase/client';

// ===== Types =====

export type CostType = 'labor' | 'material' | 'equipment' | 'subcontract' | 'overhead' | 'misc';

export type RevenueRecognitionMethod = 'billing_based' | 'cost_to_cost' | 'milestone' | 'progress_certification';

export interface ProjectCostEntry {
  id?: string;
  project_id: string;
  cost_code: string;
  wbs_activity?: string;
  cost_type: CostType;
  source_document_type: string;
  source_document_id: string;
  source_document_number: string;
  transaction_date: string;
  description: string;
  quantity?: number;
  unit?: string;
  unit_cost?: number;
  amount: number;
  currency: string;
  vendor_id?: string;
  vendor_name?: string;
  employee_id?: string;
  branch_id?: string;
  cost_center?: string;
  company_id?: string;
  is_commitment: boolean;
  is_actual: boolean;
  is_accrual: boolean;
}

export interface ProjectCostSummary {
  project_id: string;
  contract_value: number;
  revised_contract_value: number;
  original_budget: number;
  revised_budget: number;
  committed: number;
  actual_cost: number;
  accruals: number;
  total_cost_to_date: number; // actual + accruals
  forecast_to_complete: number;
  estimate_at_completion: number;
  variance_at_completion: number;
  margin: number;
  margin_pct: number;
  cost_by_type: Record<CostType, { budget: number; committed: number; actual: number; forecast: number }>;
  earned_value: EarnedValueMetrics;
}

export interface EarnedValueMetrics {
  bcws: number; // Budgeted Cost of Work Scheduled (Planned Value)
  bcwp: number; // Budgeted Cost of Work Performed (Earned Value)
  acwp: number; // Actual Cost of Work Performed
  sv: number;   // Schedule Variance = BCWP - BCWS
  cv: number;   // Cost Variance = BCWP - ACWP
  spi: number;  // Schedule Performance Index = BCWP / BCWS
  cpi: number;  // Cost Performance Index = BCWP / ACWP
  eac: number;  // Estimate At Completion
  etc: number;  // Estimate To Complete
  vac: number;  // Variance At Completion
  tcpi: number; // To-Complete Performance Index
  pct_complete: number;
}

export interface WIPEntry {
  project_id: string;
  period: string;
  recognition_method: RevenueRecognitionMethod;
  total_cost_incurred: number;
  total_estimated_cost: number;
  pct_complete: number;
  contract_revenue: number;
  revenue_recognized_cumulative: number;
  revenue_recognized_this_period: number;
  cost_recognized_this_period: number;
  wip_balance: number; // Costs in excess of billings OR billings in excess of costs
  unbilled_revenue: number;
  deferred_revenue: number;
  total_billed: number;
}

export interface AccrualEntry {
  id?: string;
  project_id: string;
  period: string;
  accrual_type: 'received_not_invoiced' | 'subcontract_work' | 'payroll' | 'site_overhead' | 'committed_services';
  description: string;
  amount: number;
  source_document_type?: string;
  source_document_id?: string;
  status: 'pending' | 'posted' | 'reversed';
  reversal_period?: string;
}

// ===== Cost Position Calculator =====

/**
 * Calculate comprehensive project cost summary from CBS items and cost entries.
 */
export async function calculateProjectCostSummary(
  projectId: string,
  companyId?: string
): Promise<ProjectCostSummary> {
  // Fetch project header
  const { data: project } = await supabase
    .from('projects')
    .select('contract_value, budget, actual_cost')
    .eq('id', projectId)
    .single();

  const contractValue = (project as any)?.contract_value || 0;
  const projectBudget = (project as any)?.budget || contractValue;

  // Fetch CBS items for detailed breakdown
  let cbsQuery = supabase
    .from('cpms_cbs_items' as any)
    .select('*')
    .eq('project_id', projectId);
  if (companyId) cbsQuery = cbsQuery.eq('company_id', companyId);

  const { data: cbsItems } = await cbsQuery;
  const items = (cbsItems || []) as any[];

  const originalBudget = items.reduce((s, i) => s + (i.budget_amount || 0), 0) || projectBudget;
  const revisedBudget = items.reduce((s, i) => s + (i.revised_budget || i.budget_amount || 0), 0) || originalBudget;
  const committed = items.reduce((s, i) => s + (i.committed_amount || 0), 0);
  const actual = items.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const forecast = items.reduce((s, i) => s + (i.forecast_amount || 0), 0);

  // Fetch accruals from finance journal entries tagged to this project
  let accruals = 0;
  try {
    const { data: accrualLines } = await supabase
      .from('finance_journal_entry_lines' as any)
      .select('debit_amount, credit_amount')
      .eq('project_id', projectId)
      .eq('entry_type', 'accrual');
    if (accrualLines) {
      accruals = (accrualLines as any[]).reduce(
        (s: number, l: any) => s + (l.debit_amount || 0) - (l.credit_amount || 0),
        0
      );
    }
  } catch {
    // Gracefully degrade — accruals remain 0 if query fails
  }
  const totalCostToDate = actual + accruals;
  const forecastToComplete = forecast > 0 ? forecast : revisedBudget - totalCostToDate;
  const eac = totalCostToDate + forecastToComplete;
  const vac = revisedBudget - eac;
  const margin = contractValue - eac;
  const marginPct = contractValue > 0 ? (margin / contractValue) * 100 : 0;

  // Cost by type breakdown
  const costByType: Record<CostType, { budget: number; committed: number; actual: number; forecast: number }> = {
    labor: { budget: 0, committed: 0, actual: 0, forecast: 0 },
    material: { budget: 0, committed: 0, actual: 0, forecast: 0 },
    equipment: { budget: 0, committed: 0, actual: 0, forecast: 0 },
    subcontract: { budget: 0, committed: 0, actual: 0, forecast: 0 },
    overhead: { budget: 0, committed: 0, actual: 0, forecast: 0 },
    misc: { budget: 0, committed: 0, actual: 0, forecast: 0 },
  };

  for (const item of items) {
    const ct = (item.cost_type as CostType) || 'misc';
    if (costByType[ct]) {
      costByType[ct].budget += item.budget_amount || 0;
      costByType[ct].committed += item.committed_amount || 0;
      costByType[ct].actual += item.actual_amount || 0;
      costByType[ct].forecast += item.forecast_amount || 0;
    }
  }

  // Earned Value Metrics
  const pctComplete = revisedBudget > 0 ? (actual / revisedBudget) * 100 : 0;
  const bcws = revisedBudget * (pctComplete / 100); // Simplified; ideally from schedule
  const bcwp = revisedBudget * (pctComplete / 100);
  const acwp = actual;
  const sv = bcwp - bcws;
  const cv = bcwp - acwp;
  const spi = bcws > 0 ? bcwp / bcws : 1;
  const cpi = acwp > 0 ? bcwp / acwp : 1;
  const tcpi = (revisedBudget - bcwp) > 0 ? (revisedBudget - bcwp) / (revisedBudget - acwp) : 1;

  return {
    project_id: projectId,
    contract_value: contractValue,
    revised_contract_value: contractValue, // Updated by variations
    original_budget: originalBudget,
    revised_budget: revisedBudget,
    committed,
    actual_cost: actual,
    accruals,
    total_cost_to_date: totalCostToDate,
    forecast_to_complete: forecastToComplete,
    estimate_at_completion: eac,
    variance_at_completion: vac,
    margin,
    margin_pct: marginPct,
    cost_by_type: costByType,
    earned_value: {
      bcws, bcwp, acwp, sv, cv, spi, cpi, eac, etc: forecastToComplete,
      vac, tcpi, pct_complete: pctComplete,
    },
  };
}

// ===== WIP & Revenue Recognition =====

/**
 * Calculate WIP / Revenue Recognition for a project using the specified method.
 */
export function calculateWIP(
  method: RevenueRecognitionMethod,
  params: {
    contract_revenue: number;
    total_cost_incurred: number;
    total_estimated_cost: number;
    total_billed: number;
    previous_revenue_recognized: number;
    milestone_pct?: number; // For milestone method
    certified_pct?: number; // For progress certification
  }
): WIPEntry {
  let pctComplete = 0;

  switch (method) {
    case 'cost_to_cost':
      pctComplete = params.total_estimated_cost > 0
        ? params.total_cost_incurred / params.total_estimated_cost
        : 0;
      break;
    case 'progress_certification':
      pctComplete = params.certified_pct || 0;
      break;
    case 'milestone':
      pctComplete = params.milestone_pct || 0;
      break;
    case 'billing_based':
      pctComplete = params.contract_revenue > 0
        ? params.total_billed / params.contract_revenue
        : 0;
      break;
  }

  const revenueCumulative = params.contract_revenue * pctComplete;
  const revenueThisPeriod = revenueCumulative - params.previous_revenue_recognized;
  const costThisPeriod = params.total_cost_incurred; // Simplified

  // WIP = Cost incurred - Billings
  const wipBalance = params.total_cost_incurred - params.total_billed;
  const unbilledRevenue = Math.max(0, revenueCumulative - params.total_billed);
  const deferredRevenue = Math.max(0, params.total_billed - revenueCumulative);

  return {
    project_id: '',
    period: new Date().toISOString().substring(0, 7),
    recognition_method: method,
    total_cost_incurred: params.total_cost_incurred,
    total_estimated_cost: params.total_estimated_cost,
    pct_complete: pctComplete,
    contract_revenue: params.contract_revenue,
    revenue_recognized_cumulative: revenueCumulative,
    revenue_recognized_this_period: revenueThisPeriod,
    cost_recognized_this_period: costThisPeriod,
    wip_balance: wipBalance,
    unbilled_revenue: unbilledRevenue,
    deferred_revenue: deferredRevenue,
    total_billed: params.total_billed,
  };
}

// ===== Period-End Accruals =====

/**
 * Generate accrual suggestions for period-end closing.
 */
export async function generateAccrualSuggestions(
  projectId: string,
  period: string,
  companyId?: string
): Promise<AccrualEntry[]> {
  const accruals: AccrualEntry[] = [];

  // 1. Received-not-invoiced: GRPOs without matching AP Invoices
  const { data: openGrpos } = await supabase
    .from('goods_receipts')
    .select('id, receipt_number, total, project_id')
    .eq('project_id', projectId)
    .is('ap_invoice_id' as any, null);

  if (openGrpos) {
    for (const grpo of openGrpos as any[]) {
      if (grpo.total > 0) {
        accruals.push({
          project_id: projectId,
          period,
          accrual_type: 'received_not_invoiced',
          description: `Goods received (${grpo.receipt_number}) but not yet invoiced`,
          amount: grpo.total,
          source_document_type: 'goods_receipt',
          source_document_id: grpo.id,
          status: 'pending',
        });
      }
    }
  }

  // 2. Subcontract work performed but not yet certified
  // (Placeholder — would query subcontract progress vs certified)
  
  // 3. Payroll accrual for project labor
  // (Placeholder — would query timesheets not yet in payroll run)

  return accruals;
}
