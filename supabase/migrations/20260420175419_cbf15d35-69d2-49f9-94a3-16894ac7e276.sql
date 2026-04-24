-- ============================================================
-- FLEET MANAGEMENT ENHANCEMENT
-- ============================================================

-- 1. PM Schedules (dual trigger: km + time)
CREATE TABLE IF NOT EXISTS public.fleet_pm_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID NOT NULL,
  schedule_name TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'preventive',
  interval_km NUMERIC,
  interval_days INTEGER,
  last_service_km NUMERIC DEFAULT 0,
  last_service_date DATE,
  next_due_km NUMERIC,
  next_due_date DATE,
  reminder_threshold_km NUMERIC DEFAULT 500,
  reminder_threshold_days INTEGER DEFAULT 7,
  auto_create_wo BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_generated_job_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_fleet_pm_asset ON public.fleet_pm_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_fleet_pm_due ON public.fleet_pm_schedules(next_due_date) WHERE is_active = true;

-- 2. Fuel transactions
CREATE TABLE IF NOT EXISTS public.fleet_fuel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID NOT NULL,
  driver_id UUID,
  trip_id UUID,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  fuel_card_number TEXT,
  vendor TEXT,
  station_name TEXT,
  fuel_type TEXT DEFAULT 'diesel',
  liters NUMERIC NOT NULL,
  price_per_liter NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  odometer_reading NUMERIC,
  km_since_last_fill NUMERIC,
  fuel_efficiency_kmpl NUMERIC,
  location TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  receipt_url TEXT,
  is_anomaly BOOLEAN DEFAULT false,
  anomaly_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_fleet_fuel_asset ON public.fleet_fuel_transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_fleet_fuel_date ON public.fleet_fuel_transactions(transaction_date DESC);

-- 3. Telematics points (GPS ingest)
CREATE TABLE IF NOT EXISTS public.fleet_telematics_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  trip_id UUID,
  recorded_at TIMESTAMPTZ NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  speed_kmh NUMERIC,
  heading NUMERIC,
  altitude NUMERIC,
  odometer NUMERIC,
  ignition_on BOOLEAN,
  fuel_level_pct NUMERIC,
  engine_temp NUMERIC,
  provider TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fleet_tel_asset_time ON public.fleet_telematics_points(asset_id, recorded_at DESC);

-- 4. Compliance documents
CREATE TABLE IF NOT EXISTS public.fleet_compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT,
  issuer TEXT,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  reminder_days_before INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active',
  document_url TEXT,
  cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_fleet_compl_asset ON public.fleet_compliance_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_fleet_compl_expiry ON public.fleet_compliance_documents(expiry_date);

-- 5. Accidents (full case)
CREATE TABLE IF NOT EXISTS public.fleet_accidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  case_number TEXT NOT NULL,
  asset_id UUID NOT NULL,
  driver_id UUID,
  trip_id UUID,
  accident_date TIMESTAMPTZ NOT NULL,
  accident_type TEXT NOT NULL DEFAULT 'collision',
  severity TEXT NOT NULL DEFAULT 'minor',
  location TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  description TEXT,
  weather_conditions TEXT,
  road_conditions TEXT,
  injuries_reported BOOLEAN DEFAULT false,
  injury_details TEXT,
  fatality_count INTEGER DEFAULT 0,
  police_report_no TEXT,
  police_station TEXT,
  insurance_claim_no TEXT,
  insurance_claim_status TEXT DEFAULT 'not_filed',
  insurance_claim_amount NUMERIC DEFAULT 0,
  insurance_settled_amount NUMERIC DEFAULT 0,
  estimated_repair_cost NUMERIC DEFAULT 0,
  actual_repair_cost NUMERIC DEFAULT 0,
  downtime_days INTEGER DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  fault_party TEXT,
  maintenance_job_id UUID,
  photos JSONB DEFAULT '[]'::jsonb,
  witnesses JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'reported',
  reported_by UUID,
  reported_by_name TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fleet_acc_asset ON public.fleet_accidents(asset_id);
CREATE INDEX IF NOT EXISTS idx_fleet_acc_date ON public.fleet_accidents(accident_date DESC);

