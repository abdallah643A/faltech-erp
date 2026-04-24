/**
 * Sales & AR lifecycle service.
 * Provides typed copy-from / copy-to helpers across:
 *   Quotation → Sales Order → Delivery → AR Invoice → Incoming Payment
 * Uses the new base_doc_id / base_doc_type traceability columns.
 */
import { supabase } from '@/integrations/supabase/client';

export type LifecycleDocType =
  | 'sales_quotation'
  | 'sales_order'
  | 'delivery'
  | 'ar_invoice'
  | 'ar_credit_memo'
  | 'ar_return'
  | 'incoming_payment';

export interface CopyContext {
  fromType: LifecycleDocType;
  fromId: string;
  toType: LifecycleDocType;
}

const linesTableMap: Partial<Record<LifecycleDocType, string>> = {
  sales_quotation: 'sales_quotation_lines',
  sales_order: 'sales_order_lines',
  ar_invoice: 'ar_invoice_lines',
  ar_credit_memo: 'ar_credit_memo_lines',
  ar_return: 'ar_return_lines',
};

const headerTableMap: Record<LifecycleDocType, string> = {
  sales_quotation: 'sales_quotations',
  sales_order: 'sales_orders',
  delivery: 'deliveries',
  ar_invoice: 'ar_invoices',
  ar_credit_memo: 'ar_credit_memos',
  ar_return: 'ar_returns',
  incoming_payment: 'incoming_payments',
};

/** Fetch a base document + its lines so the next document in the chain can pre-fill. */
export async function fetchBaseDocument(type: LifecycleDocType, id: string) {
  const headerTable = headerTableMap[type];
  const linesTable = linesTableMap[type];
  const { data: header, error: hErr } = await (supabase
    .from(headerTable as any)
    .select('*')
    .eq('id', id)
    .maybeSingle() as any);
  if (hErr) throw hErr;
  let lines: any[] = [];
  if (linesTable) {
    const fk = type === 'ar_return' ? 'return_id' :
               type === 'ar_credit_memo' ? 'credit_memo_id' :
               type === 'ar_invoice' ? 'ar_invoice_id' :
               type === 'sales_order' ? 'sales_order_id' :
               'quotation_id';
    const { data: ls } = await (supabase.from(linesTable as any).select('*').eq(fk, id) as any);
    lines = ls || [];
  }
  return { header, lines };
}

/** Approve a credit-override request (manager action). */
export async function approveCreditOverride(overrideId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await (supabase
    .from('credit_override_requests' as any)
    .update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() })
    .eq('id', overrideId) as any);
  if (error) throw error;
}

export async function rejectCreditOverride(overrideId: string, reason: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await (supabase
    .from('credit_override_requests' as any)
    .update({ status: 'rejected', approved_by: user?.id, approved_at: new Date().toISOString(), rejection_reason: reason })
    .eq('id', overrideId) as any);
  if (error) throw error;
}

export async function requestCreditOverride(args: {
  customer_id?: string;
  current_limit: number;
  requested_limit: number;
  reason: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await (supabase
    .from('credit_override_requests' as any)
    .insert({
      customer_id: args.customer_id,
      requested_by: user?.id,
      requested_by_name: user?.email,
      current_limit: args.current_limit,
      requested_limit: args.requested_limit,
      reason: args.reason,
      status: 'pending',
    })
    .select()
    .single() as any);
  if (error) throw error;
  return data;
}

/** Approve an RMA, which auto-creates the AR Credit Memo via DB RPC. */
export async function approveRmaAndCreateCreditMemo(returnId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  // 1. mark approved
  const { error: uErr } = await (supabase
    .from('ar_returns' as any)
    .update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() })
    .eq('id', returnId) as any);
  if (uErr) throw uErr;
  // 2. call RPC
  const { data, error } = await (supabase.rpc('ar_create_credit_memo_from_return' as any, { p_return_id: returnId }) as any);
  if (error) throw error;
  return data as string; // credit_memo_id
}

/** Returns true when posting an AR invoice should request ZATCA clearance. */
export function shouldTriggerZatca(currency?: string | null): boolean {
  return (currency || 'SAR').toUpperCase() === 'SAR';
}
