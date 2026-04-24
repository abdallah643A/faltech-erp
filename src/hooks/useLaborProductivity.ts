import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useLaborHours(projectId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const hours = useQuery({
    queryKey: ['labor-hours', projectId, activeCompanyId],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase.from('cpms_labor_hours' as any).select('*').eq('project_id', projectId!).order('work_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createEntry = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cpms_labor_hours' as any).insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['labor-hours'] }); toast({ title: 'Labor hours recorded' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('cpms_labor_hours' as any).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labor-hours'] }),
  });

  // Productivity analytics
  const getProductivitySummary = (data: any[]) => {
    if (!data?.length) return null;
    const totalHours = data.reduce((s, d) => s + (d.total_hours || 0), 0);
    const totalUnits = data.reduce((s, d) => s + (d.units_completed || 0), 0);
    const totalCost = data.reduce((s, d) => s + (d.total_cost || 0), 0);
    const avgProductivity = totalHours > 0 ? totalUnits / totalHours : 0;
    const costPerUnit = totalUnits > 0 ? totalCost / totalUnits : 0;

    // Group by trade
    const byTrade = data.reduce((acc: any, d: any) => {
      const trade = d.trade || 'General';
      if (!acc[trade]) acc[trade] = { hours: 0, units: 0, cost: 0, workers: new Set() };
      acc[trade].hours += d.total_hours || 0;
      acc[trade].units += d.units_completed || 0;
      acc[trade].cost += d.total_cost || 0;
      acc[trade].workers.add(d.employee_name);
      return acc;
    }, {});

    return { totalHours, totalUnits, totalCost, avgProductivity, costPerUnit, byTrade };
  };

  return { hours, createEntry, updateEntry, getProductivitySummary };
}
