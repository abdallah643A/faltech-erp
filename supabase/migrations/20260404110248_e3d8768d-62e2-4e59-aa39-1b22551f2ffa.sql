
-- Cash Flow Forecast Items
CREATE TABLE public.cash_flow_forecast_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_table TEXT,
  source_id TEXT,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  expected_date DATE NOT NULL,
  confidence TEXT DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'other',
  direction TEXT NOT NULL DEFAULT 'inflow',
  status TEXT DEFAULT 'projected',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cash_flow_forecast_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage cash_flow_forecast_items" ON public.cash_flow_forecast_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_cash_flow_forecast_items_updated_at BEFORE UPDATE ON public.cash_flow_forecast_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reconciliation Mismatches
CREATE TABLE public.reconciliation_mismatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  mismatch_type TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id TEXT,
  source_ref TEXT,
  source_amount NUMERIC DEFAULT 0,
  target_table TEXT,
  target_id TEXT,
  target_ref TEXT,
  target_amount NUMERIC DEFAULT 0,
  difference NUMERIC DEFAULT 0,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.reconciliation_mismatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage reconciliation_mismatches" ON public.reconciliation_mismatches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_reconciliation_mismatches_updated_at BEFORE UPDATE ON public.reconciliation_mismatches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Production Cost Actuals
CREATE TABLE public.production_cost_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  production_order_id TEXT,
  production_order_ref TEXT,
  item_code TEXT,
  item_name TEXT,
  cost_type TEXT NOT NULL DEFAULT 'material',
  planned_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  variance NUMERIC GENERATED ALWAYS AS (actual_amount - planned_amount) STORED,
  quantity_planned NUMERIC DEFAULT 0,
  quantity_actual NUMERIC DEFAULT 0,
  scrap_quantity NUMERIC DEFAULT 0,
  yield_percent NUMERIC DEFAULT 100,
  period_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.production_cost_actuals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage production_cost_actuals" ON public.production_cost_actuals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_production_cost_actuals_updated_at BEFORE UPDATE ON public.production_cost_actuals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CAPA Actions
CREATE TABLE public.capa_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  capa_number TEXT,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'quality_test',
  source_id TEXT,
  source_ref TEXT,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  owner_id UUID,
  owner_name TEXT,
  due_date DATE,
  verification_step TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  closure_approved_by UUID,
  closure_approved_at TIMESTAMPTZ,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.capa_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage capa_actions" ON public.capa_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_capa_actions_updated_at BEFORE UPDATE ON public.capa_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Workforce Plans
CREATE TABLE public.workforce_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  plan_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  department_id UUID,
  project_id UUID,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.workforce_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage workforce_plans" ON public.workforce_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_workforce_plans_updated_at BEFORE UPDATE ON public.workforce_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Workforce Plan Lines
CREATE TABLE public.workforce_plan_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.workforce_plans(id) ON DELETE CASCADE NOT NULL,
  role_title TEXT NOT NULL,
  planned_headcount INT DEFAULT 0,
  actual_headcount INT DEFAULT 0,
  gap INT GENERATED ALWAYS AS (planned_headcount - actual_headcount) STORED,
  cost_per_head NUMERIC DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  subcontractor_count INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.workforce_plan_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage workforce_plan_lines" ON public.workforce_plan_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Job Requisitions
CREATE TABLE public.job_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  title TEXT NOT NULL,
  department_id UUID,
  department_name TEXT,
  project_id UUID,
  positions_count INT DEFAULT 1,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'draft',
  hiring_manager_id UUID,
  hiring_manager_name TEXT,
  budget_per_position NUMERIC DEFAULT 0,
  requirements TEXT,
  description TEXT,
  location TEXT,
  employment_type TEXT DEFAULT 'full_time',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.job_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage job_requisitions" ON public.job_requisitions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_job_requisitions_updated_at BEFORE UPDATE ON public.job_requisitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Candidates
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  requisition_id UUID REFERENCES public.job_requisitions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  stage TEXT DEFAULT 'applied',
  source TEXT DEFAULT 'direct',
  resume_url TEXT,
  rating INT DEFAULT 0,
  interviewer_notes TEXT,
  interview_date TIMESTAMPTZ,
  offer_amount NUMERIC,
  offer_status TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage candidates" ON public.candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_cash_flow_forecast_company ON public.cash_flow_forecast_items(company_id);
CREATE INDEX idx_cash_flow_forecast_date ON public.cash_flow_forecast_items(expected_date);
CREATE INDEX idx_recon_mismatches_company ON public.reconciliation_mismatches(company_id);
CREATE INDEX idx_recon_mismatches_status ON public.reconciliation_mismatches(status);
CREATE INDEX idx_production_cost_company ON public.production_cost_actuals(company_id);
CREATE INDEX idx_capa_company ON public.capa_actions(company_id);
CREATE INDEX idx_capa_status ON public.capa_actions(status);
CREATE INDEX idx_workforce_plans_company ON public.workforce_plans(company_id);
CREATE INDEX idx_job_requisitions_company ON public.job_requisitions(company_id);
CREATE INDEX idx_candidates_requisition ON public.candidates(requisition_id);
