CREATE TABLE IF NOT EXISTS public.hosp_vitals_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.hosp_encounters(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES public.hosp_beds(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'manual',  -- manual | monitor | ventilator | infusion
  device_label TEXT,
  hr INTEGER,                 -- bpm
  sbp INTEGER,                -- mmHg
  dbp INTEGER,
  map INTEGER,
  spo2 NUMERIC(5,2),          -- %
  rr INTEGER,                 -- /min
  temp_c NUMERIC(4,1),        -- °C
  etco2 INTEGER,              -- mmHg
  fio2 NUMERIC(5,2),          -- %
  pain_score INTEGER CHECK (pain_score BETWEEN 0 AND 10),
  gcs INTEGER CHECK (gcs BETWEEN 3 AND 15),
  is_critical BOOLEAN DEFAULT false,
  critical_reasons TEXT[],
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hosp_vitals_patient_time
  ON public.hosp_vitals_snapshots(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_hosp_vitals_encounter_time
  ON public.hosp_vitals_snapshots(encounter_id, recorded_at DESC);

ALTER TABLE public.hosp_vitals_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hosp staff view vitals"
  ON public.hosp_vitals_snapshots FOR SELECT
  USING (public.is_hospital_staff(auth.uid()));

CREATE POLICY "clinical staff write vitals"
  ON public.hosp_vitals_snapshots FOR ALL
  USING (
    public.has_any_role(auth.uid(),
      ARRAY['admin','manager','hospital_admin','doctor','er_doctor','surgeon',
            'nurse','head_nurse','medical_records']::app_role[])
  )
  WITH CHECK (
    public.has_any_role(auth.uid(),
      ARRAY['admin','manager','hospital_admin','doctor','er_doctor','surgeon',
            'nurse','head_nurse','medical_records']::app_role[])
  );

-- Auto-flag critical vitals on insert/update
CREATE OR REPLACE FUNCTION public.hosp_vitals_flag_critical()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NEW.hr   IS NOT NULL AND (NEW.hr < 40 OR NEW.hr > 140)   THEN r := r || 'HR'; END IF;
  IF NEW.sbp  IS NOT NULL AND (NEW.sbp < 80 OR NEW.sbp > 200) THEN r := r || 'SBP'; END IF;
  IF NEW.spo2 IS NOT NULL AND NEW.spo2 < 90                   THEN r := r || 'SpO2'; END IF;
  IF NEW.rr   IS NOT NULL AND (NEW.rr < 8 OR NEW.rr > 30)     THEN r := r || 'RR'; END IF;
  IF NEW.temp_c IS NOT NULL AND (NEW.temp_c < 35 OR NEW.temp_c > 39.5) THEN r := r || 'Temp'; END IF;
  IF NEW.gcs  IS NOT NULL AND NEW.gcs < 9                     THEN r := r || 'GCS'; END IF;
  NEW.critical_reasons := r;
  NEW.is_critical := array_length(r, 1) > 0;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hosp_vitals_flag ON public.hosp_vitals_snapshots;
CREATE TRIGGER trg_hosp_vitals_flag
  BEFORE INSERT OR UPDATE ON public.hosp_vitals_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.hosp_vitals_flag_critical();

-- Extend timeline RPC to include critical vitals only (avoid noise)
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
  SELECT e.arrival_time, 'encounter'::TEXT, 'clinical'::TEXT,
         ('Encounter: ' || COALESCE(e.encounter_type,'visit'))::TEXT,
         e.chief_complaint, e.id, e.id,
         jsonb_build_object('status', e.status, 'department', e.department)
  FROM hosp_encounters e WHERE e.patient_id = p_patient_id
  UNION ALL
  SELECT c.created_at, 'charge', 'billing', c.description,
         ('Qty ' || c.qty || ' × ' || c.unit_price)::TEXT, c.id, c.encounter_id,
         jsonb_build_object('amount', c.amount, 'source_type', c.source_type)
  FROM hosp_encounter_charges c WHERE c.patient_id = p_patient_id
  UNION ALL
  SELECT lo.ordered_at, 'lab_order', 'diagnostic', lo.test_name, lo.priority, lo.id, lo.encounter_id,
         jsonb_build_object('status', lo.status, 'priority', lo.priority,
                            'critical', (lo.priority IN ('stat','emergency')))
  FROM hosp_lab_orders lo WHERE lo.patient_id = p_patient_id
  UNION ALL
  SELECT ro.ordered_at, 'rad_order', 'diagnostic', ro.modality || ' — ' || ro.study_name, ro.priority, ro.id, ro.encounter_id,
         jsonb_build_object('status', ro.status, 'priority', ro.priority,
                            'critical', (ro.priority IN ('stat','emergency')))
  FROM hosp_radiology_orders ro WHERE ro.patient_id = p_patient_id
  UNION ALL
  SELECT mo.ordered_at, 'prescription', 'medication', 'Prescription',
         ('Items: ' || COALESCE((SELECT COUNT(*)::TEXT FROM hosp_medication_order_lines WHERE order_id = mo.id),'0')),
         mo.id, mo.encounter_id, jsonb_build_object('status', mo.status)
  FROM hosp_medication_orders mo WHERE mo.patient_id = p_patient_id
  UNION ALL
  SELECT s.scheduled_start, 'surgery', 'clinical', s.procedure_name, s.surgeon_name, s.id, s.encounter_id,
         jsonb_build_object('status', s.status, 'or_room', s.or_room)
  FROM hosp_surgeries s WHERE s.patient_id = p_patient_id
  UNION ALL
  SELECT i.created_at, 'invoice', 'billing',
         ('Invoice ' || COALESCE(i.invoice_no,'(draft)')),
         ('Total: ' || COALESCE(i.total,0)::TEXT)::TEXT, i.id, i.encounter_id,
         jsonb_build_object('status', i.status, 'paid', i.paid_amount, 'total', i.total)
  FROM hosp_invoices i WHERE i.patient_id = p_patient_id
  UNION ALL
  SELECT a.scheduled_at, 'appointment', 'clinical',
         ('Appointment: ' || COALESCE(a.department,'OPD')), a.doctor_name, a.id, NULL::UUID,
         jsonb_build_object('status', a.status)
  FROM hosp_appointments a WHERE a.patient_id = p_patient_id
  UNION ALL
  SELECT COALESCE(n.birth_time, n.created_at), 'neonatal_birth', 'clinical', 'Birth recorded',
         ('Mother: ' || COALESCE(n.mother_name,'—') || ' • ' || COALESCE(n.delivery_type,'—'))::TEXT,
         n.id, NULL::UUID,
         jsonb_build_object('mother_patient_id', n.mother_patient_id,
                            'birth_weight_g', n.birth_weight_grams,
                            'gestational_age', n.gestational_age_weeks,
                            'apgar_5', n.apgar_5min,
                            'critical', (n.apgar_5min IS NOT NULL AND n.apgar_5min < 7))
  FROM hosp_neonatal_records n WHERE n.baby_patient_id = p_patient_id
  UNION ALL
  SELECT COALESCE(n.birth_time, n.created_at), 'neonatal_baby', 'clinical', 'Baby delivered',
         ('Baby MRN: ' || COALESCE(bp.mrn,'—') || ' • ' || COALESCE(n.delivery_type,'—'))::TEXT,
         n.id, NULL::UUID,
         jsonb_build_object('baby_patient_id', n.baby_patient_id,
                            'birth_weight_g', n.birth_weight_grams,
                            'apgar_5', n.apgar_5min)
  FROM hosp_neonatal_records n
  JOIN hosp_patients bp ON bp.id = n.baby_patient_id
  WHERE n.mother_patient_id = p_patient_id
  UNION ALL
  SELECT v.recorded_at, 'vitals_critical', 'clinical', 'Critical vitals',
         array_to_string(v.critical_reasons, ', '), v.id, v.encounter_id,
         jsonb_build_object('hr', v.hr, 'sbp', v.sbp, 'spo2', v.spo2, 'temp_c', v.temp_c,
                            'rr', v.rr, 'gcs', v.gcs, 'critical', true)
  FROM hosp_vitals_snapshots v WHERE v.patient_id = p_patient_id AND v.is_critical = true
  ORDER BY 1 DESC;
END $$;