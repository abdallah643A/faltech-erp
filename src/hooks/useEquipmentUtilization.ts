import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useEquipmentRates() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const rates = useQuery({
    queryKey: ['equipment-rates', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('cpms_equipment_rates' as any).select('*').order('equipment_name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cpms_equipment_rates' as any).insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment-rates'] }); toast({ title: 'Equipment rate created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('cpms_equipment_rates' as any).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment-rates'] }); toast({ title: 'Equipment rate updated' }); },
  });

  // Check if maintenance is due
  const checkMaintenance = (equip: any): { due: boolean; hoursUntil: number } => {
    const hoursUntil = (equip.next_maintenance_hours || 0) - (equip.current_engine_hours || 0);
    return { due: hoursUntil <= 0, hoursUntil };
  };

  return { rates, create, update, checkMaintenance };
}

export function useEquipmentUsage(projectId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const usage = useQuery({
    queryKey: ['equipment-usage', projectId, activeCompanyId],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase.from('cpms_equipment_usage' as any).select('*').eq('project_id', projectId!).order('usage_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const logUsage = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cpms_equipment_usage' as any).insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;

      // Update engine hours on equipment rate
      if (data.equipment_rate_id && data.engine_hours_end) {
        const { data: equip } = await supabase.from('cpms_equipment_rates' as any).select('current_engine_hours, next_maintenance_hours, maintenance_interval_hours').eq('id', data.equipment_rate_id).single();
        if (equip) {
          const updates: any = { current_engine_hours: data.engine_hours_end };
          if (data.engine_hours_end >= (equip as any).next_maintenance_hours) {
            updates.status = 'maintenance';
            updates.next_maintenance_hours = data.engine_hours_end + ((equip as any).maintenance_interval_hours || 250);
          }
          await supabase.from('cpms_equipment_rates' as any).update(updates).eq('id', data.equipment_rate_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-usage'] });
      qc.invalidateQueries({ queryKey: ['equipment-rates'] });
      toast({ title: 'Equipment usage logged' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Utilization analytics
  const getUtilizationSummary = (data: any[]) => {
    if (!data?.length) return null;
    const totalHours = data.reduce((s, d) => s + (d.hours_used || 0), 0);
    const totalIdle = data.reduce((s, d) => s + (d.idle_hours || 0), 0);
    const totalCharge = data.reduce((s, d) => s + (d.charge_amount || 0), 0);
    const totalFuel = data.reduce((s, d) => s + (d.fuel_consumed || 0), 0);
    const utilizationPct = (totalHours + totalIdle) > 0 ? (totalHours / (totalHours + totalIdle)) * 100 : 0;
    return { totalHours, totalIdle, totalCharge, totalFuel, utilizationPct };
  };

  return { usage, logUsage, getUtilizationSummary };
}
