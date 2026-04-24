
-- Fleet Categories
CREATE TABLE public.fleet_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'vehicle' CHECK (type IN ('vehicle','equipment','trailer','other')),
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fleet_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_categories_auth" ON public.fleet_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Assets (master)
CREATE TABLE public.fleet_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  category_id UUID REFERENCES public.fleet_categories(id),
  asset_code TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vin_chassis TEXT,
  engine_number TEXT,
  plate_number TEXT,
  registration_country TEXT DEFAULT 'SA',
  color TEXT,
  asset_tag TEXT,
  barcode TEXT,
  ownership_type TEXT DEFAULT 'owned' CHECK (ownership_type IN ('owned','leased','rented','subcontracted')),
  fuel_type TEXT DEFAULT 'diesel' CHECK (fuel_type IN ('diesel','gasoline','electric','hybrid','lpg','cng','other')),
  tank_capacity_liters NUMERIC(10,2),
  odometer_unit TEXT DEFAULT 'km' CHECK (odometer_unit IN ('km','miles')),
  current_odometer NUMERIC(12,2) DEFAULT 0,
  current_engine_hours NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','assigned','under_maintenance','breakdown','reserved','inactive','sold','disposed')),
  department TEXT,
  cost_center TEXT,
  project_id UUID REFERENCES public.projects(id),
  site_location TEXT,
  default_driver_id UUID,
  supervisor_id UUID,
  purchase_date DATE,
  capitalization_date DATE,
  in_service_date DATE,
  warranty_start DATE,
  warranty_end DATE,
  lease_start DATE,
  lease_end DATE,
  purchase_value NUMERIC(14,2),
  residual_value NUMERIC(14,2),
  useful_life_months INTEGER,
  fixed_asset_id UUID REFERENCES public.fixed_assets(id),
  insurance_policy TEXT,
  insurance_expiry DATE,
  registration_expiry DATE,
  next_service_date DATE,
  next_service_odometer NUMERIC(12,2),
  notes TEXT,
  image_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_fleet_assets_company ON public.fleet_assets(company_id);
CREATE INDEX idx_fleet_assets_status ON public.fleet_assets(status);
CREATE INDEX idx_fleet_assets_category ON public.fleet_assets(category_id);
ALTER TABLE public.fleet_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_assets_auth" ON public.fleet_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Drivers
CREATE TABLE public.fleet_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  employee_id UUID REFERENCES public.employees(id),
  driver_code TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  license_class TEXT,
  license_number TEXT,
  license_expiry DATE,
  medical_check_expiry DATE,
  certifications TEXT[],
  safety_score NUMERIC(5,2) DEFAULT 100,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','on_leave','suspended','unavailable','terminated')),
  violations_count INTEGER DEFAULT 0,
  incidents_count INTEGER DEFAULT 0,
  notes TEXT,
  photo_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fleet_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_drivers_auth" ON public.fleet_drivers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Assignments
CREATE TABLE public.fleet_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  asset_id UUID REFERENCES public.fleet_assets(id) NOT NULL,
  driver_id UUID REFERENCES public.fleet_drivers(id),
  assigned_to_employee UUID,
  assigned_to_department TEXT,
  assigned_to_project UUID REFERENCES public.projects(id),
  assigned_to_branch UUID REFERENCES public.branches(id),
  assignment_type TEXT DEFAULT 'permanent' CHECK (assignment_type IN ('permanent','temporary','project','trip','rental')),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  handover_notes TEXT,
  return_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fleet_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_assignments_auth" ON public.fleet_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Trips
CREATE TABLE public.fleet_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  trip_number TEXT,
  asset_id UUID REFERENCES public.fleet_assets(id) NOT NULL,
  driver_id UUID REFERENCES public.fleet_drivers(id),
  trip_type TEXT DEFAULT 'delivery' CHECK (trip_type IN ('delivery','pickup','service','transfer','site_visit','commute','other')),
  origin TEXT,
  destination TEXT,
  purpose TEXT,
  customer_name TEXT,
  project_id UUID REFERENCES public.projects(id),
  sales_order_id UUID,
  cargo_type TEXT,
  planned_departure TIMESTAMPTZ,
  planned_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  start_odometer NUMERIC(12,2),
  end_odometer NUMERIC(12,2),
  distance_km NUMERIC(10,2),
  fuel_used_liters NUMERIC(10,2),
  tolls_amount NUMERIC(10,2) DEFAULT 0,
  allowances_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  incidents_notes TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS fleet_trip_seq START 1;
