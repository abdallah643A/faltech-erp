import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface IncomingPayment {
  id: string;
  doc_num: number;
  doc_date: string;
  due_date: string | null;
  customer_code: string;
  customer_name: string;
  customer_id: string | null;
  sales_order_id: string | null;
  payment_type: string | null;
  total_amount: number;
  currency: string | null;
  reference: string | null;
  remarks: string | null;
  check_number: string | null;
  check_date: string | null;
  bank_code: string | null;
  bank_account: string | null;
  credit_card_type: string | null;
  credit_card_number: string | null;
  voucher_number: string | null;
  status: string | null;
  sap_doc_entry: string | null;
  sync_status: string | null;
  last_synced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  sales_order?: {
    doc_num: number;
    customer_name: string;
    total: number | null;
    contract_number: string | null;
    is_contract: boolean;
  } | null;
}

export function useIncomingPayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['incoming-payments', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('incoming_payments')
        .select(`
          *,
          sales_order:sales_orders(doc_num, customer_name, total, contract_number, is_contract)
        `)
        .order('created_at', { ascending: false });

      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as IncomingPayment[];
    },
  });

  const createPayment = useMutation({
    mutationFn: async (payment: Partial<IncomingPayment> & {
      customer_code: string;
      customer_name: string;
      total_amount: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // If linked to a sales order, enforce 50% minimum on first payment
      if (payment.sales_order_id) {
        // Check if there are existing payments for this sales order
        const { data: existingPayments, error: checkError } = await supabase
          .from('incoming_payments')
          .select('id')
          .eq('sales_order_id', payment.sales_order_id)
          .limit(1);

        if (checkError) throw checkError;

        const isFirstPayment = !existingPayments || existingPayments.length === 0;

        if (isFirstPayment) {
          // Get sales order total/contract value
          const { data: so, error: soError } = await supabase
            .from('sales_orders')
            .select('contract_value, total')
            .eq('id', payment.sales_order_id)
            .single();

          if (soError) throw soError;

          const contractValue = so.contract_value || so.total || 0;
          const minAmount = contractValue * 0.5;

          if (payment.total_amount < minAmount) {
            throw new Error(
              `First payment must be at least 50% of the contract value. Minimum required: ${minAmount.toLocaleString()} SAR (50% of ${contractValue.toLocaleString()} SAR)`
            );
          }
        }
      }

      const { data, error } = await supabase
        .from('incoming_payments')
        .insert([{
          customer_code: payment.customer_code,
          customer_name: payment.customer_name,
          customer_id: payment.customer_id || null,
          sales_order_id: payment.sales_order_id || null,
          doc_date: payment.doc_date || new Date().toISOString().split('T')[0],
          due_date: payment.due_date || null,
          payment_type: payment.payment_type || null,
          total_amount: payment.total_amount,
          currency: payment.currency || 'SAR',
          reference: payment.reference || null,
          remarks: payment.remarks || null,
          check_number: payment.check_number || null,
          check_date: payment.check_date || null,
          bank_code: payment.bank_code || null,
          bank_account: payment.bank_account || null,
          credit_card_type: payment.credit_card_type || null,
          credit_card_number: payment.credit_card_number || null,
          voucher_number: payment.voucher_number || null,
          status: 'draft',
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        }])
        .select()
        .single();

      if (error) throw error;

      // Auto-submit to finance if linked to a sales order that hasn't been submitted yet
      if (payment.sales_order_id) {
        const { data: so } = await supabase
          .from('sales_orders')
          .select('workflow_status, is_contract')
          .eq('id', payment.sales_order_id)
          .single();

        if (so && so.is_contract && (!so.workflow_status || so.workflow_status === 'draft')) {
          await supabase.rpc('submit_contract_to_finance', {
            p_sales_order_id: payment.sales_order_id,
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-payments'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Payment recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording payment', description: error.message, variant: 'destructive' });
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IncomingPayment> & { id: string }) => {
      const { sales_order, sync_status, ...cleanUpdates } = updates as any;
      const { data, error } = await supabase
        .from('incoming_payments')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-payments'] });
      toast({ title: 'Payment updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating payment', description: error.message, variant: 'destructive' });
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('incoming_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-payments'] });
      toast({ title: 'Payment deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting payment', description: error.message, variant: 'destructive' });
    },
  });

  const postPayment = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('incoming_payments')
        .update({ status: 'posted' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-payments'] });
      toast({ title: 'Payment posted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error posting payment', description: error.message, variant: 'destructive' });
    },
  });

  const totalReceived = payments?.reduce((sum, p) => sum + (p.status === 'posted' ? p.total_amount : 0), 0) || 0;
  const pendingCount = payments?.filter(p => p.status === 'draft').length || 0;
  const postedCount = payments?.filter(p => p.status === 'posted').length || 0;

  return {
    payments,
    isLoading,
    createPayment,
    updatePayment,
    deletePayment,
    postPayment,
    totalReceived,
    pendingCount,
    postedCount,
  };
}
