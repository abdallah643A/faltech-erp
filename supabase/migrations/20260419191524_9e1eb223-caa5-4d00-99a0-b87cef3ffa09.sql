-- PORTFOLIOS
CREATE TABLE IF NOT EXISTS public.pmo_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  owner_name text,
  strategic_objective text,
  budget_total numeric DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pmo_portfolio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.pmo_portfolios(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  project_kind text NOT NULL DEFAULT 'pm' CHECK (project_kind IN ('pm','cpms')),
  weight numeric DEFAULT 1.0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, project_id)
);

-- BASELINES
CREATE TABLE IF NOT EXISTS public.pmo_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  project_kind text NOT NULL DEFAULT 'pm',
  baseline_name text NOT NULL,
  baseline_number int DEFAULT 1,
  is_current boolean DEFAULT false,
  start_date date,
  end_date date,
  budget numeric DEFAULT 0,
  task_count int DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.pmo_baseline_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id uuid NOT NULL REFERENCES public.pmo_baselines(id) ON DELETE CASCADE,
  task_id uuid,
  task_name text NOT NULL,
  baseline_start date,
  baseline_end date,
  baseline_duration_days numeric DEFAULT 0,
  baseline_cost numeric DEFAULT 0,
  baseline_effort_hours numeric DEFAULT 0
);

-- DEPENDENCIES
CREATE TABLE IF NOT EXISTS public.pmo_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  predecessor_task_id uuid NOT NULL,
  successor_task_id uuid NOT NULL,
  dependency_type text NOT NULL DEFAULT 'FS' CHECK (dependency_type IN ('FS','SS','FF','SF')),
  lag_days numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(predecessor_task_id, successor_task_id)
);

-- RESOURCE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.pmo_resource_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  resource_id uuid,
  resource_name text NOT NULL,
  role text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  hours_per_week numeric NOT NULL DEFAULT 40,
  hourly_rate numeric DEFAULT 0,
  allocation_pct numeric DEFAULT 100,
  status text DEFAULT 'planned' CHECK (status IN ('planned','active','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pmo_resource_assign_dates ON public.pmo_resource_assignments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_pmo_resource_assign_resource ON public.pmo_resource_assignments(resource_id);

-- RAID LOG
CREATE TABLE IF NOT EXISTS public.pmo_raid_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('risk','assumption','issue','decision')),
  ref_code text,
  title text NOT NULL,
  description text,
  category text,
  probability text CHECK (probability IN ('low','medium','high')),
  impact text CHECK (impact IN ('low','medium','high')),
  severity_score int DEFAULT 0,
  status text DEFAULT 'open' CHECK (status IN ('open','mitigating','closed','accepted')),
  owner_name text,
  due_date date,
  mitigation text,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- BUDGET vs ACTUAL
CREATE TABLE IF NOT EXISTS public.pmo_budget_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  category text NOT NULL,
  budgeted_amount numeric DEFAULT 0,
  actual_amount numeric DEFAULT 0,
  committed_amount numeric DEFAULT 0,
  variance numeric GENERATED ALWAYS AS (actual_amount - budgeted_amount) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, period_year, period_month, category)
);

-- STAGE GATES
CREATE TABLE IF NOT EXISTS public.pmo_stage_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  gate_seq int NOT NULL DEFAULT 1,
  gate_name text NOT NULL,
  gate_type text DEFAULT 'phase' CHECK (gate_type IN ('phase','milestone','approval')),
  planned_date date,
  actual_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','passed','failed','skipped')),
  approver_name text,
  approval_notes text,
  criteria jsonb DEFAULT '[]'::jsonb,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- HEALTH SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.pmo_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT current_date,
  schedule_score numeric DEFAULT 0,
  budget_score numeric DEFAULT 0,
  risk_score numeric DEFAULT 0,
  scope_score numeric DEFAULT 0,
  overall_score numeric DEFAULT 0,
  health_status text DEFAULT 'green' CHECK (health_status IN ('green','amber','red')),
  schedule_variance_days numeric DEFAULT 0,
  budget_variance_pct numeric DEFAULT 0,
  open_risks int DEFAULT 0,
  open_issues int DEFAULT 0,
  ai_narrative text,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE public.pmo_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_baseline_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_raid_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_budget_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_stage_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_health_snapshots ENABLE ROW LEVEL SECURITY;

