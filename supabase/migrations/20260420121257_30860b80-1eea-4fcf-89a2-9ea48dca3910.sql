-- ============================================================
-- HOSPITAL INFORMATION SYSTEM (HIS) ENHANCEMENT
-- Saudi/GCC + NPHIES + ICD-10 + bilingual EN/AR
-- ============================================================

-- 1) Patient Master Record (MRN)
CREATE TABLE IF NOT EXISTS public.his_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  mrn TEXT NOT NULL,
  national_id TEXT,
  iqama_number TEXT,
  passport_number TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  full_name_ar TEXT,
  gender TEXT CHECK (gender IN ('male','female','other')),
  date_of_birth DATE,
  hijri_dob TEXT,
  blood_group TEXT,
  marital_status TEXT,
  nationality TEXT,
  preferred_language TEXT DEFAULT 'en',
  mobile TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  insurance_payer TEXT,
  insurance_policy_no TEXT,
  insurance_class TEXT,
  insurance_expiry DATE,
  cchi_member_id TEXT,
  nphies_patient_id TEXT,
  allergies JSONB DEFAULT '[]'::jsonb,
  chronic_conditions JSONB DEFAULT '[]'::jsonb,
  vip_status BOOLEAN DEFAULT false,
  is_deceased BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, mrn)
);

-- 2) Triage Assessments (ESI 1-5 / MOH aligned)
CREATE TABLE IF NOT EXISTS public.his_triage_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  patient_id UUID REFERENCES public.his_patients(id) ON DELETE CASCADE,
  visit_type TEXT CHECK (visit_type IN ('opd','er','walk_in')),
  arrival_time TIMESTAMPTZ DEFAULT now(),
  triage_nurse_id UUID,
  esi_level INT CHECK (esi_level BETWEEN 1 AND 5),
  acuity TEXT,
  chief_complaint TEXT,
  chief_complaint_ar TEXT,
  temperature_c NUMERIC(4,1),
  pulse_bpm INT,
  systolic_bp INT,
  diastolic_bp INT,
  respiratory_rate INT,
  spo2 INT,
  pain_score INT CHECK (pain_score BETWEEN 0 AND 10),
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,2),
  bmi NUMERIC(5,2),
  glucose NUMERIC(5,1),
  triage_notes TEXT,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Physician Orders (CPOE)
CREATE TABLE IF NOT EXISTS public.his_physician_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  patient_id UUID REFERENCES public.his_patients(id) ON DELETE CASCADE,
  encounter_id UUID,
  ordering_physician_id UUID,
  order_type TEXT NOT NULL CHECK (order_type IN ('lab','radiology','medication','procedure','diet','nursing','referral','consult','observation')),
  order_code TEXT,
  order_name TEXT NOT NULL,
  loinc_code TEXT,
  cpt_code TEXT,
  icd10_code TEXT,
  priority TEXT DEFAULT 'routine' CHECK (priority IN ('stat','urgent','routine','timed')),
  scheduled_for TIMESTAMPTZ,
  frequency TEXT,
  duration TEXT,
  dosage TEXT,
  route TEXT,
  instructions TEXT,
  clinical_indication TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','acknowledged','in_progress','completed','cancelled','on_hold')),
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Nursing Notes
CREATE TABLE IF NOT EXISTS public.his_nursing_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  patient_id UUID REFERENCES public.his_patients(id) ON DELETE CASCADE,
  encounter_id UUID,
  nurse_id UUID,
  shift TEXT CHECK (shift IN ('morning','evening','night')),
  note_type TEXT DEFAULT 'progress' CHECK (note_type IN ('progress','assessment','intervention','handoff','incident')),
  note_text TEXT NOT NULL,
  note_text_ar TEXT,
  vitals JSONB,
  medications_administered JSONB,
  intake_ml INT,
  output_ml INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5) Insurance Preauthorization (NPHIES-aligned)
CREATE TABLE IF NOT EXISTS public.his_insurance_preauth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  patient_id UUID REFERENCES public.his_patients(id) ON DELETE CASCADE,
  encounter_id UUID,
  preauth_number TEXT,
  payer_name TEXT NOT NULL,
  policy_number TEXT,
  service_type TEXT,
  service_codes JSONB DEFAULT '[]'::jsonb,
  diagnosis_codes JSONB DEFAULT '[]'::jsonb,
  estimated_amount NUMERIC(14,2),
  approved_amount NUMERIC(14,2),
  copay_amount NUMERIC(14,2),
  deductible NUMERIC(14,2),
  nphies_request_id TEXT,
  nphies_response_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','pending','approved','partial','rejected','expired','cancelled')),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  validity_days INT DEFAULT 30,
  attachments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6) Discharge Planning
