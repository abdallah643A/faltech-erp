import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PatientStatus =
  | 'registered' | 'waiting' | 'in_consultation' | 'in_triage'
  | 'admitted' | 'in_surgery' | 'in_recovery' | 'in_icu'
  | 'in_nicu' | 'in_ward' | 'transfer_pending'
  | 'discharge_pending' | 'discharged' | 'cancelled' | 'deceased';

export interface HospPatient {
  id: string; mrn: string;
  first_name: string; last_name: string; full_name_ar?: string | null;
  gender?: string | null; date_of_birth?: string | null;
  national_id?: string | null; passport_no?: string | null;
  nationality?: string | null; blood_group?: string | null;
  phone?: string | null; email?: string | null; address?: string | null;
  emergency_contact_name?: string | null; emergency_contact_phone?: string | null;
  insurance_provider?: string | null; insurance_policy_no?: string | null;
  insurance_expiry?: string | null;
  allergies?: string[] | null; chronic_conditions?: string[] | null;
  is_vip?: boolean; is_deceased?: boolean;
  created_at: string;
}

export interface HospEncounter {
  id: string; encounter_no: string;
  patient_id: string; encounter_type: string; status: string;
  department?: string | null; doctor_name?: string | null;
  arrival_time?: string | null; chief_complaint?: string | null;
  visit_priority?: string | null; is_admitted?: boolean;
  total_charges?: number | null;
  insurance_payer?: string | null;
  current_ward_id?: string | null; current_bed_id?: string | null;
  created_at: string;
}

export interface HospBed {
  id: string; bed_no: string; ward_id: string; room_id?: string | null;
  status: string; current_patient_id?: string | null;
  current_encounter_id?: string | null; is_active: boolean;
  notes?: string | null;
}

export interface HospWard {
  id: string; code?: string | null; name: string;
  ward_type?: string | null; floor?: string | null;
  building?: string | null; total_beds?: number | null;
  is_active: boolean;
}

// ── Patients ────────────────────────────────────────
export const useHospPatients = (search?: string) =>
  useQuery({
    queryKey: ['hosp-patients', search],
    queryFn: async () => {
      let q = supabase.from('hosp_patients').select('*').order('created_at', { ascending: false }).limit(500);
      if (search) {
        q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,mrn.ilike.%${search}%,phone.ilike.%${search}%,national_id.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as HospPatient[];
    },
  });

export const useHospPatient = (id?: string) =>
  useQuery({
    queryKey: ['hosp-patient', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('hosp_patients').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as HospPatient | null;
    },
  });

export const useCreatePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<HospPatient>) => {
      const { data, error } = await supabase.from('hosp_patients').insert(payload as any).select().single();
      if (error) throw error;
      return data as HospPatient;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['hosp-patients'] });
      toast.success(`Patient registered — MRN ${p.mrn}`);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to register patient'),
  });
};

// ── Encounters ──────────────────────────────────────
export const useHospEncounters = (filters?: { status?: string; type?: string; patient_id?: string; department?: string }) =>
  useQuery({
    queryKey: ['hosp-encounters', filters],
    queryFn: async () => {
      let q = supabase.from('hosp_encounters').select('*, patient:hosp_patients(id, mrn, first_name, last_name, gender, date_of_birth)')
        .order('created_at', { ascending: false }).limit(500);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.type) q = q.eq('encounter_type', filters.type);
      if (filters?.patient_id) q = q.eq('patient_id', filters.patient_id);
      if (filters?.department) q = q.eq('department', filters.department);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

export const useCreateEncounter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<HospEncounter>) => {
      const { data, error } = await supabase.from('hosp_encounters').insert({
        arrival_time: new Date().toISOString(),
        status: 'registered',
        ...payload,
      } as any).select().single();
      if (error) throw error;
      return data as HospEncounter;
    },
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: ['hosp-encounters'] });
      qc.invalidateQueries({ queryKey: ['hosp-dashboard'] });
      toast.success(`Encounter ${e.encounter_no} created`);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create encounter'),
  });
};

