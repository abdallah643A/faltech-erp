import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

// Types
export interface PurchaseRequest {
  id: string;
  pr_number: string;
  doc_date: string;
  required_date: string | null;
  status: string;
  requester_id: string | null;
  requester_name: string | null;
  department: string | null;
  project_id: string | null;
  material_request_id: string | null;
  branch_id: string | null;
  remarks: string | null;
  sap_doc_entry: string | null;
  sync_status: string | null;
  created_at: string;
  updated_at: string;
  lines?: PurchaseRequestLine[];
}

export interface PurchaseRequestLine {
  id: string;
  purchase_request_id: string;
  line_num: number;
  item_code: string | null;
  item_description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  line_total: number;
  warehouse: string | null;
  required_date: string | null;
  vendor_code: string | null;
  vendor_name: string | null;
  notes: string | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  doc_date: string;
  delivery_date: string | null;
  status: string;
  approval_status: string;
  vendor_code: string | null;
  vendor_name: string;
  vendor_id: string | null;
  purchase_request_id: string | null;
  purchase_quotation_id: string | null;
  project_id: string | null;
  branch_id: string | null;
  contact_person: string | null;
  currency: string | null;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  payment_terms: string | null;
  shipping_address: string | null;
  remarks: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_reason: string | null;
  sap_doc_entry: string | null;
  sync_status: string | null;
  created_at: string;
  updated_at: string;
  lines?: PurchaseOrderLine[];
}

export interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  line_num: number;
  item_code: string | null;
  item_description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  line_total: number;
  discount_percent: number;
  tax_code: string | null;
  tax_percent: number;
  warehouse: string | null;
  received_quantity: number;
  notes: string | null;
}

export interface PurchaseQuotation {
  id: string;
  pq_number: string;
  doc_date: string;
  valid_until: string | null;
  status: string;
  vendor_code: string | null;
  vendor_name: string;
  vendor_id: string | null;
  purchase_request_id: string | null;
  project_id: string | null;
  branch_id: string | null;
  contact_person: string | null;
  currency: string | null;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  remarks: string | null;
  sap_doc_entry: string | null;
  sync_status: string | null;
  created_at: string;
  updated_at: string;
  lines?: any[];
}

export interface GoodsReceipt {
  id: string;
  grpo_number: string;
  doc_date: string;
  posting_date: string | null;
  status: string;
  vendor_code: string | null;
  vendor_name: string;
  vendor_id: string | null;
  purchase_order_id: string | null;
  project_id: string | null;
  branch_id: string | null;
  warehouse: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  remarks: string | null;
  received_by: string | null;
  received_by_name: string | null;
  sap_doc_entry: string | null;
  sync_status: string | null;
  created_at: string;
  updated_at: string;
  lines?: any[];
}

// ====== Purchase Requests ======
export function usePurchaseRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: purchaseRequests, isLoading } = useQuery({
    queryKey: ['purchase-requests', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseRequest[];
    },
  });

  const getPRLines = async (prId: string) => {
    const { data, error } = await supabase
      .from('purchase_request_lines')
      .select('*')
      .eq('purchase_request_id', prId)
      .order('line_num');
    if (error) throw error;
    return data as PurchaseRequestLine[];
  };

  const createPurchaseRequest = useMutation({
    mutationFn: async (data: {
      department?: string;
      required_date?: string;
      project_id?: string;
      branch_id?: string;
      remarks?: string;
      lines: { item_code?: string; item_description: string; quantity: number; unit?: string; unit_price?: number }[];
    }) => {
      const prNum = `PR-${String(Date.now()).slice(-6)}`;
      const { data: pr, error } = await supabase
        .from('purchase_requests')
        .insert({
          pr_number: prNum,
          requester_id: user?.id,
          requester_name: (profile as any)?.full_name || user?.email,
          department: data.department,
          required_date: data.required_date,
          project_id: data.project_id,
          branch_id: data.branch_id,
          remarks: data.remarks,
          status: 'open',
          company_id: activeCompanyId,
        })
        .select()
        .single();
      if (error) throw error;

      if (data.lines.length > 0) {
        const { error: lErr } = await supabase
          .from('purchase_request_lines')
          .insert(data.lines.map((l, i) => ({
          purchase_request_id: pr.id,
            line_num: i + 1,
            item_code: l.item_code || null,
            item_description: l.item_description,
            quantity: l.quantity,
            unit: l.unit || null,
            unit_price: l.unit_price || 0,
          })));
        if (lErr) throw lErr;
      }
      return pr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      toast({ title: 'Purchase Request created successfully' });
    },
    onError: (e: any) => {
      toast({ title: 'Error creating PR', description: e.message, variant: 'destructive' });
    },
  });

  return { purchaseRequests, isLoading, getPRLines, createPurchaseRequest };
}

