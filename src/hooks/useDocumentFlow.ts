import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DocFlowNode {
  step: string;
  label: string;
  labelAr: string;
  docNumber: string | null;
  id: string | null;
  status: string | null;
  total: number | null;
  currency: string | null;
  createdAt: string | null;
  route: string | null;
  exists: boolean;
  isCurrent: boolean;
}

export type FlowChain = 'crm' | 'procurement';

interface FlowContext {
  chain: FlowChain;
  documentType: string;
  documentId: string;
}

const CRM_STEPS = [
  { step: 'opportunity', label: 'Opportunity', labelAr: 'فرصة', table: 'opportunities' },
  { step: 'quote', label: 'Quotation', labelAr: 'عرض سعر', table: 'quotes' },
  { step: 'sales_order', label: 'Sales Order', labelAr: 'أمر بيع', table: 'sales_orders' },
  { step: 'delivery', label: 'Delivery Note', labelAr: 'إشعار تسليم', table: 'delivery_notes' },
  { step: 'ar_invoice', label: 'A/R Invoice', labelAr: 'فاتورة مبيعات', table: 'ar_invoices' },
];

const PROCUREMENT_STEPS = [
  { step: 'material_request', label: 'Material Request', labelAr: 'طلب مواد', table: 'material_requests' },
  { step: 'purchase_request', label: 'Purchase Request', labelAr: 'طلب شراء', table: 'purchase_requests' },
  { step: 'purchase_quotation', label: 'Purchase Quotation', labelAr: 'عرض سعر مشتريات', table: 'purchase_quotations' },
  { step: 'purchase_order', label: 'Purchase Order', labelAr: 'أمر شراء', table: 'purchase_orders' },
  { step: 'goods_receipt', label: 'Goods Receipt PO', labelAr: 'استلام بضائع', table: 'goods_receipts' },
  { step: 'ap_invoice', label: 'A/P Invoice', labelAr: 'فاتورة مشتريات', table: 'ap_invoices' },
];

const ROUTE_MAP: Record<string, string> = {
  opportunities: '/opportunities',
  quotes: '/quotes',
  sales_orders: '/sales-orders',
  delivery_notes: '/delivery-notes',
  ar_invoices: '/ar-invoices',
  material_requests: '/material-requests',
  purchase_requests: '/procurement/purchase-requests',
  purchase_quotations: '/procurement/purchase-quotations',
  purchase_orders: '/procurement/purchase-orders',
  goods_receipts: '/procurement/goods-receipts',
  ap_invoices: '/procurement/ap-invoices',
};

function getDocNumber(row: any, table: string): string {
  if (table === 'opportunities') return row.name || `OPP-${(row.id as string).slice(0,8)}`;
  if (table === 'quotes') return row.quote_number || `QT-${(row.id as string).slice(0,8)}`;
  if (table === 'sales_orders') return `SO-${row.doc_num}`;
  if (table === 'delivery_notes') return `DN-${row.doc_num}`;
  if (table === 'ar_invoices') return `INV-${row.doc_num}`;
  if (table === 'material_requests') return row.mr_number || `MR-${(row.id as string).slice(0,8)}`;
  if (table === 'purchase_requests') return row.pr_number || `PR-${(row.id as string).slice(0,8)}`;
  if (table === 'purchase_quotations') return row.pq_number || `PQ-${(row.id as string).slice(0,8)}`;
  if (table === 'purchase_orders') return row.po_number || `PO-${(row.id as string).slice(0,8)}`;
  if (table === 'goods_receipts') return row.grpo_number || `GRPO-${(row.id as string).slice(0,8)}`;
  if (table === 'ap_invoices') return row.invoice_number || `API-${(row.id as string).slice(0,8)}`;
  return row.id?.slice(0,8) || '—';
}

