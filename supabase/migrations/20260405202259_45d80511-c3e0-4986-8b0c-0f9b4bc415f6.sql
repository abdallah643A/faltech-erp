
CREATE TABLE public.workforce_demand (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  branch_id UUID REFERENCES public.branches(id),
  department TEXT,
  business_unit TEXT,
  role_title TEXT NOT NULL,
  trade TEXT,
  skill_category TEXT DEFAULT 'general',
  required_count INTEGER NOT NULL DEFAULT 1,
  actual_count INTEGER NOT NULL DEFAULT 0,
  labor_source TEXT DEFAULT 'internal' CHECK (labor_source IN ('internal','external','subcontractor')),
  mobilization_date DATE,
  demobilization_date DATE,
  daily_cost_rate NUMERIC DEFAULT 0,
  monthly_cost_rate NUMERIC DEFAULT 0,
  total_estimated_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','mobilizing','active','demobilizing','completed','cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workforce_demand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage workforce_demand"
  ON public.workforce_demand FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_workforce_demand_updated_at
  BEFORE UPDATE ON public.workforce_demand
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.workforce_actual (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demand_id UUID REFERENCES public.workforce_demand(id) ON DELETE CASCADE NOT NULL,
  employee_name TEXT,
  employee_id UUID REFERENCES public.employees(id),
  resource_id UUID REFERENCES public.pmo_resources(id),
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','released','planned')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workforce_actual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage workforce_actual"
  ON public.workforce_actual FOR ALL TO authenticated USING (true) WITH CHECK (true);
