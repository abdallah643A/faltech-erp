import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const sb = supabase as any;

/* ---------- DEPRECIATION BOOKS ---------- */
export function useDepreciationBooks() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['asset-dep-books'],
    queryFn: async () => {
      const { data, error } = await sb.from('asset_depreciation_books').select('*').order('book_code');
      if (error) throw error;
      return data || [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await sb.from('asset_depreciation_books').update(row).eq('id', row.id).select().single()
        : await sb.from('asset_depreciation_books').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-dep-books'] }); toast.success('Saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

/* ---------- DEPRECIATION SCHEDULE ---------- */
export function useDepreciationSchedules(filters?: { assetId?: string; equipmentId?: string }) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['asset-dep-schedules', filters],
    queryFn: async () => {
      let q = sb.from('asset_depreciation_schedule').select('*, asset_depreciation_books(book_code, book_name, book_type)');
      if (filters?.assetId) q = q.eq('asset_id', filters.assetId);
      if (filters?.equipmentId) q = q.eq('equipment_id', filters.equipmentId);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      // compute simple straight-line schedule preview
      const cost = Number(row.acquisition_cost) || 0;
      const salvage = Number(row.salvage_value) || 0;
      const months = Number(row.useful_life_months) || 60;
      const depreciable = Math.max(0, cost - salvage);
      let monthly = 0;
      if (row.method === 'straight_line') monthly = depreciable / months;
      else if (row.method === 'double_declining') monthly = (cost * (2 / months));
      else if (row.method === 'declining_balance') monthly = cost * (Number(row.declining_factor || 1.5) / months);
      const schedule = Array.from({ length: Math.min(months, 120) }).map((_, i) => ({
        period: i + 1,
        depreciation: Math.round(monthly * 100) / 100,
        accumulated: Math.round(monthly * (i + 1) * 100) / 100,
      }));
      const payload = {
        ...row,
        schedule_json: schedule,
        net_book_value: cost - (Number(row.accumulated_depreciation) || 0),
      };
      const { data, error } = row.id
        ? await sb.from('asset_depreciation_schedule').update(payload).eq('id', row.id).select().single()
        : await sb.from('asset_depreciation_schedule').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-dep-schedules'] }); toast.success('Schedule saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

/* ---------- LEASE SCENARIOS ---------- */
export function useLeaseScenarios(filters?: { assetId?: string; equipmentId?: string }) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['asset-lease-scenarios', filters],
    queryFn: async () => {
      let q = sb.from('asset_lease_scenarios').select('*');
      if (filters?.assetId) q = q.eq('asset_id', filters.assetId);
      if (filters?.equipmentId) q = q.eq('equipment_id', filters.equipmentId);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      // simple NPV calc
      const r = (Number(row.interest_rate) || 0.08) / 12;
      const months = Number(row.term_months) || 36;
      const monthly = Number(row.monthly_cost) || 0;
      const upfront = Number(row.upfront_cost) || 0;
      const residual = Number(row.residual_value) || 0;
      let npv = upfront;
      for (let i = 1; i <= months; i++) npv += monthly / Math.pow(1 + r, i);
      npv -= residual / Math.pow(1 + r, months);
      const payload = { ...row, npv: Math.round(npv * 100) / 100 };
      const { data, error } = row.id
        ? await sb.from('asset_lease_scenarios').update(payload).eq('id', row.id).select().single()
        : await sb.from('asset_lease_scenarios').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-lease-scenarios'] }); toast.success('Scenario saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  const recommend = useMutation({
    mutationFn: async (id: string) => {
      // mark as recommended; clear others for same asset
      const { data: row } = await sb.from('asset_lease_scenarios').select('asset_id, equipment_id').eq('id', id).single();
      if (row?.asset_id) await sb.from('asset_lease_scenarios').update({ recommended: false }).eq('asset_id', row.asset_id);
      if (row?.equipment_id) await sb.from('asset_lease_scenarios').update({ recommended: false }).eq('equipment_id', row.equipment_id);
      await sb.from('asset_lease_scenarios').update({ recommended: true }).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-lease-scenarios'] }); toast.success('Marked recommended'); },
  });
  return { ...list, upsert, recommend };
}

/* ---------- MAINTENANCE PLANS ---------- */
export function useMaintenancePlans() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['asset-maintenance-plans'],
    queryFn: async () => {
      const { data, error } = await sb.from('asset_maintenance_plans').select('*').order('next_due_date', { nullsFirst: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await sb.from('asset_maintenance_plans').update(row).eq('id', row.id).select().single()
        : await sb.from('asset_maintenance_plans').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-maintenance-plans'] }); toast.success('Plan saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

/* ---------- INSPECTION TEMPLATES ---------- */
export function useInspectionTemplates() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['asset-inspection-templates'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('asset_inspection_templates')
        .select('*, asset_inspection_checklist_items(*)')
        .order('template_code');
      if (error) throw error;
      return data || [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { items, ...header } = row;
      const { data, error } = header.id
        ? await sb.from('asset_inspection_templates').update(header).eq('id', header.id).select().single()
        : await sb.from('asset_inspection_templates').insert(header).select().single();
      if (error) throw error;
      if (items && data?.id) {
        await sb.from('asset_inspection_checklist_items').delete().eq('template_id', data.id);
        if (items.length) await sb.from('asset_inspection_checklist_items').insert(items.map((it: any, i: number) => ({ ...it, template_id: data.id, item_order: i + 1 })));
      }
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-inspection-templates'] }); toast.success('Template saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

/* ---------- CUSTODY CHAIN ---------- */
export function useCustodyChain(filters?: { assetId?: string; equipmentId?: string }) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['asset-custody', filters],
    queryFn: async () => {
      let q = sb.from('asset_custody_chain').select('*');
      if (filters?.assetId) q = q.eq('asset_id', filters.assetId);
      if (filters?.equipmentId) q = q.eq('equipment_id', filters.equipmentId);
      const { data, error } = await q.order('handover_date', { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });
  const handover = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await sb.from('asset_custody_chain').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-custody'] }); toast.success('Handover recorded'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, handover };
}

/* ---------- PROFITABILITY ---------- */
export function useAssetProfitability() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['asset-profitability'],
    queryFn: async () => {
      const { data, error } = await sb.from('asset_profitability').select('*').order('period_start', { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const total = (Number(row.direct_cost) || 0) + (Number(row.maintenance_cost) || 0) + (Number(row.fuel_cost) || 0)
        + (Number(row.depreciation_cost) || 0) + (Number(row.insurance_cost) || 0) + (Number(row.other_cost) || 0);
      const margin = (Number(row.revenue) || 0) - total;
      const util = row.available_hours ? ((Number(row.utilization_hours) || 0) / Number(row.available_hours)) * 100 : 0;
      const roi = total ? (margin / total) * 100 : 0;
      const payload = { ...row, gross_margin: margin, utilization_pct: Math.round(util * 100) / 100, roi_pct: Math.round(roi * 100) / 100 };
      const { data, error } = row.id
        ? await sb.from('asset_profitability').update(payload).eq('id', row.id).select().single()
        : await sb.from('asset_profitability').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-profitability'] }); toast.success('Profitability saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

/* ---------- UTILIZATION HEATMAP ---------- */
export function useUtilizationHeatmap(days = 14) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['asset-util-heatmap', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await sb
        .from('asset_utilization_heatmap')
        .select('*')
        .gte('day_date', since.toISOString().slice(0, 10))
        .order('day_date', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
  });
  const generateDemo = useMutation({
    mutationFn: async (assetId?: string) => {
      const today = new Date();
      const rows: any[] = [];
      for (let d = 0; d < 14; d++) {
        const date = new Date(today); date.setDate(today.getDate() - d);
        for (let h = 0; h < 24; h++) {
          const isWork = h >= 7 && h < 18;
          const util = isWork ? Math.round(50 + Math.random() * 50) : Math.round(Math.random() * 20);
          rows.push({
            asset_id: assetId || null,
            day_date: date.toISOString().slice(0, 10),
            hour_of_day: h,
            utilization_pct: util,
            active_minutes: Math.round((util / 100) * 60),
            status: util > 70 ? 'active' : util > 20 ? 'idle' : 'idle',
          });
        }
      }
      const { error } = await sb.from('asset_utilization_heatmap').upsert(rows, { onConflict: 'asset_id,equipment_id,day_date,hour_of_day' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-util-heatmap'] }); toast.success('Demo data generated'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, generateDemo };
}
