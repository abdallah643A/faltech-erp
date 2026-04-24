
-- =============================================
-- CROSS-MODULE ENHANCEMENT TABLES
-- =============================================

-- 1. Go/No-Go Scoring Templates
CREATE TABLE public.go_no_go_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- criteria: [{name, weight, description, scale_min, scale_max}]
  min_go_score NUMERIC DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Go/No-Go Evaluations
CREATE TABLE public.go_no_go_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.go_no_go_templates(id),
  evaluator_id UUID,
  evaluator_name TEXT,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- scores: {criterion_name: {score, notes}}
  total_score NUMERIC DEFAULT 0,
  weighted_score NUMERIC DEFAULT 0,
  decision TEXT DEFAULT 'pending', -- go, no_go, pending, conditional
  decision_notes TEXT,
  ai_recommendation TEXT,
  ai_confidence NUMERIC,
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Cross-module lifecycle tracker (Bid → Tender → Project)
CREATE TABLE public.project_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  
  -- Source references
  bid_id UUID REFERENCES public.bids(id),
  tender_id UUID, -- references cpms tenders
  project_id UUID REFERENCES public.projects(id),
  sales_order_id UUID REFERENCES public.sales_orders(id),
  
  -- Lifecycle stage
  current_stage TEXT NOT NULL DEFAULT 'bid', -- bid, tender, awarded, project_setup, in_progress, closeout
  
  -- Key metrics carried across stages
  original_estimate NUMERIC DEFAULT 0,
  awarded_value NUMERIC DEFAULT 0,
  current_budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  variance_percent NUMERIC GENERATED ALWAYS AS (
    CASE WHEN current_budget > 0 THEN ((actual_cost - current_budget) / current_budget) * 100 ELSE 0 END
  ) STORED,
  
  -- Dates
  bid_date DATE,
  award_date DATE,
  project_start_date DATE,
  planned_completion DATE,
  actual_completion DATE,
  
  -- AI insights
  ai_risk_score NUMERIC, -- 0-100
  ai_health_score NUMERIC, -- 0-100
  ai_cost_overrun_probability NUMERIC, -- 0-100%
  ai_schedule_delay_probability NUMERIC, -- 0-100%
  ai_last_analyzed TIMESTAMPTZ,
  ai_recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  client_name TEXT,
  project_type TEXT,
  region TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Stage Gate Checklists (configurable per project type)
CREATE TABLE public.stage_gate_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  gate_name TEXT NOT NULL, -- initiation, planning, execution, monitoring, closure
  project_type TEXT, -- null = applies to all types
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{item, is_mandatory, responsible_role, evidence_required}]
  min_completion_percent NUMERIC DEFAULT 80,
  auto_advance BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Stage Gate Evaluations
CREATE TABLE public.stage_gate_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lifecycle_id UUID REFERENCES public.project_lifecycle(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  gate_name TEXT NOT NULL,
  checklist_id UUID REFERENCES public.stage_gate_checklists(id),
  completed_items JSONB DEFAULT '[]'::jsonb,
  -- [{item, completed, completed_by, completed_at, evidence_url, notes}]
  completion_percent NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, in_review, passed, failed, waived
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  ai_readiness_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SLA Rules & Tracking
CREATE TABLE public.module_sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  module TEXT NOT NULL, -- bid, tender, project, pmo, tmo
  rule_name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL, -- stage_entered, item_created, review_requested
  target_hours NUMERIC NOT NULL, -- SLA target in hours
  warning_hours NUMERIC, -- warning threshold
  escalation_chain JSONB DEFAULT '[]'::jsonb,
  -- [{level, notify_role, after_hours, action}]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SLA Violations Log
CREATE TABLE public.sla_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_rule_id UUID REFERENCES public.module_sla_rules(id),
  module TEXT NOT NULL,
  record_id UUID NOT NULL,
  record_type TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  escalation_level INT DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, escalated, resolved, waived
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. AI Analysis Log
CREATE TABLE public.ai_analysis_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL, -- bid, pmo, tmo, project
  record_id UUID NOT NULL,
  record_type TEXT NOT NULL,
  analysis_type TEXT NOT NULL, -- win_prediction, risk_assessment, cost_forecast, health_check, resource_optimization
  input_data JSONB,
  output_data JSONB,
  model_used TEXT,
  confidence_score NUMERIC,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.go_no_go_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.go_no_go_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_gate_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_gate_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON public.go_no_go_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.go_no_go_evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.project_lifecycle FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.stage_gate_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.stage_gate_evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.module_sla_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.sla_violations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.ai_analysis_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_lifecycle_company ON public.project_lifecycle(company_id);
CREATE INDEX idx_lifecycle_bid ON public.project_lifecycle(bid_id);
CREATE INDEX idx_lifecycle_project ON public.project_lifecycle(project_id);
CREATE INDEX idx_sla_violations_status ON public.sla_violations(status);
CREATE INDEX idx_ai_log_module ON public.ai_analysis_log(module, record_type);
CREATE INDEX idx_go_no_go_eval_bid ON public.go_no_go_evaluations(bid_id);
