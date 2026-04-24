-- ============================================================
-- Executive Reporting Expansion — PR1 Schema
-- ============================================================

-- 1. Cross-company KPI snapshots
CREATE TABLE IF NOT EXISTS public.exec_kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  kpi_key text NOT NULL,
  kpi_label text,
  period_type text NOT NULL DEFAULT 'monthly',
  period_start date NOT NULL,
  period_end date NOT NULL,
  value numeric,
  target numeric,
  variance_pct numeric,
  unit text,
  trend text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_exec_kpi_company_period ON public.exec_kpi_snapshots(company_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_exec_kpi_key ON public.exec_kpi_snapshots(kpi_key);

-- 2. Board packs
CREATE TABLE IF NOT EXISTS public.exec_board_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  title text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  pdf_url text,
  pdf_size bigint,
  sections jsonb DEFAULT '[]'::jsonb,
  generated_at timestamptz,
  generated_by uuid,
  delivered_to jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_board_packs_company ON public.exec_board_packs(company_id, period_end DESC);

-- 3. Management decisions log
CREATE TABLE IF NOT EXISTS public.exec_decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  decision_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  description text,
  category text,
  owner_id uuid,
  owner_name text,
  status text NOT NULL DEFAULT 'open',
  priority text DEFAULT 'medium',
  due_date date,
  outcome text,
  related_module text,
  related_doc_id uuid,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_decision_company_status ON public.exec_decision_log(company_id, status);

-- 4. Strategic goals
CREATE TABLE IF NOT EXISTS public.exec_strategic_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  goal_code text,
  title text NOT NULL,
  description text,
  perspective text,
  owner_id uuid,
  owner_name text,
  start_date date,
  target_date date,
  baseline numeric,
  target_value numeric,
  current_value numeric,
  unit text,
  weight numeric DEFAULT 1,
  status text NOT NULL DEFAULT 'on_track',
  parent_goal_id uuid REFERENCES public.exec_strategic_goals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_goals_company ON public.exec_strategic_goals(company_id);

CREATE TABLE IF NOT EXISTS public.exec_goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.exec_strategic_goals(id) ON DELETE CASCADE,
  progress_date date NOT NULL DEFAULT CURRENT_DATE,
  value numeric NOT NULL,
  status text,
  comment text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_goal_progress_goal ON public.exec_goal_progress(goal_id, progress_date DESC);

-- 5. Risk register workflow
CREATE TABLE IF NOT EXISTS public.exec_risk_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  risk_code text,
  title text NOT NULL,
  description text,
  category text,
  probability int CHECK (probability BETWEEN 1 AND 5),
  impact int CHECK (impact BETWEEN 1 AND 5),
  inherent_score int GENERATED ALWAYS AS (COALESCE(probability,0) * COALESCE(impact,0)) STORED,
  residual_probability int CHECK (residual_probability BETWEEN 1 AND 5),
  residual_impact int CHECK (residual_impact BETWEEN 1 AND 5),
  residual_score int GENERATED ALWAYS AS (COALESCE(residual_probability,0) * COALESCE(residual_impact,0)) STORED,
  owner_id uuid,
  owner_name text,
  status text NOT NULL DEFAULT 'identified',
  mitigation_strategy text,
  identified_date date NOT NULL DEFAULT CURRENT_DATE,
  review_date date,
  closed_date date,
  related_module text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_risk_company_status ON public.exec_risk_register(company_id, status);

CREATE TABLE IF NOT EXISTS public.exec_risk_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id uuid NOT NULL REFERENCES public.exec_risk_register(id) ON DELETE CASCADE,
  action_text text NOT NULL,
  owner_id uuid,
  owner_name text,
  due_date date,
  status text NOT NULL DEFAULT 'open',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_exec_risk_actions_risk ON public.exec_risk_actions(risk_id);

-- 6. Document expiry watchlist
CREATE TABLE IF NOT EXISTS public.exec_document_expiry_watch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  document_type text NOT NULL,
  document_ref text,
  document_id uuid,
  entity_type text,
  entity_name text,
  expiry_date date NOT NULL,
  days_until_expiry int,
  severity text,
  status text NOT NULL DEFAULT 'active',
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_doc_expiry_company ON public.exec_document_expiry_watch(company_id, expiry_date);

-- 7. Scheduled executive summaries
CREATE TABLE IF NOT EXISTS public.exec_summary_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  user_id uuid,
  schedule_name text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  frequency text NOT NULL DEFAULT 'daily',
  send_time time DEFAULT '07:00',
  timezone text DEFAULT 'Asia/Riyadh',
  sections jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_summary_sched_company ON public.exec_summary_schedules(company_id, is_active);

CREATE TABLE IF NOT EXISTS public.exec_summary_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.exec_summary_schedules(id) ON DELETE SET NULL,
  company_id uuid,
  channel text NOT NULL,
  recipient text,
  status text NOT NULL,
  payload jsonb,
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exec_summary_log_schedule ON public.exec_summary_dispatch_log(schedule_id, sent_at DESC);

-- 8. Role-based widgets
CREATE TABLE IF NOT EXISTS public.exec_role_widget_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  role text NOT NULL,
  widget_key text NOT NULL,
  widget_label text,
  visible boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  size text DEFAULT 'medium',
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, role, widget_key)
);
CREATE INDEX IF NOT EXISTS idx_exec_role_widgets_role ON public.exec_role_widget_configs(company_id, role);

