import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { requestThreeWayMatchOverride, approveThreeWayMatchOverride } from '@/lib/procurement/lifecycle';

export interface MatchException {
  id: string;
  ap_invoice_id: string | null;
  po_id: string | null;
  grpo_id: string | null;
  exception_type: 'qty_variance' | 'price_variance' | 'timing' | 'missing_grpo' | 'missing_po' | 'dispute' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  variance_amount: number | null;
  variance_percent: number | null;
  expected_value: number | null;
  actual_value: number | null;
  reason: string | null;
  status: 'open' | 'overridden' | 'resolved' | 'rejected';
  override_request_id: string | null;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
}

export interface MatchOverrideRequest {
  id: string;
  ap_invoice_id: string;
  exception_id: string | null;
  reason: string;
  requested_by_name: string | null;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  rejection_reason: string | null;
}

export function useMatchExceptions(filterStatus?: MatchException['status']) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['match-exceptions', activeCompanyId, filterStatus ?? 'all'],
    queryFn: async () => {
      let q: any = supabase.from('match_exceptions' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filterStatus) q = q.eq('status', filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MatchException[];
    },
  });

  const requestOverride = useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      requestThreeWayMatchOverride(invoiceId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match-exceptions'] });
      qc.invalidateQueries({ queryKey: ['match-overrides'] });
      toast({ title: 'Override requested' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...list, requestOverride };
}

export function useMatchOverrideRequests(filterStatus?: MatchOverrideRequest['status']) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['match-overrides', activeCompanyId, filterStatus ?? 'all'],
    queryFn: async () => {
      let q: any = supabase.from('match_override_requests' as any).select('*').order('requested_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filterStatus) q = q.eq('status', filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MatchOverrideRequest[];
    },
  });

  const approve = useMutation({
    mutationFn: approveThreeWayMatchOverride,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match-overrides'] });
      qc.invalidateQueries({ queryKey: ['match-exceptions'] });
      toast({ title: 'Override approved — invoice can now be posted.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await (supabase.from('match_override_requests' as any).update({
        status: 'rejected',
        rejection_reason: reason,
        approved_at: new Date().toISOString(),
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match-overrides'] });
      toast({ title: 'Override rejected' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...list, approve, reject };
}