export const useUpdateEncounterStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, extra }: { id: string; status: string; extra?: Record<string, any> }) => {
      const { error } = await supabase.from('hosp_encounters').update({ status, ...(extra || {}) }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-encounters'] });
      qc.invalidateQueries({ queryKey: ['hosp-dashboard'] });
      toast.success('Status updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update'),
  });
};

// ── Beds & Wards ────────────────────────────────────
export const useHospWards = () =>
  useQuery({
    queryKey: ['hosp-wards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hosp_wards').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return (data || []) as HospWard[];
    },
  });

export const useHospBeds = (wardId?: string) =>
  useQuery({
    queryKey: ['hosp-beds', wardId],
    queryFn: async () => {
      let q = supabase.from('hosp_beds').select('*, ward:hosp_wards(id, name, ward_type)').eq('is_active', true).order('bed_no');
      if (wardId) q = q.eq('ward_id', wardId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

export const useAssignBed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bedId, patientId, encounterId, admissionId }:
      { bedId: string; patientId: string; encounterId: string; admissionId?: string | null }) => {
      const { error } = await supabase.from('hosp_bed_assignments').insert({
        bed_id: bedId, patient_id: patientId, encounter_id: encounterId,
        admission_id: admissionId || null, reason: 'admission',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-beds'] });
      qc.invalidateQueries({ queryKey: ['hosp-admissions'] });
      qc.invalidateQueries({ queryKey: ['hosp-dashboard'] });
      toast.success('Bed assigned');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to assign bed'),
  });
};

export const useReleaseBed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bedId: string) => {
      const { error } = await supabase.from('hosp_bed_assignments').update({ released_at: new Date().toISOString() })
        .eq('bed_id', bedId).is('released_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-beds'] });
      qc.invalidateQueries({ queryKey: ['hosp-dashboard'] });
      toast.success('Bed released');
    },
  });
};