CREATE TABLE IF NOT EXISTS public.his_discharge_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  patient_id UUID REFERENCES public.his_patients(id) ON DELETE CASCADE,
  admission_id UUID,
  planned_discharge_date DATE,
  actual_discharge_date DATE,
  discharge_disposition TEXT CHECK (discharge_disposition IN ('home','transfer_hospital','rehab','ltc','dama','expired','absconded')),
  discharge_summary TEXT,
  diagnosis_primary TEXT,
  diagnosis_secondary JSONB,
  procedures_performed JSONB,
  discharge_medications JSONB,
  follow_up_instructions TEXT,
  follow_up_instructions_ar TEXT,
  follow_up_date DATE,
  follow_up_clinic TEXT,
  patient_education_provided BOOLEAN DEFAULT false,
  transportation_arranged BOOLEAN DEFAULT false,
  home_care_required BOOLEAN DEFAULT false,
  durable_medical_equipment JSONB,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning','ready','discharged','cancelled')),
  discharged_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7) Medical Billing Integration
CREATE TABLE IF NOT EXISTS public.his_medical_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  patient_id UUID REFERENCES public.his_patients(id) ON DELETE CASCADE,
  encounter_id UUID,
  bill_number TEXT NOT NULL,
  bill_date DATE DEFAULT CURRENT_DATE,
  bill_type TEXT CHECK (bill_type IN ('opd','ipd','er','pharmacy','lab','radiology','package')),
  service_lines JSONB DEFAULT '[]'::jsonb,
  gross_amount NUMERIC(14,2) DEFAULT 0,
  discount_amount NUMERIC(14,2) DEFAULT 0,
  insurance_amount NUMERIC(14,2) DEFAULT 0,
  patient_amount NUMERIC(14,2) DEFAULT 0,
  vat_amount NUMERIC(14,2) DEFAULT 0,
  net_amount NUMERIC(14,2) DEFAULT 0,
  paid_amount NUMERIC(14,2) DEFAULT 0,
  balance_amount NUMERIC(14,2) DEFAULT 0,
  preauth_id UUID REFERENCES public.his_insurance_preauth(id),
  ar_invoice_id UUID,
  posted_to_finance BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','finalized','submitted_to_payer','paid','partial','rejected','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8) Medical Records Audit Log
CREATE TABLE IF NOT EXISTS public.his_medical_record_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  patient_id UUID,
  record_type TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('view','create','update','delete','print','export','share')),
  performed_by UUID,
  performed_by_name TEXT,
  performed_by_role TEXT,
  ip_address TEXT,
  user_agent TEXT,
  reason TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9) Patient Communications (multilingual SMS/Email/WhatsApp)
CREATE TABLE IF NOT EXISTS public.his_patient_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  patient_id UUID REFERENCES public.his_patients(id) ON DELETE CASCADE,
  channel TEXT CHECK (channel IN ('sms','email','whatsapp','call','letter')),
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  language TEXT DEFAULT 'en',
  template_code TEXT,
  subject TEXT,
  message_body TEXT NOT NULL,
  related_to TEXT,
  related_id UUID,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed','cancelled')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10) Interoperability Hooks (HL7 / FHIR / device feeds)
CREATE TABLE IF NOT EXISTS public.his_interop_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  endpoint_name TEXT NOT NULL,
  endpoint_type TEXT NOT NULL CHECK (endpoint_type IN ('hl7v2','fhir_r4','dicom','device','nphies','wasfaty','seha','custom')),
  base_url TEXT,
  auth_type TEXT CHECK (auth_type IN ('none','basic','bearer','oauth2','mutual_tls')),
  direction TEXT DEFAULT 'bidirectional' CHECK (direction IN ('inbound','outbound','bidirectional')),
  resource_types JSONB DEFAULT '[]'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  total_messages_sent BIGINT DEFAULT 0,
  total_messages_received BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11) Clinical KPIs / Occupancy Snapshots
