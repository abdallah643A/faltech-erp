import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useScheduleOfValues(projectId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const items = useQuery({
    queryKey: ['sov-items', projectId, activeCompanyId],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase.from('cpms_schedule_of_values' as any).select('*').eq('project_id', projectId!).order('sort_order');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createItem = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cpms_schedule_of_values' as any).insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sov-items'] }); toast({ title: 'SOV line added' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('cpms_schedule_of_values' as any).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sov-items'] }); toast({ title: 'SOV line updated' }); },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cpms_schedule_of_values' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sov-items'] }),
  });

  // SOV Summary
  const getSummary = (data: any[]) => {
    if (!data?.length) return null;
    const totalScheduled = data.reduce((s, d) => s + (d.scheduled_value || 0), 0);
    const totalPrevBilled = data.reduce((s, d) => s + (d.previous_billed_amount || 0), 0);
    const totalCurrBilled = data.reduce((s, d) => s + (d.current_billed_amount || 0), 0);
    const totalRetainage = data.reduce((s, d) => s + (d.retainage_amount || 0), 0);
    const totalMaterials = data.reduce((s, d) => s + (d.materials_stored || 0), 0);
    const balanceToFinish = totalScheduled - totalPrevBilled - totalCurrBilled;
    return { totalScheduled, totalPrevBilled, totalCurrBilled, totalRetainage, totalMaterials, balanceToFinish };
  };

  return { items, createItem, updateItem, deleteItem, getSummary };
}

export function useProgressBillings(projectId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const billings = useQuery({
    queryKey: ['progress-billings', projectId, activeCompanyId],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase.from('cpms_progress_billings' as any).select('*').eq('project_id', projectId!).order('billing_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createBilling = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cpms_progress_billings' as any).insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['progress-billings'] }); toast({ title: 'Progress billing created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateBilling = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('cpms_progress_billings' as any).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['progress-billings'] }); toast({ title: 'Billing updated' }); },
  });

  return { billings, createBilling, updateBilling };
}
