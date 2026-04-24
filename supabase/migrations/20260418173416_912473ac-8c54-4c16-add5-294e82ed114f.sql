-- =====================================================
-- 2) SEQUENCES
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS hosp_mrn_seq START 100001;
CREATE SEQUENCE IF NOT EXISTS hosp_encounter_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hosp_admission_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hosp_appointment_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hosp_prescription_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hosp_lab_order_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hosp_rad_order_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hosp_surgery_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hosp_invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS hosp_discharge_seq START 1;

-- =====================================================
-- 3) HELPERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_hospital_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin','manager','hospital_admin','hospital_executive',
                   'receptionist','cashier','billing_officer','insurance_officer',
                   'doctor','er_doctor','surgeon','pharmacist','lab_tech',
                   'radiology_tech','nurse','head_nurse','ward_clerk',
                   'bed_manager','medical_records')
  );
$$;

-- =====================================================
-- 4) PATIENTS
-- =====================================================
CREATE TABLE public.hosp_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name_ar TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('male','female','other')),
  date_of_birth DATE,
  national_id TEXT,
  passport_no TEXT,
  nationality TEXT,
  marital_status TEXT,
  blood_group TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  insurance_provider TEXT,
  insurance_policy_no TEXT,
  insurance_expiry DATE,
  allergies TEXT[] DEFAULT '{}',
  chronic_conditions TEXT[] DEFAULT '{}',
  alerts JSONB DEFAULT '[]'::jsonb,
  is_vip BOOLEAN DEFAULT false,
  is_deceased BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hosp_patients_mrn ON public.hosp_patients(mrn);
CREATE INDEX idx_hosp_patients_name ON public.hosp_patients(last_name, first_name);
CREATE INDEX idx_hosp_patients_phone ON public.hosp_patients(phone);

CREATE OR REPLACE FUNCTION public.hosp_set_mrn()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.mrn IS NULL OR NEW.mrn = '' THEN
    NEW.mrn := 'MRN' || LPAD(nextval('hosp_mrn_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_set_mrn BEFORE INSERT ON public.hosp_patients
FOR EACH ROW EXECUTE FUNCTION public.hosp_set_mrn();

-- =====================================================
-- 5) WARDS / ROOMS / BEDS
-- =====================================================
CREATE TABLE public.hosp_wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  ward_type TEXT NOT NULL DEFAULT 'general' CHECK (ward_type IN ('general','icu','nicu','er','or','recovery','isolation','maternity','pediatric')),
  floor TEXT,
  capacity INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.hosp_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id UUID NOT NULL REFERENCES public.hosp_wards(id) ON DELETE CASCADE,
  room_no TEXT NOT NULL,
  room_type TEXT DEFAULT 'standard',
  is_isolation BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ward_id, room_no)
);

CREATE TABLE public.hosp_beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.hosp_rooms(id) ON DELETE CASCADE,
  ward_id UUID NOT NULL REFERENCES public.hosp_wards(id) ON DELETE CASCADE,
  bed_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','cleaning','blocked','maintenance')),
  current_patient_id UUID,
  current_encounter_id UUID,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, bed_no)
);
CREATE INDEX idx_hosp_beds_status ON public.hosp_beds(status);
CREATE INDEX idx_hosp_beds_ward ON public.hosp_beds(ward_id);

-- =====================================================
-- 6) ENCOUNTERS
-- =====================================================
CREATE TABLE public.hosp_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_no TEXT UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id) ON DELETE CASCADE,
  encounter_type TEXT NOT NULL CHECK (encounter_type IN ('opd','er','inpatient','daycare','lab_only','radiology_only','followup')),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN (
    'registered','waiting','in_consultation','in_triage','sent_to_lab','sent_to_radiology',
    'prescription_pending','admitted','in_surgery','in_recovery','in_icu','in_nicu','in_ward',
    'transfer_pending','discharge_pending','discharged','cancelled','deceased'
  )),
  department TEXT,
  doctor_id UUID,
  doctor_name TEXT,
  arrival_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  triage_time TIMESTAMPTZ,
  seen_time TIMESTAMPTZ,
  discharge_time TIMESTAMPTZ,
  chief_complaint TEXT,
  current_ward_id UUID REFERENCES public.hosp_wards(id),
  current_bed_id UUID REFERENCES public.hosp_beds(id),
  visit_priority TEXT DEFAULT 'normal' CHECK (visit_priority IN ('normal','urgent','stat','emergency')),
  is_admitted BOOLEAN DEFAULT false,
  total_charges NUMERIC DEFAULT 0,
  insurance_payer TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hosp_enc_patient ON public.hosp_encounters(patient_id);
