import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';

export interface WorkOrder {
  id: string;
  work_order_code: string;
  asset_id: string;
  title: string;
  description: string | null;
  work_order_type: string;
  priority: string;
  status: string;
  assigned_to_name: string | null;
  assigned_to_employee_id: string | null;
  requested_by_name: string | null;
  estimated_hours: number;
  actual_hours: number;
  estimated_cost: number;
  actual_cost: number;
  parts_cost: number;
  labor_cost: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  downtime_hours: number;
  failure_code: string | null;
  root_cause: string | null;
  resolution: string | null;
  sla_due_date: string | null;
  sla_breached: boolean;
  company_id: string | null;
  created_at: string;
  assets?: { asset_code: string; name: string } | null;
}

export interface PMSchedule {
  id: string;
  schedule_code: string;
  asset_id: string;
  title: string;
  description: string | null;
  frequency_type: string;
  frequency_days: number | null;
  frequency_hours: number | null;
  last_performed_date: string | null;
  next_due_date: string | null;
  lead_days: number;
  estimated_duration_hours: number;
  estimated_cost: number;
  assigned_to_name: string | null;
  checklist: any[];
  is_active: boolean;
  company_id: string | null;
  created_at: string;
  assets?: { asset_code: string; name: string } | null;
}

export interface SLAConfig {
  id: string;
  name: string;
  priority: string;
  response_hours: number;
  resolution_hours: number;
  escalation_hours: number | null;
  is_active: boolean;
  company_id: string | null;
}

export interface CostForecast {
  id: string;
  asset_id: string;
  forecast_period: string;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  notes: string | null;
  company_id: string | null;
  assets?: { asset_code: string; name: string } | null;
}

