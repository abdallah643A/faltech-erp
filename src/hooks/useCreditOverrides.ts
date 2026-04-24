import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { approveCreditOverride, rejectCreditOverride, requestCreditOverride } from '@/lib/sales/lifecycle';

export interface CreditOverrideRequest {
  id: string;
  customer_id: string | null;
  requested_by: string | null;
  requested_by_name: string | null;
  reason: string;
  current_limit: number | null;
  requested_limit: number | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  company_id: string | null;
  created_at: string;
}

export function useCreditOverrides(filterStatus?: 'pending' | 'approved' | 'rejected') {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['credit-overrides', activeCompanyId, filterStatus ?? 'all'],
    queryFn: async () => {
      let q: any = supabase.from('credit_override_requests' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filterStatus) q = q.eq('status', filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CreditOverrideRequest[];
    },
  });

  const create = useMutation({
    mutationFn: requestCreditOverride,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-overrides'] });
      toast({ title: 'Override requested' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const approve = useMutation({
    mutationFn: approveCreditOverride,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-overrides'] });
      toast({ title: 'Override approved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectCreditOverride(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-overrides'] });
      toast({ title: 'Override rejected' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create, approve, reject };
}
