import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useCashierShifts() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['pos-cashier-shifts', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_cashier_shifts')
        .select('*')
        .eq('company_id', activeCompanyId!)
        .order('opened_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: shiftTransactions } = useQuery({
    queryKey: ['pos-shift-transactions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_shift_transactions')
        .select('*, pos_cashier_shifts(shift_number, cashier_name)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const openShift = useMutation({
    mutationFn: async (values: { cashier_name: string; opening_float: number; branch_id?: string; terminal_id?: string }) => {
      const { data, error } = await (supabase as any).rpc('pos_open_shift', {
        p_company_id: activeCompanyId,
        p_cashier_name: values.cashier_name,
        p_opening_float: values.opening_float,
        p_branch_id: values.branch_id ?? null,
        p_terminal_id: values.terminal_id ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-cashier-shifts'] });
      toast({ title: 'Shift Opened' });
    },
    onError: (err: any) => {
      const msg = err.message?.includes('shift_already_open') ? 'You already have an open shift on this branch.' : err.message;
      toast({ title: 'Cannot open shift', description: msg, variant: 'destructive' });
    },
  });

  const closeShift = useMutation({
    mutationFn: async (values: {
      shift_id: string;
      actual_cash: number;
      actual_card: number;
      actual_digital_wallet: number;
      actual_bank_transfer: number;
      variance_notes?: string;
    }) => {
      const { data, error } = await (supabase as any).rpc('pos_close_shift', {
        p_shift_id: values.shift_id,
        p_actual_cash: values.actual_cash,
        p_actual_card: values.actual_card,
        p_actual_digital_wallet: values.actual_digital_wallet,
        p_actual_bank_transfer: values.actual_bank_transfer,
        p_variance_notes: values.variance_notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['pos-cashier-shifts'] });
      toast({ title: 'Shift Closed', description: `Variance: ${res?.variance ?? 0} (${res?.status})` });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const approveShift = useMutation({
    mutationFn: async (values: { shift_id: string; manager_notes?: string; role_name?: string }) => {
      const { error } = await (supabase as any).rpc('pos_approve_shift', {
        p_shift_id: values.shift_id,
        p_role_name: values.role_name || 'Manager',
        p_notes: values.manager_notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-cashier-shifts'] });
      toast({ title: 'Shift Approved' });
    },
    onError: (err: any) => {
      const msg = err.message?.includes('permission_denied') ? 'You lack permission to approve shifts.' : err.message;
      toast({ title: 'Cannot approve', description: msg, variant: 'destructive' });
    },
  });

  const addShiftTransaction = useMutation({
    mutationFn: async (values: { shift_id: string; transaction_type: string; amount: number; reason?: string }) => {
      const { error } = await supabase.from('pos_shift_transactions').insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-shift-transactions'] });
      toast({ title: 'Transaction Added' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  return {
    shifts,
    shiftTransactions,
    isLoading,
    openShift,
    closeShift,
    approveShift,
    addShiftTransaction,
  };
}