// ── Admissions ──────────────────────────────────────
export const useHospAdmissions = (status?: string) =>
  useQuery({
    queryKey: ['hosp-admissions', status],
    queryFn: async () => {
      let q = supabase.from('hosp_admissions').select('*, patient:hosp_patients(id,mrn,first_name,last_name), bed:hosp_beds(id,bed_no), ward:hosp_wards(id,name)')
        .order('admitted_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

export const useCreateAdmission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('hosp_admissions').insert(payload).select().single();
      if (error) throw error;
      // Mark encounter as admitted
      if (payload.encounter_id) {
        await supabase.from('hosp_encounters').update({
          status: 'admitted', is_admitted: true,
          current_ward_id: payload.current_ward_id,
          current_bed_id: payload.current_bed_id,
        }).eq('id', payload.encounter_id);
      }
      return data;
    },
    onSuccess: (a: any) => {
      qc.invalidateQueries({ queryKey: ['hosp-admissions'] });
      qc.invalidateQueries({ queryKey: ['hosp-encounters'] });
      qc.invalidateQueries({ queryKey: ['hosp-beds'] });
      qc.invalidateQueries({ queryKey: ['hosp-dashboard'] });
      toast.success(`Admission ${a.admission_no} created`);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to admit'),
  });
};

// ── Triage / Vitals ─────────────────────────────────
export const useHospTriage = (encounterId?: string) =>
  useQuery({
    queryKey: ['hosp-triage', encounterId],
    enabled: !!encounterId,
    queryFn: async () => {
      const { data, error } = await supabase.from('hosp_triage').select('*').eq('encounter_id', encounterId!).order('triaged_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

export const useCreateTriage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('hosp_triage').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars: any) => {
      qc.invalidateQueries({ queryKey: ['hosp-triage'] });
      qc.invalidateQueries({ queryKey: ['hosp-encounters'] });
      if (vars.encounter_id) {
        supabase.from('hosp_encounters').update({
          status: 'in_triage', triage_time: new Date().toISOString(),
          visit_priority: vars.triage_level <= 2 ? 'critical' : vars.triage_level === 3 ? 'urgent' : 'standard',
        }).eq('id', vars.encounter_id).then(() => qc.invalidateQueries({ queryKey: ['hosp-encounters'] }));
      }
      toast.success('Triage recorded');
    },
  });
};

export const useHospVitals = (encounterId?: string) =>
  useQuery({
    queryKey: ['hosp-vitals', encounterId],
    enabled: !!encounterId,
    queryFn: async () => {
      const { data, error } = await supabase.from('hosp_vitals').select('*').eq('encounter_id', encounterId!).order('recorded_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

// ── Clinical Notes / Diagnoses ──────────────────────
export const useHospNotes = (encounterId?: string) =>
  useQuery({
    queryKey: ['hosp-notes', encounterId],
    enabled: !!encounterId,
    queryFn: async () => {
      const { data, error } = await supabase.from('hosp_clinical_notes').select('*').eq('encounter_id', encounterId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

export const useAddNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from('hosp_clinical_notes').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-notes'] });
      toast.success('Note added');
    },
  });
};

export const useHospDiagnoses = (encounterId?: string) =>
  useQuery({
    queryKey: ['hosp-diagnoses', encounterId],
    enabled: !!encounterId,
    queryFn: async () => {
      const { data, error } = await supabase.from('hosp_diagnoses').select('*').eq('encounter_id', encounterId!).order('diagnosed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

// ── Medications / Pharmacy ──────────────────────────
export const useHospMedicationOrders = (filters?: { encounterId?: string; status?: string }) =>
  useQuery({
    queryKey: ['hosp-med-orders', filters],
    queryFn: async () => {
      let q = supabase.from('hosp_medication_orders')
        .select('*, patient:hosp_patients(id,mrn,first_name,last_name), lines:hosp_medication_order_lines(*)')
        .order('prescribed_at', { ascending: false }).limit(200);
      if (filters?.encounterId) q = q.eq('encounter_id', filters.encounterId);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

export const useCreatePrescription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ order, lines }: { order: any; lines: any[] }) => {
      const { data: ord, error } = await supabase.from('hosp_medication_orders').insert(order).select().single();
      if (error) throw error;
      if (lines.length) {
        const { error: lerr } = await supabase.from('hosp_medication_order_lines').insert(
          lines.map((l, i) => ({ ...l, order_id: ord.id, line_no: i + 1 }))
        );
        if (lerr) throw lerr;
      }
      return ord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-med-orders'] });
      qc.invalidateQueries({ queryKey: ['hosp-dashboard'] });
      toast.success('Prescription created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to prescribe'),
  });
};

export const useDispenseMedication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderLineId, qty }: { orderLineId: string; qty: number }) => {
      // Fetch line
      const { data: line, error: lerr } = await supabase.from('hosp_medication_order_lines').select('*, order:hosp_medication_orders(*)').eq('id', orderLineId).single();
      if (lerr) throw lerr;
      const dispensed = (line.dispensed_qty || 0) + qty;
      const status = dispensed >= (line.quantity || 0) ? 'dispensed' : 'partial';
      const { error: derr } = await supabase.from('hosp_pharmacy_dispenses').insert({
        order_line_id: orderLineId,
        order_id: line.order_id,
        encounter_id: (line as any).order?.encounter_id,
        patient_id: (line as any).order?.patient_id,
        qty, unit_price: line.unit_price || 0, total: (line.unit_price || 0) * qty,
        dispensed_at: new Date().toISOString(),
      });
      if (derr) throw derr;
      const { error: uerr } = await supabase.from('hosp_medication_order_lines').update({ dispensed_qty: dispensed, status }).eq('id', orderLineId);
      if (uerr) throw uerr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-med-orders'] });
      qc.invalidateQueries({ queryKey: ['hosp-dashboard'] });
      toast.success('Medication dispensed');
    },
    onError: (e: any) => toast.error(e.message || 'Dispense failed'),
  });
};

// ── Charges & Billing ───────────────────────────────
export const useChargeItems = () =>
  useQuery({
    queryKey: ['hosp-charge-items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hosp_charge_items').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data || [];
    },
  });

export const useEncounterCharges = (encounterId?: string) =>
  useQuery({
    queryKey: ['hosp-charges', encounterId],
    enabled: !!encounterId,
    queryFn: async () => {
      const { data, error } = await supabase.from('hosp_encounter_charges').select('*').eq('encounter_id', encounterId!).order('charged_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

export const useAddCharge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const amount = (payload.qty || 1) * (payload.unit_price || 0) * (1 - (payload.discount_pct || 0) / 100);
      const { error } = await supabase.from('hosp_encounter_charges').insert({ ...payload, amount, charged_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-charges'] });
      qc.invalidateQueries({ queryKey: ['hosp-encounters'] });
      qc.invalidateQueries({ queryKey: ['hosp-invoices'] });
      toast.success('Charge added');
    },
  });
};

export const useHospInvoices = (filters?: { status?: string; patient_id?: string }) =>
  useQuery({
    queryKey: ['hosp-invoices', filters],
    queryFn: async () => {
      let q = supabase.from('hosp_invoices').select('*, patient:hosp_patients(id,mrn,first_name,last_name)').order('created_at', { ascending: false }).limit(200);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.patient_id) q = q.eq('patient_id', filters.patient_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

export const useGenerateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ encounterId, patientId }: { encounterId: string; patientId: string }) => {
      // Get unbilled charges
      const { data: charges, error: cerr } = await supabase.from('hosp_encounter_charges')
        .select('*').eq('encounter_id', encounterId).is('invoice_id', null);
      if (cerr) throw cerr;
      const subtotal = (charges || []).reduce((s, c: any) => s + Number(c.amount || 0), 0);
      const { data: inv, error } = await supabase.from('hosp_invoices').insert({
        encounter_id: encounterId, patient_id: patientId,
        subtotal, total: subtotal, balance: subtotal,
        invoice_date: new Date().toISOString().slice(0, 10),
        status: 'open',
      } as any).select().single();
      if (error) throw error;
      if (charges?.length) {
        await supabase.from('hosp_encounter_charges').update({ invoice_id: inv.id }).in('id', charges.map((c: any) => c.id));
      }
      return inv;
    },
    onSuccess: (i: any) => {
      qc.invalidateQueries({ queryKey: ['hosp-invoices'] });
      qc.invalidateQueries({ queryKey: ['hosp-charges'] });
      toast.success(`Invoice ${i.invoice_no} generated`);
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });
};

export const useRecordPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from('hosp_payments').insert({ ...payload, paid_at: new Date().toISOString() });
      if (error) throw error;
      // Update invoice
      if (payload.invoice_id) {
        const { data: inv } = await supabase.from('hosp_invoices').select('paid_amount,total').eq('id', payload.invoice_id).single();
        if (inv) {
          const newPaid = Number(inv.paid_amount || 0) + Number(payload.amount || 0);
          const balance = Number(inv.total || 0) - newPaid;
          await supabase.from('hosp_invoices').update({
            paid_amount: newPaid, balance,
            status: balance <= 0 ? 'paid' : 'partial',
          }).eq('id', payload.invoice_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-invoices'] });
      qc.invalidateQueries({ queryKey: ['hosp-payments'] });
      toast.success('Payment recorded');
    },
  });
};

// ── Discharge ───────────────────────────────────────
export const useHospDischarges = (status?: string) =>
  useQuery({
    queryKey: ['hosp-discharges', status],
    queryFn: async () => {
      let q = supabase.from('hosp_discharges')
        .select('*, patient:hosp_patients(id,mrn,first_name,last_name)')
        .order('initiated_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

export const useInitiateDischarge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('hosp_discharges').insert({
        initiated_at: new Date().toISOString(),
        status: 'in_progress',
        ...payload,
      }).select().single();
      if (error) throw error;
      if (payload.encounter_id) {
        await supabase.from('hosp_encounters').update({ status: 'discharge_pending' }).eq('id', payload.encounter_id);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-discharges'] });
      qc.invalidateQueries({ queryKey: ['hosp-encounters'] });
      qc.invalidateQueries({ queryKey: ['hosp-dashboard'] });
      toast.success('Discharge initiated');
    },
  });
};

export const useUpdateDischarge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from('hosp_discharges').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-discharges'] });
      toast.success('Updated');
    },
  });
};

