// Phase 3 hospital ↔ ERP integration hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Patient timeline (RPC) ─────────────────────────────
export interface TimelineEvent {
  event_at: string;
  event_type: string;
  event_category: string;
  title: string;
  subtitle?: string | null;
  reference_id: string;
  encounter_id: string | null;
  meta: Record<string, any>;
}

export const usePatientTimeline = (patientId?: string) =>
  useQuery({
    queryKey: ['hosp-patient-timeline', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const sb: any = supabase;
      const { data, error } = await sb.rpc('hosp_patient_timeline', { p_patient_id: patientId });
      if (error) throw error;
      return (data || []) as TimelineEvent[];
    },
  });

// ── Stock alerts ───────────────────────────────────────
export const useHospStockAlerts = (status?: string) =>
  useQuery({
    queryKey: ['hosp-stock-alerts', status],
    queryFn: async () => {
      const sb: any = supabase;
      let q = sb.from('hosp_stock_alerts').select('*').order('created_at', { ascending: false }).limit(200);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useCreateMRFromAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const sb: any = supabase;
      const { data, error } = await sb.rpc('hosp_create_mr_from_alert', { p_alert_id: alertId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (mrId) => {
      qc.invalidateQueries({ queryKey: ['hosp-stock-alerts'] });
      toast.success('Material Request created from alert');
      return mrId;
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create MR'),
  });
};

export const useAcknowledgeAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const sb: any = supabase;
      const { error } = await sb.from('hosp_stock_alerts').update({ status: 'acknowledged' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-stock-alerts'] });
      toast.success('Alert acknowledged');
    },
  });
};

// ── Nursing tasks ──────────────────────────────────────
export const useNursingTasks = (filters?: { encounterId?: string; status?: string; wardId?: string }) =>
  useQuery({
    queryKey: ['hosp-nursing-tasks', filters],
    queryFn: async () => {
      const sb: any = supabase;
      let q = sb.from('hosp_nursing_tasks')
        .select('*, patient:hosp_patients(id,mrn,first_name,last_name), bed:hosp_beds(id,bed_no)')
        .order('scheduled_at', { ascending: true }).limit(300);
      if (filters?.encounterId) q = q.eq('encounter_id', filters.encounterId);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.wardId) q = q.eq('ward_id', filters.wardId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useCreateNursingTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const sb: any = supabase;
      const { error } = await sb.from('hosp_nursing_tasks').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-nursing-tasks'] });
      toast.success('Task created');
    },
  });
};

export const useCompleteNursingTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const sb: any = supabase;
      const { error } = await sb.from('hosp_nursing_tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-nursing-tasks'] });
      toast.success('Task completed');
    },
  });
};

// ── Surgery consumables ────────────────────────────────
export const useSurgeryConsumables = (surgeryId?: string) =>
  useQuery({
    queryKey: ['hosp-surg-cons', surgeryId],
    enabled: !!surgeryId,
    queryFn: async () => {
      const sb: any = supabase;
      const { data, error } = await sb.from('hosp_surgery_consumables').select('*').eq('surgery_id', surgeryId).order('used_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

export const useAddSurgeryConsumable = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const sb: any = supabase;
      const { error } = await sb.from('hosp_surgery_consumables').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-surg-cons'] });
      qc.invalidateQueries({ queryKey: ['hosp-charges'] });
      toast.success('Consumable recorded — stock issued & billed');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });
};

// ── Discharge checklist ────────────────────────────────
export const useDischargeChecklist = (dischargeId?: string) =>
  useQuery({
    queryKey: ['hosp-disc-chk', dischargeId],
    enabled: !!dischargeId,
    queryFn: async () => {
      const sb: any = supabase;
      const { data, error } = await sb.from('hosp_discharge_checklist').select('*').eq('discharge_id', dischargeId).order('created_at');
      if (error) throw error;
      return data || [];
    },
  });

export const useToggleChecklistItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isDone, notes }: { id: string; isDone: boolean; notes?: string }) => {
      const sb: any = supabase;
      const { error } = await sb.from('hosp_discharge_checklist').update({
        is_done: isDone,
        done_at: isDone ? new Date().toISOString() : null,
        notes,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-disc-chk'] });
    },
  });
};

// ── Items linked to pharmacy/medical use (for autocomplete) ──
export const useMedicalItems = (search?: string) =>
  useQuery({
    queryKey: ['hosp-med-items', search],
    queryFn: async () => {
      let q = supabase.from('items').select('id,item_code,description,uom,in_stock,reorder_point,default_price,warehouse,item_group').eq('status', 'active').order('description').limit(100);
      if (search) q = q.or(`item_code.ilike.%${search}%,description.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
