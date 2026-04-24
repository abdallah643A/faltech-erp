-- Predictive maintenance signals
CREATE TABLE IF NOT EXISTS public.asset_predictive_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  equipment_id uuid,
  asset_id uuid,
  signal_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  confidence_score numeric NOT NULL DEFAULT 0,
  detection_source text NOT NULL DEFAULT 'rule',
  title text NOT NULL,
  description text,
  recommended_action text,
  predicted_failure_date date,
  detected_value numeric,
  threshold_value numeric,
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_pred_signals_equipment ON public.asset_predictive_signals(equipment_id, status);
CREATE INDEX IF NOT EXISTS idx_pred_signals_company ON public.asset_predictive_signals(company_id, severity);

ALTER TABLE public.asset_predictive_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view predictive signals" ON public.asset_predictive_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert predictive signals" ON public.asset_predictive_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update predictive signals" ON public.asset_predictive_signals FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Creators delete predictive signals" ON public.asset_predictive_signals FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Predictive runs
CREATE TABLE IF NOT EXISTS public.asset_predictive_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  run_type text NOT NULL DEFAULT 'scheduled',
  status text NOT NULL DEFAULT 'completed',
  assets_scanned integer DEFAULT 0,
  signals_created integer DEFAULT 0,
  ai_calls integer DEFAULT 0,
  duration_ms integer,
  error_message text,
  summary jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  triggered_by uuid
);
ALTER TABLE public.asset_predictive_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view pred runs" ON public.asset_predictive_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert pred runs" ON public.asset_predictive_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Replacement roadmap
CREATE TABLE IF NOT EXISTS public.asset_replacement_roadmap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  equipment_id uuid,
  asset_id uuid,
  plan_year integer NOT NULL,
  decision text NOT NULL DEFAULT 'replace',
  estimated_replacement_cost numeric DEFAULT 0,
  estimated_refurbish_cost numeric DEFAULT 0,
  estimated_salvage_value numeric DEFAULT 0,
  annual_maintenance_cost numeric DEFAULT 0,
  expected_life_extension_years numeric DEFAULT 0,
  refurbish_roi numeric DEFAULT 0,
  replace_roi numeric DEFAULT 0,
  recommendation text,
  capital_plan_id uuid,
  budget_line_id uuid,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'draft',
  approval_workflow jsonb DEFAULT '[]'::jsonb,
  approved_at timestamptz,
  approved_by uuid,
  rejection_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_repl_roadmap_year ON public.asset_replacement_roadmap(plan_year, status);
CREATE INDEX IF NOT EXISTS idx_repl_roadmap_company ON public.asset_replacement_roadmap(company_id);

ALTER TABLE public.asset_replacement_roadmap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view roadmap" ON public.asset_replacement_roadmap FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert roadmap" ON public.asset_replacement_roadmap FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update roadmap" ON public.asset_replacement_roadmap FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Creators delete roadmap" ON public.asset_replacement_roadmap FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Vendor scorecard metrics (period-based)
CREATE TABLE IF NOT EXISTS public.asset_vendor_scorecard_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  vendor_id uuid,
  vendor_name text NOT NULL,
  period_year integer NOT NULL,
  period_month integer,
  total_jobs integer DEFAULT 0,
  on_time_jobs integer DEFAULT 0,
  rework_jobs integer DEFAULT 0,
  avg_response_hours numeric DEFAULT 0,
  avg_repair_quality numeric DEFAULT 0,
  sla_compliance_pct numeric DEFAULT 0,
  user_feedback_avg numeric DEFAULT 0,
  total_spend numeric DEFAULT 0,
  overall_score numeric DEFAULT 0,
  grade text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_metrics_period ON public.asset_vendor_scorecard_metrics(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_vendor_metrics_vendor ON public.asset_vendor_scorecard_metrics(vendor_id);

ALTER TABLE public.asset_vendor_scorecard_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view vendor metrics" ON public.asset_vendor_scorecard_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert vendor metrics" ON public.asset_vendor_scorecard_metrics FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update vendor metrics" ON public.asset_vendor_scorecard_metrics FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);