CREATE INDEX idx_hosp_enc_status ON public.hosp_encounters(status);
CREATE INDEX idx_hosp_enc_type ON public.hosp_encounters(encounter_type);

CREATE OR REPLACE FUNCTION public.hosp_set_encounter_no()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.encounter_no IS NULL OR NEW.encounter_no = '' THEN
    NEW.encounter_no := 'ENC-' || TO_CHAR(now(),'YYYY') || '-' || LPAD(nextval('hosp_encounter_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_set_encounter_no BEFORE INSERT ON public.hosp_encounters
FOR EACH ROW EXECUTE FUNCTION public.hosp_set_encounter_no();

-- =====================================================
-- 7) TRIAGE / VITALS / NOTES / DIAGNOSES
-- =====================================================
CREATE TABLE public.hosp_triage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  triage_level INT NOT NULL CHECK (triage_level BETWEEN 1 AND 5),
  triage_category TEXT,
  pulse INT, bp_systolic INT, bp_diastolic INT, temperature NUMERIC, spo2 INT, respiration INT,
  pain_score INT,
  notes TEXT,
  triaged_by UUID,
  triaged_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.hosp_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  recorded_at TIMESTAMPTZ DEFAULT now(),
  pulse INT, bp_systolic INT, bp_diastolic INT, temperature NUMERIC, spo2 INT,
  respiration INT, pain_score INT, glucose NUMERIC, weight NUMERIC, height NUMERIC,
  notes TEXT,
  recorded_by UUID
);

CREATE TABLE public.hosp_clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  note_type TEXT NOT NULL DEFAULT 'progress' CHECK (note_type IN ('progress','consultation','nursing','soap','procedure','referral','discharge_summary')),
  title TEXT,
  content TEXT NOT NULL,
  author_id UUID,
  author_name TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.hosp_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  icd10_code TEXT,
  diagnosis TEXT NOT NULL,
  diagnosis_type TEXT DEFAULT 'primary' CHECK (diagnosis_type IN ('primary','secondary','provisional','final','differential')),
  diagnosed_by UUID,
  diagnosed_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 8) APPOINTMENTS
-- =====================================================
CREATE TABLE public.hosp_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_no TEXT UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  doctor_id UUID,
  doctor_name TEXT,
  department TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 15,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','checked_in','in_consultation','completed','cancelled','no_show','rescheduled')),
  encounter_id UUID REFERENCES public.hosp_encounters(id),
  reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_hosp_appt_date ON public.hosp_appointments(scheduled_at);

