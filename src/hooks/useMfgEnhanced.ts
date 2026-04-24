import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

const sb = supabase as any;

// ===== ENGINEERING CHANGE ORDERS =====
export function useECOs() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['mfg-eco', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_eco').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const eco_number = rec.eco_number || `ECO-${String(Date.now()).slice(-6)}`;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_eco').insert({ ...rec, eco_number, requested_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-eco'] }); toast({ title: 'ECO created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await sb.from('mfg_eco').update(updates).eq('id', id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-eco'] }); toast({ title: 'ECO updated' }); },
  });
  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_eco').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-eco'] }); toast({ title: 'ECO approved' }); },
  });
  return { ...query, create, update, approve };
}

export function useECOLines(ecoId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['mfg-eco-lines', ecoId],
    enabled: !!ecoId,
    queryFn: async () => {
      const { data, error } = await sb.from('mfg_eco_lines').select('*').eq('eco_id', ecoId).order('created_at');
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const { data, error } = await sb.from('mfg_eco_lines').insert(rec).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-eco-lines'] }); toast({ title: 'Line added' }); },
  });
  return { ...query, create };
}

// ===== SUBCONTRACT MANUFACTURING =====
export function useSubcontractOrders() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['mfg-sco', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_subcontract_orders').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const sco_number = rec.sco_number || `SCO-${String(Date.now()).slice(-6)}`;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_subcontract_orders').insert({ ...rec, sco_number, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-sco'] }); toast({ title: 'Subcontract order created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await sb.from('mfg_subcontract_orders').update(updates).eq('id', id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-sco'] }); toast({ title: 'Updated' }); },
  });
  return { ...query, create, update };
}

export function useSubcontractComponents(scoId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['mfg-sco-components', scoId],
    enabled: !!scoId,
    queryFn: async () => {
      const { data, error } = await sb.from('mfg_subcontract_components').select('*').eq('sco_id', scoId);
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const { data, error } = await sb.from('mfg_subcontract_components').insert(rec).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-sco-components'] }); toast({ title: 'Component added' }); },
  });
  return { ...query, create };
}

// ===== COST ROLL-UP =====
export function useCostRollups() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['mfg-cost-rollup', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_cost_rollup').select('*').order('rollup_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const total = Number(rec.material_cost || 0) + Number(rec.labor_cost || 0) + Number(rec.overhead_cost || 0) + Number(rec.subcontract_cost || 0);
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_cost_rollup').insert({ ...rec, total_cost: total, rolled_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-cost-rollup'] }); toast({ title: 'Cost roll-up saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { ...query, create };
}

// ===== MATERIAL ISSUE / RETURN =====
export function useMaterialIssues() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['mfg-material-issue', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_material_issue').select('*').order('issued_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const issue_number = rec.issue_number || `ISS-${String(Date.now()).slice(-6)}`;
      const total_cost = Number(rec.issued_qty || 0) * Number(rec.unit_cost || 0);
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_material_issue').insert({ ...rec, issue_number, total_cost, issued_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-material-issue'] }); toast({ title: 'Material issued' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { ...query, create };
}

export function useMaterialReturns() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['mfg-material-return', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_material_return').select('*').order('returned_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const return_number = rec.return_number || `RET-${String(Date.now()).slice(-6)}`;
      const total_cost = Number(rec.return_qty || 0) * Number(rec.unit_cost || 0);
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_material_return').insert({ ...rec, return_number, total_cost, returned_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-material-return'] }); toast({ title: 'Material returned' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { ...query, create };
}

// ===== SCRAP & REWORK =====
export function useScrapRework() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['mfg-scrap-rework', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_scrap_rework').select('*').order('reported_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const event_number = rec.event_number || `${rec.event_type === 'rework' ? 'RWK' : 'SCR'}-${String(Date.now()).slice(-6)}`;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_scrap_rework').insert({ ...rec, event_number, reported_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-scrap-rework'] }); toast({ title: 'Event logged' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { ...query, create };
}

// ===== QUALITY CHECKPOINTS =====
export function useQualityCheckpoints() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['mfg-qc-checkpoints', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_quality_checkpoints').select('*').order('operation_seq');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const { data, error } = await sb.from('mfg_quality_checkpoints').insert({ ...rec, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-qc-checkpoints'] }); toast({ title: 'Checkpoint added' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from('mfg_quality_checkpoints').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-qc-checkpoints'] }); toast({ title: 'Deleted' }); },
  });
  return { ...query, create, remove };
}

export function useQualityInspections(woId?: string) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['mfg-qc-inspections', activeCompanyId, woId],
    queryFn: async () => {
      let q = sb.from('mfg_quality_inspections').select('*').order('inspected_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (woId) q = q.eq('wo_id', woId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_quality_inspections').insert({ ...rec, inspector_id: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-qc-inspections'] }); toast({ title: 'Inspection recorded' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { ...query, create };
}

// ===== LOT GENEALOGY =====
export function useLotGenealogy(lot?: string) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['mfg-lot-genealogy', activeCompanyId, lot],
    queryFn: async () => {
      let q = sb.from('mfg_lot_genealogy').select('*').order('link_date', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (lot) q = q.or(`parent_lot.eq.${lot},child_lot.eq.${lot}`);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const { data, error } = await sb.from('mfg_lot_genealogy').insert({ ...rec, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-lot-genealogy'] }); toast({ title: 'Genealogy link recorded' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { ...query, create };
}

// ===== CAPACITY PLAN =====
export function useCapacityPlan(workCenter?: string) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['mfg-capacity-plan', activeCompanyId, workCenter],
    queryFn: async () => {
      let q = sb.from('mfg_capacity_plan').select('*').order('plan_date', { ascending: false }).limit(180);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (workCenter) q = q.eq('work_center_code', workCenter);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const upsert = useMutation({
    mutationFn: async (rec: any) => {
      const { data, error } = await sb.from('mfg_capacity_plan').upsert({ ...rec, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }, { onConflict: 'company_id,work_center_code,plan_date' }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-capacity-plan'] }); toast({ title: 'Capacity saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { ...query, upsert };
}
