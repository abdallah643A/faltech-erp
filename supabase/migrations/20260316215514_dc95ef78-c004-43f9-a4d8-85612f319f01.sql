
-- Preventive Maintenance Schedules
CREATE TABLE public.pm_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_code TEXT NOT NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  frequency_type TEXT NOT NULL DEFAULT 'interval',
  frequency_days INT,
  frequency_hours INT,
  last_performed_date DATE,
  next_due_date DATE,
  lead_days INT DEFAULT 7,
  estimated_duration_hours NUMERIC DEFAULT 1,
  estimated_cost NUMERIC DEFAULT 0,
  assigned_to_name TEXT,
  checklist JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Maintenance SLA Configuration
CREATE TABLE public.maintenance_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority TEXT NOT NULL,
  response_hours INT NOT NULL DEFAULT 24,
  resolution_hours INT NOT NULL DEFAULT 72,
  escalation_hours INT DEFAULT 48,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Maintenance Cost Forecasts
CREATE TABLE public.maintenance_cost_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  forecast_period TEXT NOT NULL,
  budgeted_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pm_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_cost_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage pm_schedules" ON public.pm_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage maintenance_sla_configs" ON public.maintenance_sla_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage maintenance_cost_forecasts" ON public.maintenance_cost_forecasts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure work_orders has RLS
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can manage work_orders" ON public.work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
