import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

const sb = supabase as any;

// ---------- BOM Versions ----------
export function useBOMVersions(bomId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: versions, isLoading } = useQuery({
    queryKey: ['mfg-bom-versions', bomId, activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_bom_versions').select('*').order('version_number', { ascending: false });
      if (bomId) q = q.eq('bom_id', bomId);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createVersion = useMutation({
    mutationFn: async (v: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_bom_versions').insert({
        ...v, company_id: activeCompanyId, created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-bom-versions'] }); toast({ title: 'BOM version created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const approveVersion = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_bom_versions').update({
        status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-bom-versions'] }); toast({ title: 'Version approved' }); },
  });

  return { versions, isLoading, createVersion, approveVersion };
}

// ---------- Work Centers ----------
export function useWorkCenters() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: workCenters, isLoading } = useQuery({
    queryKey: ['mfg-work-centers', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_work_centers').select('*').order('code');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createWC = useMutation({
    mutationFn: async (wc: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_work_centers').insert({
        ...wc, company_id: activeCompanyId, created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-work-centers'] }); toast({ title: 'Work center created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateWC = useMutation({
    mutationFn: async ({ id, ...u }: any) => {
      const { data, error } = await sb.from('mfg_work_centers').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-work-centers'] }); toast({ title: 'Updated' }); },
  });

  return { workCenters, isLoading, createWC, updateWC };
}

// ---------- Routings ----------
export function useRoutings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: routings, isLoading } = useQuery({
    queryKey: ['mfg-routings', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_routings').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createRouting = useMutation({
    mutationFn: async (r: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_routings').insert({
        ...r, company_id: activeCompanyId, created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-routings'] }); toast({ title: 'Routing created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { routings, isLoading, createRouting };
}

export function useRoutingOperations(routingId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: ops, isLoading } = useQuery({
    queryKey: ['mfg-routing-ops', routingId],
    queryFn: async () => {
      if (!routingId) return [];
      const { data, error } = await sb.from('mfg_routing_operations').select('*').eq('routing_id', routingId).order('op_seq');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!routingId,
  });

  const addOp = useMutation({
    mutationFn: async (op: any) => {
      const { data, error } = await sb.from('mfg_routing_operations').insert({ ...op, routing_id: routingId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-routing-ops'] }); toast({ title: 'Operation added' }); },
  });

  const deleteOp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('mfg_routing_operations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-routing-ops'] }); },
  });

  return { ops, isLoading, addOp, deleteOp };
}

// ---------- Work Orders ----------
export function useMfgWorkOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['mfg-work-orders', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_work_orders').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createWO = useMutation({
    mutationFn: async (wo: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const wo_number = wo.wo_number || `WO-${String(Date.now()).slice(-6)}`;
      const { data, error } = await sb.from('mfg_work_orders').insert({
        ...wo, wo_number, company_id: activeCompanyId, created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-work-orders'] }); toast({ title: 'Work order created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateWO = useMutation({
    mutationFn: async ({ id, ...u }: any) => {
      const { data, error } = await sb.from('mfg_work_orders').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-work-orders'] }); toast({ title: 'Updated' }); },
  });

  const recomputeCosts = useMutation({
    mutationFn: async (woId: string) => {
      const { error } = await sb.rpc('mfg_recompute_wo_costs', { p_wo_id: woId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-work-orders'] }); toast({ title: 'Costs recomputed' }); },
  });

  return { workOrders, isLoading, createWO, updateWO, recomputeCosts };
}

// ---------- WO Material lines + moves ----------
export function useWOMaterialLines(woId?: string) {
  const qc = useQueryClient();
  const { data: lines, isLoading } = useQuery({
    queryKey: ['mfg-wo-mat', woId],
    queryFn: async () => {
      if (!woId) return [];
      const { data, error } = await sb.from('mfg_wo_material_lines').select('*').eq('wo_id', woId).order('line_num');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!woId,
  });

  const issue = useMutation({
    mutationFn: async (payload: { line: any; qty: number; notes?: string }) => {
      const { line, qty, notes } = payload;
      const newIssued = Number(line.issued_qty || 0) + qty;
      const newActualCost = newIssued * Number(line.actual_unit_cost || line.std_unit_cost || 0);
      await sb.from('mfg_wo_material_lines').update({ issued_qty: newIssued, actual_cost: newActualCost }).eq('id', line.id);
      await sb.from('mfg_wo_material_moves').insert({
        wo_id: line.wo_id, material_line_id: line.id, move_type: 'issue',
        item_code: line.item_code, qty, uom: line.uom, warehouse_code: line.warehouse_code,
        unit_cost: line.actual_unit_cost || line.std_unit_cost || 0,
        total_cost: qty * Number(line.actual_unit_cost || line.std_unit_cost || 0),
        notes,
      });
      await sb.rpc('mfg_recompute_wo_costs', { p_wo_id: line.wo_id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-wo-mat'] }); qc.invalidateQueries({ queryKey: ['mfg-work-orders'] }); },
  });

  const returnQty = useMutation({
    mutationFn: async (payload: { line: any; qty: number; notes?: string }) => {
      const { line, qty, notes } = payload;
      const newReturned = Number(line.returned_qty || 0) + qty;
      const newIssued = Math.max(0, Number(line.issued_qty || 0) - qty);
      const newActualCost = newIssued * Number(line.actual_unit_cost || line.std_unit_cost || 0);
      await sb.from('mfg_wo_material_lines').update({ returned_qty: newReturned, issued_qty: newIssued, actual_cost: newActualCost }).eq('id', line.id);
      await sb.from('mfg_wo_material_moves').insert({
        wo_id: line.wo_id, material_line_id: line.id, move_type: 'return',
        item_code: line.item_code, qty, uom: line.uom, warehouse_code: line.warehouse_code,
        unit_cost: line.actual_unit_cost || line.std_unit_cost || 0,
        total_cost: qty * Number(line.actual_unit_cost || line.std_unit_cost || 0),
        notes,
      });
      await sb.rpc('mfg_recompute_wo_costs', { p_wo_id: line.wo_id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-wo-mat'] }); qc.invalidateQueries({ queryKey: ['mfg-work-orders'] }); },
  });

  return { lines, isLoading, issue, returnQty };
}

// ---------- Scrap & Rework ----------
export function useWOScrap(woId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: scrap, isLoading } = useQuery({
    queryKey: ['mfg-wo-scrap', woId, activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_wo_scrap').select('*').order('scrap_date', { ascending: false });
      if (woId) q = q.eq('wo_id', woId);
      else if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const reportScrap = useMutation({
    mutationFn: async (s: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const total = Number(s.qty || 0) * Number(s.unit_cost || 0);
      const { data, error } = await sb.from('mfg_wo_scrap').insert({
        ...s, company_id: activeCompanyId, reported_by: user?.id, total_cost: total,
      }).select().single();
      if (error) throw error;
      if (s.wo_id) await sb.rpc('mfg_recompute_wo_costs', { p_wo_id: s.wo_id });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mfg-wo-scrap'] });
      qc.invalidateQueries({ queryKey: ['mfg-work-orders'] });
      toast({ title: 'Scrap reported' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { scrap, isLoading, reportScrap };
}

export function useReworkOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: reworks, isLoading } = useQuery({
    queryKey: ['mfg-reworks', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_rework_orders').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createRework = useMutation({
    mutationFn: async (r: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const rework_number = r.rework_number || `RW-${String(Date.now()).slice(-6)}`;
      const { data, error } = await sb.from('mfg_rework_orders').insert({
        ...r, rework_number, company_id: activeCompanyId, created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-reworks'] }); toast({ title: 'Rework order created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { reworks, isLoading, createRework };
}

// ---------- QC ----------
export function useWOQCChecks(woId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: checks, isLoading } = useQuery({
    queryKey: ['mfg-wo-qc', woId, activeCompanyId],
    queryFn: async () => {
      let q = sb.from('mfg_wo_qc_checks').select('*').order('created_at', { ascending: false });
      if (woId) q = q.eq('wo_id', woId);
      else if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const recordCheck = useMutation({
    mutationFn: async (c: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('mfg_wo_qc_checks').insert({
        ...c, company_id: activeCompanyId, inspector_id: user?.id,
        inspected_at: c.result && c.result !== 'pending' ? new Date().toISOString() : null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mfg-wo-qc'] }); toast({ title: 'QC recorded' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { checks, isLoading, recordCheck };
}
