import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface SalesOrderContract {
  id: string;
  doc_num: number;
  doc_date: string;
  due_date: string | null;
  customer_id: string | null;
  customer_code: string;
  customer_name: string;
  contact_person: string | null;
  status: string | null;
  currency: string | null;
  subtotal: number | null;
  discount_percent: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  total: number | null;
  shipping_address: string | null;
  billing_address: string | null;
  payment_terms: string | null;
  incoterm: string | null;
  shipping_method: string | null;
  sales_rep_id: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Contract fields
  is_contract: boolean;
  contract_number: string | null;
  contract_date: string | null;
  contract_signed_date: string | null;
  contract_value: number | null;
  scope_of_work: string | null;
  terms_and_conditions: string | null;
  contract_file_url: string | null;
  project_id: string | null;
  delivery_terms: string | null;
  warranty_period: string | null;
  validity_period: number | null;
  payment_terms_details: any | null;
  workflow_status: string | null;
  submitted_to_finance_at: string | null;
  finance_verified_at: string | null;
  finance_verified_by: string | null;
  finance_rejection_reason: string | null;
  sap_doc_entry: string | null;
  sync_status: 'pending' | 'synced' | 'conflict' | 'error' | null;
  branch_id: string | null;
  series: number | null;
  // Customer detail fields
  customer_mobile: string | null;
  customer_cr: string | null;
  customer_national_id: string | null;
  customer_vat_number: string | null;
  customer_city: string | null;
  // Branch detail fields
  branch_manager_name: string | null;
  branch_mobile: string | null;
}

export interface ContractPaymentTerm {
  payment_number: number;
  description: string;
  percentage: number;
  amount: number;
  due_date?: string;
  milestone?: string;
}

export const WORKFLOW_STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: 'Draft', color: 'muted', icon: 'FileEdit' },
  pending_finance: { label: 'Pending Finance', color: 'warning', icon: 'Clock' },
  finance_approved: { label: 'Finance Approved', color: 'success', icon: 'CheckCircle' },
  finance_rejected: { label: 'Finance Rejected', color: 'destructive', icon: 'XCircle' },
  in_progress: { label: 'In Progress', color: 'info', icon: 'Play' },
  completed: { label: 'Completed', color: 'success', icon: 'CheckCircle2' },
};

