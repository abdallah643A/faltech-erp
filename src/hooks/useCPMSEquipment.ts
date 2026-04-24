import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface CPMSEquipment {
  id?: string;
  project_id?: string;
  company_id?: string;
  code: string;
  name: string;
  category?: string;
  type?: string;
  make?: string;
  model?: string;
  serial_number?: string;
  year_manufactured?: number;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  salvage_value?: number;
  useful_life_years?: number;
  depreciation_method?: string;
  status?: string;
  condition?: string;
  location?: string;
  assigned_project_id?: string;
  assigned_to?: string;
  hourly_rate?: number;
  daily_rate?: number;
  monthly_rate?: number;
  rental_vendor?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  maintenance_interval_hours?: number;
  total_engine_hours?: number;
  qr_code?: string;
  photo_url?: string;
  notes?: string;
  created_at?: string;
}

export interface EquipmentLog {
  id?: string;
  equipment_id: string;
  project_id?: string;
  log_date: string;
  hours_used?: number;
  hours_idle?: number;
  hours_maintenance?: number;
  fuel_consumed?: number;
  operator_name?: string;
  work_description?: string;
  location?: string;
  status?: string;
  notes?: string;
  created_at?: string;
}

export interface MaintenanceRecord {
  id?: string;
  equipment_id: string;
  maintenance_type?: string;
  title: string;
  description?: string;
  scheduled_date?: string;
  completed_date?: string;
  cost?: number;
  vendor?: string;
  parts_replaced?: string;
  next_due_date?: string;
  next_due_hours?: number;
  status?: string;
  performed_by?: string;
  notes?: string;
  created_at?: string;
}

