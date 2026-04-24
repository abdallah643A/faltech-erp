-- Neonatal records (one row per baby patient)
CREATE TABLE IF NOT EXISTS public.hosp_neonatal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_patient_id UUID NOT NULL REFERENCES public.hosp_patients(id) ON DELETE CASCADE,
  mother_patient_id UUID REFERENCES public.hosp_patients(id) ON DELETE SET NULL,
  mother_mrn TEXT,
  mother_name TEXT,
  birth_time TIMESTAMPTZ,
  gestational_age_weeks NUMERIC(4,1),
  birth_weight_grams INTEGER,
  delivery_type TEXT CHECK (delivery_type IN ('vaginal','c_section','assisted','other')),
  apgar_1min INTEGER CHECK (apgar_1min BETWEEN 0 AND 10),
  apgar_5min INTEGER CHECK (apgar_5min BETWEEN 0 AND 10),
  apgar_10min INTEGER CHECK (apgar_10min BETWEEN 0 AND 10),
  resuscitation_required BOOLEAN DEFAULT false,
  complications TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT hosp_neonatal_baby_unique UNIQUE (baby_patient_id)
);

CREATE INDEX IF NOT EXISTS idx_hosp_neonatal_mother ON public.hosp_neonatal_records(mother_patient_id);

ALTER TABLE public.hosp_neonatal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hosp staff view neonatal"
  ON public.hosp_neonatal_records FOR SELECT
  USING (public.is_hospital_staff(auth.uid()));

CREATE POLICY "hosp clinical staff write neonatal"
  ON public.hosp_neonatal_records FOR ALL
  USING (
    public.has_any_role(auth.uid(),
      ARRAY['admin','manager','hospital_admin','doctor','er_doctor','surgeon','nurse','head_nurse','medical_records']::app_role[])
  )
  WITH CHECK (
    public.has_any_role(auth.uid(),
      ARRAY['admin','manager','hospital_admin','doctor','er_doctor','surgeon','nurse','head_nurse','medical_records']::app_role[])
  );

CREATE TRIGGER trg_hosp_neonatal_updated
  BEFORE UPDATE ON public.hosp_neonatal_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend patient timeline RPC to surface neonatal events
CREATE OR REPLACE FUNCTION public.hosp_patient_timeline(p_patient_id UUID)
RETURNS TABLE (
  event_at TIMESTAMPTZ,
  event_type TEXT,
  event_category TEXT,
  title TEXT,
  subtitle TEXT,
  reference_id UUID,
  encounter_id UUID,
  meta JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Encounters
  SELECT e.arrival_time, 'encounter'::TEXT, 'clinical'::TEXT,
         ('Encounter: ' || COALESCE(e.encounter_type,'visit'))::TEXT,
         e.chief_complaint, e.id, e.id,
         jsonb_build_object('status', e.status, 'department', e.department)
  FROM hosp_encounters e WHERE e.patient_id = p_patient_id

  UNION ALL
  SELECT c.created_at, 'charge', 'billing',
         c.description, ('Qty ' || c.qty || ' × ' || c.unit_price)::TEXT,
         c.id, c.encounter_id,
         jsonb_build_object('amount', c.amount, 'source_type', c.source_type)
  FROM hosp_encounter_charges c WHERE c.patient_id = p_patient_id

  UNION ALL
  SELECT lo.ordered_at, 'lab_order', 'diagnostic',
         lo.test_name, lo.priority, lo.id, lo.encounter_id,
         jsonb_build_object('status', lo.status, 'priority', lo.priority,
                            'critical', (lo.priority IN ('stat','emergency')))
  FROM hosp_lab_orders lo WHERE lo.patient_id = p_patient_id

  UNION ALL
  SELECT ro.ordered_at, 'rad_order', 'diagnostic',
         ro.modality || ' — ' || ro.study_name, ro.priority, ro.id, ro.encounter_id,
         jsonb_build_object('status', ro.status, 'priority', ro.priority,
                            'critical', (ro.priority IN ('stat','emergency')))
  FROM hosp_radiology_orders ro WHERE ro.patient_id = p_patient_id

  UNION ALL
  SELECT mo.ordered_at, 'prescription', 'medication',
         'Prescription', ('Items: ' || COALESCE((SELECT COUNT(*)::TEXT FROM hosp_medication_order_lines WHERE order_id = mo.id),'0')),
         mo.id, mo.encounter_id,
         jsonb_build_object('status', mo.status)
  FROM hosp_medication_orders mo WHERE mo.patient_id = p_patient_id

  UNION ALL
  SELECT s.scheduled_start, 'surgery', 'clinical',
         s.procedure_name, s.surgeon_name, s.id, s.encounter_id,
         jsonb_build_object('status', s.status, 'or_room', s.or_room)
  FROM hosp_surgeries s WHERE s.patient_id = p_patient_id

  UNION ALL
  SELECT i.created_at, 'invoice', 'billing',
         ('Invoice ' || COALESCE(i.invoice_no,'(draft)')),
         ('Total: ' || COALESCE(i.total,0)::TEXT)::TEXT,
         i.id, i.encounter_id,
         jsonb_build_object('status', i.status, 'paid', i.paid_amount, 'total', i.total)
  FROM hosp_invoices i WHERE i.patient_id = p_patient_id

  UNION ALL
  SELECT a.scheduled_at, 'appointment', 'clinical',
         ('Appointment: ' || COALESCE(a.department,'OPD')),
         a.doctor_name, a.id, NULL::UUID,
         jsonb_build_object('status', a.status)
  FROM hosp_appointments a WHERE a.patient_id = p_patient_id

  -- Neonatal: birth event for baby file
  UNION ALL
  SELECT COALESCE(n.birth_time, n.created_at), 'neonatal_birth', 'clinical',
         'Birth recorded',
         ('Mother: ' || COALESCE(n.mother_name,'—') || ' • ' || COALESCE(n.delivery_type,'—'))::TEXT,
         n.id, NULL::UUID,
         jsonb_build_object('mother_patient_id', n.mother_patient_id,
                            'birth_weight_g', n.birth_weight_grams,
                            'gestational_age', n.gestational_age_weeks,
                            'apgar_5', n.apgar_5min,
                            'critical', (n.apgar_5min IS NOT NULL AND n.apgar_5min < 7))
  FROM hosp_neonatal_records n WHERE n.baby_patient_id = p_patient_id

  -- Neonatal: linked babies on mother file
  UNION ALL
  SELECT COALESCE(n.birth_time, n.created_at), 'neonatal_baby', 'clinical',
         ('Baby delivered'),
         ('Baby MRN: ' || COALESCE(bp.mrn,'—') || ' • ' || COALESCE(n.delivery_type,'—'))::TEXT,
         n.id, NULL::UUID,
         jsonb_build_object('baby_patient_id', n.baby_patient_id,
                            'birth_weight_g', n.birth_weight_grams,
                            'apgar_5', n.apgar_5min)
  FROM hosp_neonatal_records n
  JOIN hosp_patients bp ON bp.id = n.baby_patient_id
  WHERE n.mother_patient_id = p_patient_id

  ORDER BY 1 DESC;
END $$;