-- POLICIES (authenticated full access; tighten later via roles)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'pmo_portfolios','pmo_portfolio_projects','pmo_baselines','pmo_baseline_tasks',
    'pmo_dependencies','pmo_resource_assignments','pmo_raid_log','pmo_budget_actuals',
    'pmo_stage_gates','pmo_health_snapshots'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "auth read %I" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth write %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.pmo_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_pmo_portfolios_touch BEFORE UPDATE ON public.pmo_portfolios FOR EACH ROW EXECUTE FUNCTION public.pmo_touch_updated_at();
CREATE TRIGGER trg_pmo_raid_touch BEFORE UPDATE ON public.pmo_raid_log FOR EACH ROW EXECUTE FUNCTION public.pmo_touch_updated_at();
CREATE TRIGGER trg_pmo_gates_touch BEFORE UPDATE ON public.pmo_stage_gates FOR EACH ROW EXECUTE FUNCTION public.pmo_touch_updated_at();

-- Compute health score function (rule-based)
CREATE OR REPLACE FUNCTION public.pmo_compute_health(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_sched_score numeric := 100;
  v_budget_score numeric := 100;
  v_risk_score numeric := 100;
  v_overall numeric;
  v_status text;
  v_open_risks int;
  v_open_issues int;
  v_budget_var_pct numeric := 0;
  v_total_budget numeric := 0;
  v_total_actual numeric := 0;
  v_sched_var numeric := 0;
BEGIN
  -- Risks/issues
  SELECT COUNT(*) FILTER (WHERE entry_type='risk' AND status IN ('open','mitigating')),
         COUNT(*) FILTER (WHERE entry_type='issue' AND status IN ('open','mitigating'))
  INTO v_open_risks, v_open_issues
  FROM pmo_raid_log WHERE project_id = p_project_id;

  v_risk_score := GREATEST(0, 100 - (v_open_risks * 8) - (v_open_issues * 12));

  -- Budget
  SELECT COALESCE(SUM(budgeted_amount),0), COALESCE(SUM(actual_amount + committed_amount),0)
  INTO v_total_budget, v_total_actual
  FROM pmo_budget_actuals WHERE project_id = p_project_id;

  IF v_total_budget > 0 THEN
    v_budget_var_pct := ((v_total_actual - v_total_budget) / v_total_budget) * 100;
    v_budget_score := GREATEST(0, 100 - GREATEST(0, v_budget_var_pct) * 2);
  END IF;

  -- Schedule: compare actual vs baseline end
  SELECT COALESCE(AVG(EXTRACT(epoch FROM (sg.actual_date::timestamp - sg.planned_date::timestamp))/86400), 0)
  INTO v_sched_var
  FROM pmo_stage_gates sg
  WHERE sg.project_id = p_project_id AND sg.actual_date IS NOT NULL AND sg.planned_date IS NOT NULL;

  v_sched_score := GREATEST(0, 100 - GREATEST(0, v_sched_var) * 2);

  v_overall := ROUND((v_sched_score * 0.4 + v_budget_score * 0.4 + v_risk_score * 0.2)::numeric, 1);
  v_status := CASE WHEN v_overall >= 75 THEN 'green' WHEN v_overall >= 50 THEN 'amber' ELSE 'red' END;

  INSERT INTO pmo_health_snapshots(
    project_id, schedule_score, budget_score, risk_score, scope_score, overall_score,
    health_status, schedule_variance_days, budget_variance_pct, open_risks, open_issues
  ) VALUES (
    p_project_id, v_sched_score, v_budget_score, v_risk_score, 100, v_overall,
    v_status, v_sched_var, v_budget_var_pct, v_open_risks, v_open_issues
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $$;