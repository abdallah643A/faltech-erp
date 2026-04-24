
-- Project Phases table with hierarchical support (up to 3 levels)
CREATE TABLE public.cpms_project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  parent_phase_id UUID REFERENCES public.cpms_project_phases(id) ON DELETE CASCADE,
  phase_number TEXT NOT NULL,
  phase_name TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  budgeted_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_started',
  percent_complete NUMERIC DEFAULT 0,
  depends_on_phase_id UUID REFERENCES public.cpms_project_phases(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cpms_project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage project phases"
  ON public.cpms_project_phases FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_cpms_project_phases_project ON public.cpms_project_phases(project_id);
CREATE INDEX idx_cpms_project_phases_parent ON public.cpms_project_phases(parent_phase_id);
