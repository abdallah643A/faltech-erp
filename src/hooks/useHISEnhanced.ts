import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';

const upsertFactory = (table: string, key: string) => () => {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec, company_id: rec.company_id || activeCompanyId };
      const { data, error } = await (supabase as any).from(table).upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [key] }); toast.success('Saved'); },
    onError: (e: any) => toast.error(e.message),
  });
};

const listFactory = (table: string, key: string, order = 'created_at') => () => {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: [key, activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from(table).select('*').order(order, { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
};

// Patients
export function usePatients() {
  const list = listFactory('his_patients', 'his_patients', 'created_at')();
  const upsert = upsertFactory('his_patients', 'his_patients')();
  return { ...list, upsert };
}

// Triage
export function useTriageAssessments() {
  const list = listFactory('his_triage_assessments', 'his_triage', 'arrival_time')();
  const upsert = upsertFactory('his_triage_assessments', 'his_triage')();
  return { ...list, upsert };
}

// Physician Orders
export function usePhysicianOrders() {
  const list = listFactory('his_physician_orders', 'his_orders', 'created_at')();
  const upsert = upsertFactory('his_physician_orders', 'his_orders')();
  return { ...list, upsert };
}

// Nursing Notes
export function useNursingNotes() {
  const list = listFactory('his_nursing_notes', 'his_nursing', 'created_at')();
  const upsert = upsertFactory('his_nursing_notes', 'his_nursing')();
  return { ...list, upsert };
}

// Insurance Preauthorization
export function useInsurancePreauth() {
  const list = listFactory('his_insurance_preauth', 'his_preauth', 'created_at')();
  const upsert = upsertFactory('his_insurance_preauth', 'his_preauth')();
  return { ...list, upsert };
}

// Discharge Plans
export function useDischargePlans() {
  const list = listFactory('his_discharge_plans', 'his_discharge', 'created_at')();
  const upsert = upsertFactory('his_discharge_plans', 'his_discharge')();
  return { ...list, upsert };
}

// Medical Bills
export function useMedicalBills() {
  const list = listFactory('his_medical_bills', 'his_bills', 'bill_date')();
  const upsert = upsertFactory('his_medical_bills', 'his_bills')();
  return { ...list, upsert };
}

// Patient Communications
export function usePatientCommunications() {
  const list = listFactory('his_patient_communications', 'his_comms', 'created_at')();
  const upsert = upsertFactory('his_patient_communications', 'his_comms')();
  return { ...list, upsert };
}

// Interop Endpoints
export function useInteropEndpoints() {
  const list = listFactory('his_interop_endpoints', 'his_interop', 'created_at')();
  const upsert = upsertFactory('his_interop_endpoints', 'his_interop')();
  return { ...list, upsert };
}

// KPI Snapshots
export function useHISKPISnapshots() {
  const list = listFactory('his_kpi_snapshots', 'his_kpi', 'snapshot_date')();
  const upsert = upsertFactory('his_kpi_snapshots', 'his_kpi')();
  return { ...list, upsert };
}

// Medical Record Audit Log (read-only utility)
export function useMedicalRecordAudit(patientId?: string) {
  return useQuery({
    queryKey: ['his_audit', patientId],
    queryFn: async () => {
      let q = (supabase as any).from('his_medical_record_audit').select('*').order('created_at', { ascending: false }).limit(200);
      if (patientId) q = q.eq('patient_id', patientId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });
}