-- 9. AI narrative insights
CREATE TABLE IF NOT EXISTS public.exec_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  insight_type text NOT NULL,
  scope text,
  scope_ref_id uuid,
  title text,
  narrative text NOT NULL,
  highlights jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  model text,
  confidence numeric,
  period_start date,
  period_end date,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_exec_ai_insights_company ON public.exec_ai_insights(company_id, generated_at DESC);

-- ============================================================
-- updated_at triggers (reuse existing helper if present)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_simple') THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at_simple()
    RETURNS TRIGGER LANGUAGE plpgsql AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $f$;
  END IF;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'exec_board_packs','exec_decision_log','exec_strategic_goals',
    'exec_risk_register','exec_document_expiry_watch','exec_summary_schedules',
    'exec_role_widget_configs'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_simple();', t);
  END LOOP;
END $$;

-- ============================================================
-- RLS — enable + permissive policies for authenticated users
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'exec_kpi_snapshots','exec_board_packs','exec_decision_log',
    'exec_strategic_goals','exec_goal_progress','exec_risk_register',
    'exec_risk_actions','exec_document_expiry_watch','exec_summary_schedules',
    'exec_summary_dispatch_log','exec_role_widget_configs','exec_ai_insights'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%s" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "auth_read_%s" ON public.%I FOR SELECT TO authenticated USING (true);', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_write_%s" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "auth_write_%s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- ============================================================
-- Helper: refresh document expiry watchlist
-- ============================================================
CREATE OR REPLACE FUNCTION public.exec_refresh_document_expiry(p_company_id uuid, p_horizon_days int DEFAULT 90)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int := 0;
BEGIN
  -- Mark expired/historical entries as inactive when out of horizon
  UPDATE public.exec_document_expiry_watch
  SET status = 'expired', days_until_expiry = (expiry_date - CURRENT_DATE)
  WHERE company_id = p_company_id
    AND expiry_date < CURRENT_DATE
    AND status = 'active';

  -- Refresh days_until_expiry/severity for active rows
  UPDATE public.exec_document_expiry_watch
  SET days_until_expiry = (expiry_date - CURRENT_DATE),
      severity = CASE
        WHEN expiry_date - CURRENT_DATE <= 7 THEN 'critical'
        WHEN expiry_date - CURRENT_DATE <= 30 THEN 'high'
        WHEN expiry_date - CURRENT_DATE <= 60 THEN 'medium'
        ELSE 'low' END,
      updated_at = now()
  WHERE company_id = p_company_id AND status = 'active';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- ============================================================
-- Helper: compute exec KPI snapshot for a company/period
-- ============================================================
CREATE OR REPLACE FUNCTION public.exec_compute_kpi_snapshot(
  p_company_id uuid,
  p_period_start date,
  p_period_end date
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_revenue numeric := 0;
  v_payments numeric := 0;
  v_pending int := 0;
  v_projects int := 0;
  v_employees int := 0;
  v_inserted int := 0;
BEGIN
  -- Revenue (incoming payments)
  BEGIN
    SELECT COALESCE(SUM(total_amount),0) INTO v_revenue
    FROM public.incoming_payments
    WHERE company_id = p_company_id
      AND doc_date BETWEEN p_period_start AND p_period_end
      AND COALESCE(status,'') <> 'cancelled';
  EXCEPTION WHEN undefined_table THEN v_revenue := 0; END;

  -- Pending approvals
  BEGIN
    SELECT COUNT(*) INTO v_pending FROM public.approval_requests WHERE status = 'pending';
  EXCEPTION WHEN undefined_table THEN v_pending := 0; END;

  -- Active projects
  BEGIN
    SELECT COUNT(*) INTO v_projects FROM public.projects
    WHERE company_id = p_company_id AND status = 'in_progress';
  EXCEPTION WHEN undefined_table THEN v_projects := 0; END;

  -- Employees
  BEGIN
    SELECT COUNT(*) INTO v_employees FROM public.employees
    WHERE company_id = p_company_id AND status = 'active';
  EXCEPTION WHEN undefined_table THEN v_employees := 0; END;

  INSERT INTO public.exec_kpi_snapshots
    (company_id, kpi_key, kpi_label, period_type, period_start, period_end, value, unit)
  VALUES
    (p_company_id, 'revenue', 'Revenue', 'custom', p_period_start, p_period_end, v_revenue, 'SAR'),
    (p_company_id, 'pending_approvals', 'Pending Approvals', 'custom', p_period_start, p_period_end, v_pending, 'count'),
    (p_company_id, 'active_projects', 'Active Projects', 'custom', p_period_start, p_period_end, v_projects, 'count'),
    (p_company_id, 'active_employees', 'Active Employees', 'custom', p_period_start, p_period_end, v_employees, 'count');

  v_inserted := 4;
  RETURN v_inserted;
END $$;