CREATE OR REPLACE FUNCTION public.hosp_set_appointment_no()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.appointment_no IS NULL OR NEW.appointment_no = '' THEN
    NEW.appointment_no := 'APT-' || TO_CHAR(now(),'YYYY') || '-' || LPAD(nextval('hosp_appointment_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_set_appointment_no BEFORE INSERT ON public.hosp_appointments
FOR EACH ROW EXECUTE FUNCTION public.hosp_set_appointment_no();

-- =====================================================
-- 9) ADMISSIONS / BED ASSIGNMENTS
-- =====================================================
CREATE TABLE public.hosp_admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no TEXT UNIQUE NOT NULL,
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admitting_doctor_id UUID,
  admitting_doctor_name TEXT,
  admission_type TEXT DEFAULT 'planned' CHECK (admission_type IN ('planned','emergency','transfer','newborn','daycare')),
  diagnosis TEXT,
  current_bed_id UUID REFERENCES public.hosp_beds(id),
  current_ward_id UUID REFERENCES public.hosp_wards(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','transferred','discharged','deceased')),
  expected_discharge DATE,
  actual_discharge TIMESTAMPTZ,
  length_of_stay_days INT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_hosp_adm_patient ON public.hosp_admissions(patient_id);
CREATE INDEX idx_hosp_adm_status ON public.hosp_admissions(status);

CREATE OR REPLACE FUNCTION public.hosp_set_admission_no()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.admission_no IS NULL OR NEW.admission_no = '' THEN
    NEW.admission_no := 'ADM-' || TO_CHAR(now(),'YYYY') || '-' || LPAD(nextval('hosp_admission_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_set_admission_no BEFORE INSERT ON public.hosp_admissions
FOR EACH ROW EXECUTE FUNCTION public.hosp_set_admission_no();

CREATE TABLE public.hosp_bed_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id UUID NOT NULL REFERENCES public.hosp_beds(id),
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id),
  admission_id UUID REFERENCES public.hosp_admissions(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  released_at TIMESTAMPTZ,
  reason TEXT,
  assigned_by UUID
);

CREATE OR REPLACE FUNCTION public.hosp_bed_assign_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.hosp_beds
    SET status = 'occupied', current_patient_id = NEW.patient_id,
        current_encounter_id = NEW.encounter_id, updated_at = now()
  WHERE id = NEW.bed_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_bed_assign AFTER INSERT ON public.hosp_bed_assignments
FOR EACH ROW EXECUTE FUNCTION public.hosp_bed_assign_trg();

CREATE OR REPLACE FUNCTION public.hosp_bed_release_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.released_at IS NOT NULL AND OLD.released_at IS NULL THEN
    UPDATE public.hosp_beds
      SET status = 'cleaning', current_patient_id = NULL,
          current_encounter_id = NULL, updated_at = now()
    WHERE id = NEW.bed_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_bed_release AFTER UPDATE ON public.hosp_bed_assignments
FOR EACH ROW EXECUTE FUNCTION public.hosp_bed_release_trg();

-- =====================================================
-- 10) MEDICATIONS / PHARMACY
-- =====================================================
CREATE TABLE public.hosp_medication_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_no TEXT UNIQUE NOT NULL,
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  prescribed_by UUID, prescribed_by_name TEXT,
  prescribed_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','dispensed','partial','cancelled','administered')),
  is_stat BOOLEAN DEFAULT false,
  is_controlled BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_hosp_med_orders_enc ON public.hosp_medication_orders(encounter_id);

CREATE OR REPLACE FUNCTION public.hosp_set_prescription_no()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.prescription_no IS NULL OR NEW.prescription_no = '' THEN
    NEW.prescription_no := 'RX-' || TO_CHAR(now(),'YYYY') || '-' || LPAD(nextval('hosp_prescription_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_set_prescription_no BEFORE INSERT ON public.hosp_medication_orders
FOR EACH ROW EXECUTE FUNCTION public.hosp_set_prescription_no();

CREATE TABLE public.hosp_medication_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.hosp_medication_orders(id) ON DELETE CASCADE,
  line_no INT NOT NULL DEFAULT 1,
  drug_name TEXT NOT NULL, drug_code TEXT,
  inventory_item_id UUID,
  dose TEXT, route TEXT, frequency TEXT, duration TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  dispensed_qty NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','dispensed','partial','out_of_stock','substituted','cancelled')),
  substitution_for TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.hosp_pharmacy_dispenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_line_id UUID NOT NULL REFERENCES public.hosp_medication_order_lines(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.hosp_medication_orders(id),
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id),
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  inventory_item_id UUID,
  warehouse_code TEXT,
  qty NUMERIC NOT NULL,
  unit_price NUMERIC DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (qty * COALESCE(unit_price,0)) STORED,
  dispensed_by UUID,
  dispensed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

CREATE OR REPLACE FUNCTION public.hosp_dispense_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.hosp_medication_order_lines
    SET dispensed_qty = COALESCE(dispensed_qty,0) + NEW.qty,
        status = CASE WHEN COALESCE(dispensed_qty,0) + NEW.qty >= quantity THEN 'dispensed' ELSE 'partial' END
  WHERE id = NEW.order_line_id;

  IF NEW.inventory_item_id IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.stock_items SET on_hand = COALESCE(on_hand,0) - $1, updated_at = now() WHERE id = $2'
        USING NEW.qty, NEW.inventory_item_id;
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_dispense_after_insert AFTER INSERT ON public.hosp_pharmacy_dispenses
FOR EACH ROW EXECUTE FUNCTION public.hosp_dispense_after_insert();

-- =====================================================
-- 11) LAB / RADIOLOGY / SURGERY
-- =====================================================
CREATE TABLE public.hosp_lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  test_code TEXT, test_name TEXT NOT NULL,
  priority TEXT DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered','collected','in_lab','reported','validated','released','cancelled')),
  ordered_by UUID, ordered_at TIMESTAMPTZ DEFAULT now(),
  result_value TEXT, result_text TEXT, result_at TIMESTAMPTZ,
  is_critical BOOLEAN DEFAULT false,
  unit_price NUMERIC DEFAULT 0, notes TEXT
);
CREATE OR REPLACE FUNCTION public.hosp_set_lab_order_no()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.order_no IS NULL OR NEW.order_no = '' THEN
    NEW.order_no := 'LAB-' || TO_CHAR(now(),'YYYY') || '-' || LPAD(nextval('hosp_lab_order_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_set_lab_order_no BEFORE INSERT ON public.hosp_lab_orders
FOR EACH ROW EXECUTE FUNCTION public.hosp_set_lab_order_no();

CREATE TABLE public.hosp_radiology_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  modality TEXT, exam_name TEXT NOT NULL,
  priority TEXT DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered','scheduled','in_progress','reported','released','cancelled')),
  ordered_by UUID, ordered_at TIMESTAMPTZ DEFAULT now(),
  report_text TEXT, reported_at TIMESTAMPTZ,
  unit_price NUMERIC DEFAULT 0, notes TEXT
);
CREATE OR REPLACE FUNCTION public.hosp_set_rad_order_no()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.order_no IS NULL OR NEW.order_no = '' THEN
    NEW.order_no := 'RAD-' || TO_CHAR(now(),'YYYY') || '-' || LPAD(nextval('hosp_rad_order_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_set_rad_order_no BEFORE INSERT ON public.hosp_radiology_orders
FOR EACH ROW EXECUTE FUNCTION public.hosp_set_rad_order_no();

CREATE TABLE public.hosp_surgeries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_no TEXT UNIQUE NOT NULL,
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id),
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  procedure_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  ot_room TEXT,
  surgeon_id UUID, surgeon_name TEXT,
  anesthetist_name TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','pre_op','in_progress','completed','cancelled','postponed')),
  pre_op_done BOOLEAN DEFAULT false,
  consent_signed BOOLEAN DEFAULT false,
  start_time TIMESTAMPTZ, end_time TIMESTAMPTZ,
  notes TEXT, created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.hosp_set_surgery_no()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.surgery_no IS NULL OR NEW.surgery_no = '' THEN
    NEW.surgery_no := 'SUR-' || TO_CHAR(now(),'YYYY') || '-' || LPAD(nextval('hosp_surgery_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_set_surgery_no BEFORE INSERT ON public.hosp_surgeries
FOR EACH ROW EXECUTE FUNCTION public.hosp_set_surgery_no();

-- =====================================================
-- 12) BILLING
-- =====================================================
CREATE TABLE public.hosp_charge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('consultation','room','nursing','procedure','surgery','lab','radiology','medication','consumable','package','other')),
  default_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.hosp_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id),
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','partial','paid','cancelled','locked')),
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (COALESCE(total,0) - COALESCE(paid_amount,0)) STORED,
  insurance_payer TEXT,
  insurance_approval_no TEXT,
  insurance_covered NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_hosp_inv_enc ON public.hosp_invoices(encounter_id);

CREATE OR REPLACE FUNCTION public.hosp_set_invoice_no()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := 'HINV-' || TO_CHAR(now(),'YYYY') || '-' || LPAD(nextval('hosp_invoice_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_set_invoice_no BEFORE INSERT ON public.hosp_invoices
FOR EACH ROW EXECUTE FUNCTION public.hosp_set_invoice_no();

CREATE TABLE public.hosp_encounter_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  charge_item_id UUID REFERENCES public.hosp_charge_items(id),
  charge_code TEXT,
  description TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('manual','consultation','room','medication','lab','radiology','surgery','procedure','nursing','package')),
  source_id UUID,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_pct NUMERIC DEFAULT 0,
  amount NUMERIC GENERATED ALWAYS AS (qty * unit_price * (1 - COALESCE(discount_pct,0)/100)) STORED,
  charged_at TIMESTAMPTZ DEFAULT now(),
  charged_by UUID,
  invoice_id UUID REFERENCES public.hosp_invoices(id),
  notes TEXT
);
CREATE INDEX idx_hosp_charges_enc ON public.hosp_encounter_charges(encounter_id);

CREATE TABLE public.hosp_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.hosp_invoices(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id),
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash','card','transfer','insurance','wallet','other')),
  reference TEXT,
  paid_at TIMESTAMPTZ DEFAULT now(),
  received_by UUID,
  notes TEXT
);

CREATE TABLE public.hosp_insurance_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id),
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  payer TEXT NOT NULL,
  policy_no TEXT, approval_no TEXT,
  requested_amount NUMERIC, approved_amount NUMERIC,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested','pending','approved','rejected','partial','expired')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  notes TEXT, requested_by UUID
);

