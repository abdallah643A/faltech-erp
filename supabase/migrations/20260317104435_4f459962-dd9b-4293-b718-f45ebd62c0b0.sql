
-- =====================================================
-- PMO Advanced Features - Database Schema
-- =====================================================

-- 1. Resource Skill Profiles (for skill gap analysis)
CREATE TABLE IF NOT EXISTS public.pmo_resource_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.pmo_resources(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL,
  proficiency_level TEXT NOT NULL DEFAULT 'intermediate',
  years_experience NUMERIC DEFAULT 0,
  certified BOOLEAN DEFAULT false,
  certification_expiry DATE,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pmo_resource_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage resource skills" ON public.pmo_resource_skills FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Resource Availability Forecasts
CREATE TABLE IF NOT EXISTS public.pmo_resource_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.pmo_resources(id) ON DELETE CASCADE NOT NULL,
  forecast_date DATE NOT NULL,
  available_hours NUMERIC NOT NULL DEFAULT 0,
  allocated_hours NUMERIC NOT NULL DEFAULT 0,
  leave_hours NUMERIC DEFAULT 0,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pmo_resource_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage resource forecasts" ON public.pmo_resource_forecasts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Stakeholder Communication Hub
CREATE TABLE IF NOT EXISTS public.pmo_stakeholder_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'status_update',
  project_id UUID REFERENCES public.projects(id),
  program_id UUID REFERENCES public.pmo_programs(id),
  content JSONB DEFAULT '{}',
  kpi_highlights JSONB DEFAULT '[]',
  risk_summary JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  sent_by TEXT,
  sent_by_id UUID,
  recipients JSONB DEFAULT '[]',
  schedule_type TEXT,
  next_send_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pmo_stakeholder_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage stakeholder reports" ON public.pmo_stakeholder_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Stakeholder Report Recipients
CREATE TABLE IF NOT EXISTS public.pmo_report_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.pmo_stakeholder_reports(id) ON DELETE CASCADE NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  role TEXT,
  delivery_status TEXT DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pmo_report_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage report recipients" ON public.pmo_report_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Dependency Critical Path Analysis
CREATE TABLE IF NOT EXISTS public.pmo_critical_path_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  program_id UUID REFERENCES public.pmo_programs(id),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  critical_path_nodes JSONB DEFAULT '[]',
  total_duration_days NUMERIC DEFAULT 0,
  bottleneck_nodes JSONB DEFAULT '[]',
  cascading_risks JSONB DEFAULT '[]',
  float_analysis JSONB DEFAULT '{}',
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pmo_critical_path_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage critical path" ON public.pmo_critical_path_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Predictive Analytics Models & Predictions
CREATE TABLE IF NOT EXISTS public.pmo_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) NOT NULL,
  prediction_type TEXT NOT NULL,
  predicted_value NUMERIC,
  confidence_score NUMERIC,
  risk_factors JSONB DEFAULT '[]',
  model_version TEXT DEFAULT 'v1',
  input_features JSONB DEFAULT '{}',
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  actual_value NUMERIC,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pmo_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage predictions" ON public.pmo_predictions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Portfolio Optimization Scenarios
CREATE TABLE IF NOT EXISTS public.pmo_optimization_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT NOT NULL DEFAULT 'resource_reallocation',
  base_portfolio JSONB DEFAULT '[]',
  optimized_portfolio JSONB DEFAULT '[]',
  constraints JSONB DEFAULT '{}',
  objectives JSONB DEFAULT '[]',
  impact_analysis JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  selected BOOLEAN DEFAULT false,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pmo_optimization_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage scenarios" ON public.pmo_optimization_scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. PMO Compliance & Audit Records
CREATE TABLE IF NOT EXISTS public.pmo_compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  record_type TEXT NOT NULL DEFAULT 'change_log',
  title TEXT NOT NULL,
  description TEXT,
  change_details JSONB DEFAULT '{}',
  approval_status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_by_id UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  compliance_category TEXT,
  reference_number TEXT,
  attachments JSONB DEFAULT '[]',
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pmo_compliance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage compliance records" ON public.pmo_compliance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pmo_resource_skills_resource ON public.pmo_resource_skills(resource_id);
CREATE INDEX IF NOT EXISTS idx_pmo_resource_forecasts_resource ON public.pmo_resource_forecasts(resource_id);
CREATE INDEX IF NOT EXISTS idx_pmo_resource_forecasts_date ON public.pmo_resource_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_pmo_stakeholder_reports_project ON public.pmo_stakeholder_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_pmo_stakeholder_reports_status ON public.pmo_stakeholder_reports(status);
CREATE INDEX IF NOT EXISTS idx_pmo_predictions_project ON public.pmo_predictions(project_id);
CREATE INDEX IF NOT EXISTS idx_pmo_predictions_type ON public.pmo_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_pmo_compliance_records_project ON public.pmo_compliance_records(project_id);
CREATE INDEX IF NOT EXISTS idx_pmo_compliance_records_type ON public.pmo_compliance_records(record_type);
