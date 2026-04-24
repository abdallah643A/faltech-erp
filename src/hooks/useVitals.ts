import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VitalsSnapshot {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  bed_id: string | null;
  recorded_at: string;
  source: string;
  device_label: string | null;
  hr: number | null;
  sbp: number | null;
  dbp: number | null;
  map: number | null;
  spo2: number | null;
  rr: number | null;
  temp_c: number | null;
  etco2: number | null;
  fio2: number | null;
  pain_score: number | null;
  gcs: number | null;
  is_critical: boolean;
  critical_reasons: string[] | null;
  notes: string | null;
}

export const useVitalsSnapshots = (patientId?: string, hours = 24) =>
  useQuery({
    queryKey: ['hosp-vitals', patientId, hours],
    enabled: !!patientId,
    refetchInterval: 30_000, // live monitor refresh
    queryFn: async () => {
      const since = new Date(Date.now() - hours * 3_600_000).toISOString();
      const sb: any = supabase;
      const { data, error } = await sb
        .from('hosp_vitals_snapshots')
        .select('*')
        .eq('patient_id', patientId)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as VitalsSnapshot[];
    },
  });

export const useLatestVitals = (patientId?: string) =>
  useQuery({
    queryKey: ['hosp-vitals-latest', patientId],
    enabled: !!patientId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const sb: any = supabase;
      const { data, error } = await sb
        .from('hosp_vitals_snapshots')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as VitalsSnapshot | null;
    },
  });

export const useRecordVitals = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<VitalsSnapshot> & { patient_id: string }) => {
      const sb: any = supabase;
      const { error } = await sb.from('hosp_vitals_snapshots').insert(payload);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['hosp-vitals', vars.patient_id] });
      qc.invalidateQueries({ queryKey: ['hosp-vitals-latest', vars.patient_id] });
      qc.invalidateQueries({ queryKey: ['hosp-patient-timeline', vars.patient_id] });
      toast.success('Vitals recorded');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });
};
