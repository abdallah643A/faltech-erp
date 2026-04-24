-- Business Case Tracking
CREATE TABLE public.pmo_business_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  portfolio_id UUID,
  case_name TEXT NOT NULL,
  case_name_ar TEXT,
  problem_statement TEXT,
  proposed_solution TEXT,
  strategic_alignment_score INTEGER DEFAULT 0 CHECK (strategic_alignment_score BETWEEN 0 AND 10),
  estimated_investment NUMERIC(18,2) DEFAULT 0,
  estimated_benefit NUMERIC(18,2) DEFAULT 0,
  npv NUMERIC(18,2) DEFAULT 0,
  irr NUMERIC(8,4) DEFAULT 0,
  payback_months INTEGER,
  roi_percent NUMERIC(8,2),
  risk_level TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','approved','rejected','on_hold')),
  sponsor_id UUID,
  sponsor_name TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  assumptions TEXT,
  alternatives_considered TEXT,
  company_id UUID,
  branch_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Portfolio Scoring (weighted prioritization)
CREATE TABLE public.pmo_portfolio_scoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL,
  project_id UUID,
  scoring_period TEXT,
  strategic_value INTEGER DEFAULT 0 CHECK (strategic_value BETWEEN 0 AND 10),
  financial_return INTEGER DEFAULT 0 CHECK (financial_return BETWEEN 0 AND 10),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 10),
  complexity_score INTEGER DEFAULT 0 CHECK (complexity_score BETWEEN 0 AND 10),
  resource_fit INTEGER DEFAULT 0 CHECK (resource_fit BETWEEN 0 AND 10),
  regulatory_urgency INTEGER DEFAULT 0 CHECK (regulatory_urgency BETWEEN 0 AND 10),
  weight_strategic NUMERIC(4,2) DEFAULT 0.30,
  weight_financial NUMERIC(4,2) DEFAULT 0.25,
  weight_risk NUMERIC(4,2) DEFAULT 0.15,
  weight_complexity NUMERIC(4,2) DEFAULT 0.10,
  weight_resource NUMERIC(4,2) DEFAULT 0.10,
  weight_regulatory NUMERIC(4,2) DEFAULT 0.10,
  composite_score NUMERIC(6,3) GENERATED ALWAYS AS (
    (strategic_value * weight_strategic) +
    (financial_return * weight_financial) +
    ((10 - risk_score) * weight_risk) +
    ((10 - complexity_score) * weight_complexity) +
    (resource_fit * weight_resource) +
    (regulatory_urgency * weight_regulatory)
  ) STORED,
  rank_position INTEGER,
  recommendation TEXT,
  scored_by UUID,
  scored_at TIMESTAMPTZ DEFAULT now(),
  company_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Benefits Realization
CREATE TABLE public.pmo_benefits_realization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  business_case_id UUID,
  benefit_name TEXT NOT NULL,
  benefit_name_ar TEXT,
  benefit_type TEXT DEFAULT 'financial' CHECK (benefit_type IN ('financial','operational','strategic','compliance','customer','employee')),
  measurement_unit TEXT,
  baseline_value NUMERIC(18,2) DEFAULT 0,
  target_value NUMERIC(18,2) DEFAULT 0,
  actual_value NUMERIC(18,2) DEFAULT 0,
  realization_percent NUMERIC(6,2) GENERATED ALWAYS AS (
    CASE WHEN target_value = 0 THEN 0
    ELSE ROUND((actual_value / target_value) * 100, 2) END
  ) STORED,
  measurement_date DATE,
  realization_due_date DATE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','tracking','realized','partial','missed','abandoned')),
  owner_id UUID,
  owner_name TEXT,
  notes TEXT,
  evidence_url TEXT,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Financial Health (EVM)
CREATE TABLE public.pmo_financial_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  fiscal_period TEXT,
  budget_at_completion NUMERIC(18,2) DEFAULT 0,
  planned_value NUMERIC(18,2) DEFAULT 0,
  earned_value NUMERIC(18,2) DEFAULT 0,
  actual_cost NUMERIC(18,2) DEFAULT 0,
  cost_variance NUMERIC(18,2) GENERATED ALWAYS AS (earned_value - actual_cost) STORED,
  schedule_variance NUMERIC(18,2) GENERATED ALWAYS AS (earned_value - planned_value) STORED,
  cpi NUMERIC(6,3) GENERATED ALWAYS AS (
    CASE WHEN actual_cost = 0 THEN 0 ELSE ROUND(earned_value / actual_cost, 3) END
  ) STORED,
  spi NUMERIC(6,3) GENERATED ALWAYS AS (
    CASE WHEN planned_value = 0 THEN 0 ELSE ROUND(earned_value / planned_value, 3) END
  ) STORED,
  estimate_at_completion NUMERIC(18,2) DEFAULT 0,
  variance_at_completion NUMERIC(18,2) DEFAULT 0,
  estimate_to_complete NUMERIC(18,2) DEFAULT 0,
  forecast_completion_date DATE,
  health_indicator TEXT DEFAULT 'green' CHECK (health_indicator IN ('green','amber','red')),
  commentary TEXT,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stage-Gate Templates (reusable)