export const useFinalizeDischarge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dischargeId, encounterId, bedId }: { dischargeId: string; encounterId: string; bedId?: string | null }) => {
      const { error } = await supabase.from('hosp_discharges').update({
        status: 'completed',
        finalized_at: new Date().toISOString(),
      }).eq('id', dischargeId);
      if (error) throw error;
      await supabase.from('hosp_encounters').update({
        status: 'discharged', discharge_time: new Date().toISOString(), is_admitted: false,
      }).eq('id', encounterId);
      await supabase.from('hosp_admissions').update({
        status: 'discharged', actual_discharge: new Date().toISOString(),
      }).eq('encounter_id', encounterId);
      if (bedId) {
        await supabase.from('hosp_bed_assignments').update({ released_at: new Date().toISOString() })
          .eq('bed_id', bedId).is('released_at', null);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-discharges'] });
      qc.invalidateQueries({ queryKey: ['hosp-encounters'] });
      qc.invalidateQueries({ queryKey: ['hosp-admissions'] });
      qc.invalidateQueries({ queryKey: ['hosp-beds'] });
      qc.invalidateQueries({ queryKey: ['hosp-dashboard'] });
      toast.success('Discharge finalized');
    },
    onError: (e: any) => toast.error(e.message || 'Finalize failed'),
  });
};

