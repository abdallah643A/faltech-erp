import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';

export function useFleetAssets(filters?: { status?: string; category_id?: string; ownership_type?: string }) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-assets', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase.from('fleet_assets').select('*, fleet_categories(name, type, color)').order('asset_code');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.category_id) q = q.eq('category_id', filters.category_id);
      if (filters?.ownership_type) q = q.eq('ownership_type', filters.ownership_type);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFleetAsset(id: string | undefined) {
  return useQuery({
    queryKey: ['fleet-asset', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('fleet_assets')
        .select('*, fleet_categories(name, type, color)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useFleetCategories() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-categories', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('fleet_categories').select('*').eq('is_active', true).order('name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });
}

export function useFleetDrivers() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-drivers', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('fleet_drivers').select('*').order('full_name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(500);
      return data || [];
    },
  });
}

export function useFleetTrips(filters?: { asset_id?: string; status?: string }) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-trips', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase.from('fleet_trips').select('*, fleet_assets(asset_code, asset_name, plate_number), fleet_drivers(full_name)').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.asset_id) q = q.eq('asset_id', filters.asset_id);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data } = await q.limit(500);
      return data || [];
    },
  });
}

export function useFleetFuelLogs(assetId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-fuel-logs', activeCompanyId, assetId],
    queryFn: async () => {
      let q = supabase.from('fleet_fuel_logs').select('*, fleet_assets(asset_code, asset_name), fleet_drivers(full_name)').order('fill_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (assetId) q = q.eq('asset_id', assetId);
      const { data } = await q.limit(500);
      return data || [];
    },
  });
}

export function useFleetMaintenanceJobs(filters?: { asset_id?: string; status?: string }) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-maint-jobs', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase.from('fleet_maintenance_jobs').select('*, fleet_assets(asset_code, asset_name, plate_number)').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.asset_id) q = q.eq('asset_id', filters.asset_id);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data } = await q.limit(500);
      return data || [];
    },
  });
}

export function useFleetComplianceDocs(assetId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-compliance', activeCompanyId, assetId],
    queryFn: async () => {
      let q = supabase.from('fleet_compliance_docs').select('*, fleet_assets(asset_code, asset_name)').order('expiry_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (assetId) q = q.eq('asset_id', assetId);
      const { data } = await q.limit(500);
      return data || [];
    },
  });
}

export function useFleetIncidents(assetId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-incidents', activeCompanyId, assetId],
    queryFn: async () => {
      let q = supabase.from('fleet_incidents').select('*, fleet_assets(asset_code, asset_name), fleet_drivers(full_name)').order('incident_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (assetId) q = q.eq('asset_id', assetId);
      const { data } = await q.limit(500);
      return data || [];
    },
  });
}

export function useFleetLeases() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-leases', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('fleet_leases').select('*, fleet_assets(asset_code, asset_name, plate_number)').order('start_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(500);
      return data || [];
    },
  });
}

export function useFleetCostEntries(assetId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-costs', activeCompanyId, assetId],
    queryFn: async () => {
      let q = supabase.from('fleet_cost_entries').select('*, fleet_assets(asset_code, asset_name)').order('cost_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (assetId) q = q.eq('asset_id', assetId);
      const { data } = await q.limit(500);
      return data || [];
    },
  });
}

export function useFleetReservations() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-reservations', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('fleet_reservations').select('*, fleet_assets(asset_code, asset_name, plate_number)').order('start_datetime', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(200);
      return data || [];
    },
  });
}

export function useFleetDashboardKPIs() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-dashboard-kpis', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('fleet_assets').select('id, status, ownership_type, category_id, current_odometer');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data: assets } = await q;
      
      let cq = supabase.from('fleet_compliance_docs').select('id, expiry_date, status');
      if (activeCompanyId) cq = cq.eq('company_id', activeCompanyId);
      const { data: docs } = await cq;

      let mq = supabase.from('fleet_maintenance_jobs').select('id, status, total_cost');
      if (activeCompanyId) mq = mq.eq('company_id', activeCompanyId);
      const { data: jobs } = await mq;

      const all = assets || [];
      const total = all.length;
      const available = all.filter(a => a.status === 'available').length;
      const assigned = all.filter(a => a.status === 'assigned').length;
      const maintenance = all.filter(a => a.status === 'under_maintenance').length;
      const breakdown = all.filter(a => a.status === 'breakdown').length;
      const owned = all.filter(a => a.ownership_type === 'owned').length;
      const leased = all.filter(a => a.ownership_type === 'leased').length;
      const rented = all.filter(a => a.ownership_type === 'rented').length;

      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
      const expiringDocs = (docs || []).filter(d => d.expiry_date && d.expiry_date <= in30 && d.status !== 'renewed').length;
      
      const openJobs = (jobs || []).filter(j => j.status !== 'completed' && j.status !== 'cancelled').length;
      const totalMaintCost = (jobs || []).reduce((s, j) => s + (j.total_cost || 0), 0);

      const utilizationRate = total > 0 ? ((assigned + maintenance) / total * 100) : 0;
      const availabilityRate = total > 0 ? (available / total * 100) : 0;

      return {
        total, available, assigned, maintenance, breakdown,
        owned, leased, rented,
        expiringDocs, openJobs, totalMaintCost,
        utilizationRate, availabilityRate,
        statusBreakdown: [
          { name: 'Available', value: available, color: '#22c55e' },
          { name: 'Assigned', value: assigned, color: '#3b82f6' },
          { name: 'Maintenance', value: maintenance, color: '#f59e0b' },
          { name: 'Breakdown', value: breakdown, color: '#ef4444' },
          { name: 'Other', value: total - available - assigned - maintenance - breakdown, color: '#94a3b8' },
        ].filter(s => s.value > 0),
        ownershipBreakdown: [
          { name: 'Owned', value: owned, color: '#3b82f6' },
          { name: 'Leased', value: leased, color: '#8b5cf6' },
          { name: 'Rented', value: rented, color: '#f59e0b' },
          { name: 'Subcontracted', value: total - owned - leased - rented, color: '#64748b' },
        ].filter(s => s.value > 0),
      };
    },
  });
}

export function useSaveFleetAsset() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (asset: Record<string, any>) => {
      const payload = { ...asset, company_id: activeCompanyId || asset.company_id };
      if (asset.id) {
        const { error } = await supabase.from('fleet_assets').update(payload).eq('id', asset.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('fleet_assets').insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-assets'] });
      qc.invalidateQueries({ queryKey: ['fleet-dashboard-kpis'] });
      toast({ title: 'Fleet asset saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}