CREATE OR REPLACE FUNCTION public.hosp_charge_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_invoice_id UUID; v_total NUMERIC;
BEGIN
  SELECT id INTO v_invoice_id FROM public.hosp_invoices
    WHERE encounter_id = NEW.encounter_id AND status IN ('draft','open','partial')
    ORDER BY created_at DESC LIMIT 1;
  IF v_invoice_id IS NULL THEN
    INSERT INTO public.hosp_invoices(encounter_id, patient_id, status, created_by)
    VALUES (NEW.encounter_id, NEW.patient_id, 'open', NEW.charged_by)
    RETURNING id INTO v_invoice_id;
  END IF;

  UPDATE public.hosp_encounter_charges SET invoice_id = v_invoice_id WHERE id = NEW.id;

  SELECT COALESCE(SUM(amount),0) INTO v_total FROM public.hosp_encounter_charges WHERE invoice_id = v_invoice_id;
  UPDATE public.hosp_invoices
    SET subtotal = v_total, total = v_total - COALESCE(discount,0) + COALESCE(tax,0), updated_at = now()
  WHERE id = v_invoice_id;

  UPDATE public.hosp_encounters
    SET total_charges = (SELECT COALESCE(SUM(amount),0) FROM public.hosp_encounter_charges WHERE encounter_id = NEW.encounter_id),
        updated_at = now()
  WHERE id = NEW.encounter_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_charge_after_insert AFTER INSERT ON public.hosp_encounter_charges