CREATE TABLE public.pmo_gate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_name_ar TEXT,
  methodology TEXT DEFAULT 'PMI' CHECK (methodology IN ('PMI','PRINCE2','Agile','Hybrid','Custom')),
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  gates JSONB NOT NULL DEFAULT '[]',
  required_artifacts JSONB DEFAULT '[]',
  approval_levels JSONB DEFAULT '[]',
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Capacity Snapshots
CREATE TABLE public.pmo_capacity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  week_start DATE NOT NULL,
  resource_id UUID,
  department TEXT,
  skill_category TEXT,
  capacity_hours NUMERIC(8,2) DEFAULT 0,
  allocated_hours NUMERIC(8,2) DEFAULT 0,
  available_hours NUMERIC(8,2) GENERATED ALWAYS AS (capacity_hours - allocated_hours) STORED,
  utilization_percent NUMERIC(6,2) GENERATED ALWAYS AS (
    CASE WHEN capacity_hours = 0 THEN 0 ELSE ROUND((allocated_hours / capacity_hours) * 100, 2) END
  ) STORED,
  is_overallocated BOOLEAN GENERATED ALWAYS AS (allocated_hours > capacity_hours) STORED,
  notes TEXT,
  company_id UUID,
  branch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pmo_business_cases_project ON public.pmo_business_cases(project_id);
CREATE INDEX idx_pmo_business_cases_company ON public.pmo_business_cases(company_id);
CREATE INDEX idx_pmo_business_cases_status ON public.pmo_business_cases(status);
CREATE INDEX idx_pmo_portfolio_scoring_portfolio ON public.pmo_portfolio_scoring(portfolio_id);
CREATE INDEX idx_pmo_portfolio_scoring_project ON public.pmo_portfolio_scoring(project_id);
CREATE INDEX idx_pmo_benefits_project ON public.pmo_benefits_realization(project_id);
CREATE INDEX idx_pmo_benefits_status ON public.pmo_benefits_realization(status);
CREATE INDEX idx_pmo_financial_health_project ON public.pmo_financial_health(project_id);
CREATE INDEX idx_pmo_financial_health_date ON public.pmo_financial_health(snapshot_date DESC);
CREATE INDEX idx_pmo_capacity_snapshots_date ON public.pmo_capacity_snapshots(snapshot_date DESC);
CREATE INDEX idx_pmo_capacity_snapshots_resource ON public.pmo_capacity_snapshots(resource_id);

-- RLS
ALTER TABLE public.pmo_business_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_portfolio_scoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_benefits_realization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_financial_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_gate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_capacity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view business cases" ON public.pmo_business_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage business cases" ON public.pmo_business_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view portfolio scoring" ON public.pmo_portfolio_scoring FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage portfolio scoring" ON public.pmo_portfolio_scoring FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view benefits" ON public.pmo_benefits_realization FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage benefits" ON public.pmo_benefits_realization FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view financial health" ON public.pmo_financial_health FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage financial health" ON public.pmo_financial_health FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view gate templates" ON public.pmo_gate_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage gate templates" ON public.pmo_gate_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view capacity snapshots" ON public.pmo_capacity_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage capacity snapshots" ON public.pmo_capacity_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Updated-at triggers
CREATE TRIGGER trg_pmo_business_cases_updated BEFORE UPDATE ON public.pmo_business_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pmo_portfolio_scoring_updated BEFORE UPDATE ON public.pmo_portfolio_scoring
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pmo_benefits_updated BEFORE UPDATE ON public.pmo_benefits_realization
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pmo_financial_health_updated BEFORE UPDATE ON public.pmo_financial_health
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pmo_gate_templates_updated BEFORE UPDATE ON public.pmo_gate_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default PMI + PRINCE2 templates
INSERT INTO public.pmo_gate_templates (template_name, template_name_ar, methodology, description, is_default, is_active, gates, required_artifacts) VALUES
('PMI 5-Phase Standard', 'معيار PMI خماسي المراحل', 'PMI', 'PMBOK 5 process groups: Initiate, Plan, Execute, Monitor, Close', true, true,
 '[
   {"order":1,"name":"Initiation Gate","approval_role":"Sponsor","checklist":["Project Charter signed","Stakeholders identified","Business case approved"]},
   {"order":2,"name":"Planning Gate","approval_role":"Steering Committee","checklist":["Scope baseline","Schedule baseline","Cost baseline","Risk register"]},
   {"order":3,"name":"Execution Gate","approval_role":"Program Manager","checklist":["Resources mobilized","Quality plan active","Communications plan"]},
   {"order":4,"name":"Monitor & Control Gate","approval_role":"PMO","checklist":["EVM tracking","Variance analysis","Change control board"]},
   {"order":5,"name":"Closure Gate","approval_role":"Sponsor","checklist":["Deliverables accepted","Lessons learned","Final report","Resources released"]}
 ]'::jsonb,
 '["Project Charter","WBS","Risk Register","Communications Plan","Lessons Learned Log"]'::jsonb),
('PRINCE2 7-Stage', 'PRINCE2 سبع مراحل', 'PRINCE2', 'PRINCE2 stage boundaries with management products', true, true,
 '[
   {"order":1,"name":"Starting Up","approval_role":"Executive","checklist":["Project mandate","Project brief","Initiation plan"]},
   {"order":2,"name":"Initiating","approval_role":"Project Board","checklist":["PID","Business case detailed","Quality strategy"]},
   {"order":3,"name":"Stage Boundary 1","approval_role":"Project Board","checklist":["Stage 1 deliverables","Next stage plan","Updated business case"]},
   {"order":4,"name":"Controlling Stage","approval_role":"Project Manager","checklist":["Work packages","Issue/risk management","Highlight reports"]},
   {"order":5,"name":"Managing Product Delivery","approval_role":"Team Manager","checklist":["Quality records","Acceptance criteria met"]},
   {"order":6,"name":"Stage Boundary N","approval_role":"Project Board","checklist":["Benefits review plan","Final stage plan"]},
   {"order":7,"name":"Closing","approval_role":"Executive","checklist":["Acceptance record","Follow-on actions","End project report"]}
 ]'::jsonb,
 '["Project Brief","PID","Business Case","Risk Register","Quality Register","Lessons Log"]'::jsonb);