// ── Dashboard Aggregates ────────────────────────────
export const useHospDashboard = () =>
  useQuery({
    queryKey: ['hosp-dashboard'],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      const [patientsToday, encActive, beds, admissions, medsPending, dischargesPending, invoicesOpen] = await Promise.all([
        supabase.from('hosp_patients').select('id', { count: 'exact', head: true }).gte('created_at', todayIso),
        supabase.from('hosp_encounters').select('id, status, encounter_type, visit_priority, department').not('status', 'in', '(discharged,cancelled)'),
        supabase.from('hosp_beds').select('id, status, ward_id').eq('is_active', true),
        supabase.from('hosp_admissions').select('id, status').eq('status', 'admitted'),
        supabase.from('hosp_medication_orders').select('id, status').in('status', ['ordered', 'partial']),
        supabase.from('hosp_discharges').select('id, status').eq('status', 'in_progress'),
        supabase.from('hosp_invoices').select('balance, status').neq('status', 'paid'),
      ]);
      const enc = encActive.data || [];
      const bd = beds.data || [];
      const inv = invoicesOpen.data || [];
      return {
        patientsToday: patientsToday.count || 0,
        waiting: enc.filter((e: any) => e.status === 'waiting' || e.status === 'registered').length,
        inConsultation: enc.filter((e: any) => e.status === 'in_consultation').length,
        erQueue: enc.filter((e: any) => e.encounter_type === 'er').length,
        criticalEr: enc.filter((e: any) => e.encounter_type === 'er' && e.visit_priority === 'critical').length,
        admitted: (admissions.data || []).length,
        bedsTotal: bd.length,
        bedsOccupied: bd.filter((b: any) => b.status === 'occupied').length,
        bedsAvailable: bd.filter((b: any) => b.status === 'available').length,
        bedsCleaning: bd.filter((b: any) => b.status === 'cleaning').length,
        pendingPrescriptions: (medsPending.data || []).length,
        dischargesPending: (dischargesPending.data || []).length,
        outstanding: inv.reduce((s: number, i: any) => s + Number(i.balance || 0), 0),
        invoicesOpen: inv.length,
      };
    },
    refetchInterval: 30_000,
  });

// ═══════════ PHASE 2: OR / ICU / NICU / Lab / Radiology / Insurance ═══════════

// ── Surgeries (OR) ──────────────────────────────────
export const useHospSurgeries = (status?: string) =>
  useQuery({
    queryKey: ['hosp-surgeries', status],
    queryFn: async () => {
      let q = supabase.from('hosp_surgeries')
        .select('*, patient:hosp_patients(id,mrn,first_name,last_name), encounter:hosp_encounters(id,encounter_no)')
        .order('scheduled_at', { ascending: true });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useCreateSurgery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const surgery_no = `SUR-${Date.now().toString().slice(-8)}`;
      const { data, error } = await supabase.from('hosp_surgeries').insert({ ...payload, surgery_no, status: payload.status || 'scheduled' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-surgeries'] });
      toast.success('Surgery scheduled');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to schedule'),
  });
};

export const useUpdateSurgery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { error } = await supabase.from('hosp_surgeries').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-surgeries'] });
      toast.success('Surgery updated');
    },
  });
};