FOR EACH ROW EXECUTE FUNCTION public.hosp_charge_after_insert();

CREATE OR REPLACE FUNCTION public.hosp_payment_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_paid NUMERIC; v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.hosp_payments WHERE invoice_id = NEW.invoice_id;
  SELECT total INTO v_total FROM public.hosp_invoices WHERE id = NEW.invoice_id;
  UPDATE public.hosp_invoices
    SET paid_amount = v_paid,
        status = CASE WHEN v_paid >= COALESCE(v_total,0) AND COALESCE(v_total,0) > 0 THEN 'paid'
                      WHEN v_paid > 0 THEN 'partial' ELSE status END,
        updated_at = now()
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_payment_after_insert AFTER INSERT ON public.hosp_payments
FOR EACH ROW EXECUTE FUNCTION public.hosp_payment_after_insert();

-- =====================================================
-- 13) DISCHARGE
-- =====================================================
CREATE TABLE public.hosp_discharges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discharge_no TEXT UNIQUE NOT NULL,
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES public.hosp_admissions(id),
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  initiated_by UUID,
  initiated_at TIMESTAMPTZ DEFAULT now(),
  doctor_cleared BOOLEAN DEFAULT false, doctor_cleared_at TIMESTAMPTZ, doctor_cleared_by UUID,
  nursing_cleared BOOLEAN DEFAULT false, nursing_cleared_at TIMESTAMPTZ, nursing_cleared_by UUID,
  pharmacy_cleared BOOLEAN DEFAULT false, pharmacy_cleared_at TIMESTAMPTZ, pharmacy_cleared_by UUID,
  billing_cleared BOOLEAN DEFAULT false, billing_cleared_at TIMESTAMPTZ, billing_cleared_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  discharge_type TEXT DEFAULT 'normal' CHECK (discharge_type IN ('normal','against_advice','transfer','referral','deceased')),
  discharge_summary TEXT,
  follow_up_date DATE,
  takehome_meds TEXT,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID
);

