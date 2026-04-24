import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NeonatalRecord {
  id: string;
  baby_patient_id: string;
  mother_patient_id: string | null;
  mother_mrn: string | null;
  mother_name: string | null;
  birth_time: string | null;
  gestational_age_weeks: number | null;
  birth_weight_grams: number | null;
  delivery_type: 'vaginal' | 'c_section' | 'assisted' | 'other' | null;
  apgar_1min: number | null;
  apgar_5min: number | null;
  apgar_10min: number | null;
  resuscitation_required: boolean;
  complications: string | null;
  notes: string | null;
  created_at: string;
}

export const useNeonatalRecord = (babyPatientId?: string) =>
  useQuery({
    queryKey: ['hosp-neonatal', babyPatientId],
    enabled: !!babyPatientId,
    queryFn: async () => {
      const sb: any = supabase;
      const { data, error } = await sb
        .from('hosp_neonatal_records')
        .select('*')
        .eq('baby_patient_id', babyPatientId)
        .maybeSingle();
      if (error) throw error;
      return data as NeonatalRecord | null;
    },
  });

export const useBabiesOfMother = (motherPatientId?: string) =>
  useQuery({
    queryKey: ['hosp-neonatal-babies', motherPatientId],
    enabled: !!motherPatientId,
    queryFn: async () => {
      const sb: any = supabase;
      const { data, error } = await sb
        .from('hosp_neonatal_records')
        .select('*, baby:hosp_patients!hosp_neonatal_records_baby_patient_id_fkey(id,mrn,first_name,last_name,date_of_birth,gender)')
        .eq('mother_patient_id', motherPatientId)
        .order('birth_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

export const useUpsertNeonatalRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<NeonatalRecord> & { baby_patient_id: string }) => {
      const sb: any = supabase;
      const { data, error } = await sb
        .from('hosp_neonatal_records')
        .upsert(payload, { onConflict: 'baby_patient_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['hosp-neonatal', vars.baby_patient_id] });
      qc.invalidateQueries({ queryKey: ['hosp-neonatal-babies'] });
      qc.invalidateQueries({ queryKey: ['hosp-patient-timeline'] });
      toast.success('Neonatal record saved');
    },
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });
};