async function buildCrmFlow(docType: string, docId: string): Promise<DocFlowNode[]> {
  const nodes: DocFlowNode[] = CRM_STEPS.map(s => ({
    step: s.step, label: s.label, labelAr: s.labelAr,
    docNumber: null, id: null, status: null, total: null, currency: null, createdAt: null,
    route: ROUTE_MAP[s.table], exists: false, isCurrent: false,
  }));

  // Start from whichever doc type we have, then traverse up and down
  let opportunityId: string | null = null;
  let quoteId: string | null = null;
  let soDocNum: number | null = null;
  let soCustomerCode: string | null = null;

  if (docType === 'opportunity') {
    opportunityId = docId;
  } else if (docType === 'quote') {
    const { data: q } = await supabase.from('quotes').select('*').eq('id', docId).single();
    if (q) {
      fillNode(nodes, 'quote', q, 'quotes');
      opportunityId = q.opportunity_id;
      soCustomerCode = q.customer_code;
    }
  } else if (docType === 'sales_order') {
    const { data: so } = await supabase.from('sales_orders').select('*').eq('id', docId).single();
    if (so) {
      fillNode(nodes, 'sales_order', so, 'sales_orders');
      soDocNum = so.doc_num;
      soCustomerCode = so.customer_code;
    }
  } else if (docType === 'delivery_note') {
    const { data: dn } = await supabase.from('delivery_notes').select('*').eq('id', docId).single();
    if (dn) {
      fillNode(nodes, 'delivery', dn, 'delivery_notes');
      soCustomerCode = dn.customer_code;
      if (dn.base_doc_id) {
        const { data: so } = await supabase.from('sales_orders').select('*').eq('id', dn.base_doc_id).single();
        if (so) { fillNode(nodes, 'sales_order', so, 'sales_orders'); soDocNum = so.doc_num; soCustomerCode = so.customer_code; }
      }
    }
  } else if (docType === 'ar_invoice') {
    const { data: inv } = await supabase.from('ar_invoices').select('*').eq('id', docId).single();
    if (inv) {
      fillNode(nodes, 'ar_invoice', inv, 'ar_invoices');
      soCustomerCode = inv.customer_code;
    }
  }

  // Fill opportunity
  if (opportunityId) {
    const { data: opp } = await supabase.from('opportunities').select('*').eq('id', opportunityId).single();
    if (opp) fillNode(nodes, 'opportunity', opp, 'opportunities');
  }

  // Find linked quotes if we have an opportunity
  if (opportunityId && !nodes.find(n => n.step === 'quote')?.exists) {
    const { data: quotes } = await supabase.from('quotes').select('*').eq('opportunity_id', opportunityId).limit(1);
    if (quotes?.[0]) { fillNode(nodes, 'quote', quotes[0], 'quotes'); soCustomerCode = soCustomerCode || quotes[0].customer_code; }
  }

  // Find sales orders by customer_code if no direct link
  if (soCustomerCode && !nodes.find(n => n.step === 'sales_order')?.exists) {
    const { data: sos } = await supabase.from('sales_orders').select('*').eq('customer_code', soCustomerCode).order('created_at', { ascending: false }).limit(1);
    if (sos?.[0]) { fillNode(nodes, 'sales_order', sos[0], 'sales_orders'); soDocNum = sos[0].doc_num; }
  }

  // Find delivery notes linked to SO
  if (soDocNum && !nodes.find(n => n.step === 'delivery')?.exists) {
    const soNode = nodes.find(n => n.step === 'sales_order');
    if (soNode?.id) {
      const { data: dns } = await supabase.from('delivery_notes').select('*').eq('base_doc_id', soNode.id).limit(1);
      if (dns?.[0]) fillNode(nodes, 'delivery', dns[0], 'delivery_notes');
    }
  }

  // Find AR invoices by customer_code
  if (soCustomerCode && !nodes.find(n => n.step === 'ar_invoice')?.exists) {
    const { data: invs } = await supabase.from('ar_invoices').select('*').eq('customer_code', soCustomerCode).order('created_at', { ascending: false }).limit(1);
    if (invs?.[0]) fillNode(nodes, 'ar_invoice', invs[0], 'ar_invoices');
  }

  // Mark current
  const currentIdx = nodes.findIndex(n => n.step === docType || (docType === 'delivery_note' && n.step === 'delivery'));
  if (currentIdx >= 0) nodes[currentIdx].isCurrent = true;

  return nodes;
}

