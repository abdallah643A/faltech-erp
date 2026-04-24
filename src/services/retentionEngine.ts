/**
 * Retention Engine
 * Manages customer retention receivable and subcontractor retention payable.
 * Handles retention deduction, accumulation, release milestones, and DLP conditions.
 */

// ===== Types =====

export type RetentionType = 'customer' | 'subcontractor';
export type RetentionStatus = 'withheld' | 'partially_released' | 'fully_released' | 'forfeited';
export type ReleaseTrigger = 'practical_completion' | 'final_completion' | 'dlp_expiry' | 'manual' | 'milestone';

export interface RetentionTerms {
  retention_pct: number;           // e.g., 10%
  max_retention_amount?: number;   // Cap
  release_schedule: RetentionReleaseMilestone[];
  withholding_tax_applicable: boolean;
  retention_account_receivable?: string; // GL account
  retention_account_payable?: string;    // GL account
}

export interface RetentionReleaseMilestone {
  trigger: ReleaseTrigger;
  release_pct: number;          // % of total retention to release
  days_after_trigger?: number;  // Days after trigger event
  description: string;
  requires_approval: boolean;
}

export interface RetentionRecord {
  id?: string;
  project_id: string;
  retention_type: RetentionType;
  counterparty_id: string;       // Customer or Subcontractor BP ID
  counterparty_name: string;
  source_document_type: string;  // ar_invoice, ap_invoice, progress_billing, subcontract_ipc
  source_document_id: string;
  source_document_number: string;
  source_document_date: string;
  gross_amount: number;          // Original invoice/billing amount
  retention_pct: number;
  retention_amount: number;      // Amount withheld
  released_amount: number;       // Amount released so far
  balance: number;               // retention_amount - released_amount
  status: RetentionStatus;
  currency: string;
  branch_id?: string;
  company_id?: string;
}

export interface RetentionRelease {
  id?: string;
  retention_id: string;
  release_date: string;
  release_amount: number;
  release_trigger: ReleaseTrigger;
  release_document_type?: string;  // Payment or credit note
  release_document_id?: string;
  approved_by?: string;
  notes?: string;
}

export interface RetentionSummary {
  project_id: string;
  customer_retention: {
    total_withheld: number;
    total_released: number;
    balance: number;
    records_count: number;
  };
  subcontractor_retention: {
    total_withheld: number;
    total_released: number;
    balance: number;
    records_count: number;
  };
  by_counterparty: Record<string, { withheld: number; released: number; balance: number; name: string; type: RetentionType }>;
}

// ===== Retention Calculation =====

/**
 * Calculate retention amount for a billing/invoice document.
 */
export function calculateRetention(
  grossAmount: number,
  terms: RetentionTerms
): { retentionAmount: number; netPayable: number } {
  let retentionAmount = grossAmount * (terms.retention_pct / 100);

  // Apply cap if configured
  if (terms.max_retention_amount && retentionAmount > terms.max_retention_amount) {
    retentionAmount = terms.max_retention_amount;
  }

  return {
    retentionAmount: Math.round(retentionAmount * 100) / 100,
    netPayable: Math.round((grossAmount - retentionAmount) * 100) / 100,
  };
}

/**
 * Create a retention record from a billing/invoice document.
 */
export function createRetentionRecord(
  projectId: string,
  retentionType: RetentionType,
  counterpartyId: string,
  counterpartyName: string,
  sourceDocType: string,
  sourceDocId: string,
  sourceDocNumber: string,
  sourceDocDate: string,
  grossAmount: number,
  terms: RetentionTerms,
  currency: string = 'SAR',
  branchId?: string,
  companyId?: string
): RetentionRecord {
  const { retentionAmount } = calculateRetention(grossAmount, terms);

  return {
    project_id: projectId,
    retention_type: retentionType,
    counterparty_id: counterpartyId,
    counterparty_name: counterpartyName,
    source_document_type: sourceDocType,
    source_document_id: sourceDocId,
    source_document_number: sourceDocNumber,
    source_document_date: sourceDocDate,
    gross_amount: grossAmount,
    retention_pct: terms.retention_pct,
    retention_amount: retentionAmount,
    released_amount: 0,
    balance: retentionAmount,
    status: 'withheld',
    currency,
    branch_id: branchId,
    company_id: companyId,
  };
}

// ===== Retention Release =====

/**
 * Process a retention release (partial or full).
 */
