/**
 * Reversal & Cancellation Engine
 * Per-document-type reversal rules, downstream blocking, and reverse JE generation.
 */

import { supabase } from '@/integrations/supabase/client';
import { getCancellationRules, getDownstreamDocuments, type CancellationRules } from './documentFinanceEngine';

// ===== Types =====

export type ReversalMethod = 'cancel' | 'reverse_je' | 'credit_note' | 'return' | 'adjustment';

export interface ReversalValidation {
  can_reverse: boolean;
  allowed_methods: ReversalMethod[];
  blocking_reasons: string[];
  warnings: string[];
  downstream_documents: DownstreamDocument[];
  requires_approval: boolean;
  cancellation_rules: CancellationRules;
}

export interface DownstreamDocument {
  document_type: string;
  document_id: string;
  document_number: string;
  status: string;
  blocks_cancellation: boolean;
}

export interface ReversalEntry {
  original_document_type: string;
  original_document_id: string;
  reversal_method: ReversalMethod;
  reversal_date: string;
  reversal_reason: string;
  reversed_by?: string;
  reversal_journal_lines?: ReversalJournalLine[];
}

export interface ReversalJournalLine {
  line_order: number;
  side: 'debit' | 'credit';
  acct_code: string;
  acct_name: string;
  amount: number;
  original_side: 'debit' | 'credit';
  description: string;
}

// ===== Document-to-table mapping for downstream check =====

const DOWNSTREAM_TABLE_MAP: Record<string, { table: string; fk_field: string; number_field: string; status_field: string }[]> = {
  sales_order: [
    { table: 'delivery_notes', fk_field: 'sales_order_id', number_field: 'doc_num', status_field: 'status' },
    { table: 'ar_invoices', fk_field: 'sales_order_id', number_field: 'doc_num', status_field: 'status' },
  ],
  delivery: [
    { table: 'ar_invoices', fk_field: 'delivery_note_id', number_field: 'doc_num', status_field: 'status' },
  ],
  ar_invoice: [
    { table: 'incoming_payments', fk_field: 'invoice_id', number_field: 'doc_num', status_field: 'status' },
    { table: 'ar_credit_memos', fk_field: 'reference_invoice', number_field: 'doc_num', status_field: 'status' },
  ],
  purchase_order: [
    { table: 'goods_receipts', fk_field: 'purchase_order_id', number_field: 'receipt_number', status_field: 'status' },
    { table: 'ap_invoices', fk_field: 'purchase_order_id', number_field: 'invoice_number', status_field: 'status' },
  ],
  goods_receipt_po: [
    { table: 'ap_invoices', fk_field: 'goods_receipt_id', number_field: 'invoice_number', status_field: 'status' },
  ],
  ap_invoice: [
    { table: 'outgoing_payments', fk_field: 'ap_invoice_id', number_field: 'doc_num', status_field: 'status' },
    { table: 'ap_credit_memos', fk_field: 'reference_invoice', number_field: 'doc_num', status_field: 'status' },
  ],
};

// ===== Validation =====

/**
 * Validate whether a document can be reversed/cancelled.
 * Checks downstream documents, posting status, and cancellation rules.
 */