CREATE OR REPLACE FUNCTION public.hosp_set_discharge_no()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.discharge_no IS NULL OR NEW.discharge_no = '' THEN
    NEW.discharge_no := 'DSC-' || TO_CHAR(now(),'YYYY') || '-' || LPAD(nextval('hosp_discharge_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_set_discharge_no BEFORE INSERT ON public.hosp_discharges
FOR EACH ROW EXECUTE FUNCTION public.hosp_set_discharge_no();

CREATE OR REPLACE FUNCTION public.hosp_discharge_finalize_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    UPDATE public.hosp_encounters
      SET status = 'discharged', discharge_time = COALESCE(NEW.finalized_at, now()), updated_at = now()
    WHERE id = NEW.encounter_id;

    IF NEW.admission_id IS NOT NULL THEN
      UPDATE public.hosp_admissions
        SET status = 'discharged', actual_discharge = COALESCE(NEW.finalized_at, now()),
            length_of_stay_days = GREATEST(0, EXTRACT(DAY FROM (COALESCE(NEW.finalized_at, now()) - admitted_at))::INT)
      WHERE id = NEW.admission_id;
    END IF;

    UPDATE public.hosp_bed_assignments
      SET released_at = COALESCE(NEW.finalized_at, now())
    WHERE encounter_id = NEW.encounter_id AND released_at IS NULL;

    UPDATE public.hosp_invoices
      SET status = CASE WHEN status = 'paid' THEN 'locked' ELSE status END, updated_at = now()
    WHERE encounter_id = NEW.encounter_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hosp_discharge_finalize AFTER UPDATE ON public.hosp_discharges
FOR EACH ROW EXECUTE FUNCTION public.hosp_discharge_finalize_trg();

-- =====================================================
-- 14) AUDIT
-- =====================================================
CREATE TABLE public.hosp_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  patient_id UUID,
  encounter_id UUID,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 15) RLS
-- =====================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'hosp_patients','hosp_wards','hosp_rooms','hosp_beds','hosp_encounters',
    'hosp_triage','hosp_vitals','hosp_clinical_notes','hosp_diagnoses',
    'hosp_appointments','hosp_admissions','hosp_bed_assignments',
    'hosp_medication_orders','hosp_medication_order_lines','hosp_pharmacy_dispenses',
    'hosp_lab_orders','hosp_radiology_orders','hosp_surgeries',
    'hosp_charge_items','hosp_encounter_charges','hosp_invoices','hosp_payments',
    'hosp_insurance_approvals','hosp_discharges','hosp_activity_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_hospital_staff(auth.uid()))', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_hospital_staff(auth.uid()))', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_hospital_staff(auth.uid())) WITH CHECK (public.is_hospital_staff(auth.uid()))', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY[''admin''::app_role,''hospital_admin''::app_role]))', t || '_delete', t);
  END LOOP;
END $$;

-- =====================================================
-- 16) ROLE PERMISSIONS SEED
-- =====================================================
DO $$
DECLARE
  r TEXT; m TEXT;
  roles TEXT[] := ARRAY['admin','manager','hospital_admin','hospital_executive',
    'receptionist','cashier','billing_officer','insurance_officer',
    'doctor','er_doctor','surgeon','pharmacist','lab_tech','radiology_tech',
    'nurse','head_nurse','ward_clerk','bed_manager','medical_records'];
  modules TEXT[] := ARRAY['hospitalDashboard','hospitalReception','hospitalAppointments',
    'hospitalOPD','hospitalER','hospitalInpatient','hospitalBedManagement',
    'hospitalPharmacy','hospitalPatientFile','hospitalNursing',
    'hospitalBilling','hospitalInsurance','hospitalDischarge',
    'hospitalLab','hospitalRadiology','hospitalOR','hospitalICU','hospitalNICU',
    'hospitalReports','hospitalSettings'];
