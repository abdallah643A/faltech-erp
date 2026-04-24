import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useCustomerCreditLimits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: creditLimits = [], isLoading } = useQuery({
    queryKey: ['customer-credit-limits', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('customer_credit_limits' as any).select('*').order('customer_name') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createCreditLimit = useMutation({
    mutationFn: async (data: { customer_id?: string; customer_code: string; customer_name: string; approved_credit_limit: number; risk_level?: string; review_date?: string; notes?: string }) => {
      const { error } = await (supabase.from('customer_credit_limits' as any).insert({
        ...data,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-credit-limits'] });
      toast({ title: 'Credit limit set' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateCreditLimit = useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { error } = await (supabase.from('customer_credit_limits' as any).update(rest).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-credit-limits'] });
      toast({ title: 'Credit limit updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Credit check: returns { allowed: boolean, reason?: string, overrideRequestId?: string }
  const checkCredit = async (customerCode: string, orderAmount: number): Promise<{ allowed: boolean; reason?: string; available?: number; overrideRequired?: boolean }> => {
    const { data: limit } = await (supabase.from('customer_credit_limits' as any)
      .select('*')
      .eq('customer_code', customerCode)
      .maybeSingle() as any);

    if (!limit) return { allowed: true, reason: 'No credit limit configured' };
    if (limit.credit_status === 'blocked') {
      await (supabase.from('credit_check_log' as any).insert({
        customer_code: customerCode, customer_id: limit.customer_id, order_amount: orderAmount,
        outstanding_before: limit.current_outstanding, credit_limit: limit.approved_credit_limit,
        result: 'blocked', blocked_reason: 'Customer credit blocked',
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      return { allowed: false, reason: 'Customer credit is blocked' };
    }

    const available = limit.approved_credit_limit - (limit.current_outstanding || 0);
    if (orderAmount > available) {
      await (supabase.from('credit_check_log' as any).insert({
        customer_code: customerCode, customer_id: limit.customer_id, order_amount: orderAmount,
        outstanding_before: limit.current_outstanding, credit_limit: limit.approved_credit_limit,
        result: 'blocked',
        blocked_reason: `Order ${orderAmount} exceeds available credit ${available.toFixed(2)}`,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      return { allowed: false, overrideRequired: true, reason: `Order amount (${orderAmount.toFixed(2)}) exceeds available credit (${available.toFixed(2)}). A credit override is required.`, available };
    }

    await (supabase.from('credit_check_log' as any).insert({
      customer_code: customerCode, customer_id: limit.customer_id, order_amount: orderAmount,
      outstanding_before: limit.current_outstanding, credit_limit: limit.approved_credit_limit,
      result: 'passed',
      ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
    }) as any);

    return { allowed: true, available };
  };

  // Refresh outstanding balances from AR invoices
  const refreshOutstanding = useMutation({
    mutationFn: async () => {
      const { data: limits } = await (supabase.from('customer_credit_limits' as any).select('*') as any);
      if (!limits) return;

      for (const limit of limits) {
        // Sum open AR invoices for this customer
        const { data: invoices } = await supabase
          .from('ar_invoices')
          .select('balance_due')
          .eq('customer_code', limit.customer_code)
          .in('status', ['open', 'overdue', 'partially_paid']);

        const outstanding = (invoices || []).reduce((s: number, i: any) => s + (i.balance_due || 0), 0);

        await (supabase.from('customer_credit_limits' as any).update({
          current_outstanding: outstanding,
          risk_level: outstanding > limit.approved_credit_limit * 0.9 ? 'high' : outstanding > limit.approved_credit_limit * 0.7 ? 'medium' : 'low',
        }).eq('id', limit.id) as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-credit-limits'] });
      toast({ title: 'Outstanding balances refreshed' });
    },
  });

  return { creditLimits, isLoading, createCreditLimit, updateCreditLimit, checkCredit, refreshOutstanding };
}

export function useCreditCheckLog() {
  const { activeCompanyId } = useActiveCompany();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['credit-check-log', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('credit_check_log' as any).select('*').order('created_at', { ascending: false }).limit(100) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  return { logs, isLoading };
}
