import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from '@/hooks/use-toast';

// ===== PM Schedules =====
export function useFleetPMSchedules(assetId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-pm', activeCompanyId, assetId],
    queryFn: async () => {
      let q = (supabase as any).from('fleet_pm_schedules').select('*').order('next_due_date', { ascending: true });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (assetId) q = q.eq('asset_id', assetId);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFleetPMMutations() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      const row = { ...payload, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = payload.id
        ? await (supabase as any).from('fleet_pm_schedules').update(row).eq('id', payload.id)
        : await (supabase as any).from('fleet_pm_schedules').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fleet-pm'] }); toast({ title: 'PM schedule saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { upsert };
}

// ===== Fuel Transactions =====
export function useFleetFuelTransactions(filters?: { asset_id?: string; from?: string; to?: string }) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-fuel-tx', activeCompanyId, filters],
    queryFn: async () => {
      let q = (supabase as any).from('fleet_fuel_transactions').select('*').order('transaction_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.asset_id) q = q.eq('asset_id', filters.asset_id);
      if (filters?.from) q = q.gte('transaction_date', filters.from);
      if (filters?.to) q = q.lte('transaction_date', filters.to);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFleetFuelMutations() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const create = useMutation({
    mutationFn: async (payload: any) => {
      const total = (payload.liters || 0) * (payload.price_per_liter || 0);
      const row = { ...payload, total_cost: total, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = await (supabase as any).from('fleet_fuel_transactions').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-fuel-tx'] });
      qc.invalidateQueries({ queryKey: ['fleet-cost'] });
      toast({ title: 'Fuel transaction logged' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { create };
}

// ===== Compliance Documents =====
export function useFleetCompliance(assetId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-compliance', activeCompanyId, assetId],
    queryFn: async () => {
      let q = (supabase as any).from('fleet_compliance_documents').select('*').order('expiry_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (assetId) q = q.eq('asset_id', assetId);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFleetComplianceMutations() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      const row = { ...payload, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = payload.id
        ? await (supabase as any).from('fleet_compliance_documents').update(row).eq('id', payload.id)
        : await (supabase as any).from('fleet_compliance_documents').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fleet-compliance'] }); toast({ title: 'Document saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { upsert };
}

// ===== Accidents =====
export function useFleetAccidents(filters?: { asset_id?: string; status?: string }) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-accidents', activeCompanyId, filters],
    queryFn: async () => {
      let q = (supabase as any).from('fleet_accidents').select('*').order('accident_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.asset_id) q = q.eq('asset_id', filters.asset_id);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFleetAccidentMutations() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      const caseNo = payload.case_number || `ACC-${Date.now().toString().slice(-8)}`;
      const row = { ...payload, case_number: caseNo, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = payload.id
        ? await (supabase as any).from('fleet_accidents').update(row).eq('id', payload.id)
        : await (supabase as any).from('fleet_accidents').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fleet-accidents'] }); toast({ title: 'Accident case saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { upsert };
}

// ===== CPK / Cost analytics =====
export function useFleetCPK(assetId: string | undefined, days: number = 90) {
  return useQuery({
    queryKey: ['fleet-cpk', assetId, days],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('recompute_fleet_cpk', { _asset_id: assetId, _days: days });
      if (error) throw error;
      return Number(data || 0);
    },
  });
}

export function useFleetCostEntries(assetId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-cost', activeCompanyId, assetId],
    queryFn: async () => {
      let q = (supabase as any).from('fleet_cost_entries').select('*').order('cost_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (assetId) q = q.eq('asset_id', assetId);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data || [];
    },
  });
}

// ===== Telematics =====
export function useFleetTelematics(assetId: string | undefined, limit = 200) {
  return useQuery({
    queryKey: ['fleet-tel', assetId, limit],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('fleet_telematics_points')
        .select('*').eq('asset_id', assetId).order('recorded_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

// ===== Project / Service / Asset links =====
export function useFleetProjectLinks(assetId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['fleet-links', activeCompanyId, assetId],
    queryFn: async () => {
      let q = (supabase as any).from('fleet_project_links').select('*').eq('is_active', true).order('start_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (assetId) q = q.eq('asset_id', assetId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFleetLinkMutations() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const create = useMutation({
    mutationFn: async (payload: any) => {
      const row = { ...payload, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = await (supabase as any).from('fleet_project_links').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fleet-links'] }); toast({ title: 'Link created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { create };
}