CREATE TABLE IF NOT EXISTS public.his_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  snapshot_hour INT,
  total_beds INT DEFAULT 0,
  occupied_beds INT DEFAULT 0,
  occupancy_rate NUMERIC(5,2),
  er_arrivals INT DEFAULT 0,
  er_avg_wait_minutes NUMERIC(7,2),
  er_avg_door_to_doc_minutes NUMERIC(7,2),
  opd_visits INT DEFAULT 0,
  opd_avg_wait_minutes NUMERIC(7,2),
  admissions INT DEFAULT 0,
  discharges INT DEFAULT 0,
  avg_los_days NUMERIC(5,2),
  surgeries_count INT DEFAULT 0,
  lab_orders INT DEFAULT 0,
  lab_avg_tat_minutes NUMERIC(7,2),
  radiology_orders INT DEFAULT 0,
  radiology_avg_tat_minutes NUMERIC(7,2),
  pharmacy_dispenses INT DEFAULT 0,
  preauth_pending INT DEFAULT 0,
  preauth_approved INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ENABLE RLS + permissive auth-only policies (multi-tenant ERP)
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'his_patients','his_triage_assessments','his_physician_orders','his_nursing_notes',
    'his_insurance_preauth','his_discharge_plans','his_medical_bills',
    'his_medical_record_audit','his_patient_communications','his_interop_endpoints',
    'his_kpi_snapshots'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_auth_all" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%I_auth_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_his_patients_mrn ON public.his_patients(mrn);
CREATE INDEX IF NOT EXISTS idx_his_patients_national ON public.his_patients(national_id);
CREATE INDEX IF NOT EXISTS idx_his_triage_patient ON public.his_triage_assessments(patient_id, arrival_time DESC);
CREATE INDEX IF NOT EXISTS idx_his_orders_patient ON public.his_physician_orders(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_his_nursing_patient ON public.his_nursing_notes(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_his_preauth_patient ON public.his_insurance_preauth(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_his_discharge_patient ON public.his_discharge_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_his_bills_patient ON public.his_medical_bills(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_his_audit_patient ON public.his_medical_record_audit(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_his_kpi_date ON public.his_kpi_snapshots(snapshot_date DESC);

-- ============================================================
-- Trigger: auto-compute BMI in triage
-- ============================================================
CREATE OR REPLACE FUNCTION public.his_compute_bmi()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 THEN
    NEW.bmi := ROUND((NEW.weight_kg / ((NEW.height_cm/100.0) * (NEW.height_cm/100.0)))::numeric, 2);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_his_compute_bmi ON public.his_triage_assessments;
CREATE TRIGGER trg_his_compute_bmi BEFORE INSERT OR UPDATE ON public.his_triage_assessments
FOR EACH ROW EXECUTE FUNCTION public.his_compute_bmi();

-- ============================================================
-- Trigger: auto-balance medical bill
-- ============================================================
CREATE OR REPLACE FUNCTION public.his_compute_bill_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.net_amount := COALESCE(NEW.gross_amount,0) - COALESCE(NEW.discount_amount,0) + COALESCE(NEW.vat_amount,0);
  NEW.balance_amount := COALESCE(NEW.net_amount,0) - COALESCE(NEW.paid_amount,0);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_his_bill_totals ON public.his_medical_bills;
CREATE TRIGGER trg_his_bill_totals BEFORE INSERT OR UPDATE ON public.his_medical_bills
FOR EACH ROW EXECUTE FUNCTION public.his_compute_bill_totals();

-- ============================================================
-- Seed: Saudi/GCC insurance payers + MOH triage levels + interop
-- ============================================================
INSERT INTO public.his_interop_endpoints (endpoint_name, endpoint_type, direction, resource_types, is_active)
VALUES
  ('NPHIES Eligibility & Preauth', 'nphies', 'bidirectional', '["Eligibility","Preauthorization","Claim"]'::jsonb, true),
  ('Wasfaty e-Prescription', 'wasfaty', 'outbound', '["MedicationRequest"]'::jsonb, true),
  ('Seha Virtual Hospital', 'seha', 'bidirectional', '["Encounter","Observation"]'::jsonb, false),
  ('Lab Analyzer (HL7 v2)', 'hl7v2', 'inbound', '["ORU^R01"]'::jsonb, true),
  ('PACS DICOM', 'dicom', 'bidirectional', '["Study","Series","Image"]'::jsonb, true),
  ('FHIR R4 External EHR', 'fhir_r4', 'bidirectional', '["Patient","Observation","DiagnosticReport","MedicationRequest"]'::jsonb, false)
ON CONFLICT DO NOTHING;