export function useSalesOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: salesOrders, isLoading } = useQuery({
    queryKey: ['sales-orders', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('sales_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesOrderContract[];
    },
  });

  const createSalesOrder = useMutation({
    mutationFn: async (order: Partial<SalesOrderContract> & { 
      customer_code: string; 
      customer_name: string;
      items?: { lineNum: number; itemCode: string; itemName: string; quantity: number; unitPrice: number; taxCode: string; lineTotal: number; dim_employee_id: string | null; dim_branch_id: string | null; dim_business_line_id: string | null; dim_factory_id: string | null }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('sales_orders')
        .insert([{
          customer_code: order.customer_code,
          customer_name: order.customer_name,
          customer_id: order.customer_id,
          contact_person: order.contact_person,
          doc_date: order.doc_date || new Date().toISOString().split('T')[0],
          due_date: order.due_date,
          currency: order.currency || 'SAR',
          subtotal: order.subtotal || 0,
          discount_percent: order.discount_percent || 0,
          discount_amount: order.discount_amount || 0,
          tax_amount: order.tax_amount || 0,
          total: order.total || 0,
          shipping_address: order.shipping_address,
          billing_address: order.billing_address,
          payment_terms: order.payment_terms,
          incoterm: order.incoterm,
          shipping_method: order.shipping_method,
          sales_rep_id: order.sales_rep_id || user?.id,
          remarks: order.remarks,
          created_by: user?.id,
          is_contract: order.is_contract || false,
          contract_number: order.contract_number,
          contract_date: order.contract_date,
          contract_signed_date: order.contract_signed_date,
          contract_value: order.contract_value || order.total || 0,
          scope_of_work: order.scope_of_work,
          terms_and_conditions: order.terms_and_conditions,
          contract_file_url: order.contract_file_url,
          delivery_terms: order.delivery_terms,
          warranty_period: order.warranty_period,
          validity_period: order.validity_period || 30,
          payment_terms_details: order.payment_terms_details,
           workflow_status: 'draft',
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
          branch_id: order.branch_id || null,
          customer_mobile: order.customer_mobile || null,
          customer_cr: order.customer_cr || null,
          customer_national_id: order.customer_national_id || null,
          customer_vat_number: order.customer_vat_number || null,
          customer_city: order.customer_city || null,
          branch_manager_name: order.branch_manager_name || null,
          branch_mobile: order.branch_mobile || null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Save line items
      if (order.items && order.items.length > 0) {
        const lines = order.items
          .filter(item => item.itemCode || item.itemName)
          .map((item, i) => ({
            sales_order_id: data.id,
            line_num: i + 1,
            item_code: item.itemCode || null,
            description: item.itemName || '',
            quantity: item.quantity,
            unit_price: item.unitPrice,
            tax_code: item.taxCode || null,
            line_total: item.lineTotal,
            dim_employee_id: item.dim_employee_id || null,
            dim_branch_id: item.dim_branch_id || null,
            dim_business_line_id: item.dim_business_line_id || null,
            dim_factory_id: item.dim_factory_id || null,
          }));
        if (lines.length > 0) {
          const { error: linesError } = await supabase
            .from('sales_order_lines')
            .insert(lines);
          if (linesError) throw linesError;
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({ title: 'Sales order created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating sales order', description: error.message, variant: 'destructive' });
    },
  });

  const updateSalesOrder = useMutation({
    mutationFn: async ({ id, items, ...updates }: Partial<SalesOrderContract> & { 
      id: string;
      items?: { lineNum: number; itemCode: string; itemName: string; quantity: number; unitPrice: number; taxCode: string; lineTotal: number; dim_employee_id: string | null; dim_branch_id: string | null; dim_business_line_id: string | null; dim_factory_id: string | null }[];
    }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Replace line items
      if (items) {
        await supabase.from('sales_order_lines').delete().eq('sales_order_id', id);
        const lines = items
          .filter(item => item.itemCode || item.itemName)
          .map((item, i) => ({
            sales_order_id: id,
            line_num: i + 1,
            item_code: item.itemCode || null,
            description: item.itemName || '',
            quantity: item.quantity,
            unit_price: item.unitPrice,
            tax_code: item.taxCode || null,
            line_total: item.lineTotal,
            dim_employee_id: item.dim_employee_id || null,
            dim_branch_id: item.dim_branch_id || null,
            dim_business_line_id: item.dim_business_line_id || null,
            dim_factory_id: item.dim_factory_id || null,
          }));
        if (lines.length > 0) {
          const { error: linesError } = await supabase
            .from('sales_order_lines')
            .insert(lines);
          if (linesError) throw linesError;
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({ title: 'Sales order updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating sales order', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSalesOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({ title: 'Sales order deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting sales order', description: error.message, variant: 'destructive' });
    },
  });

  const submitToFinance = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc('submit_contract_to_finance', {
        p_sales_order_id: orderId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Contract submitted to Finance for verification' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error submitting to finance', description: error.message, variant: 'destructive' });
    },
  });

  const uploadContractFile = useMutation({
    mutationFn: async ({ orderId, file }: { orderId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `contracts/${orderId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(fileName, 3600 * 24 * 365);

      const { data, error } = await supabase
        .from('sales_orders')
        .update({ contract_file_url: urlData?.signedUrl || fileName })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({ title: 'Contract file uploaded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error uploading contract file', description: error.message, variant: 'destructive' });
    },
  });

  return {
    salesOrders,
    isLoading,
    createSalesOrder,
    updateSalesOrder,
    deleteSalesOrder,
    submitToFinance,
    uploadContractFile,
  };
}

export function useSalesOrderById(orderId: string | undefined) {
  const { data: salesOrder, isLoading } = useQuery({
    queryKey: ['sales-order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as SalesOrderContract;
    },
    enabled: !!orderId,
  });

  return { salesOrder, isLoading };
}