// ── ICU / NICU (filtered admissions/wards) ──────────
export const useHospCriticalCare = (wardType: 'icu' | 'nicu') =>
  useQuery({
    queryKey: ['hosp-critical-care', wardType],
    queryFn: async () => {
      const sb: any = supabase;
      const { data: wards, error: wErr } = await sb.from('hosp_wards').select('*').eq('ward_type', wardType).eq('is_active', true);
      if (wErr) throw wErr;
      const wardIds = (wards || []).map((w: any) => w.id);
      if (!wardIds.length) return { wards: [], beds: [], admissions: [] };

      const bedsR = await sb.from('hosp_beds').select('*, ward:hosp_wards(id,name,ward_type)').in('ward_id', wardIds).eq('is_active', true).order('bed_no');
      const admR = await sb.from('hosp_admissions')
        .select('*, patient:hosp_patients(id,mrn,first_name,last_name,date_of_birth,gender), bed:hosp_beds(id,bed_no), ward:hosp_wards(id,name,ward_type)')
        .in('ward_id', wardIds).eq('status', 'admitted');
      return { wards: wards || [], beds: bedsR.data || [], admissions: admR.data || [] };
    },
    refetchInterval: 30_000,
  });

// ── Lab Orders ──────────────────────────────────────
export const useHospLabOrders = (filters?: { status?: string; encounter_id?: string; patient_id?: string }) =>
  useQuery({
    queryKey: ['hosp-lab-orders', filters],
    queryFn: async () => {
      let q = supabase.from('hosp_lab_orders')
        .select('*, patient:hosp_patients(id,mrn,first_name,last_name), encounter:hosp_encounters(id,encounter_no,department)')
        .order('ordered_at', { ascending: false }).limit(500);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.encounter_id) q = q.eq('encounter_id', filters.encounter_id);
      if (filters?.patient_id) q = q.eq('patient_id', filters.patient_id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useCreateLabOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const order_no = `LAB-${Date.now().toString().slice(-8)}`;
      const { data, error } = await supabase.from('hosp_lab_orders').insert({ ...payload, order_no, status: 'ordered', ordered_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-lab-orders'] });
      toast.success('Lab order placed');
    },
    onError: (e: any) => toast.error(e.message || 'Order failed'),
  });
};

export const useUpdateLabOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      if (patch.result_text || patch.result_value) {
        patch.result_at = patch.result_at || new Date().toISOString();
        patch.status = patch.status || 'completed';
      }
      const { error } = await supabase.from('hosp_lab_orders').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-lab-orders'] });
      toast.success('Lab order updated');
    },
  });
};

// ── Radiology Orders ────────────────────────────────
export const useHospRadiologyOrders = (filters?: { status?: string; encounter_id?: string; patient_id?: string }) =>
  useQuery({
    queryKey: ['hosp-radiology-orders', filters],
    queryFn: async () => {
      let q = supabase.from('hosp_radiology_orders')
        .select('*, patient:hosp_patients(id,mrn,first_name,last_name), encounter:hosp_encounters(id,encounter_no,department)')
        .order('ordered_at', { ascending: false }).limit(500);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.encounter_id) q = q.eq('encounter_id', filters.encounter_id);
      if (filters?.patient_id) q = q.eq('patient_id', filters.patient_id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useCreateRadiologyOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const order_no = `RAD-${Date.now().toString().slice(-8)}`;
      const { data, error } = await supabase.from('hosp_radiology_orders').insert({ ...payload, order_no, status: 'ordered', ordered_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-radiology-orders'] });
      toast.success('Radiology order placed');
    },
  });
};

export const useUpdateRadiologyOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      if (patch.report_text) {
        patch.reported_at = patch.reported_at || new Date().toISOString();
        patch.status = patch.status || 'reported';
      }
      const { error } = await supabase.from('hosp_radiology_orders').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-radiology-orders'] });
      toast.success('Radiology updated');
    },
  });
};