// ====== Purchase Quotations ======
export function usePurchaseQuotations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['purchase-quotations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_quotations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PurchaseQuotation[];
    },
  });

  const createQuotation = useMutation({
    mutationFn: async (data: {
      vendor_name: string;
      vendor_code?: string;
      vendor_id?: string;
      purchase_request_id?: string;
      project_id?: string;
      branch_id?: string;
      valid_until?: string;
      remarks?: string;
      lines: { item_code?: string; item_description: string; quantity: number; unit_price: number; unit?: string }[];
    }) => {
      const pqNum = `PQ-${String(Date.now()).slice(-6)}`;
      const subtotal = data.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

      const { data: pq, error } = await supabase
        .from('purchase_quotations')
        .insert({
          pq_number: pqNum,
          vendor_name: data.vendor_name,
          vendor_code: data.vendor_code,
          vendor_id: data.vendor_id,
          purchase_request_id: data.purchase_request_id,
          project_id: data.project_id,
          branch_id: data.branch_id,
          valid_until: data.valid_until,
          remarks: data.remarks,
          subtotal,
          total: subtotal,
          status: 'open',
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();
      if (error) throw error;

      if (data.lines.length > 0) {
        const lines = data.lines.map((l, i) => ({
          purchase_quotation_id: pq.id,
          line_num: i + 1,
          item_code: l.item_code || null,
          item_description: l.item_description,
          quantity: l.quantity,
          unit: l.unit || 'EA',
          unit_price: l.unit_price,
        }));
        const { error: lineErr } = await supabase.from('purchase_quotation_lines').insert(lines);
        if (lineErr) throw lineErr;
      }
      return pq;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-quotations'] });
      toast({ title: 'Purchase Quotation created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const getQuotationLines = async (pqId: string) => {
    const { data, error } = await supabase
      .from('purchase_quotation_lines')
      .select('*')
      .eq('purchase_quotation_id', pqId)
      .order('line_num');
    if (error) throw error;
    return data;
  };

  return { quotations, isLoading, createQuotation, getQuotationLines };
}

// ====== Purchase Orders ======
export function usePurchaseOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ['purchase-orders', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseOrder[];
    },
  });

  const createPO = useMutation({
    mutationFn: async (data: {
      vendor_name: string;
      vendor_code?: string;
      vendor_id?: string;
      purchase_request_id?: string;
      purchase_quotation_id?: string;
      project_id?: string;
      branch_id?: string;
      delivery_date?: string;
      payment_terms?: string;
      incoterm?: string;
      shipping_address?: string;
      remarks?: string;
      lines: { item_code?: string; item_description: string; quantity: number; unit_price: number; unit?: string }[];
    }) => {
      const poNum = `PO-${String(Date.now()).slice(-6)}`;
      const subtotal = data.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

      const { data: po, error } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNum,
          vendor_name: data.vendor_name,
          vendor_code: data.vendor_code,
          vendor_id: data.vendor_id,
          purchase_request_id: data.purchase_request_id,
          purchase_quotation_id: data.purchase_quotation_id,
          project_id: data.project_id,
          branch_id: data.branch_id,
          delivery_date: data.delivery_date,
          payment_terms: data.payment_terms,
          incoterm: data.incoterm,
          shipping_address: data.shipping_address,
          remarks: data.remarks,
          subtotal,
          total: subtotal,
          status: 'draft',
          approval_status: 'none',
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();
      if (error) throw error;

      if (data.lines.length > 0) {
        const lines = data.lines.map((l, i) => ({
          purchase_order_id: po.id,
          line_num: i + 1,
          item_code: l.item_code || null,
          item_description: l.item_description,
          quantity: l.quantity,
          unit: l.unit || 'EA',
          unit_price: l.unit_price,
        }));
        const { error: lineErr } = await supabase.from('purchase_order_lines').insert(lines);
        if (lineErr) throw lineErr;
      }
      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Purchase Order created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const submitForApproval = useMutation({
    mutationFn: async (poId: string) => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'pending_approval', approval_status: 'pending' })
        .eq('id', poId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'PO submitted for approval' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const approvePO = useMutation({
    mutationFn: async (poId: string) => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'approved',
          approval_status: 'approved',
          approved_by: user?.id,
          approved_by_name: profile?.full_name,
          approved_at: new Date().toISOString(),
        })
        .eq('id', poId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Purchase Order approved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const rejectPO = useMutation({
    mutationFn: async ({ poId, reason }: { poId: string; reason: string }) => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'draft',
          approval_status: 'rejected',
          rejected_by: user?.id,
          rejected_reason: reason,
        })
        .eq('id', poId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Purchase Order rejected' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const getPOLines = async (poId: string) => {
    const { data, error } = await supabase
      .from('purchase_order_lines')
      .select('*')
      .eq('purchase_order_id', poId)
      .order('line_num');
    if (error) throw error;
    return data as PurchaseOrderLine[];
  };

  return { purchaseOrders, isLoading, createPO, submitForApproval, approvePO, rejectPO, getPOLines };
}

// ====== Goods Receipts ======
export function useGoodsReceipts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: goodsReceipts, isLoading } = useQuery({
    queryKey: ['goods-receipts', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('goods_receipts')
        .select('*')
        .order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as GoodsReceipt[];
    },
  });

  const createGRPO = useMutation({
    mutationFn: async (data: {
      vendor_name: string;
      vendor_code?: string;
      vendor_id?: string;
      purchase_order_id?: string;
      project_id?: string;
      branch_id?: string;
      warehouse?: string;
      remarks?: string;
      lines: { item_code?: string; item_description: string; received_quantity: number; unit_price: number; ordered_quantity?: number; unit?: string; warehouse?: string }[];
    }) => {
      const grpoNum = `GRPO-${String(Date.now()).slice(-6)}`;
      const subtotal = data.lines.reduce((s, l) => s + l.received_quantity * l.unit_price, 0);

      const { data: grpo, error } = await supabase
        .from('goods_receipts')
        .insert({
          grpo_number: grpoNum,
          vendor_name: data.vendor_name,
          vendor_code: data.vendor_code,
          vendor_id: data.vendor_id,
          purchase_order_id: data.purchase_order_id,
          project_id: data.project_id,
          branch_id: data.branch_id,
          warehouse: data.warehouse,
          remarks: data.remarks,
          subtotal,
          total: subtotal,
          status: 'draft',
          received_by: user?.id,
          received_by_name: profile?.full_name,
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();
      if (error) throw error;

      if (data.lines.length > 0) {
        const lines = data.lines.map((l, i) => ({
          goods_receipt_id: grpo.id,
          line_num: i + 1,
          item_code: l.item_code || null,
          item_description: l.item_description,
          received_quantity: l.received_quantity,
          ordered_quantity: l.ordered_quantity || 0,
          unit: l.unit || 'EA',
          unit_price: l.unit_price,
          warehouse: l.warehouse,
        }));
        const { error: lineErr } = await supabase.from('goods_receipt_lines').insert(lines);
        if (lineErr) throw lineErr;
      }

      // Update PO received quantities and status
      if (data.purchase_order_id) {
        for (const line of data.lines) {
          if (line.item_code) {
            // This is simplified - in production you'd match by line
          }
        }
        // Check if all lines fully received
        const { data: poLines } = await supabase
          .from('purchase_order_lines')
          .select('quantity, received_quantity')
          .eq('purchase_order_id', data.purchase_order_id);

        const allReceived = poLines?.every((l: any) => (l.received_quantity || 0) + data.lines.reduce((s, dl) => s + dl.received_quantity, 0) >= l.quantity);
        
        await supabase
          .from('purchase_orders')
          .update({ status: allReceived ? 'fully_delivered' : 'partially_delivered' })
          .eq('id', data.purchase_order_id);
      }

      return grpo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Goods Receipt created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const postGRPO = useMutation({
    mutationFn: async (grpoId: string) => {
      const { error } = await supabase
        .from('goods_receipts')
        .update({ status: 'posted', posting_date: new Date().toISOString().split('T')[0] })
        .eq('id', grpoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      toast({ title: 'Goods Receipt posted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { goodsReceipts, isLoading, createGRPO, postGRPO };
}

// ====== AP Invoices ======
export interface APInvoice {
  id: string;
  invoice_number: string;
  doc_date: string;
  doc_due_date: string | null;
  posting_date: string | null;
  status: string;
  vendor_code: string | null;
  vendor_name: string;
  vendor_id: string | null;
  purchase_order_id: string | null;
  goods_receipt_id: string | null;
  project_id: string | null;
  branch_id: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  remarks: string | null;
  sap_doc_entry: string | null;
  sync_status: string | null;
  created_at: string;
  updated_at: string;
}

export function useAPInvoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: apInvoices, isLoading } = useQuery({
    queryKey: ['ap-invoices', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('ap_invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as APInvoice[];
    },
  });

  const createAPInvoice = useMutation({
    mutationFn: async (data: {
      vendor_name: string;
      vendor_code?: string;
      purchase_order_id?: string;
      goods_receipt_id?: string;
      doc_due_date?: string;
      payment_terms?: string;
      remarks?: string;
      lines: { item_code?: string; item_description: string; quantity: number; unit_price: number }[];
    }) => {
      const invNum = `APINV-${String(Date.now()).slice(-6)}`;
      const subtotal = data.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
      const taxAmount = subtotal * 0.15;

      const { data: inv, error } = await supabase
        .from('ap_invoices')
        .insert({
          invoice_number: invNum,
          vendor_name: data.vendor_name,
          vendor_code: data.vendor_code,
          purchase_order_id: data.purchase_order_id,
          goods_receipt_id: data.goods_receipt_id,
          doc_due_date: data.doc_due_date,
          payment_terms: data.payment_terms,
          remarks: data.remarks,
          subtotal,
          tax_amount: taxAmount,
          total: subtotal + taxAmount,
          status: 'draft',
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();
      if (error) throw error;

      if (data.lines.length > 0) {
        const lines = data.lines.map((l, i) => ({
          ap_invoice_id: inv.id,
          line_num: i + 1,
          item_code: l.item_code || null,
          item_description: l.item_description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          line_total: l.quantity * l.unit_price,
          tax_percent: 15,
        }));
        const { error: lineErr } = await supabase.from('ap_invoice_lines').insert(lines);
        if (lineErr) throw lineErr;
      }
      return inv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
      toast({ title: 'AP Invoice created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { apInvoices, isLoading, createAPInvoice };
}

// ====== PO Approval Thresholds ======
export function usePOApprovalThresholds() {
  const { data: thresholds, isLoading } = useQuery({
    queryKey: ['po-approval-thresholds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_approval_thresholds')
        .select('*')
        .order('min_amount');
      if (error) throw error;
      return data;
    },
  });

  return { thresholds, isLoading };
}
