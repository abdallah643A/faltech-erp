
-- Lessons Learned Repository (shared between PMO & TMO)
CREATE TABLE public.pmo_lessons_learned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.pmo_programs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'process',
  lesson_type TEXT NOT NULL DEFAULT 'improvement',
  description TEXT,
  root_cause TEXT,
  recommendation TEXT,
  impact_area TEXT,
  tags TEXT[] DEFAULT '{}',
  submitted_by TEXT,
  submitted_by_id UUID,
  approved BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pmo_lessons_learned ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage lessons learned"
  ON public.pmo_lessons_learned FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- EVM Tracking snapshots for projects
CREATE TABLE public.pmo_evm_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  planned_value NUMERIC DEFAULT 0,
  earned_value NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  spi NUMERIC GENERATED ALWAYS AS (
    CASE WHEN planned_value > 0 THEN earned_value / planned_value ELSE 0 END
  ) STORED,
  cpi NUMERIC GENERATED ALWAYS AS (
    CASE WHEN actual_cost > 0 THEN earned_value / actual_cost ELSE 0 END
  ) STORED,
  eac NUMERIC GENERATED ALWAYS AS (
    CASE WHEN (CASE WHEN actual_cost > 0 THEN earned_value / actual_cost ELSE 0 END) > 0
    THEN (planned_value / (CASE WHEN actual_cost > 0 THEN earned_value / actual_cost ELSE 0 END))
    ELSE planned_value END
  ) STORED,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pmo_evm_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage EVM snapshots"
  ON public.pmo_evm_snapshots FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Portfolio scenario planning
CREATE TABLE public.pmo_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT NOT NULL DEFAULT 'what_if',
  base_portfolio JSONB DEFAULT '[]',
  modifications JSONB DEFAULT '[]',
  impact_summary JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_by_name TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pmo_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage scenarios"
  ON public.pmo_scenarios FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