export async function validateReversal(
  documentType: string,
  documentId: string
): Promise<ReversalValidation> {
  const rules = getCancellationRules(documentType);
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const downstreamDocs: DownstreamDocument[] = [];

  // Check downstream documents
  if (rules.downstream_documents_block_cancel) {
    const tableConfigs = DOWNSTREAM_TABLE_MAP[documentType] || [];

    for (const config of tableConfigs) {
      try {
        const { data } = await supabase
          .from(config.table as any)
          .select(`id, ${config.number_field}, ${config.status_field}`)
          .eq(config.fk_field, documentId)
          .neq(config.status_field, 'cancelled');

        if (data && data.length > 0) {
          for (const doc of data as any[]) {
            const downstream: DownstreamDocument = {
              document_type: config.table,
              document_id: doc.id,
              document_number: String(doc[config.number_field] || doc.id),
              status: doc[config.status_field] || 'unknown',
              blocks_cancellation: true,
            };
            downstreamDocs.push(downstream);
            blockingReasons.push(
              `Cannot cancel: downstream ${config.table.replace(/_/g, ' ')} #${downstream.document_number} exists (status: ${downstream.status})`
            );
          }
        }
      } catch {
        // Table might not exist or FK field might be wrong — skip gracefully
      }
    }
  }

  // Check if already posted (for JE reversal)
  if (rules.reverse_journal_required) {
    try {
      const { data: postingRuns } = await supabase
        .from('acct_posting_runs' as any)
        .select('id, status, reversed_by_run_id')
        .eq('document_id', documentId)
        .eq('status', 'posted');

      if (postingRuns && postingRuns.length > 0) {
        const alreadyReversed = (postingRuns as any[]).some(r => r.reversed_by_run_id);
        if (alreadyReversed) {
          blockingReasons.push('Document has already been reversed');
        }
      }
    } catch {
      // acct_posting_runs might not have data for this doc
    }
  }

  // Determine allowed methods based on rules and blocking
  let allowedMethods = [...rules.allowed_reversal_methods];
  if (blockingReasons.length > 0 && rules.downstream_documents_block_cancel) {
    // Remove direct cancel if downstream exists, but allow credit note/return
    allowedMethods = allowedMethods.filter(m => m !== 'cancel' && m !== 'reverse_je');
    if (rules.requires_credit_note_or_return) {
      if (!allowedMethods.includes('credit_note')) allowedMethods.push('credit_note');
      if (!allowedMethods.includes('return')) allowedMethods.push('return');
    }
  }

  const canReverse = blockingReasons.length === 0 || allowedMethods.length > 0;

  if (rules.reversal_date_must_match_original) {
    warnings.push('Reversal date must match original posting date');
  }

  return {
    can_reverse: canReverse,
    allowed_methods: allowedMethods,
    blocking_reasons: blockingReasons,
    warnings,
    downstream_documents: downstreamDocs,
    requires_approval: rules.requires_approval_for_reversal,
    cancellation_rules: rules,
  };
}

// ===== Reverse JE Generation =====

/**
 * Generate reversal journal entry lines by flipping debit/credit of original posting.
 */
export async function generateReversalJE(
  documentId: string,
  reversalDate: string,
  reason: string
): Promise<ReversalJournalLine[]> {
  // Fetch original posting run lines
  const { data: runs } = await supabase
    .from('acct_posting_runs' as any)
    .select('id')
    .eq('document_id', documentId)
    .eq('status', 'posted');

  if (!runs || runs.length === 0) return [];

  const runId = (runs as any[])[0].id;

  const { data: lines } = await supabase
    .from('acct_posting_run_lines' as any)
    .select('*')
    .eq('run_id', runId)
    .order('line_order');

  if (!lines || lines.length === 0) return [];

  return (lines as any[]).map((line, idx) => ({
    line_order: idx + 1,
    side: line.side === 'debit' ? 'credit' as const : 'debit' as const,
    acct_code: line.acct_code,
    acct_name: line.acct_name || '',
    amount: Math.abs(line.amount),
    original_side: line.side as 'debit' | 'credit',
    description: `Reversal: ${reason} (original line ${line.line_order})`,
  }));
}

/**
 * Execute a cancellation for a non-financial document (PO, SO, PR, etc.)
 */
export function buildCancellationRecord(
  documentType: string,
  documentId: string,
  reason: string,
  cancelledBy: string
): ReversalEntry {
  return {
    original_document_type: documentType,
    original_document_id: documentId,
    reversal_method: 'cancel',
    reversal_date: new Date().toISOString().split('T')[0],
    reversal_reason: reason,
    reversed_by: cancelledBy,
  };
}

/**
 * Get human-readable summary of what will happen on reversal.
 */
export function getReversalImpactSummary(documentType: string): string[] {
  const impacts: string[] = [];
  const rules = getCancellationRules(documentType);

  if (rules.reverse_journal_required) impacts.push('Reverse journal entry will be created');
  if (rules.requires_credit_note_or_return) impacts.push('Credit note or return document is required');
  if (rules.downstream_documents_block_cancel) impacts.push('Downstream documents must be cancelled first');
  if (rules.requires_approval_for_reversal) impacts.push('Approval is required for reversal');
  if (rules.reversal_date_must_match_original) impacts.push('Reversal must use the original posting date');

  return impacts;
}
