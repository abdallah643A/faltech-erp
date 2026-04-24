
-- Asset Maintenance Plans (Idea 181)
CREATE TABLE IF NOT EXISTS public.asset_maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'calendar',
  trigger_type TEXT NOT NULL DEFAULT 'calendar',
  interval_days INT,
  interval_hours NUMERIC,
  interval_mileage NUMERIC,
  interval_cycles INT,
  warranty_linked BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium',
  description TEXT,
  checklist JSONB DEFAULT '[]',
  assigned_technician TEXT,
  estimated_duration_hours NUMERIC,
  spare_parts JSONB DEFAULT '[]',
  last_performed_at TIMESTAMPTZ,
  next_due_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_maintenance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_maintenance_plans" ON public.asset_maintenance_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Asset Work Orders (Idea 181)
CREATE TABLE IF NOT EXISTS public.asset_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  maintenance_plan_id UUID REFERENCES public.asset_maintenance_plans(id),
  work_order_number TEXT NOT NULL,
  wo_type TEXT DEFAULT 'preventive',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  description TEXT,
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  actual_duration_hours NUMERIC,
  spare_parts_used JSONB DEFAULT '[]',
  labor_cost NUMERIC DEFAULT 0,
  parts_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  notes TEXT,
  sla_due_at TIMESTAMPTZ,
  sla_met BOOLEAN,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_work_orders" ON public.asset_work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS asset_wo_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_asset_wo_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    NEW.work_order_number := 'WO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('asset_wo_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_asset_wo_number BEFORE INSERT ON public.asset_work_orders
FOR EACH ROW EXECUTE FUNCTION public.generate_asset_wo_number();

-- Warranty & AMC Tracker (Idea 183)
CREATE TABLE IF NOT EXISTS public.asset_warranty_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  contract_type TEXT DEFAULT 'warranty',
  provider_name TEXT NOT NULL,
  provider_contact TEXT,
  policy_number TEXT,
  coverage_scope TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  response_sla_hours INT,
  entitlements JSONB DEFAULT '[]',
  premium_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  auto_renew BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_warranty_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_warranty_contracts" ON public.asset_warranty_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.asset_warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_contract_id UUID REFERENCES public.asset_warranty_contracts(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL,
  claim_date DATE DEFAULT CURRENT_DATE,
  issue_description TEXT NOT NULL,
  claim_amount NUMERIC DEFAULT 0,
  approved_amount NUMERIC,
  status TEXT DEFAULT 'submitted',
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_warranty_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_warranty_claims" ON public.asset_warranty_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Asset Check-in/Check-out (Idea 184)
CREATE TABLE IF NOT EXISTS public.asset_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  checked_out_to TEXT NOT NULL,
  checked_out_to_type TEXT DEFAULT 'employee',
  department TEXT,
  project_name TEXT,
  site_name TEXT,
  checkout_date DATE DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  condition_at_checkout TEXT DEFAULT 'good',
  condition_at_return TEXT,
  approval_status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  status TEXT DEFAULT 'checked_out',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_checkouts" ON public.asset_checkouts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Asset Transfer Approval (Idea 187)
CREATE TABLE IF NOT EXISTS public.asset_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  transfer_number TEXT,
  from_branch TEXT,
  to_branch TEXT,
  from_department TEXT,
  to_department TEXT,
  from_project TEXT,
  to_project TEXT,
  reason TEXT,
  transfer_cost NUMERIC DEFAULT 0,
  request_date DATE DEFAULT CURRENT_DATE,
  approval_status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  status TEXT DEFAULT 'requested',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_transfers" ON public.asset_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS asset_transfer_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_asset_transfer_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.transfer_number IS NULL OR NEW.transfer_number = '' THEN
    NEW.transfer_number := 'TRF-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('asset_transfer_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_asset_transfer_number BEFORE INSERT ON public.asset_transfers
FOR EACH ROW EXECUTE FUNCTION public.generate_asset_transfer_number();

-- Asset Disposal (Idea 189)
CREATE TABLE IF NOT EXISTS public.asset_disposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  disposal_number TEXT,
  disposal_type TEXT DEFAULT 'sale',
  disposal_reason TEXT,
  book_value NUMERIC DEFAULT 0,
  valuation_amount NUMERIC DEFAULT 0,
  sale_amount NUMERIC DEFAULT 0,
  gain_loss NUMERIC DEFAULT 0,
  buyer_name TEXT,
  buyer_contact TEXT,
  approval_status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  disposal_date DATE,
  accounting_entry_ref TEXT,
  attachments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_disposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_disposals" ON public.asset_disposals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS asset_disposal_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_asset_disposal_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.disposal_number IS NULL OR NEW.disposal_number = '' THEN
    NEW.disposal_number := 'DSP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('asset_disposal_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_asset_disposal_number BEFORE INSERT ON public.asset_disposals
