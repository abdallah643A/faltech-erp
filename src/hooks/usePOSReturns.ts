import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function usePOSReturns() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: returns, isLoading } = useQuery({
    queryKey: ['pos-returns', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_return_requests')
        .select('*')
        .eq('company_id', activeCompanyId!)
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: patterns } = useQuery({
    queryKey: ['pos-return-patterns', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_return_patterns')
        .select('*')
        .eq('company_id', activeCompanyId!)
        .order('total_returns', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const createReturn = useMutation({
    mutationFn: async (values: any) => {
      const { data, error } = await supabase.from('pos_return_requests').insert({
        ...values,
        company_id: activeCompanyId,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-returns'] });
      toast({ title: 'Return Created' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const approveReturn = useMutation({
    mutationFn: async (values: { id: string; restocking_decision?: string; role_name?: string }) => {
      const { error } = await (supabase as any).rpc('pos_approve_return', {
        p_return_id: values.id,
        p_role_name: values.role_name || 'Manager',
        p_restocking_decision: values.restocking_decision || 'restock',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-returns'] });
      toast({ title: 'Return Approved' });
    },
    onError: (err: any) => {
      const msg = err.message?.includes('refund_exceeds_limit') ? 'Refund exceeds your role limit. Manager required.'
        : err.message?.includes('permission_denied') ? 'You lack permission to approve returns.'
        : err.message;
      toast({ title: 'Cannot approve return', description: msg, variant: 'destructive' });
    },
  });

  const rejectReturn = useMutation({
    mutationFn: async (values: { id: string; rejection_reason: string }) => {
      const { error } = await supabase.from('pos_return_requests').update({
        status: 'rejected',
        rejection_reason: values.rejection_reason,
      }).eq('id', values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-returns'] });
      toast({ title: 'Return Rejected' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const stats = {
    pending: returns?.filter(r => r.status === 'pending').length || 0,
    approved: returns?.filter(r => r.status === 'approved').length || 0,
    totalRefunds: returns?.reduce((s, r) => s + Number(r.total_refund_amount || 0), 0) || 0,
    noReceipt: returns?.filter(r => !r.has_receipt).length || 0,
    flagged: returns?.filter(r => r.risk_flag && r.risk_flag !== 'normal').length || 0,
    topReason: (() => {
      const reasons = (returns || []).map(r => r.return_reason);
      const counts: Record<string, number> = {};
      reasons.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    })(),
  };

  return { returns, patterns, isLoading, stats, createReturn, approveReturn, rejectReturn };
}