-- 6. Accident parties (other vehicles/people)
CREATE TABLE IF NOT EXISTS public.fleet_accident_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_id UUID NOT NULL REFERENCES public.fleet_accidents(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL DEFAULT 'third_party',
  party_name TEXT NOT NULL,
  contact_phone TEXT,
  vehicle_make_model TEXT,
  vehicle_plate TEXT,
  insurance_company TEXT,
  insurance_policy_no TEXT,
  fault_percentage NUMERIC DEFAULT 0,
  damage_description TEXT,
  injury_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Cost ledger for CPK / TCO
CREATE TABLE IF NOT EXISTS public.fleet_cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID NOT NULL,
  cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cost_category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_fleet_cost_asset_date ON public.fleet_cost_entries(asset_id, cost_date DESC);

-- 8. Project / service / asset links
CREATE TABLE IF NOT EXISTS public.fleet_project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID NOT NULL,
  link_type TEXT NOT NULL,
  project_id UUID,
  service_order_id UUID,
  asset_record_id UUID,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  billing_rate_per_km NUMERIC,
  billing_rate_per_hour NUMERIC,
  billing_rate_per_day NUMERIC,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_fleet_link_asset ON public.fleet_project_links(asset_id) WHERE is_active = true;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.fleet_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_fleet_pm_updated ON public.fleet_pm_schedules;
CREATE TRIGGER trg_fleet_pm_updated BEFORE UPDATE ON public.fleet_pm_schedules
FOR EACH ROW EXECUTE FUNCTION public.fleet_set_updated_at();

DROP TRIGGER IF EXISTS trg_fleet_compl_updated ON public.fleet_compliance_documents;
CREATE TRIGGER trg_fleet_compl_updated BEFORE UPDATE ON public.fleet_compliance_documents
FOR EACH ROW EXECUTE FUNCTION public.fleet_set_updated_at();

DROP TRIGGER IF EXISTS trg_fleet_acc_updated ON public.fleet_accidents;
CREATE TRIGGER trg_fleet_acc_updated BEFORE UPDATE ON public.fleet_accidents
FOR EACH ROW EXECUTE FUNCTION public.fleet_set_updated_at();

-- Auto-update next_due_km from latest odometer when fuel transaction inserted
CREATE OR REPLACE FUNCTION public.fleet_after_fuel_insert()
RETURNS TRIGGER AS $$
DECLARE prev_km NUMERIC;
BEGIN
  -- compute km_since_last_fill + efficiency
  SELECT odometer_reading INTO prev_km
  FROM public.fleet_fuel_transactions
  WHERE asset_id = NEW.asset_id AND id <> NEW.id AND odometer_reading IS NOT NULL
  ORDER BY transaction_date DESC LIMIT 1;
  IF prev_km IS NOT NULL AND NEW.odometer_reading IS NOT NULL AND NEW.odometer_reading > prev_km THEN
    NEW.km_since_last_fill := NEW.odometer_reading - prev_km;
    IF NEW.liters > 0 THEN
      NEW.fuel_efficiency_kmpl := NEW.km_since_last_fill / NEW.liters;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_fleet_fuel_before_insert ON public.fleet_fuel_transactions;
CREATE TRIGGER trg_fleet_fuel_before_insert BEFORE INSERT ON public.fleet_fuel_transactions
FOR EACH ROW EXECUTE FUNCTION public.fleet_after_fuel_insert();

-- Cost entry auto-create from fuel transaction
CREATE OR REPLACE FUNCTION public.fleet_fuel_to_cost()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.fleet_cost_entries (company_id, asset_id, cost_date, cost_category, amount, reference_type, reference_id, description, created_by)
  VALUES (NEW.company_id, NEW.asset_id, NEW.transaction_date::date, 'fuel', NEW.total_cost, 'fuel_transaction', NEW.id, COALESCE(NEW.station_name, 'Fuel') || ' - ' || NEW.liters || 'L', NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_fleet_fuel_cost ON public.fleet_fuel_transactions;
CREATE TRIGGER trg_fleet_fuel_cost AFTER INSERT ON public.fleet_fuel_transactions
FOR EACH ROW EXECUTE FUNCTION public.fleet_fuel_to_cost();

-- CPK calculator
CREATE OR REPLACE FUNCTION public.recompute_fleet_cpk(_asset_id UUID, _days INTEGER DEFAULT 90)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE total_cost NUMERIC; total_km NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_cost
  FROM public.fleet_cost_entries
  WHERE asset_id = _asset_id AND cost_date >= CURRENT_DATE - _days;
  
  SELECT COALESCE(SUM(km_since_last_fill), 0) INTO total_km
  FROM public.fleet_fuel_transactions
  WHERE asset_id = _asset_id AND transaction_date::date >= CURRENT_DATE - _days;
  
  IF total_km <= 0 THEN RETURN 0; END IF;
  RETURN ROUND(total_cost / total_km, 4);
END;
$$;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.fleet_pm_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_fuel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_telematics_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_accidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_accident_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_project_links ENABLE ROW LEVEL SECURITY;

-- Generic authenticated read/write policies (company-scoped read enforced by app via company_id filters)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'fleet_pm_schedules','fleet_fuel_transactions','fleet_telematics_points',
    'fleet_compliance_documents','fleet_accidents','fleet_accident_parties',
    'fleet_cost_entries','fleet_project_links'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_read_%I" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_write_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_write_%I" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%I" ON public.%I FOR UPDATE TO authenticated USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%I" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;