async function buildProcurementFlow(docType: string, docId: string): Promise<DocFlowNode[]> {
  const nodes: DocFlowNode[] = PROCUREMENT_STEPS.map(s => ({
    step: s.step, label: s.label, labelAr: s.labelAr,
    docNumber: null, id: null, status: null, total: null, currency: null, createdAt: null,
    route: ROUTE_MAP[s.table], exists: false, isCurrent: false,
  }));

  let mrId: string | null = null;
  let prId: string | null = null;
  let pqId: string | null = null;
  let poId: string | null = null;
  let grId: string | null = null;

  // Load the starting document and traverse
  if (docType === 'material_request') {
    mrId = docId;
    const { data } = await supabase.from('material_requests').select('*').eq('id', docId).single();
    if (data) fillNode(nodes, 'material_request', data, 'material_requests');
  } else if (docType === 'purchase_request') {
    prId = docId;
    const { data } = await supabase.from('purchase_requests').select('*').eq('id', docId).single();
    if (data) { fillNode(nodes, 'purchase_request', data, 'purchase_requests'); mrId = data.material_request_id; }
  } else if (docType === 'purchase_quotation') {
    pqId = docId;
    const { data } = await supabase.from('purchase_quotations').select('*').eq('id', docId).single();
    if (data) { fillNode(nodes, 'purchase_quotation', data, 'purchase_quotations'); prId = data.purchase_request_id; }
  } else if (docType === 'purchase_order') {
    poId = docId;
    const { data } = await supabase.from('purchase_orders').select('*').eq('id', docId).single();
    if (data) { fillNode(nodes, 'purchase_order', data, 'purchase_orders'); prId = data.purchase_request_id; pqId = data.purchase_quotation_id; }
  } else if (docType === 'goods_receipt') {
    grId = docId;
    const { data } = await supabase.from('goods_receipts').select('*').eq('id', docId).single();
    if (data) { fillNode(nodes, 'goods_receipt', data, 'goods_receipts'); poId = data.purchase_order_id; }
  } else if (docType === 'ap_invoice') {
    const { data } = await supabase.from('ap_invoices').select('*').eq('id', docId).single();
    if (data) { fillNode(nodes, 'ap_invoice', data, 'ap_invoices'); poId = data.purchase_order_id; grId = data.goods_receipt_id; }
  }

  // Traverse upstream
  if (poId && !nodes.find(n => n.step === 'purchase_order')?.exists) {
    const { data } = await supabase.from('purchase_orders').select('*').eq('id', poId).single();
    if (data) { fillNode(nodes, 'purchase_order', data, 'purchase_orders'); prId = prId || data.purchase_request_id; pqId = pqId || data.purchase_quotation_id; }
  }
  if (pqId && !nodes.find(n => n.step === 'purchase_quotation')?.exists) {
    const { data } = await supabase.from('purchase_quotations').select('*').eq('id', pqId).single();
    if (data) { fillNode(nodes, 'purchase_quotation', data, 'purchase_quotations'); prId = prId || data.purchase_request_id; }
  }
  if (prId && !nodes.find(n => n.step === 'purchase_request')?.exists) {
    const { data } = await supabase.from('purchase_requests').select('*').eq('id', prId).single();
    if (data) { fillNode(nodes, 'purchase_request', data, 'purchase_requests'); mrId = mrId || data.material_request_id; }
  }
  if (mrId && !nodes.find(n => n.step === 'material_request')?.exists) {
    const { data } = await supabase.from('material_requests').select('*').eq('id', mrId).single();
    if (data) fillNode(nodes, 'material_request', data, 'material_requests');
  }

  // Traverse downstream
  if (prId && !nodes.find(n => n.step === 'purchase_quotation')?.exists) {
    const { data } = await supabase.from('purchase_quotations').select('*').eq('purchase_request_id', prId).limit(1);
    if (data?.[0]) { fillNode(nodes, 'purchase_quotation', data[0], 'purchase_quotations'); pqId = data[0].id; }
  }
  if ((prId || pqId) && !nodes.find(n => n.step === 'purchase_order')?.exists) {
    let q = supabase.from('purchase_orders').select('*');
    if (prId) q = q.eq('purchase_request_id', prId);
    else if (pqId) q = q.eq('purchase_quotation_id', pqId);
    const { data } = await q.limit(1);
    if (data?.[0]) { fillNode(nodes, 'purchase_order', data[0], 'purchase_orders'); poId = data[0].id; }
  }
  if (poId && !nodes.find(n => n.step === 'goods_receipt')?.exists) {
    const { data } = await supabase.from('goods_receipts').select('*').eq('purchase_order_id', poId).limit(1);
    if (data?.[0]) { fillNode(nodes, 'goods_receipt', data[0], 'goods_receipts'); grId = data[0].id; }
  }
  if (poId && !nodes.find(n => n.step === 'ap_invoice')?.exists) {
    const { data } = await supabase.from('ap_invoices').select('*').eq('purchase_order_id', poId).limit(1);
    if (data?.[0]) fillNode(nodes, 'ap_invoice', data[0], 'ap_invoices');
  }

  // Mark current
  const currentIdx = nodes.findIndex(n => n.step === docType);
  if (currentIdx >= 0) nodes[currentIdx].isCurrent = true;

  return nodes;
}

function fillNode(nodes: DocFlowNode[], step: string, row: any, table: string) {
  const n = nodes.find(nd => nd.step === step);
  if (!n) return;
  n.exists = true;
  n.id = row.id;
  n.docNumber = getDocNumber(row, table);
  n.status = row.status || row.workflow_status || null;
  n.total = row.total || row.max_local_total || null;
  n.currency = row.currency || null;
  n.createdAt = row.created_at || row.requested_at || null;
}

export function useDocumentFlow(ctx: FlowContext | null) {
  return useQuery({
    queryKey: ['document-flow', ctx?.chain, ctx?.documentType, ctx?.documentId],
    queryFn: async () => {
      if (!ctx) return [];
      if (ctx.chain === 'crm') return buildCrmFlow(ctx.documentType, ctx.documentId);
      return buildProcurementFlow(ctx.documentType, ctx.documentId);
    },
    enabled: !!ctx,
    staleTime: 30_000,
  });
}
