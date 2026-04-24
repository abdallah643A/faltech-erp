import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface OutgoingPayment {
  id: string;
  doc_num: number;
  doc_date: string;
  posting_date: string | null;
  due_date: string | null;
  pay_to_type: string;
  vendor_code: string | null;
  vendor_name: string | null;
  vendor_id: string | null;
  customer_code: string | null;
  customer_name: string | null;
  customer_id: string | null;
  account_code: string | null;
  contact_person: string | null;
  project: string | null;
  blanket_agreement: string | null;
  payment_type: string | null;
  total_amount: number;
  payment_on_account: number;
  currency: string | null;
  reference: string | null;
  transaction_no: string | null;
  remarks: string | null;
  journal_remarks: string | null;
  check_number: string | null;
  check_date: string | null;
  bank_code: string | null;
  bank_account: string | null;
  credit_card_type: string | null;
  credit_card_number: string | null;
  cash_account: string | null;
  transfer_account: string | null;
  status: string | null;
  open_balance: number;
  sap_doc_entry: string | null;
  sync_status: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useOutgoingPayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['outgoing-payments', activeCompanyId],
    queryFn: async () => {
      let query = (supabase.from('outgoing_payments' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as OutgoingPayment[];
    },
  });

  const createPayment = useMutation({
    mutationFn: async (payment: Partial<OutgoingPayment>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from('outgoing_payments' as any).insert([{
        ...payment,
        status: 'draft',
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }]).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoing-payments'] });
      toast({ title: 'Outgoing payment created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OutgoingPayment> & { id: string }) => {
      const { data, error } = await (supabase.from('outgoing_payments' as any).update(updates).eq('id', id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoing-payments'] });
      toast({ title: 'Payment updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('outgoing_payments' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoing-payments'] });
      toast({ title: 'Payment deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const postPayment = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase.from('outgoing_payments' as any).update({ status: 'posted' }).eq('id', id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoing-payments'] });
      toast({ title: 'Payment posted successfully' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const totalPaid = payments?.reduce((sum, p) => sum + (p.status === 'posted' ? p.total_amount : 0), 0) || 0;
  const pendingCount = payments?.filter(p => p.status === 'draft').length || 0;
  const postedCount = payments?.filter(p => p.status === 'posted').length || 0;

  return { payments, isLoading, createPayment, updatePayment, deletePayment, postPayment, totalPaid, pendingCount, postedCount };
}
