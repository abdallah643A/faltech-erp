import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useCBS(projectId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const items = useQuery({
    queryKey: ['cbs-items', projectId, activeCompanyId],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase.from('cpms_cbs_items' as any).select('*').eq('project_id', projectId!).order('sort_order');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createItem = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cpms_cbs_items' as any).insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cbs-items'] }); toast({ title: 'CBS item created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('cpms_cbs_items' as any).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cbs-items'] }); toast({ title: 'CBS item updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cpms_cbs_items' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cbs-items'] }),
  });

  // Check if procurement should be locked for a CBS item
  const checkBudgetLock = (item: any): { locked: boolean; reason: string } => {
    if (!item) return { locked: false, reason: '' };
    const overrunPct = item.budget_amount > 0 
      ? ((item.actual_amount - item.budget_amount) / item.budget_amount) * 100 
      : 0;
    if (overrunPct > (item.lock_threshold_pct || 10)) {
      return { locked: true, reason: `Budget exceeded by ${overrunPct.toFixed(1)}% (threshold: ${item.lock_threshold_pct}%). Change Order required.` };
    }
    return { locked: false, reason: '' };
  };

  return { items, createItem, updateItem, deleteItem, checkBudgetLock };
}

export function useIFRS15(projectId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const entries = useQuery({
    queryKey: ['ifrs15-entries', projectId, activeCompanyId],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase.from('cpms_ifrs15_entries' as any).select('*').eq('project_id', projectId!).order('period');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createEntry = useMutation({
    mutationFn: async (data: any) => {
      // Calculate revenue using Input Method
      const pctComplete = data.total_expected_cost > 0 
        ? data.costs_incurred_to_date / data.total_expected_cost 
        : 0;
      const revenueRecognized = data.contract_revenue * pctComplete;
      const previousRevenue = data.previous_revenue_recognized || 0;
      const revenueThisPeriod = revenueRecognized - previousRevenue;

      const { error } = await supabase.from('cpms_ifrs15_entries' as any).insert({
        ...data,
        revenue_recognized: revenueRecognized,
        revenue_this_period: revenueThisPeriod,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ifrs15-entries'] }); toast({ title: 'IFRS 15 entry recorded' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { entries, createEntry };
}