BEGIN
  FOREACH r IN ARRAY roles LOOP
    FOREACH m IN ARRAY modules LOOP
      INSERT INTO public.role_permissions(role_key, module_key, can_view, can_create, can_edit, can_delete)
      VALUES (r, m, true,
              r IN ('admin','manager','hospital_admin','receptionist','doctor','er_doctor','surgeon','pharmacist','lab_tech','radiology_tech','nurse','head_nurse','bed_manager','billing_officer','cashier','insurance_officer','medical_records'),
              r IN ('admin','manager','hospital_admin','receptionist','doctor','er_doctor','surgeon','pharmacist','nurse','head_nurse','bed_manager','billing_officer','cashier','insurance_officer','medical_records'),
              r IN ('admin','hospital_admin'))
      ON CONFLICT (role_key, module_key) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- 17) DEMO SEED
-- =====================================================
INSERT INTO public.hosp_wards (code, name, ward_type, floor, capacity) VALUES
  ('W-OPD','Out-Patient Clinic','general','G',0),
  ('W-ER','Emergency Department','er','G',8),
  ('W-WARD-A','General Ward A','general','1',12),
  ('W-WARD-B','General Ward B','general','2',12),
  ('W-ICU','Intensive Care Unit','icu','3',6),
  ('W-NICU','Neonatal ICU','nicu','3',4),
  ('W-OR','Operating Theatres','or','4',4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.hosp_rooms (ward_id, room_no)
SELECT w.id, r.rn FROM public.hosp_wards w
CROSS JOIN (VALUES ('101'),('102'),('103')) AS r(rn)
WHERE w.code IN ('W-WARD-A','W-WARD-B','W-ICU','W-NICU','W-ER')
ON CONFLICT DO NOTHING;

INSERT INTO public.hosp_beds (room_id, ward_id, bed_no, status)
SELECT rm.id, rm.ward_id, b.bn, 'available'
FROM public.hosp_rooms rm
CROSS JOIN (VALUES ('A'),('B')) AS b(bn)
ON CONFLICT DO NOTHING;

INSERT INTO public.hosp_charge_items (code, name, category, default_price) VALUES
  ('CONS-GP','GP Consultation','consultation',150),
  ('CONS-SP','Specialist Consultation','consultation',300),
  ('ROOM-GEN','General Ward / day','room',400),
  ('ROOM-ICU','ICU bed / day','room',1500),
  ('ROOM-NICU','NICU bed / day','room',1800),
  ('NUR-DAILY','Daily Nursing Care','nursing',120),
  ('LAB-CBC','CBC','lab',60),
  ('LAB-BMP','Basic Metabolic Panel','lab',90),
  ('RAD-XRAY','X-Ray','radiology',180),
  ('RAD-CT','CT Scan','radiology',900),
  ('PROC-ECG','ECG','procedure',120),
  ('SUR-MIN','Minor Surgery','surgery',1500),
  ('SUR-MAJ','Major Surgery','surgery',8500)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.hosp_patients (first_name,last_name,gender,date_of_birth,phone,blood_group,allergies,chronic_conditions)
VALUES
  ('Ahmed','Al-Saleh','male','1985-03-14','+966500000001','O+',ARRAY['Penicillin'],ARRAY['Hypertension']),
  ('Fatimah','Al-Otaibi','female','1992-11-02','+966500000002','A+',ARRAY[]::TEXT[],ARRAY['Asthma']),
  ('John','Smith','male','1978-06-21','+966500000003','B+',ARRAY['Latex'],ARRAY[]::TEXT[]);

INSERT INTO public.hosp_encounters (patient_id, encounter_type, status, department, doctor_name, chief_complaint)
SELECT id, 'opd','waiting','General Medicine','Dr. Khalid','Headache and fever'
FROM public.hosp_patients WHERE first_name = 'Ahmed' LIMIT 1;