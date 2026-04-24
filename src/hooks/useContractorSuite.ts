import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const sb = supabase as any;

/* ===================== Subcontracts ===================== */
export function useSubcontracts(projectId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['cpms-subcontracts', activeCompanyId, projectId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = sb.from('cpms_subcontracts').select('*').eq('company_id', activeCompanyId).order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertSubcontract() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      const row = { ...payload, company_id: activeCompanyId, created_by: user?.id };
      const { data, error } = await sb.from('cpms_subcontracts').upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cpms-subcontracts'] });
      toast.success('Subcontract saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ===================== Subcontract IPC ===================== */
export function useSubcontractIPCs(subcontractId?: string) {
  return useQuery({
    queryKey: ['cpms-sub-ipc', subcontractId],
    enabled: !!subcontractId,
    queryFn: async () => {
      const { data, error } = await sb.from('cpms_subcontract_ipc').select('*').eq('subcontract_id', subcontractId).order('ipc_no', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

/* ===================== Variation Orders ===================== */
export function useVariationOrders(projectId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['cpms-vos', activeCompanyId, projectId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = sb.from('cpms_variation_orders').select('*').eq('company_id', activeCompanyId).order('vo_date', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertVO() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      const row = { ...payload, company_id: activeCompanyId, created_by: user?.id };
      const { data, error } = await sb.from('cpms_variation_orders').upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-vos'] }); toast.success('VO saved'); },
  });
}

/* ===================== Client IPC / Progress Billing ===================== */
export function useClientIPCs(projectId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['cpms-client-ipc', activeCompanyId, projectId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = sb.from('cpms_client_ipc').select('*').eq('company_id', activeCompanyId).order('ipc_no', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertClientIPC() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      // Auto-derive net_certified
      const row: any = { ...payload, company_id: activeCompanyId, created_by: user?.id };
      const periodAmount = (row.cumulative_work_done || 0) - (row.previous_certified || 0);
      const ret = ((periodAmount + (row.materials_on_site || 0)) * (row.retention_pct || 10)) / 100;
      row.retention_amount = ret;
      const subtotal = periodAmount + (row.materials_on_site || 0) - ret - (row.advance_recovery || 0);
      row.vat_amount = subtotal * 0.15;
      row.net_certified = subtotal + row.vat_amount;
      const { data, error } = await sb.from('cpms_client_ipc').upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-client-ipc'] }); toast.success('IPC saved'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ===================== Retention Ledger ===================== */
export function useRetentionLedger(projectId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['cpms-retention', activeCompanyId, projectId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = sb.from('cpms_retention_ledger').select('*').eq('company_id', activeCompanyId).order('movement_date', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

/* ===================== CTC Snapshots ===================== */
export function useCTCSnapshots(projectId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['cpms-ctc', activeCompanyId, projectId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = sb.from('cpms_ctc_snapshots').select('*').eq('company_id', activeCompanyId).order('snapshot_date', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateCTC() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      const r: any = { ...payload, company_id: activeCompanyId, created_by: user?.id };
      r.cpi = r.ac > 0 ? r.ev / r.ac : null;
      r.spi = r.pv > 0 ? r.ev / r.pv : null;
      r.eac = r.cpi && r.cpi > 0 ? r.bac / r.cpi : (r.ac || 0) + (r.etc || 0);
      r.health = r.cpi >= 0.95 && r.spi >= 0.95 ? 'green' : r.cpi >= 0.85 ? 'amber' : 'red';
      const { data, error } = await sb.from('cpms_ctc_snapshots').upsert(r).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-ctc'] }); toast.success('CTC snapshot saved'); },
  });
}

/* ===================== Delay Events ===================== */
export function useDelayEvents(projectId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['cpms-delays', activeCompanyId, projectId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = sb.from('cpms_delay_events').select('*').eq('company_id', activeCompanyId).order('event_date', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertDelay() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: any) => {
      const { data, error } = await sb.from('cpms_delay_events').upsert({ ...p, company_id: activeCompanyId, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-delays'] }); toast.success('Delay event saved'); },
  });
}

/* ===================== Productivity Ledger ===================== */
export function useProductivity(projectId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['cpms-productivity', activeCompanyId, projectId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = sb.from('cpms_productivity_ledger').select('*').eq('company_id', activeCompanyId).order('log_date', { ascending: false }).limit(500);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useLogProductivity() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: any) => {
      const r: any = { ...p, company_id: activeCompanyId, created_by: user?.id };
      if (r.budget_rate && r.output_qty > 0) {
        const actual = (r.manhours + (r.equipment_hours || 0)) / r.output_qty;
        r.productivity_factor = actual > 0 ? r.budget_rate / actual : null;
      }
      const { data, error } = await sb.from('cpms_productivity_ledger').insert(r).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-productivity'] }); toast.success('Productivity logged'); },
  });
}

/* ===================== Doc Transmittals ===================== */
export function useTransmittals(projectId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['cpms-transmittals', activeCompanyId, projectId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = sb.from('cpms_doc_transmittals').select('*').eq('company_id', activeCompanyId).order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertTransmittal() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: any) => {
      const { data, error } = await sb.from('cpms_doc_transmittals').upsert({ ...p, company_id: activeCompanyId, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-transmittals'] }); toast.success('Transmittal saved'); },
  });
}

/* ===================== Control Tower ===================== */
export function useControlTower(scope: 'company' | 'group' = 'company') {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['cpms-tower', scope, activeCompanyId],
    enabled: scope === 'group' || !!activeCompanyId,
    queryFn: async () => {
      // Latest snapshot per project
      let q = sb.from('cpms_control_tower_snapshots').select('*').order('snapshot_date', { ascending: false }).limit(500);
      if (scope === 'company' && activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      // dedupe latest per project
      const map = new Map<string, any>();
      (data || []).forEach((r: any) => { if (!map.has(r.project_id)) map.set(r.project_id, r); });
      return Array.from(map.values());
    },
  });
}

export function useRefreshTower() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  return useMutation({
    mutationFn: async () => {
      // Compute snapshot per active project from existing CPMS data
      const { data: projects } = await sb.from('cpms_projects').select('id,name,name_ar,status').eq('company_id', activeCompanyId).in('status', ['active', 'in_progress']);
      const today = new Date().toISOString().split('T')[0];
      for (const p of projects || []) {
        const [{ count: ncrs }, { count: rfis }, { count: vos }, { count: delays }, { data: ctc }] = await Promise.all([
          sb.from('cpms_quality_ncrs').select('id', { count: 'exact', head: true }).eq('project_id', p.id).eq('status', 'open'),
          sb.from('cpms_rfis').select('id', { count: 'exact', head: true }).eq('project_id', p.id).in('status', ['open', 'pending']),
          sb.from('cpms_variation_orders').select('id', { count: 'exact', head: true }).eq('project_id', p.id).in('status', ['draft', 'submitted', 'under_review']),
          sb.from('cpms_delay_events').select('id', { count: 'exact', head: true }).eq('project_id', p.id).in('status', ['open', 'notified', 'claimed']),
          sb.from('cpms_ctc_snapshots').select('cpi,spi,health,bac,eac').eq('project_id', p.id).order('snapshot_date', { ascending: false }).limit(1).maybeSingle(),
        ]);
        await sb.from('cpms_control_tower_snapshots').upsert({
          company_id: activeCompanyId,
          project_id: p.id,
          snapshot_date: today,
          open_ncrs: ncrs || 0,
          open_rfis: rfis || 0,
          open_vos: vos || 0,
          open_delays: delays || 0,
          cpi: ctc?.cpi ?? null,
          spi: ctc?.spi ?? null,
          health: ctc?.health ?? 'green',
          payload: { bac: ctc?.bac ?? 0, eac: ctc?.eac ?? 0 },
        });
      }
      return projects?.length || 0;
    },
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['cpms-tower'] }); toast.success(`Refreshed ${n} project(s)`); },
    onError: (e: any) => toast.error(e.message),
  });
}
