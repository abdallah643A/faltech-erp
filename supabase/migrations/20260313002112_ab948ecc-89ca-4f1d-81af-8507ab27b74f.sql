
-- PMO Portfolio Management Tables

-- Programs (group of related projects)
CREATE TABLE public.pmo_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  strategic_objective TEXT,
  program_manager_id UUID,
  start_date DATE,
  end_date DATE,
  total_budget NUMERIC DEFAULT 0,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project portfolio metadata (extends projects table)
CREATE TABLE public.pmo_project_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.pmo_programs(id) ON DELETE SET NULL,
  classification TEXT DEFAULT 'operational', -- strategic, operational, regulatory, innovation
  strategic_priority INTEGER DEFAULT 3, -- 1-5 scale
  delivery_risk INTEGER DEFAULT 3, -- 1-5 scale
  investment_tier TEXT DEFAULT 'standard', -- low, standard, high, critical
  methodology TEXT DEFAULT 'waterfall', -- waterfall, agile, hybrid
  health_status TEXT DEFAULT 'green', -- green, yellow, red
  benefits_description TEXT,
  lessons_learned TEXT,
  closure_date DATE,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Cross-project dependencies
CREATE TABLE public.pmo_project_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  target_project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start', -- finish_to_start, start_to_start, finish_to_finish, start_to_finish
  description TEXT,
  is_critical BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk register
CREATE TABLE public.pmo_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general', -- technical, financial, resource, schedule, external, regulatory
  probability INTEGER NOT NULL DEFAULT 3, -- 1-5
  impact INTEGER NOT NULL DEFAULT 3, -- 1-5
  risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  status TEXT NOT NULL DEFAULT 'open', -- open, mitigating, resolved, closed, materialized
  owner_id UUID,
  owner_name TEXT,
  mitigation_plan TEXT,
  contingency_plan TEXT,
  risk_appetite TEXT DEFAULT 'moderate', -- low, moderate, high
  materialized_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Issue log
CREATE TABLE public.pmo_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  risk_id UUID REFERENCES public.pmo_risks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, escalated, resolved, closed
  owner_id UUID,
  owner_name TEXT,
  resolution TEXT,
  escalation_level INTEGER DEFAULT 0,
  escalated_to TEXT,
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resource pool
CREATE TABLE public.pmo_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  resource_type TEXT DEFAULT 'internal', -- internal, contractor, vendor
  department TEXT,
  skill_category TEXT, -- network, it, business, vendor
  skills JSONB DEFAULT '[]',
  hourly_rate NUMERIC DEFAULT 0,
  available_hours_per_week NUMERIC DEFAULT 40,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resource allocations across projects
CREATE TABLE public.pmo_resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.pmo_resources(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  role_in_project TEXT,
  allocated_hours_per_week NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active', -- active, completed, cancelled
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stage-gate definitions
CREATE TABLE public.pmo_stage_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  gate_name TEXT NOT NULL,
  gate_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, in_review, approved, rejected
  checklist JSONB DEFAULT '[]',
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pmo_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_project_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_project_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_stage_gates ENABLE ROW LEVEL SECURITY;

-- RLS Policies - authenticated users can access based on company
CREATE POLICY "Authenticated users can manage programs" ON public.pmo_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage portfolio" ON public.pmo_project_portfolio FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage dependencies" ON public.pmo_project_dependencies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage risks" ON public.pmo_risks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage issues" ON public.pmo_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage resources" ON public.pmo_resources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage allocations" ON public.pmo_resource_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage gates" ON public.pmo_stage_gates FOR ALL TO authenticated USING (true) WITH CHECK (true);
