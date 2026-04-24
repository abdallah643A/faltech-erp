
-- Budget Setup tables
CREATE TABLE public.budget_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.budget_distribution_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  method_type TEXT NOT NULL DEFAULT 'equal',
  description TEXT,
  percentages JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT,
  fiscal_year INTEGER NOT NULL,
  period_1 NUMERIC DEFAULT 0,
  period_2 NUMERIC DEFAULT 0,
  period_3 NUMERIC DEFAULT 0,
  period_4 NUMERIC DEFAULT 0,
  period_5 NUMERIC DEFAULT 0,
  period_6 NUMERIC DEFAULT 0,
  period_7 NUMERIC DEFAULT 0,
  period_8 NUMERIC DEFAULT 0,
  period_9 NUMERIC DEFAULT 0,
  period_10 NUMERIC DEFAULT 0,
  period_11 NUMERIC DEFAULT 0,
  period_12 NUMERIC DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (period_1+period_2+period_3+period_4+period_5+period_6+period_7+period_8+period_9+period_10+period_11+period_12) STORED,
  distribution_method_id UUID REFERENCES public.budget_distribution_methods(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scenario_id, account_code, fiscal_year)
);

-- Cost Accounting tables
CREATE TABLE public.cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  dimension_type TEXT,
  parent_id UUID REFERENCES public.cost_centers(id),
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.distribution_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  dimension_type TEXT,
  is_active BOOLEAN DEFAULT true,
  factor TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.distribution_rule_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.distribution_rules(id) ON DELETE CASCADE NOT NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id),
  cost_center_code TEXT,
  percentage NUMERIC NOT NULL DEFAULT 0,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_distribution_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_rule_lines ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can manage budget_scenarios" ON public.budget_scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage budget_distribution_methods" ON public.budget_distribution_methods FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage budgets" ON public.budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage cost_centers" ON public.cost_centers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage distribution_rules" ON public.distribution_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage distribution_rule_lines" ON public.distribution_rule_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