export function processRetentionRelease(
  retention: RetentionRecord,
  releaseAmount: number,
  trigger: ReleaseTrigger,
  releaseDate: string,
  approvedBy?: string,
  notes?: string
): { updatedRetention: RetentionRecord; release: RetentionRelease } {
  const actualRelease = Math.min(releaseAmount, retention.balance);

  const updatedRetention: RetentionRecord = {
    ...retention,
    released_amount: retention.released_amount + actualRelease,
    balance: retention.balance - actualRelease,
    status: (retention.balance - actualRelease) <= 0.01 ? 'fully_released' : 'partially_released',
  };

  const release: RetentionRelease = {
    retention_id: retention.id || '',
    release_date: releaseDate,
    release_amount: actualRelease,
    release_trigger: trigger,
    approved_by: approvedBy,
    notes,
  };

  return { updatedRetention, release };
}

/**
 * Check if retention is eligible for release based on milestones.
 */
export function checkReleaseEligibility(
  retention: RetentionRecord,
  terms: RetentionTerms,
  completedTriggers: ReleaseTrigger[]
): { eligible: boolean; releasableAmount: number; pendingMilestones: RetentionReleaseMilestone[] } {
  if (retention.status === 'fully_released' || retention.status === 'forfeited') {
    return { eligible: false, releasableAmount: 0, pendingMilestones: [] };
  }

  let releasablePct = 0;
  const pendingMilestones: RetentionReleaseMilestone[] = [];

  for (const milestone of terms.release_schedule) {
    if (completedTriggers.includes(milestone.trigger)) {
      releasablePct += milestone.release_pct;
    } else {
      pendingMilestones.push(milestone);
    }
  }

  const totalReleasable = retention.retention_amount * (releasablePct / 100);
  const releasableAmount = Math.max(0, totalReleasable - retention.released_amount);

  return {
    eligible: releasableAmount > 0.01,
    releasableAmount: Math.round(releasableAmount * 100) / 100,
    pendingMilestones,
  };
}

// ===== Retention Summary =====

/**
 * Summarize retention for a project across all counterparties.
 */
export function summarizeRetention(records: RetentionRecord[]): RetentionSummary {
  const summary: RetentionSummary = {
    project_id: records[0]?.project_id || '',
    customer_retention: { total_withheld: 0, total_released: 0, balance: 0, records_count: 0 },
    subcontractor_retention: { total_withheld: 0, total_released: 0, balance: 0, records_count: 0 },
    by_counterparty: {},
  };

  for (const r of records) {
    if (r.status === 'forfeited') continue;

    const bucket = r.retention_type === 'customer' ? summary.customer_retention : summary.subcontractor_retention;
    bucket.total_withheld += r.retention_amount;
    bucket.total_released += r.released_amount;
    bucket.balance += r.balance;
    bucket.records_count++;

    if (!summary.by_counterparty[r.counterparty_id]) {
      summary.by_counterparty[r.counterparty_id] = {
        withheld: 0, released: 0, balance: 0,
        name: r.counterparty_name, type: r.retention_type,
      };
    }
    summary.by_counterparty[r.counterparty_id].withheld += r.retention_amount;
    summary.by_counterparty[r.counterparty_id].released += r.released_amount;
    summary.by_counterparty[r.counterparty_id].balance += r.balance;
  }

  return summary;
}

// ===== Advance Payment & Recovery =====

export interface AdvancePayment {
  id?: string;
  project_id: string;
  advance_type: 'client_advance' | 'supplier_advance' | 'subcontractor_advance';
  counterparty_id: string;
  counterparty_name: string;
  advance_amount: number;
  recovered_amount: number;
  balance: number;
  recovery_pct_per_billing: number; // e.g., 20% of each billing
  source_document_type: string;
  source_document_id: string;
  currency: string;
  status: 'active' | 'fully_recovered' | 'written_off';
}

/**
 * Calculate advance recovery amount for a billing/payment certificate.
 */
export function calculateAdvanceRecovery(
  advance: AdvancePayment,
  billingAmount: number
): { recoveryAmount: number; remainingBalance: number } {
  if (advance.status !== 'active' || advance.balance <= 0) {
    return { recoveryAmount: 0, remainingBalance: advance.balance };
  }

  const scheduledRecovery = billingAmount * (advance.recovery_pct_per_billing / 100);
  const actualRecovery = Math.min(scheduledRecovery, advance.balance);

  return {
    recoveryAmount: Math.round(actualRecovery * 100) / 100,
    remainingBalance: Math.round((advance.balance - actualRecovery) * 100) / 100,
  };
}