// ── Insurance Approvals ─────────────────────────────
export const useHospInsuranceApprovals = (status?: string) =>
  useQuery({
    queryKey: ['hosp-insurance', status],
    queryFn: async () => {
      let q = supabase.from('hosp_insurance_approvals')
        .select('*, patient:hosp_patients(id,mrn,first_name,last_name), encounter:hosp_encounters(id,encounter_no,department)')
        .order('requested_at', { ascending: false }).limit(500);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useCreateInsuranceRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('hosp_insurance_approvals')
        .insert({ ...payload, status: 'pending', requested_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-insurance'] });
      toast.success('Insurance request submitted');
    },
  });
};

export const useUpdateInsuranceApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      if (patch.status && ['approved', 'rejected', 'partial'].includes(patch.status)) {
        patch.responded_at = patch.responded_at || new Date().toISOString();
      }
      const { error } = await supabase.from('hosp_insurance_approvals').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-insurance'] });
      toast.success('Approval updated');
    },
  });
};

// ── Reports / Analytics ─────────────────────────────
export const useHospReports = (range: { from: string; to: string }) =>
  useQuery({
    queryKey: ['hosp-reports', range],
    queryFn: async () => {
      const [encR, admR, surR, invR, payR, labR, radR, insR] = await Promise.all([
        supabase.from('hosp_encounters').select('id, encounter_type, status, department, visit_priority, created_at').gte('created_at', range.from).lte('created_at', range.to),
        supabase.from('hosp_admissions').select('id, status, admitted_at, discharged_at, ward_id').gte('admitted_at', range.from).lte('admitted_at', range.to),
        supabase.from('hosp_surgeries').select('id, status, scheduled_at, procedure_name').gte('scheduled_at', range.from).lte('scheduled_at', range.to),
        supabase.from('hosp_invoices').select('id, total, balance, status, created_at').gte('created_at', range.from).lte('created_at', range.to),
        supabase.from('hosp_payments').select('id, amount, paid_at').gte('paid_at', range.from).lte('paid_at', range.to),
        supabase.from('hosp_lab_orders').select('id, status, ordered_at').gte('ordered_at', range.from).lte('ordered_at', range.to),
        supabase.from('hosp_radiology_orders').select('id, status, ordered_at').gte('ordered_at', range.from).lte('ordered_at', range.to),
        supabase.from('hosp_insurance_approvals').select('id, status, requested_amount, approved_amount, requested_at').gte('requested_at', range.from).lte('requested_at', range.to),
      ]);
      const enc = encR.data || [];
      const inv = invR.data || [];
      const pay = payR.data || [];
      return {
        encounters: enc,
        encountersByType: enc.reduce((acc: any, e: any) => { acc[e.encounter_type || 'other'] = (acc[e.encounter_type || 'other'] || 0) + 1; return acc; }, {}),
        encountersByDept: enc.reduce((acc: any, e: any) => { acc[e.department || 'general'] = (acc[e.department || 'general'] || 0) + 1; return acc; }, {}),
        admissionsCount: (admR.data || []).length,
        surgeriesCount: (surR.data || []).length,
        surgeriesCompleted: (surR.data || []).filter((s: any) => s.status === 'completed').length,
        invoiceTotal: inv.reduce((s: number, i: any) => s + Number(i.total || 0), 0),
        invoiceOutstanding: inv.reduce((s: number, i: any) => s + Number(i.balance || 0), 0),
        paymentsTotal: pay.reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
        labOrders: (labR.data || []).length,
        labCompleted: (labR.data || []).filter((l: any) => l.status === 'completed').length,
        radOrders: (radR.data || []).length,
        radReported: (radR.data || []).filter((r: any) => r.status === 'reported').length,
        insuranceCount: (insR.data || []).length,
        insuranceApproved: (insR.data || []).filter((i: any) => i.status === 'approved').length,
        insuranceRequested: (insR.data || []).reduce((s: number, i: any) => s + Number(i.requested_amount || 0), 0),
        insuranceApprovedAmt: (insR.data || []).reduce((s: number, i: any) => s + Number(i.approved_amount || 0), 0),
      };
    },
  });