FOR EACH ROW EXECUTE FUNCTION public.generate_asset_disposal_number();

-- Spare Parts Linkage (Idea 190)
CREATE TABLE IF NOT EXISTS public.asset_spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  part_code TEXT NOT NULL,
  part_name TEXT NOT NULL,
  specification TEXT,
  manufacturer TEXT,
  substitute_parts TEXT,
  reorder_threshold INT DEFAULT 5,
  current_stock INT DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  lead_time_days INT DEFAULT 7,
  last_consumed_at TIMESTAMPTZ,
  total_consumed INT DEFAULT 0,
  is_critical BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_spare_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_spare_parts" ON public.asset_spare_parts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Field Inspections (Idea 191)
CREATE TABLE IF NOT EXISTS public.asset_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  inspection_number TEXT,
  inspector_name TEXT NOT NULL,
  inspection_date DATE DEFAULT CURRENT_DATE,
  inspection_type TEXT DEFAULT 'routine',
  checklist_results JSONB DEFAULT '[]',
  overall_condition TEXT DEFAULT 'good',
  faults_found JSONB DEFAULT '[]',
  meter_reading NUMERIC,
  photos JSONB DEFAULT '[]',
  signature_url TEXT,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  qr_scanned BOOLEAN DEFAULT false,
  notes TEXT,
  status TEXT DEFAULT 'completed',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_inspections" ON public.asset_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS asset_inspection_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_asset_inspection_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.inspection_number IS NULL OR NEW.inspection_number = '' THEN
    NEW.inspection_number := 'INS-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('asset_inspection_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_asset_inspection_number BEFORE INSERT ON public.asset_inspections
FOR EACH ROW EXECUTE FUNCTION public.generate_asset_inspection_number();

-- Calibration Tracker (Idea 192)
CREATE TABLE IF NOT EXISTS public.asset_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  calibration_number TEXT,
  calibration_provider TEXT NOT NULL,
  calibration_date DATE NOT NULL,
  next_calibration_date DATE,
  certificate_number TEXT,
  certificate_url TEXT,
  tolerance_status TEXT DEFAULT 'within_tolerance',
  standard_used TEXT,
  results JSONB DEFAULT '[]',
  is_locked_out BOOLEAN DEFAULT false,
  lockout_reason TEXT,
  notes TEXT,
  status TEXT DEFAULT 'valid',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_calibrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_calibrations" ON public.asset_calibrations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS asset_calibration_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_asset_calibration_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.calibration_number IS NULL OR NEW.calibration_number = '' THEN
    NEW.calibration_number := 'CAL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('asset_calibration_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_asset_calibration_number BEFORE INSERT ON public.asset_calibrations
FOR EACH ROW EXECUTE FUNCTION public.generate_asset_calibration_number();

-- Insurance Tracker (Idea 193)
CREATE TABLE IF NOT EXISTS public.asset_insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  insurer_name TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  coverage_type TEXT DEFAULT 'comprehensive',
  insured_value NUMERIC DEFAULT 0,
  premium_amount NUMERIC DEFAULT 0,
  deductible NUMERIC DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  exclusions TEXT,
  claims_history JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  renewal_reminder_days INT DEFAULT 30,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_insurance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_insurance" ON public.asset_insurance_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fuel & Operating Consumption (Idea 194)
CREATE TABLE IF NOT EXISTS public.asset_fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  log_date DATE DEFAULT CURRENT_DATE,
  fuel_type TEXT DEFAULT 'diesel',
  quantity NUMERIC NOT NULL,
  unit TEXT DEFAULT 'liters',
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  meter_reading NUMERIC,
  operator_name TEXT,
  project_name TEXT,
  branch_name TEXT,
  consumption_rate NUMERIC,
  is_anomaly BOOLEAN DEFAULT false,
  anomaly_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_fuel_logs" ON public.asset_fuel_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Capitalization & Component Accounting (Idea 188)
CREATE TABLE IF NOT EXISTS public.asset_capitalization_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  equipment_id UUID NOT NULL,
  component_name TEXT NOT NULL,
  component_code TEXT,
  original_cost NUMERIC DEFAULT 0,
  current_book_value NUMERIC DEFAULT 0,
  useful_life_months INT,
  depreciation_method TEXT DEFAULT 'straight_line',
  depreciation_rate NUMERIC DEFAULT 0,
  accumulated_depreciation NUMERIC DEFAULT 0,
  revaluation_amount NUMERIC,
  revaluation_date DATE,
  impairment_amount NUMERIC DEFAULT 0,
  capitalization_date DATE,
  is_major_repair BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.asset_capitalization_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access_capitalization" ON public.asset_capitalization_components FOR ALL TO authenticated USING (true) WITH CHECK (true);