ALTER TABLE public.fleet_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_trips_auth" ON public.fleet_trips FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Fuel Logs
CREATE TABLE public.fleet_fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  asset_id UUID REFERENCES public.fleet_assets(id) NOT NULL,
  driver_id UUID REFERENCES public.fleet_drivers(id),
  fill_date DATE NOT NULL,
  station_name TEXT,
  vendor_id UUID,
  fuel_type TEXT,
  quantity_liters NUMERIC(10,3) NOT NULL,
  unit_price NUMERIC(10,4),
  total_cost NUMERIC(12,2),
  odometer_at_fill NUMERIC(12,2),
  engine_hours_at_fill NUMERIC(12,2),
  is_full_tank BOOLEAN DEFAULT true,
  receipt_url TEXT,
  trip_id UUID REFERENCES public.fleet_trips(id),
  cost_center TEXT,
  project_id UUID REFERENCES public.projects(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_fleet_fuel_asset ON public.fleet_fuel_logs(asset_id);
ALTER TABLE public.fleet_fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_fuel_auth" ON public.fleet_fuel_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Maintenance Plans (preventive)
CREATE TABLE public.fleet_maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  plan_name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.fleet_categories(id),
  interval_type TEXT NOT NULL CHECK (interval_type IN ('km','hours','days','weeks','months')),
  interval_value NUMERIC(10,2) NOT NULL,
  checklist JSONB,
  estimated_cost NUMERIC(12,2),
  estimated_duration_hours NUMERIC(6,2),
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fleet_maintenance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_maint_plans_auth" ON public.fleet_maintenance_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Maintenance Jobs
CREATE TABLE public.fleet_maintenance_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  job_number TEXT,
  asset_id UUID REFERENCES public.fleet_assets(id) NOT NULL,
  plan_id UUID REFERENCES public.fleet_maintenance_plans(id),
  job_type TEXT DEFAULT 'preventive' CHECK (job_type IN ('preventive','corrective','breakdown','inspection','overhaul')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  description TEXT,
  workshop_type TEXT DEFAULT 'internal' CHECK (workshop_type IN ('internal','external')),
  vendor_id UUID,
  vendor_name TEXT,
  assigned_technician TEXT,
  reported_date DATE,
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  odometer_at_job NUMERIC(12,2),
  engine_hours_at_job NUMERIC(12,2),
  labor_cost NUMERIC(12,2) DEFAULT 0,
  parts_cost NUMERIC(12,2) DEFAULT 0,
  service_cost NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  warranty_covered BOOLEAN DEFAULT false,
  downtime_hours NUMERIC(8,2),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','scheduled','in_progress','pending_parts','completed','cancelled')),
  resolution_notes TEXT,
  cost_center TEXT,
  project_id UUID REFERENCES public.projects(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS fleet_job_seq START 1;
ALTER TABLE public.fleet_maintenance_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_maint_jobs_auth" ON public.fleet_maintenance_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Maintenance Parts
CREATE TABLE public.fleet_maintenance_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.fleet_maintenance_jobs(id) NOT NULL,
  item_code TEXT,
  item_description TEXT NOT NULL,
  quantity NUMERIC(10,3) DEFAULT 1,
  unit TEXT DEFAULT 'EA',
  unit_cost NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  warehouse_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fleet_maintenance_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_maint_parts_auth" ON public.fleet_maintenance_parts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Compliance Docs
CREATE TABLE public.fleet_compliance_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  asset_id UUID REFERENCES public.fleet_assets(id),
  driver_id UUID REFERENCES public.fleet_drivers(id),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('registration','insurance','inspection','permit','license','certification','other')),
  doc_name TEXT NOT NULL,
  doc_number TEXT,
  issuer TEXT,
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expiring_soon','expired','renewed','cancelled')),
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal','attention','warning','critical','expired')),
  renewal_cost NUMERIC(12,2),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_fleet_compliance_expiry ON public.fleet_compliance_docs(expiry_date);
ALTER TABLE public.fleet_compliance_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_compliance_auth" ON public.fleet_compliance_docs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Incidents
CREATE TABLE public.fleet_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  incident_number TEXT,
  asset_id UUID REFERENCES public.fleet_assets(id) NOT NULL,
  driver_id UUID REFERENCES public.fleet_drivers(id),
  incident_date TIMESTAMPTZ NOT NULL,
  incident_type TEXT DEFAULT 'accident' CHECK (incident_type IN ('accident','breakdown','theft','vandalism','fire','other')),
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor','moderate','major','total_loss')),
  location TEXT,
  description TEXT,
  police_report_number TEXT,
  third_party_details TEXT,
  root_cause TEXT,
  responsibility TEXT,
  repair_cost NUMERIC(12,2) DEFAULT 0,
  claim_amount NUMERIC(12,2) DEFAULT 0,
  insurance_claim_ref TEXT,
  claim_status TEXT DEFAULT 'none' CHECK (claim_status IN ('none','submitted','in_review','approved','rejected','settled')),
  downtime_days NUMERIC(6,1) DEFAULT 0,
  maintenance_job_id UUID REFERENCES public.fleet_maintenance_jobs(id),
  preventive_action TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  photos JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS fleet_incident_seq START 1;
ALTER TABLE public.fleet_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_incidents_auth" ON public.fleet_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Leases
CREATE TABLE public.fleet_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  asset_id UUID REFERENCES public.fleet_assets(id) NOT NULL,
  lease_type TEXT DEFAULT 'lease' CHECK (lease_type IN ('lease','rental','subcontract')),
  vendor_id UUID,
  vendor_name TEXT,
  contract_number TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent NUMERIC(12,2),
  included_km NUMERIC(10,2),
  included_hours NUMERIC(10,2),
  excess_km_rate NUMERIC(8,4),
  excess_hour_rate NUMERIC(8,4),
  penalty_terms TEXT,
  renewal_terms TEXT,
  total_contract_value NUMERIC(14,2),
  deposit_amount NUMERIC(12,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft','active','expired','terminated','renewed')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fleet_leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_leases_auth" ON public.fleet_leases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Cost Entries
CREATE TABLE public.fleet_cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  asset_id UUID REFERENCES public.fleet_assets(id) NOT NULL,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('fuel','maintenance','insurance','registration','tire','battery','toll','parking','fine','wash','lease_payment','rental','accident','other')),
  cost_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  description TEXT,
  vendor_name TEXT,
  reference_type TEXT,
  reference_id UUID,
  cost_center TEXT,
  project_id UUID REFERENCES public.projects(id),
  branch_id UUID REFERENCES public.branches(id),
  department TEXT,
  is_chargeback BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_fleet_costs_asset ON public.fleet_cost_entries(asset_id);
CREATE INDEX idx_fleet_costs_date ON public.fleet_cost_entries(cost_date);
ALTER TABLE public.fleet_cost_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_costs_auth" ON public.fleet_cost_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Meter Readings
CREATE TABLE public.fleet_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.fleet_assets(id) NOT NULL,
  reading_date TIMESTAMPTZ DEFAULT now(),
  odometer NUMERIC(12,2),
  engine_hours NUMERIC(12,2),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','trip','fuel','maintenance','gps')),
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_fleet_meters_asset ON public.fleet_meter_readings(asset_id);
ALTER TABLE public.fleet_meter_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_meters_auth" ON public.fleet_meter_readings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Reservations
CREATE TABLE public.fleet_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  asset_id UUID REFERENCES public.fleet_assets(id) NOT NULL,
  requested_by UUID,
  requested_by_name TEXT,
  department TEXT,
  project_id UUID REFERENCES public.projects(id),
  purpose TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fleet_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_reservations_auth" ON public.fleet_reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Rate Cards
CREATE TABLE public.fleet_rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  category_id UUID REFERENCES public.fleet_categories(id),
  asset_id UUID REFERENCES public.fleet_assets(id),
  rate_type TEXT NOT NULL CHECK (rate_type IN ('hourly','daily','weekly','monthly','per_km','per_trip')),
  rate_amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fleet_rate_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_rate_cards_auth" ON public.fleet_rate_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fleet Settings
CREATE TABLE public.fleet_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, setting_key)
);
ALTER TABLE public.fleet_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_settings_auth" ON public.fleet_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_fleet_assets_ts BEFORE UPDATE ON public.fleet_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_drivers_ts BEFORE UPDATE ON public.fleet_drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_assignments_ts BEFORE UPDATE ON public.fleet_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_trips_ts BEFORE UPDATE ON public.fleet_trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_maint_plans_ts BEFORE UPDATE ON public.fleet_maintenance_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_maint_jobs_ts BEFORE UPDATE ON public.fleet_maintenance_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_compliance_ts BEFORE UPDATE ON public.fleet_compliance_docs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_incidents_ts BEFORE UPDATE ON public.fleet_incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_leases_ts BEFORE UPDATE ON public.fleet_leases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_reservations_ts BEFORE UPDATE ON public.fleet_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_categories_ts BEFORE UPDATE ON public.fleet_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_settings_ts BEFORE UPDATE ON public.fleet_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fleet_rate_cards_ts BEFORE UPDATE ON public.fleet_rate_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate trip numbers
CREATE OR REPLACE FUNCTION public.generate_fleet_trip_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.trip_number IS NULL OR NEW.trip_number = '' THEN
    NEW.trip_number := 'FT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('fleet_trip_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER gen_fleet_trip_num BEFORE INSERT ON public.fleet_trips FOR EACH ROW EXECUTE FUNCTION generate_fleet_trip_number();

-- Auto-generate job numbers
CREATE OR REPLACE FUNCTION public.generate_fleet_job_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    NEW.job_number := 'FJ-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('fleet_job_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER gen_fleet_job_num BEFORE INSERT ON public.fleet_maintenance_jobs FOR EACH ROW EXECUTE FUNCTION generate_fleet_job_number();

-- Auto-generate incident numbers
CREATE OR REPLACE FUNCTION public.generate_fleet_incident_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
    NEW.incident_number := 'FI-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('fleet_incident_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER gen_fleet_incident_num BEFORE INSERT ON public.fleet_incidents FOR EACH ROW EXECUTE FUNCTION generate_fleet_incident_number();
