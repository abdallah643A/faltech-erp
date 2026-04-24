
-- ============================================
-- TRANSPORT & DISPATCH MANAGEMENT
-- ============================================

CREATE SEQUENCE IF NOT EXISTS dispatch_trip_seq START 1;

CREATE TABLE public.dispatch_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  plate_number TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'truck',
  capacity_kg NUMERIC,
  capacity_cbm NUMERIC,
  driver_name TEXT,
  driver_phone TEXT,
  status TEXT DEFAULT 'available',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.dispatch_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_dispatch_vehicles" ON public.dispatch_vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.dispatch_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  trip_number TEXT,
  vehicle_id UUID REFERENCES public.dispatch_vehicles(id),
  driver_name TEXT,
  driver_phone TEXT,
  route_name TEXT,
  status TEXT DEFAULT 'planned',
  planned_departure TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  planned_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  total_stops INTEGER DEFAULT 0,
  completed_stops INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.dispatch_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_dispatch_trips" ON public.dispatch_trips FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.generate_dispatch_trip_number() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.trip_number IS NULL OR NEW.trip_number = '' THEN
    NEW.trip_number := 'TRIP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('dispatch_trip_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_dispatch_trip_number BEFORE INSERT ON public.dispatch_trips FOR EACH ROW EXECUTE FUNCTION public.generate_dispatch_trip_number();

CREATE TABLE public.dispatch_trip_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.dispatch_trips(id) ON DELETE CASCADE,
  stop_order INTEGER DEFAULT 1,
  customer_name TEXT,
  delivery_address TEXT,
  sales_order_id UUID,
  sales_order_ref TEXT,
  status TEXT DEFAULT 'pending',
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  proof_of_delivery_url TEXT,
  signed_by TEXT,
  receiver_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.dispatch_trip_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_dispatch_trip_stops" ON public.dispatch_trip_stops FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.dispatch_delay_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.dispatch_trips(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES public.dispatch_trip_stops(id),
  incident_type TEXT DEFAULT 'delay',
  delay_reason TEXT,
  delay_minutes INTEGER DEFAULT 0,
  description TEXT,
  reported_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.dispatch_delay_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_dispatch_delay_incidents" ON public.dispatch_delay_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- QUALITY LAB & SAMPLE MANAGEMENT
-- ============================================

CREATE SEQUENCE IF NOT EXISTS quality_sample_seq START 1;

CREATE TABLE public.quality_test_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  plan_name TEXT NOT NULL,
  description TEXT,
  source_type TEXT DEFAULT 'incoming',
  test_parameters JSONB DEFAULT '[]'::jsonb,
  pass_criteria TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.quality_test_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_quality_test_plans" ON public.quality_test_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.quality_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  sample_number TEXT,
  source_type TEXT DEFAULT 'incoming',
  source_reference TEXT,
  item_code TEXT,
  item_description TEXT,
  lot_number TEXT,
  serial_number TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  test_plan_id UUID REFERENCES public.quality_test_plans(id),
  status TEXT DEFAULT 'registered',
  result TEXT DEFAULT 'pending',
  inspector TEXT,
  inspected_at TIMESTAMPTZ,
  certificate_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.quality_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_quality_samples" ON public.quality_samples FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.generate_quality_sample_number() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.sample_number IS NULL OR NEW.sample_number = '' THEN
    NEW.sample_number := 'SMP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('quality_sample_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_quality_sample_number BEFORE INSERT ON public.quality_samples FOR EACH ROW EXECUTE FUNCTION public.generate_quality_sample_number();

CREATE TABLE public.quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID REFERENCES public.quality_samples(id) ON DELETE CASCADE,
  test_plan_id UUID REFERENCES public.quality_test_plans(id),
  parameter_name TEXT,
  expected_value TEXT,
  actual_value TEXT,
  result TEXT DEFAULT 'pending',
  inspector TEXT,
  inspected_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_quality_inspections" ON public.quality_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.quality_capa_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  inspection_id UUID REFERENCES public.quality_inspections(id),
  sample_id UUID REFERENCES public.quality_samples(id),
  action_type TEXT DEFAULT 'corrective',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  root_cause TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.quality_capa_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_quality_capa_actions" ON public.quality_capa_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- ENGINEERING CHANGE CONTROL
-- ============================================

CREATE SEQUENCE IF NOT EXISTS ecr_seq START 1;

CREATE TABLE public.engineering_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  ecr_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  change_type TEXT DEFAULT 'design',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'draft',
  reason TEXT,
  impact_analysis TEXT,
  affected_items TEXT[],
  affected_projects TEXT[],
  requested_by UUID,
  requested_by_name TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  released_by UUID,
  released_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.engineering_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_ecr" ON public.engineering_change_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.generate_ecr_number() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.ecr_number IS NULL OR NEW.ecr_number = '' THEN
    NEW.ecr_number := 'ECR-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('ecr_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_ecr_number BEFORE INSERT ON public.engineering_change_requests FOR EACH ROW EXECUTE FUNCTION public.generate_ecr_number();

CREATE TABLE public.engineering_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecr_id UUID REFERENCES public.engineering_change_requests(id) ON DELETE CASCADE,
  document_type TEXT DEFAULT 'drawing',
  document_name TEXT NOT NULL,
  old_revision TEXT,
  new_revision TEXT,
  change_description TEXT,
  file_url TEXT,
  released_at TIMESTAMPTZ,
  released_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.engineering_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_eng_revisions" ON public.engineering_revisions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.engineering_bom_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecr_id UUID REFERENCES public.engineering_change_requests(id) ON DELETE CASCADE,
  item_code TEXT,
  item_description TEXT,
  change_type TEXT DEFAULT 'modify',
  old_value TEXT,
  new_value TEXT,
  quantity_old NUMERIC,
  quantity_new NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.engineering_bom_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_eng_bom_changes" ON public.engineering_bom_changes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- MAINTENANCE RELIABILITY ANALYTICS
-- ============================================

CREATE TABLE public.maintenance_downtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  asset_id TEXT,
  asset_name TEXT NOT NULL,
  asset_class TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_hours NUMERIC GENERATED ALWAYS AS (
    CASE WHEN end_time IS NOT NULL THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0 ELSE NULL END
  ) STORED,
  failure_mode TEXT,
  cause_category TEXT DEFAULT 'unknown',
  root_cause TEXT,
  corrective_action TEXT,
  maintenance_type TEXT DEFAULT 'breakdown',
  work_order_ref TEXT,
  cost_estimate NUMERIC DEFAULT 0,
  reported_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.maintenance_downtime_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_maint_downtime" ON public.maintenance_downtime_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.maintenance_pm_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  asset_id TEXT,
  asset_name TEXT NOT NULL,
  asset_class TEXT,
  schedule_type TEXT DEFAULT 'preventive',
  task_description TEXT,
  frequency_days INTEGER DEFAULT 30,
  last_completed_at TIMESTAMPTZ,
  next_due_at TIMESTAMPTZ,
  compliance_status TEXT DEFAULT 'on_track',
  assigned_to TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.maintenance_pm_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_maint_pm" ON public.maintenance_pm_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
