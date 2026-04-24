import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

const sb = supabase as any;

// ===== STOCK LEDGER =====
export function useStockLedger(filters?: { itemCode?: string; warehouseCode?: string; limit?: number }) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['wms-stock-ledger', activeCompanyId, filters],
    queryFn: async () => {
      let q = sb.from('wms_stock_ledger').select('*').order('txn_date', { ascending: false }).limit(filters?.limit ?? 200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.itemCode) q = q.eq('item_code', filters.itemCode);
      if (filters?.warehouseCode) q = q.eq('warehouse_code', filters.warehouseCode);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateLedgerEntry() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (entry: any) => {
      const payload = { ...entry, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { data, error } = await sb.from('wms_stock_ledger').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-stock-ledger'] }); toast({ title: 'Stock movement recorded' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

// ===== UOM CONVERSIONS =====
export function useUomConversions() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['wms-uom-conversions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await sb.from('wms_uom_conversions').select('*').order('from_uom');
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const { data, error } = await sb.from('wms_uom_conversions').insert({ ...rec, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-uom-conversions'] }); toast({ title: 'UoM conversion saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from('wms_uom_conversions').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-uom-conversions'] }); toast({ title: 'Deleted' }); },
  });
  return { ...query, create, remove };
}

export function convertUom(qty: number, factor: number) { return qty * factor; }

// ===== CARTON / PALLET =====
export function useCartonPallets(parentId?: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['wms-carton-pallet', activeCompanyId, parentId],
    queryFn: async () => {
      let q = sb.from('wms_carton_pallet').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (parentId !== undefined) q = parentId === null ? q.is('parent_id', null) : q.eq('parent_id', parentId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const sscc = rec.sscc || `SSCC${Date.now()}`;
      const { data, error } = await sb.from('wms_carton_pallet').insert({ ...rec, sscc, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-carton-pallet'] }); toast({ title: 'Pack unit created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { ...query, create };
}

// ===== REPLENISHMENT =====
export function useReplenishmentSuggestions() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['wms-replenishment', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('wms_replenishment_suggestions').select('*').order('priority').order('generated_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await sb.from('wms_replenishment_suggestions').update(updates).eq('id', id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-replenishment'] }); toast({ title: 'Suggestion updated' }); },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const { data, error } = await sb.from('wms_replenishment_suggestions').insert({ ...rec, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-replenishment'] }); toast({ title: 'Replenishment suggestion created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { ...query, update, create };
}

// ===== CYCLE COUNT =====
export function useCycleCountPlans() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['wms-cycle-count-plans', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('wms_cycle_count_plans').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (plan: any) => {
      const planCode = plan.plan_code || `CC-${String(Date.now()).slice(-6)}`;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('wms_cycle_count_plans').insert({ ...plan, plan_code: planCode, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-cycle-count-plans'] }); toast({ title: 'Cycle count plan created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await sb.from('wms_cycle_count_plans').update(updates).eq('id', id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-cycle-count-plans'] }); toast({ title: 'Plan updated' }); },
  });
  return { ...query, create, update };
}

export function useCycleCountLines(planId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['wms-cycle-count-lines', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await sb.from('wms_cycle_count_lines').select('*').eq('plan_id', planId).order('item_code');
      if (error) throw error;
      return data as any[];
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, counted_qty, system_qty, ...rest }: any) => {
      const variance_qty = counted_qty != null && system_qty != null ? counted_qty - system_qty : null;
      const variance_pct = variance_qty != null && system_qty ? (variance_qty / system_qty) * 100 : null;
      const { data, error } = await sb.from('wms_cycle_count_lines').update({ counted_qty, system_qty, variance_qty, variance_pct, ...rest }).eq('id', id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wms-cycle-count-lines'] }),
  });
  return { ...query, update };
}

// ===== MOBILE SCAN =====
export function useMobileScanLog(limit = 100) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['wms-mobile-scan', activeCompanyId, limit],
    queryFn: async () => {
      let q = sb.from('wms_mobile_scan_log').select('*').order('scanned_at', { ascending: false }).limit(limit);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useRecordScan() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (scan: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('wms_mobile_scan_log').insert({ ...scan, user_id: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-mobile-scan'] }); },
  });
}

// ===== KPIs =====
export function useWarehouseKpis(warehouseCode?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['wms-kpis', activeCompanyId, warehouseCode],
    queryFn: async () => {
      let q = sb.from('wms_warehouse_kpis').select('*').order('snapshot_date', { ascending: false }).limit(90);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (warehouseCode) q = q.eq('warehouse_code', warehouseCode);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

// ===== EXCEPTIONS =====
export function useWmsExceptions() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['wms-exceptions', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('wms_exceptions').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('wms_exceptions').insert({ ...rec, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-exceptions'] }); toast({ title: 'Exception logged' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const resolve = useMutation({
    mutationFn: async ({ id, resolution_notes }: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('wms_exceptions').update({ status: 'resolved', resolution_notes, resolved_by: user?.id, resolved_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-exceptions'] }); toast({ title: 'Exception resolved' }); },
  });
  return { ...query, create, resolve };
}

// ===== 3PL =====
export function use3PLProviders() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['wms-3pl-providers'],
    queryFn: async () => {
      const { data, error } = await sb.from('wms_3pl_providers').select('*').order('provider_name');
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const { data, error } = await sb.from('wms_3pl_providers').insert({ ...rec, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-3pl-providers'] }); toast({ title: '3PL provider added' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { ...query, create };
}

export function use3PLShipments() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['wms-3pl-shipments', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('wms_3pl_shipments').select('*, provider:wms_3pl_providers(provider_name, provider_code)').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const awb = rec.awb_number || `AWB${Date.now()}`;
      const { data, error } = await sb.from('wms_3pl_shipments').insert({ ...rec, awb_number: awb, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-3pl-shipments'] }); toast({ title: 'Shipment created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await sb.from('wms_3pl_shipments').update(updates).eq('id', id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-3pl-shipments'] }); toast({ title: 'Shipment updated' }); },
  });
  return { ...query, create, update };
}

// ===== FEFO/FIFO =====
export function useFefoFifoRules() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['wms-fefo-fifo', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('wms_fefo_fifo_rules').select('*').order('priority');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const { data, error } = await sb.from('wms_fefo_fifo_rules').insert({ ...rec, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-fefo-fifo'] }); toast({ title: 'Rule saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from('wms_fefo_fifo_rules').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-fefo-fifo'] }); toast({ title: 'Deleted' }); },
  });
  return { ...query, create, remove };
}

// ===== CROSS-WAREHOUSE RESERVATIONS =====
export function useCrossWarehouseReservations() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['wms-cross-wh-reservations', activeCompanyId],
    queryFn: async () => {
      let q = sb.from('wms_cross_warehouse_reservations').select('*').order('priority').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (rec: any) => {
      const reservation_number = rec.reservation_number || `RSV-${String(Date.now()).slice(-8)}`;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('wms_cross_warehouse_reservations').insert({ ...rec, reservation_number, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-cross-wh-reservations'] }); toast({ title: 'Reservation created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await sb.from('wms_cross_warehouse_reservations').update(updates).eq('id', id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-cross-wh-reservations'] }); toast({ title: 'Updated' }); },
  });
  return { ...query, create, update };
}
