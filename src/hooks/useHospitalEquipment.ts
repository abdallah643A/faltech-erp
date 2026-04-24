import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HospEquipment {
  id: string;
  asset_code: string | null;
  name: string;
  category: string;
  modality: string | null;
  location_type: string | null;
  location_id: string | null;
  fixed_asset_id: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  status: 'available' | 'in_use' | 'maintenance' | 'down' | 'retired';
  last_maintenance_at: string | null;
  next_maintenance_due: string | null;
  calibration_due: string | null;
  notes: string | null;
}

export interface HospEquipmentDowntime {
  id: string;
  equipment_id: string;
  reason: string;
  severity: 'planned' | 'unplanned' | 'critical';
  starts_at: string;
  ends_at: string | null;
  description: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  work_order_ref: string | null;
}

export const useHospEquipment = (filters?: { category?: string; status?: string }) =>
  useQuery({
    queryKey: ['hosp-equipment', filters],
    queryFn: async () => {
      let q = (supabase as any).from('hosp_equipment').select('*').order('name');
      if (filters?.category) q = q.eq('category', filters.category);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as HospEquipment[];
    },
  });

export const useEquipmentDowntime = (equipmentId?: string) =>
  useQuery({
    queryKey: ['hosp-equipment-downtime', equipmentId],
    enabled: !!equipmentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('hosp_equipment_downtime')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('starts_at', { ascending: false });
      if (error) throw error;
      return (data || []) as HospEquipmentDowntime[];
    },
  });

export const useActiveDowntime = () =>
  useQuery({
    queryKey: ['hosp-equipment-downtime-active'],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from('hosp_equipment_downtime')
        .select('*, equipment:hosp_equipment(id,name,category,modality)')
        .is('resolved_at', null)
        .lte('starts_at', nowIso)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order('severity', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 60_000,
  });

export const useUpsertEquipment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<HospEquipment> & { id?: string }) => {
      const { error } = await (supabase as any).from('hosp_equipment').upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-equipment'] });
      toast.success('Equipment saved');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });
};

export const useReportDowntime = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<HospEquipmentDowntime>) => {
      const { error } = await (supabase as any).from('hosp_equipment_downtime').insert({
        ...payload,
        starts_at: payload.starts_at || new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-equipment'] });
      qc.invalidateQueries({ queryKey: ['hosp-equipment-downtime'] });
      qc.invalidateQueries({ queryKey: ['hosp-equipment-downtime-active'] });
      toast.success('Downtime reported');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });
};

export const useResolveDowntime = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolution_notes }: { id: string; resolution_notes?: string }) => {
      const nowIso = new Date().toISOString();
      const { error } = await (supabase as any)
        .from('hosp_equipment_downtime')
        .update({ resolved_at: nowIso, ends_at: nowIso, resolution_notes })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-equipment'] });
      qc.invalidateQueries({ queryKey: ['hosp-equipment-downtime'] });
      qc.invalidateQueries({ queryKey: ['hosp-equipment-downtime-active'] });
      toast.success('Downtime resolved');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });
};

/**
 * Calls the DB function to check whether a piece of equipment is free for a window.
 * Returns { available, conflict_reason, conflict_severity }.
 */
export async function checkEquipmentAvailability(
  equipmentId: string,
  startIso: string,
  endIso: string
): Promise<{ available: boolean; conflict_reason: string | null; conflict_severity: string | null }> {
  const { data, error } = await (supabase as any).rpc('hosp_equipment_check_availability', {
    p_equipment_id: equipmentId,
    p_start: startIso,
    p_end: endIso,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row || { available: true, conflict_reason: null, conflict_severity: null };
}
