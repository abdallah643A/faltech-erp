
-- Asset utilization logs for tracking daily usage
CREATE TABLE public.asset_utilization_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_used NUMERIC(8,2) DEFAULT 0,
  hours_available NUMERIC(8,2) DEFAULT 8,
  usage_type TEXT DEFAULT 'active', -- active, idle, maintenance, standby
  department TEXT,
  location TEXT,
  logged_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asset_id, log_date)
);

ALTER TABLE public.asset_utilization_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read utilization logs"
  ON public.asset_utilization_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert utilization logs"
  ON public.asset_utilization_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update utilization logs"
  ON public.asset_utilization_logs FOR UPDATE TO authenticated USING (true);

-- Asset utilization benchmarks
CREATE TABLE public.asset_utilization_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.asset_categories(id),
  company_id UUID REFERENCES public.sap_companies(id),
  benchmark_name TEXT NOT NULL,
  target_utilization_pct NUMERIC(5,2) DEFAULT 75,
  min_acceptable_pct NUMERIC(5,2) DEFAULT 50,
  industry_avg_pct NUMERIC(5,2) DEFAULT 65,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.asset_utilization_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage benchmarks"
  ON public.asset_utilization_benchmarks FOR ALL TO authenticated USING (true) WITH CHECK (true);
