CREATE TABLE IF NOT EXISTS public.pmo_capacity_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  resource_name text NOT NULL,
  role text,
  demand_hours numeric NOT NULL DEFAULT 0,
  supply_hours numeric NOT NULL DEFAULT 160,
  utilization_pct numeric GENERATED ALWAYS AS (CASE WHEN supply_hours > 0 THEN ROUND((demand_hours/supply_hours*100)::numeric,2) ELSE 0 END) STORED,
  status text NOT NULL DEFAULT 'ok',
  project_breakdown jsonb DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  computed_by uuid
);
ALTER TABLE public.pmo_capacity_forecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read capacity" ON public.pmo_capacity_forecasts;
DROP POLICY IF EXISTS "auth write capacity" ON public.pmo_capacity_forecasts;
CREATE POLICY "auth read capacity" ON public.pmo_capacity_forecasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write capacity" ON public.pmo_capacity_forecasts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.pmo_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name text NOT NULL,
  description text,
  scenario_type text NOT NULL DEFAULT 'capacity',
  base_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  results jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pmo_scenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read scenarios" ON public.pmo_scenarios;
DROP POLICY IF EXISTS "auth write scenarios" ON public.pmo_scenarios;
CREATE POLICY "auth read scenarios" ON public.pmo_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write scenarios" ON public.pmo_scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.pmo_scenario_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.pmo_scenarios(id) ON DELETE CASCADE,
  project_id uuid,
  adjustment_type text NOT NULL,
  adjustment_value numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pmo_scenario_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read sadj" ON public.pmo_scenario_adjustments;
DROP POLICY IF EXISTS "auth write sadj" ON public.pmo_scenario_adjustments;
CREATE POLICY "auth read sadj" ON public.pmo_scenario_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sadj" ON public.pmo_scenario_adjustments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.pmo_health_narratives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  narrative text NOT NULL,
  recommendations jsonb DEFAULT '[]'::jsonb,
  health_status text,
  overall_score numeric,
  model_used text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid
);
ALTER TABLE public.pmo_health_narratives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read narr" ON public.pmo_health_narratives;
DROP POLICY IF EXISTS "auth write narr" ON public.pmo_health_narratives;
CREATE POLICY "auth read narr" ON public.pmo_health_narratives FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write narr" ON public.pmo_health_narratives FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.pmo_compute_capacity(p_start date, p_end date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0; r record;
BEGIN
  DELETE FROM pmo_capacity_forecasts WHERE period_start = p_start AND period_end = p_end;
  FOR r IN
    SELECT COALESCE(resource_name,'Unassigned') as rn, COALESCE(role,'') as rr,
      SUM(COALESCE(allocated_hours,0)) as demand,
      jsonb_agg(jsonb_build_object('project_id', project_id, 'hours', allocated_hours, 'allocation_pct', allocation_pct)) as breakdown
    FROM pmo_resource_assignments
    WHERE (start_date IS NULL OR start_date <= p_end) AND (end_date IS NULL OR end_date >= p_start)
    GROUP BY resource_name, role
  LOOP
    INSERT INTO pmo_capacity_forecasts (period_start, period_end, resource_name, role, demand_hours, supply_hours, status, project_breakdown)
    VALUES (p_start, p_end, r.rn, r.rr, r.demand, 160,
      CASE WHEN r.demand > 160 THEN 'overloaded' WHEN r.demand > 128 THEN 'stretched' WHEN r.demand < 80 THEN 'underused' ELSE 'ok' END,
      r.breakdown);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION public.pmo_apply_scenario(p_scenario_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb; v_total_demand numeric := 0; v_total_supply numeric := 0; v_adjusted_demand numeric := 0; v_demand_delta numeric := 0;
BEGIN
  SELECT COALESCE(SUM(demand_hours),0), COALESCE(SUM(supply_hours),0) INTO v_total_demand, v_total_supply
  FROM pmo_capacity_forecasts WHERE computed_at = (SELECT MAX(computed_at) FROM pmo_capacity_forecasts);

  SELECT COALESCE(SUM(CASE adjustment_type
    WHEN 'add_demand' THEN adjustment_value
    WHEN 'reduce_demand' THEN -adjustment_value
    WHEN 'shift_pct' THEN v_total_demand * (adjustment_value/100.0)
    ELSE 0 END),0) INTO v_demand_delta
  FROM pmo_scenario_adjustments WHERE scenario_id = p_scenario_id;

  v_adjusted_demand := GREATEST(0, v_total_demand + v_demand_delta);
  v_result := jsonb_build_object(
    'baseline_demand', v_total_demand, 'baseline_supply', v_total_supply,
    'adjusted_demand', v_adjusted_demand, 'demand_delta', v_demand_delta,
    'baseline_utilization', CASE WHEN v_total_supply>0 THEN ROUND((v_total_demand/v_total_supply*100)::numeric,2) ELSE 0 END,
    'projected_utilization', CASE WHEN v_total_supply>0 THEN ROUND((v_adjusted_demand/v_total_supply*100)::numeric,2) ELSE 0 END,
    'verdict', CASE WHEN v_total_supply = 0 THEN 'no_data'
      WHEN v_adjusted_demand/v_total_supply > 1.1 THEN 'overcommitted'
      WHEN v_adjusted_demand/v_total_supply > 0.9 THEN 'tight'
      WHEN v_adjusted_demand/v_total_supply < 0.5 THEN 'undercommitted' ELSE 'balanced' END
  );
  UPDATE pmo_scenarios SET results = v_result, status = 'computed', updated_at = now() WHERE id = p_scenario_id;
  RETURN v_result;
END $$;

DROP TRIGGER IF EXISTS trg_pmo_scenarios_updated ON public.pmo_scenarios;
CREATE TRIGGER trg_pmo_scenarios_updated BEFORE UPDATE ON public.pmo_scenarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();