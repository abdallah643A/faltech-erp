-- Extend existing strategic_goals
ALTER TABLE public.strategic_goals
  ADD COLUMN IF NOT EXISTS goal_code TEXT,
  ADD COLUMN IF NOT EXISTS goal_title_ar TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS perspective TEXT NOT NULL DEFAULT 'financial',
  ADD COLUMN IF NOT EXISTS fiscal_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS progress_percent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX IF NOT EXISTS idx_strategic_goals_year ON public.strategic_goals(fiscal_year);

-- Executive KPIs
CREATE TABLE IF NOT EXISTS public.executive_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  kpi_code TEXT NOT NULL,
  kpi_name TEXT NOT NULL,
  kpi_name_ar TEXT,
  category TEXT NOT NULL DEFAULT 'financial',
  unit TEXT DEFAULT 'SAR',
  target_value NUMERIC DEFAULT 0,
  actual_value NUMERIC DEFAULT 0,
  prior_value NUMERIC DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'mtd',
  period_start DATE,
  period_end DATE,
  trend TEXT DEFAULT 'flat',
  status TEXT DEFAULT 'on_track',
  owner_id UUID,
  owner_name TEXT,
  region TEXT,
  business_unit TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_kpis_company ON public.executive_kpis(company_id);
CREATE INDEX IF NOT EXISTS idx_exec_kpis_category ON public.executive_kpis(category);
CREATE INDEX IF NOT EXISTS idx_exec_kpis_period ON public.executive_kpis(period);
ALTER TABLE public.executive_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exec_kpis_select_authenticated" ON public.executive_kpis;
CREATE POLICY "exec_kpis_select_authenticated" ON public.executive_kpis FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "exec_kpis_modify_privileged" ON public.executive_kpis;
CREATE POLICY "exec_kpis_modify_privileged" ON public.executive_kpis FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.has_role(auth.uid(),'general_manager'::app_role) OR public.has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.has_role(auth.uid(),'general_manager'::app_role) OR public.has_role(auth.uid(),'manager'::app_role));

-- Scorecard
CREATE TABLE IF NOT EXISTS public.scorecard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  goal_id UUID REFERENCES public.strategic_goals(id) ON DELETE CASCADE,
  kpi_id UUID REFERENCES public.executive_kpis(id) ON DELETE SET NULL,
  perspective TEXT NOT NULL DEFAULT 'financial',
  measure_name TEXT NOT NULL,
  measure_name_ar TEXT,
  target_value NUMERIC DEFAULT 0,
  actual_value NUMERIC DEFAULT 0,
  variance_percent NUMERIC DEFAULT 0,
  rag_status TEXT DEFAULT 'green',
  period TEXT DEFAULT 'mtd',
  period_start DATE,
  period_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scorecard_company ON public.scorecard_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_goal ON public.scorecard_entries(goal_id);
ALTER TABLE public.scorecard_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scorecard_select_authenticated" ON public.scorecard_entries;
CREATE POLICY "scorecard_select_authenticated" ON public.scorecard_entries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "scorecard_modify_privileged" ON public.scorecard_entries;
CREATE POLICY "scorecard_modify_privileged" ON public.scorecard_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.has_role(auth.uid(),'general_manager'::app_role) OR public.has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.has_role(auth.uid(),'general_manager'::app_role) OR public.has_role(auth.uid(),'manager'::app_role));

-- Risk Register
CREATE TABLE IF NOT EXISTS public.risk_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  risk_code TEXT NOT NULL,
  risk_title TEXT NOT NULL,
  risk_title_ar TEXT,
  category TEXT NOT NULL DEFAULT 'operational',
  description TEXT,
  likelihood INTEGER NOT NULL DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  risk_score INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
  inherent_rating TEXT DEFAULT 'medium',
  residual_rating TEXT DEFAULT 'medium',
  mitigation_plan TEXT,
  owner_id UUID,
  owner_name TEXT,
  status TEXT DEFAULT 'open',
  review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_risk_register_company ON public.risk_register(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_register_score ON public.risk_register(risk_score DESC);
ALTER TABLE public.risk_register ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "risk_register_select_authenticated" ON public.risk_register;
CREATE POLICY "risk_register_select_authenticated" ON public.risk_register FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "risk_register_modify_privileged" ON public.risk_register;
CREATE POLICY "risk_register_modify_privileged" ON public.risk_register FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.has_role(auth.uid(),'general_manager'::app_role) OR public.has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.has_role(auth.uid(),'general_manager'::app_role) OR public.has_role(auth.uid(),'manager'::app_role));

DROP TRIGGER IF EXISTS update_executive_kpis_updated_at ON public.executive_kpis;
CREATE TRIGGER update_executive_kpis_updated_at BEFORE UPDATE ON public.executive_kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_scorecard_entries_updated_at ON public.scorecard_entries;
CREATE TRIGGER update_scorecard_entries_updated_at BEFORE UPDATE ON public.scorecard_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_risk_register_updated_at ON public.risk_register;
CREATE TRIGGER update_risk_register_updated_at BEFORE UPDATE ON public.risk_register FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();