-- Capacity calendar additions to work centers
ALTER TABLE public.mfg_work_centers
  ADD COLUMN IF NOT EXISTS working_days int[] DEFAULT ARRAY[1,2,3,4,5],
  ADD COLUMN IF NOT EXISTS shift_start time DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS shift_end time DEFAULT '17:00';

-- Schedule runs
CREATE TABLE IF NOT EXISTS public.mfg_schedule_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number text,
  run_date timestamptz NOT NULL DEFAULT now(),
  horizon_start date NOT NULL DEFAULT current_date,
  horizon_end date NOT NULL DEFAULT (current_date + 30),
  strategy text NOT NULL DEFAULT 'forward' CHECK (strategy IN ('forward','backward')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('draft','running','completed','failed')),
  total_operations int DEFAULT 0,
  total_load_hours numeric DEFAULT 0,
  bottleneck_wc_id uuid REFERENCES public.mfg_work_centers(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.mfg_scheduled_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.mfg_schedule_runs(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.mfg_work_orders(id) ON DELETE CASCADE,
  wo_number text,
  operation_seq int NOT NULL DEFAULT 10,
  operation_name text,
  work_center_id uuid REFERENCES public.mfg_work_centers(id),
  work_center_code text,
  planned_qty numeric NOT NULL DEFAULT 0,
  duration_hours numeric NOT NULL DEFAULT 0,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  is_bottleneck boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfg_sched_ops_run ON public.mfg_scheduled_operations(run_id);
CREATE INDEX IF NOT EXISTS idx_mfg_sched_ops_wc ON public.mfg_scheduled_operations(work_center_id, scheduled_start);

-- Simulation scenarios (what-if)
CREATE TABLE IF NOT EXISTS public.mfg_simulation_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name text NOT NULL,
  description text,
  base_run_id uuid REFERENCES public.mfg_schedule_runs(id) ON DELETE SET NULL,
  changes jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','simulated','archived')),
  delta_load_hours numeric DEFAULT 0,
  delta_completion_days numeric DEFAULT 0,
  delta_bottleneck text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.mfg_simulation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.mfg_simulation_scenarios(id) ON DELETE CASCADE,
  work_center_id uuid REFERENCES public.mfg_work_centers(id),
  work_center_code text,
  baseline_load_hours numeric DEFAULT 0,
  scenario_load_hours numeric DEFAULT 0,
  delta_hours numeric DEFAULT 0,
  utilization_pct numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mfg_schedule_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfg_scheduled_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfg_simulation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfg_simulation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read schedule_runs" ON public.mfg_schedule_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write schedule_runs" ON public.mfg_schedule_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read sched_ops" ON public.mfg_scheduled_operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sched_ops" ON public.mfg_scheduled_operations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read sim_scen" ON public.mfg_simulation_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sim_scen" ON public.mfg_simulation_scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read sim_res" ON public.mfg_simulation_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sim_res" ON public.mfg_simulation_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Finite capacity scheduling function
CREATE OR REPLACE FUNCTION public.mfg_run_finite_schedule(
  p_horizon_start date DEFAULT current_date,
  p_horizon_end date DEFAULT (current_date + 30),
  p_strategy text DEFAULT 'forward',
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_wo record;
  v_op record;
  v_wc record;
  v_cursor timestamptz;
  v_op_end timestamptz;
  v_total_ops int := 0;
  v_total_hours numeric := 0;
  v_bottleneck_id uuid;
  v_max_load numeric := 0;
  v_wc_load numeric;
BEGIN
  INSERT INTO mfg_schedule_runs(run_number, horizon_start, horizon_end, strategy, status, notes)
  VALUES ('SCH-' || to_char(now(),'YYYYMMDDHH24MISS'), p_horizon_start, p_horizon_end, p_strategy, 'running', p_notes)
  RETURNING id INTO v_run_id;

  FOR v_wo IN
    SELECT wo.* FROM mfg_work_orders wo
    WHERE wo.status IN ('released','in_progress','planned','draft')
    ORDER BY COALESCE(wo.planned_start_date, current_date) ASC
  LOOP
    v_cursor := COALESCE(v_wo.planned_start_date::timestamptz, p_horizon_start::timestamptz) + interval '8 hours';

    FOR v_op IN
      SELECT ro.*, wc.id as wc_id, wc.code as wc_code, wc.capacity_per_day_hours, wc.efficiency_pct
      FROM mfg_routing_operations ro
      LEFT JOIN mfg_work_centers wc ON wc.id = ro.work_center_id
      WHERE ro.routing_id = v_wo.routing_id
      ORDER BY ro.operation_seq
    LOOP
      DECLARE
        v_dur numeric := COALESCE((v_op.setup_time_min + v_op.run_time_min * COALESCE(v_wo.planned_qty,1)) / 60.0, 1);
        v_cap_per_hr numeric := GREATEST(COALESCE(v_op.capacity_per_day_hours,8) / 8.0 * (COALESCE(v_op.efficiency_pct,100)/100.0), 0.1);
      BEGIN
        v_dur := v_dur / v_cap_per_hr;
        v_op_end := v_cursor + (v_dur || ' hours')::interval;

        INSERT INTO mfg_scheduled_operations(
          run_id, work_order_id, wo_number, operation_seq, operation_name,
          work_center_id, work_center_code, planned_qty, duration_hours,
          scheduled_start, scheduled_end
        ) VALUES (
          v_run_id, v_wo.id, v_wo.wo_number, v_op.operation_seq, v_op.operation_name,
          v_op.wc_id, v_op.wc_code, COALESCE(v_wo.planned_qty,0), v_dur,
          v_cursor, v_op_end
        );

        v_cursor := v_op_end;
        v_total_ops := v_total_ops + 1;
        v_total_hours := v_total_hours + v_dur;
      END;
    END LOOP;
  END LOOP;

  -- Find bottleneck work center
  SELECT work_center_id, SUM(duration_hours) INTO v_bottleneck_id, v_max_load
  FROM mfg_scheduled_operations
  WHERE run_id = v_run_id AND work_center_id IS NOT NULL
  GROUP BY work_center_id
  ORDER BY SUM(duration_hours) DESC
  LIMIT 1;

  IF v_bottleneck_id IS NOT NULL THEN
    UPDATE mfg_scheduled_operations SET is_bottleneck = true
    WHERE run_id = v_run_id AND work_center_id = v_bottleneck_id;
  END IF;

  UPDATE mfg_schedule_runs SET
    status = 'completed',
    total_operations = v_total_ops,
    total_load_hours = v_total_hours,
    bottleneck_wc_id = v_bottleneck_id
  WHERE id = v_run_id;

  RETURN v_run_id;
END;
$$;

-- What-if simulation function
CREATE OR REPLACE FUNCTION public.mfg_run_simulation(p_scenario_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scen record;
  v_changes jsonb;
  v_capacity_mult numeric := 1.0;
  v_baseline_total numeric := 0;
  v_scenario_total numeric := 0;
BEGIN
  SELECT * INTO v_scen FROM mfg_simulation_scenarios WHERE id = p_scenario_id;
  IF v_scen.id IS NULL THEN RETURN; END IF;

  v_changes := COALESCE(v_scen.changes, '{}'::jsonb);
  v_capacity_mult := COALESCE((v_changes->>'capacity_multiplier')::numeric, 1.0);

  DELETE FROM mfg_simulation_results WHERE scenario_id = p_scenario_id;

  INSERT INTO mfg_simulation_results(
    scenario_id, work_center_id, work_center_code,
    baseline_load_hours, scenario_load_hours, delta_hours, utilization_pct
  )
  SELECT
    p_scenario_id,
    so.work_center_id,
    MAX(so.work_center_code),
    SUM(so.duration_hours),
    SUM(so.duration_hours) / NULLIF(v_capacity_mult, 0),
    SUM(so.duration_hours) / NULLIF(v_capacity_mult, 0) - SUM(so.duration_hours),
    LEAST(100, (SUM(so.duration_hours) / NULLIF(v_capacity_mult,0)) /
      NULLIF(EXTRACT(epoch FROM (sr.horizon_end::timestamp - sr.horizon_start::timestamp))/3600 * 0.33, 0) * 100)
  FROM mfg_scheduled_operations so
  JOIN mfg_schedule_runs sr ON sr.id = so.run_id
  WHERE so.run_id = v_scen.base_run_id
  GROUP BY so.work_center_id, sr.horizon_end, sr.horizon_start;

  SELECT COALESCE(SUM(baseline_load_hours),0), COALESCE(SUM(scenario_load_hours),0)
  INTO v_baseline_total, v_scenario_total
  FROM mfg_simulation_results WHERE scenario_id = p_scenario_id;

  UPDATE mfg_simulation_scenarios SET
    status = 'simulated',
    delta_load_hours = v_scenario_total - v_baseline_total,
    delta_completion_days = (v_scenario_total - v_baseline_total) / 8.0,
    delta_bottleneck = (
      SELECT work_center_code FROM mfg_simulation_results
      WHERE scenario_id = p_scenario_id ORDER BY scenario_load_hours DESC LIMIT 1
    )
  WHERE id = p_scenario_id;
END;
$$;