export function useMaintenanceWorkOrders() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();

  // Work Orders
  const { data: workOrders = [], isLoading: woLoading } = useQuery({
    queryKey: ['asset-work-orders', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('asset_work_orders' as any).select('*, assets(asset_code, name)') as any)
        .order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as WorkOrder[];
    },
  });

  // PM Schedules
  const { data: pmSchedules = [], isLoading: pmLoading } = useQuery({
    queryKey: ['pm-schedules', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('pm_schedules' as any).select('*, assets(asset_code, name)') as any)
        .order('next_due_date', { ascending: true });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PMSchedule[];
    },
  });

  // SLA Configs
  const { data: slaConfigs = [] } = useQuery({
    queryKey: ['maintenance-sla-configs', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('maintenance_sla_configs' as any).select('*') as any)
        .eq('is_active', true);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SLAConfig[];
    },
  });

  // Cost Forecasts
  const { data: costForecasts = [] } = useQuery({
    queryKey: ['maintenance-cost-forecasts', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('maintenance_cost_forecasts' as any).select('*, assets(asset_code, name)') as any)
        .order('forecast_period', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CostForecast[];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['asset-work-orders'] });
    qc.invalidateQueries({ queryKey: ['pm-schedules'] });
    qc.invalidateQueries({ queryKey: ['maintenance-sla-configs'] });
    qc.invalidateQueries({ queryKey: ['maintenance-cost-forecasts'] });
  };

  // Create Work Order
  const createWorkOrder = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const code = 'WO-' + String(Math.floor(Date.now() / 1000)).slice(-6);
      // Calculate SLA due date from config
      const slaConfig = slaConfigs.find(s => s.priority === (data.priority || 'medium'));
      const slaDue = slaConfig
        ? new Date(Date.now() + slaConfig.resolution_hours * 3600000).toISOString()
        : null;

      const insertData = {
        ...data,
        work_order_code: code,
        sla_due_date: slaDue,
        requested_by_name: profile?.full_name || null,
        created_by: user?.id || null,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      };
      const { error } = await (supabase.from('asset_work_orders' as any).insert(insertData) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Work order created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Update Work Order
  const updateWorkOrder = useMutation({
    mutationFn: async ({ id, ...data }: Record<string, any>) => {
      // Check SLA breach
      if (data.status === 'completed' || data.status === 'in_progress') {
        const wo = workOrders.find(w => w.id === id);
        if (wo?.sla_due_date && new Date() > new Date(wo.sla_due_date)) {
          data.sla_breached = true;
        }
      }
      if (data.status === 'in_progress' && !data.actual_start) {
        data.actual_start = new Date().toISOString();
      }
      if (data.status === 'completed' && !data.actual_end) {
        data.actual_end = new Date().toISOString();
      }
      const { error } = await (supabase.from('asset_work_orders' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Work order updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Create PM Schedule
  const createPMSchedule = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const code = 'PM-' + String(Math.floor(Date.now() / 1000)).slice(-6);
      const nextDue = data.frequency_days
        ? new Date(Date.now() + data.frequency_days * 86400000).toISOString().split('T')[0]
        : null;
      const insertData = {
        ...data,
        schedule_code: code,
        next_due_date: data.next_due_date || nextDue,
        created_by: user?.id || null,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      };
      const { error } = await (supabase.from('pm_schedules' as any).insert(insertData) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'PM schedule created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Create SLA Config
  const createSLAConfig = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const insertData = { ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = await (supabase.from('maintenance_sla_configs' as any).insert(insertData) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'SLA config created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Create Cost Forecast
  const createCostForecast = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const insertData = {
        ...data,
        variance: (data.budgeted_amount || 0) - (data.actual_amount || 0),
        created_by: user?.id || null,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      };
      const { error } = await (supabase.from('maintenance_cost_forecasts' as any).insert(insertData) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Forecast created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Predictive scheduling: suggest maintenance based on asset age & history
  const getPredictiveInsights = (assets: any[], maintenanceRecords: any[]) => {
    return assets.map(asset => {
      const assetMaintenance = maintenanceRecords.filter((m: any) => m.asset_id === asset.id);
      const totalCost = assetMaintenance.reduce((s: number, m: any) => s + (m.cost || 0), 0);
      const avgInterval = assetMaintenance.length > 1
        ? (new Date(assetMaintenance[0]?.created_at).getTime() - new Date(assetMaintenance[assetMaintenance.length - 1]?.created_at).getTime()) / (assetMaintenance.length - 1) / 86400000
        : 90;
      const lastMaintenance = assetMaintenance[0]?.created_at;
      const daysSinceLast = lastMaintenance ? Math.floor((Date.now() - new Date(lastMaintenance).getTime()) / 86400000) : 999;
      const riskScore = Math.min(100, Math.round((daysSinceLast / Math.max(avgInterval, 1)) * 100));
      const nextSuggested = lastMaintenance
        ? new Date(new Date(lastMaintenance).getTime() + avgInterval * 86400000).toISOString().split('T')[0]
        : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      return {
        assetId: asset.id,
        assetCode: asset.asset_code,
        assetName: asset.name,
        maintenanceCount: assetMaintenance.length,
        totalCost,
        avgIntervalDays: Math.round(avgInterval),
        daysSinceLast,
        riskScore,
        nextSuggested,
        recommendation: riskScore > 80 ? 'Urgent maintenance recommended' :
          riskScore > 50 ? 'Schedule maintenance soon' : 'On track',
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  };

  // SLA metrics
  const getSLAMetrics = () => {
    const total = workOrders.length;
    const breached = workOrders.filter(w => w.sla_breached).length;
    const onTime = total - breached;
    const complianceRate = total > 0 ? ((onTime / total) * 100) : 100;
    const avgResolutionHours = workOrders
      .filter(w => w.actual_start && w.actual_end)
      .reduce((sum, w) => {
        const diff = (new Date(w.actual_end!).getTime() - new Date(w.actual_start!).getTime()) / 3600000;
        return sum + diff;
      }, 0) / Math.max(workOrders.filter(w => w.actual_end).length, 1);

    const byPriority = ['critical', 'high', 'medium', 'low'].map(p => {
      const pWOs = workOrders.filter(w => w.priority === p);
      const pBreached = pWOs.filter(w => w.sla_breached).length;
      return { priority: p, total: pWOs.length, breached: pBreached, compliance: pWOs.length > 0 ? (((pWOs.length - pBreached) / pWOs.length) * 100) : 100 };
    });

    return { total, breached, onTime, complianceRate, avgResolutionHours: Math.round(avgResolutionHours * 10) / 10, byPriority };
  };

  // Cost analysis
  const getCostAnalysis = () => {
    const totalBudgeted = costForecasts.reduce((s, f) => s + f.budgeted_amount, 0);
    const totalActual = costForecasts.reduce((s, f) => s + f.actual_amount, 0);
    const totalVariance = totalBudgeted - totalActual;
    const woTotalCost = workOrders.reduce((s, w) => s + (w.actual_cost || w.estimated_cost || 0), 0);

    return { totalBudgeted, totalActual, totalVariance, woTotalCost };
  };

  // Overdue PM schedules
  const overduePMs = pmSchedules.filter(pm => {
    if (!pm.next_due_date || !pm.is_active) return false;
    return new Date(pm.next_due_date) < new Date();
  });

  const upcomingPMs = pmSchedules.filter(pm => {
    if (!pm.next_due_date || !pm.is_active) return false;
    const due = new Date(pm.next_due_date);
    const now = new Date();
    const inDays = (due.getTime() - now.getTime()) / 86400000;
    return inDays >= 0 && inDays <= 14;
  });

  return {
    workOrders, woLoading,
    pmSchedules, pmLoading,
    slaConfigs,
    costForecasts,
    overduePMs, upcomingPMs,
    createWorkOrder, updateWorkOrder,
    createPMSchedule,
    createSLAConfig,
    createCostForecast,
    getPredictiveInsights,
    getSLAMetrics,
    getCostAnalysis,
  };
}
