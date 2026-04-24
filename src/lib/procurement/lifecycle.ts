/**
 * Procurement & Purchasing lifecycle service.
 * Provides typed copy-from / copy-to helpers across:
 *   Purchase Request → RFQ → Quotation → PO → GRPO → AP Invoice → Landed Cost
 * Uses the new base_doc_id / base_doc_type traceability columns.
 */
import { supabase } from '@/integrations/supabase/client';

export type ProcDocType =
  | 'purchase_request'
  | 'rfq'
  | 'purchase_quotation'
  | 'purchase_order'
  | 'goods_receipt'
  | 'ap_invoice'
  | 'ap_credit_memo'
  | 'landed_cost';

const headerTableMap: Record<ProcDocType, string> = {
  purchase_request: 'purchase_requests',
  rfq: 'supplier_rfqs',
  purchase_quotation: 'purchase_quotations',
  purchase_order: 'purchase_orders',
  goods_receipt: 'goods_receipts',
  ap_invoice: 'ap_invoices',
  ap_credit_memo: 'ap_credit_memos',
  landed_cost: 'landed_cost_documents',
};

const linesTableMap: Partial<Record<ProcDocType, string>> = {
  purchase_request: 'purchase_request_lines',
  purchase_quotation: 'purchase_quotation_lines',
  purchase_order: 'purchase_order_lines',
  goods_receipt: 'goods_receipt_lines',
  ap_invoice: 'ap_invoice_lines',
  ap_credit_memo: 'ap_credit_memo_lines',
};

const lineFkMap: Partial<Record<ProcDocType, string>> = {
  purchase_request: 'purchase_request_id',
  purchase_quotation: 'quotation_id',
  purchase_order: 'purchase_order_id',
  goods_receipt: 'goods_receipt_id',
  ap_invoice: 'ap_invoice_id',
  ap_credit_memo: 'credit_memo_id',
};

export async function fetchProcDocument(type: ProcDocType, id: string) {
  const headerTable = headerTableMap[type];
  const linesTable = linesTableMap[type];
  const fk = lineFkMap[type];
  const { data: header, error: hErr } = await (supabase
    .from(headerTable as any)
    .select('*')
    .eq('id', id)
    .maybeSingle() as any);
  if (hErr) throw hErr;
  let lines: any[] = [];
  if (linesTable && fk) {
    const { data: ls } = await (supabase.from(linesTable as any).select('*').eq(fk, id) as any);
    lines = ls || [];
  }
  return { header, lines };
}

export async function requestThreeWayMatchOverride(invoiceId: string, reason: string) {
  const { data, error } = await (supabase.rpc('proc_create_match_override_request' as any, {
    p_invoice_id: invoiceId,
    p_reason: reason,
  }) as any);
  if (error) throw error;
  return data as string;
}

export async function approveThreeWayMatchOverride(requestId: string) {
  const { error } = await (supabase.rpc('proc_approve_match_override' as any, {
    p_request_id: requestId,
  }) as any);
  if (error) throw error;
}

export async function recalcSupplierScorecard(vendorId: string) {
  const { error } = await (supabase.rpc('proc_recalc_supplier_scorecard' as any, {
    p_vendor_id: vendorId,
  }) as any);
  if (error) throw error;
}
