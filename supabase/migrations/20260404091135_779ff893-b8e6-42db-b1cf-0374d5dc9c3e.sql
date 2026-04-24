
-- Regression Test Scenarios (templates)
CREATE TABLE public.regression_test_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  steps TEXT,
  expected_result TEXT,
  priority TEXT DEFAULT 'medium',
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regression_test_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view scenarios" ON public.regression_test_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage scenarios" ON public.regression_test_scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Regression Test Runs
CREATE TABLE public.regression_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name TEXT NOT NULL,
  description TEXT,
  tester_name TEXT,
  tester_id UUID,
  status TEXT DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_scenarios INT DEFAULT 0,
  passed INT DEFAULT 0,
  failed INT DEFAULT 0,
  blocked INT DEFAULT 0,
  skipped INT DEFAULT 0,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regression_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view runs" ON public.regression_test_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage runs" ON public.regression_test_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Regression Test Results (per scenario per run)
CREATE TABLE public.regression_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.regression_test_runs(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.regression_test_scenarios(id) ON DELETE CASCADE,
  result TEXT DEFAULT 'pending',
  actual_result TEXT,
  evidence_url TEXT,
  notes TEXT,
  blocker_description TEXT,
  tested_by TEXT,
  tested_at TIMESTAMPTZ,
  retest_count INT DEFAULT 0,
  last_retest_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regression_test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view results" ON public.regression_test_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage results" ON public.regression_test_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_regression_scenarios_module ON public.regression_test_scenarios(module);
CREATE INDEX idx_regression_results_run ON public.regression_test_results(run_id);
CREATE INDEX idx_regression_results_scenario ON public.regression_test_results(scenario_id);
CREATE INDEX idx_regression_runs_status ON public.regression_test_runs(status);

-- Triggers for updated_at
CREATE TRIGGER update_regression_scenarios_ts BEFORE UPDATE ON public.regression_test_scenarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regression_runs_ts BEFORE UPDATE ON public.regression_test_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regression_results_ts BEFORE UPDATE ON public.regression_test_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