export function useCPMSEquipment(projectId?: string) {
  const [equipment, setEquipment] = useState<CPMSEquipment[]>([]);
  const [logs, setLogs] = useState<EquipmentLog[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAll = async () => {
    setLoading(true);
    try {
      let eq = supabase.from('cpms_equipment' as any).select('*').order('created_at', { ascending: false });
      if (projectId) eq = eq.or(`project_id.eq.${projectId},assigned_project_id.eq.${projectId}`);
      const { data: eqData, error: eqErr } = await eq;
      if (eqErr) throw eqErr;
      setEquipment((eqData || []) as any[]);

      const eqIds = ((eqData || []) as any[]).map((e: any) => e.id);
      if (eqIds.length > 0) {
        const [logsRes, maintRes] = await Promise.all([
          supabase.from('cpms_equipment_logs' as any).select('*').in('equipment_id', eqIds).order('log_date', { ascending: false }).limit(500),
          supabase.from('cpms_equipment_maintenance' as any).select('*').in('equipment_id', eqIds).order('scheduled_date', { ascending: false }),
        ]);
        setLogs((logsRes.data || []) as any[]);
        setMaintenance((maintRes.data || []) as any[]);
      } else {
        setLogs([]);
        setMaintenance([]);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const createEquipment = async (item: Partial<CPMSEquipment>) => {
    const { data, error } = await supabase.from('cpms_equipment' as any)
      .insert({ ...item, created_by: user?.id, qr_code: `EQ-${Date.now().toString(36).toUpperCase()}` } as any)
      .select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: 'Equipment added' });
    await fetchAll();
    return data;
  };

  const updateEquipment = async (id: string, updates: Partial<CPMSEquipment>) => {
    const { error } = await supabase.from('cpms_equipment' as any).update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Equipment updated' });
    await fetchAll();
    return true;
  };

  const deleteEquipment = async (id: string) => {
    const { error } = await supabase.from('cpms_equipment' as any).delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Equipment deleted' });
    await fetchAll();
    return true;
  };

  const logUsage = async (log: Partial<EquipmentLog>) => {
    const { data, error } = await supabase.from('cpms_equipment_logs' as any)
      .insert({ ...log, logged_by: user?.id } as any).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }

    // Update total engine hours
    if (log.equipment_id && log.hours_used) {
      const eq = equipment.find(e => e.id === log.equipment_id);
      if (eq) {
        await supabase.from('cpms_equipment' as any).update({
          total_engine_hours: (eq.total_engine_hours || 0) + log.hours_used,
          updated_at: new Date().toISOString(),
        } as any).eq('id', log.equipment_id);
      }
    }
    toast({ title: 'Usage logged' });
    await fetchAll();
    return data;
  };

  const createMaintenance = async (record: Partial<MaintenanceRecord>) => {
    const { data, error } = await supabase.from('cpms_equipment_maintenance' as any)
      .insert({ ...record, created_by: user?.id } as any).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: 'Maintenance scheduled' });
    await fetchAll();
    return data;
  };

  const updateMaintenance = async (id: string, updates: Partial<MaintenanceRecord>) => {
    const { error } = await supabase.from('cpms_equipment_maintenance' as any).update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Maintenance updated' });
    await fetchAll();
    return true;
  };

  // Utilization stats per equipment
  const getUtilizationStats = (equipmentId: string) => {
    const eqLogs = logs.filter(l => l.equipment_id === equipmentId);
    const totalUsed = eqLogs.reduce((s, l) => s + (l.hours_used || 0), 0);
    const totalIdle = eqLogs.reduce((s, l) => s + (l.hours_idle || 0), 0);
    const totalMaint = eqLogs.reduce((s, l) => s + (l.hours_maintenance || 0), 0);
    const totalAvailable = totalUsed + totalIdle + totalMaint;
    const utilizationRate = totalAvailable > 0 ? Math.round((totalUsed / totalAvailable) * 100) : 0;
    const totalFuel = eqLogs.reduce((s, l) => s + (l.fuel_consumed || 0), 0);
    return { totalUsed, totalIdle, totalMaint, totalAvailable, utilizationRate, totalFuel, logCount: eqLogs.length };
  };

  // Depreciation calculator
  const calculateDepreciation = (eq: CPMSEquipment) => {
    const cost = eq.purchase_cost || 0;
    const salvage = eq.salvage_value || 0;
    const life = eq.useful_life_years || 10;
    const purchaseDate = eq.purchase_date ? new Date(eq.purchase_date) : new Date();
    const yearsElapsed = Math.max(0, (Date.now() - purchaseDate.getTime()) / (365.25 * 86400000));

    if (eq.depreciation_method === 'declining_balance') {
      const rate = 2 / life;
      let value = cost;
      for (let i = 0; i < Math.floor(yearsElapsed); i++) {
        value = Math.max(salvage, value * (1 - rate));
      }
      return { currentValue: Math.round(value), annualDepreciation: Math.round(value * rate), accumulatedDepreciation: Math.round(cost - value) };
    }

    // Straight line
    const annual = (cost - salvage) / life;
    const accumulated = Math.min(cost - salvage, annual * yearsElapsed);
    return { currentValue: Math.round(cost - accumulated), annualDepreciation: Math.round(annual), accumulatedDepreciation: Math.round(accumulated) };
  };

  // Overall fleet stats
  const getFleetStats = () => {
    const totalCount = equipment.length;
    const available = equipment.filter(e => e.status === 'available').length;
    const inUse = equipment.filter(e => e.status === 'in_use').length;
    const underMaintenance = equipment.filter(e => e.status === 'maintenance').length;
    const owned = equipment.filter(e => e.type === 'owned');
    const rented = equipment.filter(e => e.type === 'rented');
    const totalValue = owned.reduce((s, e) => s + (e.purchase_cost || 0), 0);
    const monthlyRentalCost = rented.reduce((s, e) => s + (e.monthly_rate || 0), 0);
    const overdueMaint = maintenance.filter(m => m.status === 'scheduled' && m.scheduled_date && new Date(m.scheduled_date) < new Date()).length;
    return { totalCount, available, inUse, underMaintenance, ownedCount: owned.length, rentedCount: rented.length, totalValue, monthlyRentalCost, overdueMaint };
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  return {
    equipment, logs, maintenance, loading, fetchAll,
    createEquipment, updateEquipment, deleteEquipment,
    logUsage, createMaintenance, updateMaintenance,
    getUtilizationStats, calculateDepreciation, getFleetStats,
  };
}
