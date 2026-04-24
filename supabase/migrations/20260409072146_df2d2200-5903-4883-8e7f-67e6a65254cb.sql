
-- Add parent_asset_id for hierarchy support
ALTER TABLE public.cpms_equipment ADD COLUMN IF NOT EXISTS parent_asset_id UUID REFERENCES public.cpms_equipment(id);
CREATE INDEX IF NOT EXISTS idx_cpms_equipment_parent ON public.cpms_equipment(parent_asset_id);

-- ============================================================
-- Idea 195: Meter & Runtime Reading Management
-- ============================================================
CREATE TABLE public.asset_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.cpms_equipment(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  reading_type TEXT NOT NULL DEFAULT 'hours', -- hours, odometer, cycles, custom
  reading_value NUMERIC NOT NULL,
  previous_value NUMERIC,
  delta NUMERIC,
  reading_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'manual', -- manual, scanned, automatic
  recorded_by UUID,
  is_abnormal BOOLEAN DEFAULT false,
  abnormal_reason TEXT,
  validated BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_meter_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_meter_readings" ON public.asset_meter_readings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_meter_readings_eq ON public.asset_meter_readings(equipment_id, reading_date DESC);

-- ============================================================
-- Idea 196: Asset Reservation Calendar
-- ============================================================
CREATE TABLE public.asset_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.cpms_equipment(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  reserved_by UUID,
  reserved_for_name TEXT,
  department TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, active, completed, cancelled
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_reservations" ON public.asset_reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_reservations_eq_dates ON public.asset_reservations(equipment_id, start_date, end_date);

-- ============================================================
-- Idea 197: Asset Incident & Damage Register
-- ============================================================
CREATE TABLE public.asset_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.cpms_equipment(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  incident_number TEXT,
  incident_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  incident_type TEXT, -- damage, theft, accident, malfunction, vandalism
  description TEXT NOT NULL,
  location TEXT,
  reported_by UUID,
  reported_by_name TEXT,
  responsible_party TEXT,
  repair_estimate NUMERIC DEFAULT 0,
  actual_repair_cost NUMERIC,
  insurance_claim_id TEXT,
  insurance_status TEXT DEFAULT 'not_applicable', -- not_applicable, pending, submitted, approved, rejected
  downtime_hours NUMERIC DEFAULT 0,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open, investigating, repair_in_progress, resolved, closed
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_incidents" ON public.asset_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE SEQUENCE IF NOT EXISTS asset_incident_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_asset_incident_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
    NEW.incident_number := 'INC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('asset_incident_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_asset_incident_number BEFORE INSERT ON public.asset_incidents
FOR EACH ROW EXECUTE FUNCTION public.generate_asset_incident_number();

-- ============================================================
-- Idea 198: Refurbishment & Major Overhaul
-- ============================================================
CREATE TABLE public.asset_overhauls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.cpms_equipment(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  overhaul_number TEXT,
  title TEXT NOT NULL,
  overhaul_type TEXT DEFAULT 'refurbishment', -- refurbishment, major_overhaul, rebuild, retrofit
  scope_description TEXT,
  estimated_budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  approved_budget NUMERIC,
  budget_approved_by UUID,
  budget_approved_at TIMESTAMPTZ,
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  downtime_days NUMERIC DEFAULT 0,
  parts_replaced TEXT[],
  life_extension_years NUMERIC,
  pre_condition TEXT,
  post_condition TEXT,
  pre_performance_score NUMERIC,
  post_performance_score NUMERIC,
  vendor TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, pending_approval, approved, in_progress, completed, cancelled
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_overhauls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_overhauls" ON public.asset_overhauls FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE SEQUENCE IF NOT EXISTS asset_overhaul_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_asset_overhaul_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.overhaul_number IS NULL OR NEW.overhaul_number = '' THEN
    NEW.overhaul_number := 'OVH-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('asset_overhaul_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_asset_overhaul_number BEFORE INSERT ON public.asset_overhauls
FOR EACH ROW EXECUTE FUNCTION public.generate_asset_overhaul_number();

-- ============================================================
-- Idea 199: Asset Budget Planning
-- ============================================================
CREATE TABLE public.asset_budget_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  plan_name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  department TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, approved, rejected
  total_acquisition NUMERIC DEFAULT 0,
  total_renewal NUMERIC DEFAULT 0,
  total_replacement NUMERIC DEFAULT 0,
  total_maintenance NUMERIC DEFAULT 0,
  total_disposal NUMERIC DEFAULT 0,
  total_budget NUMERIC DEFAULT 0,
  total_actual NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_budget_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_budget_plans" ON public.asset_budget_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.asset_budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.asset_budget_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- acquisition, renewal, replacement, maintenance, disposal
  asset_category TEXT,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  total_budget NUMERIC DEFAULT 0,
  total_actual NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  month_1 NUMERIC DEFAULT 0, month_2 NUMERIC DEFAULT 0, month_3 NUMERIC DEFAULT 0,
  month_4 NUMERIC DEFAULT 0, month_5 NUMERIC DEFAULT 0, month_6 NUMERIC DEFAULT 0,
  month_7 NUMERIC DEFAULT 0, month_8 NUMERIC DEFAULT 0, month_9 NUMERIC DEFAULT 0,
  month_10 NUMERIC DEFAULT 0, month_11 NUMERIC DEFAULT 0, month_12 NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_budget_lines" ON public.asset_budget_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Idea 200: Asset Replacement Recommendation Engine
-- ============================================================
CREATE TABLE public.asset_replacement_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.cpms_equipment(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  age_score NUMERIC DEFAULT 0,
  utilization_score NUMERIC DEFAULT 0,
  maintenance_cost_score NUMERIC DEFAULT 0,
  downtime_score NUMERIC DEFAULT 0,
  safety_risk_score NUMERIC DEFAULT 0,
  warranty_score NUMERIC DEFAULT 0,
  residual_value_score NUMERIC DEFAULT 0,
  overall_score NUMERIC DEFAULT 0,
  recommendation TEXT, -- repair, retain, refurbish, replace
  recommendation_reason TEXT,
  estimated_replacement_cost NUMERIC,
  estimated_remaining_life_years NUMERIC,
  calculated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_replacement_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_replacement_scores" ON public.asset_replacement_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Idea 201: Employee IT Asset Issuance Pack
-- ============================================================
CREATE TABLE public.asset_it_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  pack_name TEXT NOT NULL,
  pack_type TEXT DEFAULT 'onboarding', -- onboarding, role_based, custom
  description TEXT,
  is_template BOOLEAN DEFAULT false,
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT,
  issued_date TIMESTAMPTZ,
  returned_date TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_signature TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, issued, acknowledged, partially_returned, returned
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_it_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_it_packs" ON public.asset_it_packs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.asset_it_pack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES public.asset_it_packs(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.cpms_equipment(id),
  item_type TEXT NOT NULL, -- laptop, phone, monitor, keyboard, mouse, headset, license, access_card
  item_name TEXT NOT NULL,
  serial_number TEXT,
  condition_issued TEXT DEFAULT 'new',
  condition_returned TEXT,
  issued BOOLEAN DEFAULT false,
  returned BOOLEAN DEFAULT false,
  return_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_it_pack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_it_pack_items" ON public.asset_it_pack_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Idea 203: Geolocation & Site Mapping
-- ============================================================
CREATE TABLE public.asset_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.cpms_equipment(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  latitude NUMERIC,
  longitude NUMERIC,
  site_name TEXT,
  zone TEXT,
  address TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'manual', -- manual, gps, scan
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_locations" ON public.asset_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_asset_locations_eq ON public.asset_locations(equipment_id, recorded_at DESC);

-- ============================================================
-- Idea 204: Rental Asset Billing & Utilization
-- ============================================================
CREATE TABLE public.asset_rental_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.cpms_equipment(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  contract_number TEXT,
  customer_name TEXT NOT NULL,
  customer_id UUID REFERENCES public.business_partners(id),
  project_id UUID REFERENCES public.projects(id),
  start_date DATE NOT NULL,
  end_date DATE,
  rate_type TEXT DEFAULT 'daily', -- hourly, daily, weekly, monthly
  rate_amount NUMERIC NOT NULL DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  insurance_required BOOLEAN DEFAULT false,
  terms TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, completed, cancelled
  total_billed NUMERIC DEFAULT 0,
  total_collected NUMERIC DEFAULT 0,
  damage_charges NUMERIC DEFAULT 0,
  return_condition TEXT,
  return_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_rental_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_rental_contracts" ON public.asset_rental_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.asset_rental_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.asset_rental_contracts(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  usage_quantity NUMERIC DEFAULT 0,
  rate_amount NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  damage_charges NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, invoiced, paid
  invoice_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_rental_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_rental_billing" ON public.asset_rental_billing FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Idea 205: Borrowed & Leased Asset Register
-- ============================================================
CREATE TABLE public.asset_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.cpms_equipment(id),
  company_id UUID REFERENCES public.sap_companies(id),
  lease_type TEXT DEFAULT 'leased', -- leased, rented, borrowed
  provider_name TEXT NOT NULL,
  provider_id UUID REFERENCES public.business_partners(id),
  contract_reference TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  return_date DATE,
  monthly_charge NUMERIC DEFAULT 0,
  total_charges NUMERIC DEFAULT 0,
  deposit NUMERIC DEFAULT 0,
  damage_responsibility TEXT DEFAULT 'lessee',
  terms TEXT,
  asset_description TEXT,
  serial_number TEXT,
  assigned_project_id UUID REFERENCES public.projects(id),
  assigned_department TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, returned, expired, cancelled
  return_condition TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_leases" ON public.asset_leases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Idea 206: Fixed Asset Audit & Count
-- ============================================================
CREATE TABLE public.asset_audit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  audit_name TEXT NOT NULL,
  audit_type TEXT DEFAULT 'full', -- full, sample, spot_check
  planned_date DATE NOT NULL,
  completed_date DATE,
  branch_id UUID REFERENCES public.branches(id),
  location TEXT,
  assigned_counters TEXT[],
  total_assets INTEGER DEFAULT 0,
  counted INTEGER DEFAULT 0,
  matched INTEGER DEFAULT 0,
  missing INTEGER DEFAULT 0,
  surplus INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned', -- planned, in_progress, pending_review, completed, cancelled
  recount_required BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  report_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_audit_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_audit_plans" ON public.asset_audit_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.asset_audit_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_plan_id UUID NOT NULL REFERENCES public.asset_audit_plans(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.cpms_equipment(id),
  expected_location TEXT,
  found_location TEXT,
  scanned_qr TEXT,
  counted_by UUID,
  counted_by_name TEXT,
  counted_at TIMESTAMPTZ,
  condition TEXT,
  status TEXT DEFAULT 'pending', -- pending, found, missing, surplus, condition_changed
  variance_notes TEXT,
  recount BOOLEAN DEFAULT false,
  recount_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_audit_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_audit_counts" ON public.asset_audit_counts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Idea 207: Asset Document Library
-- ============================================================
CREATE TABLE public.asset_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.cpms_equipment(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  document_type TEXT NOT NULL, -- manual, drawing, certificate, invoice, warranty, maintenance, compliance, photo
  title TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  previous_version_id UUID REFERENCES public.asset_documents(id),
  expiry_date DATE,
  tags TEXT[],
  uploaded_by UUID,
  uploaded_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_documents" ON public.asset_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_asset_docs_eq ON public.asset_documents(equipment_id);

-- ============================================================
-- Idea 208: Asset Downtime Reason Analytics
-- ============================================================
CREATE TABLE public.asset_downtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.cpms_equipment(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_hours NUMERIC,
  reason_category TEXT NOT NULL, -- mechanical_failure, electrical_failure, spare_part_delay, operator_issue, planned_maintenance, external_vendor_delay, safety_stop, weather, other
  reason_detail TEXT,
  failure_component TEXT,
  spare_part_needed TEXT,
  vendor_involved TEXT,
  impact_description TEXT,
  cost_impact NUMERIC DEFAULT 0,
  reported_by UUID,
  status TEXT DEFAULT 'active', -- active, resolved
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_downtime_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_downtime" ON public.asset_downtime_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_downtime_eq ON public.asset_downtime_events(equipment_id, start_time DESC);

-- ============================================================
-- Idea 209: Asset Service Vendor Scorecard
-- ============================================================
CREATE TABLE public.asset_vendor_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.business_partners(id),
  company_id UUID REFERENCES public.sap_companies(id),
  vendor_name TEXT NOT NULL,
  contract_reference TEXT,
  service_type TEXT, -- maintenance, repair, calibration, inspection
  total_jobs INTEGER DEFAULT 0,
  avg_response_hours NUMERIC DEFAULT 0,
  avg_repair_quality NUMERIC DEFAULT 0,
  repeat_failure_rate NUMERIC DEFAULT 0,
  avg_maintenance_cost NUMERIC DEFAULT 0,
  parts_availability_score NUMERIC DEFAULT 0,
  sla_compliance_percent NUMERIC DEFAULT 0,
  overall_score NUMERIC DEFAULT 0,
  rating TEXT DEFAULT 'unrated', -- excellent, good, average, poor, unrated
  total_reviews INTEGER DEFAULT 0,
  last_review_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_vendor_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_vendor_scorecards" ON public.asset_vendor_scorecards FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.asset_vendor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID NOT NULL REFERENCES public.asset_vendor_scorecards(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.cpms_equipment(id),
  work_order_reference TEXT,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  response_time_hours NUMERIC,
  repair_quality_score NUMERIC, -- 1-5
  cost_reasonableness NUMERIC, -- 1-5
  parts_availability NUMERIC, -- 1-5
  sla_met BOOLEAN DEFAULT true,
  repeat_failure BOOLEAN DEFAULT false,
  reviewer_id UUID,
  reviewer_name TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_vendor_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_vendor_reviews" ON public.asset_vendor_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger to update scorecard aggregates
CREATE OR REPLACE FUNCTION public.update_asset_vendor_scorecard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sc_id UUID;
BEGIN
  v_sc_id := COALESCE(NEW.scorecard_id, OLD.scorecard_id);
  UPDATE public.asset_vendor_scorecards SET
    total_jobs = sub.cnt,
    avg_response_hours = sub.avg_resp,
    avg_repair_quality = sub.avg_qual,
    avg_maintenance_cost = 0,
    parts_availability_score = sub.avg_parts,
    sla_compliance_percent = sub.sla_pct,
    repeat_failure_rate = sub.repeat_pct,
    overall_score = (sub.avg_qual * 20 + (100 - COALESCE(sub.avg_resp, 0)) + sub.avg_parts * 20 + sub.sla_pct) / 4,
    total_reviews = sub.cnt,
    last_review_date = sub.last_date,
    rating = CASE
      WHEN (sub.avg_qual * 20 + (100 - COALESCE(sub.avg_resp, 0)) + sub.avg_parts * 20 + sub.sla_pct) / 4 >= 80 THEN 'excellent'
      WHEN (sub.avg_qual * 20 + (100 - COALESCE(sub.avg_resp, 0)) + sub.avg_parts * 20 + sub.sla_pct) / 4 >= 60 THEN 'good'
      WHEN (sub.avg_qual * 20 + (100 - COALESCE(sub.avg_resp, 0)) + sub.avg_parts * 20 + sub.sla_pct) / 4 >= 40 THEN 'average'
      ELSE 'poor'
    END,
    updated_at = now()
  FROM (
    SELECT
      COUNT(*) as cnt,
      AVG(response_time_hours) as avg_resp,
      AVG(repair_quality_score) as avg_qual,
      AVG(parts_availability) as avg_parts,
      ROUND(COUNT(*) FILTER (WHERE sla_met) * 100.0 / NULLIF(COUNT(*), 0), 1) as sla_pct,
      ROUND(COUNT(*) FILTER (WHERE repeat_failure) * 100.0 / NULLIF(COUNT(*), 0), 1) as repeat_pct,
      MAX(review_date) as last_date
    FROM public.asset_vendor_reviews WHERE scorecard_id = v_sc_id
  ) sub
  WHERE id = v_sc_id;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_update_vendor_scorecard
AFTER INSERT OR UPDATE OR DELETE ON public.asset_vendor_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_asset_vendor_scorecard();
