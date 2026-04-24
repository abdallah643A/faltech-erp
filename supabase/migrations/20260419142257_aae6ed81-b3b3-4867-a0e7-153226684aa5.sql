
-- =========================================================
-- HR Lifecycle Mega-Migration
-- =========================================================

-- ===== RECRUITMENT =====
CREATE TABLE IF NOT EXISTS public.hr_job_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  requisition_number TEXT,
  job_title TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  position_id UUID REFERENCES public.positions(id),
  hiring_manager_id UUID REFERENCES public.employees(id),
  number_of_openings INT NOT NULL DEFAULT 1,
  employment_type TEXT DEFAULT 'full_time',
  location TEXT,
  budget_min NUMERIC(14,2),
  budget_max NUMERIC(14,2),
  currency TEXT DEFAULT 'SAR',
  job_description TEXT,
  required_skills TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','approved','on_hold','filled','cancelled')),
  posted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID REFERENCES public.hr_job_requisitions(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'direct',
  resume_url TEXT,
  current_employer TEXT,
  notice_period_days INT,
  expected_salary NUMERIC(14,2),
  current_stage TEXT NOT NULL DEFAULT 'applied',
  rating INT CHECK (rating BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','rejected','withdrawn','hired')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_candidate_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.hr_candidates(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','passed','failed','skipped')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  interviewer_id UUID REFERENCES public.employees(id),
  feedback TEXT,
  score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.hr_candidates(id) ON DELETE CASCADE,
  requisition_id UUID REFERENCES public.hr_job_requisitions(id),
  offer_number TEXT,
  offered_salary NUMERIC(14,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  benefits JSONB,
  start_date DATE,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','declined','withdrawn','expired')),
  approval_request_id UUID,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== ONBOARDING =====
CREATE TABLE IF NOT EXISTS public.hr_onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  template_name TEXT NOT NULL,
  description TEXT,
  applies_to_department UUID REFERENCES public.departments(id),
  applies_to_position UUID REFERENCES public.positions(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_onboarding_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.hr_onboarding_templates(id) ON DELETE CASCADE,
  task_order INT NOT NULL,
  task_title TEXT NOT NULL,
  task_description TEXT,
  responsible_role TEXT NOT NULL DEFAULT 'hr',
  due_offset_days INT NOT NULL DEFAULT 0,
  is_mandatory BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.hr_onboarding_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.hr_onboarding_templates(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_completion_date DATE,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.hr_onboarding_instances(id) ON DELETE CASCADE,
  task_order INT NOT NULL,
  task_title TEXT NOT NULL,
  task_description TEXT,
  responsible_role TEXT,
  assigned_to UUID,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  evidence_url TEXT,
  notes TEXT
);

-- ===== ATTENDANCE EXCEPTIONS & LEAVE ENCASHMENT =====
CREATE TABLE IF NOT EXISTS public.hr_attendance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES public.attendance(id) ON DELETE SET NULL,
  exception_date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('missing_punch','late','early_leave','no_show','overtime','manual_correction')),
  reason TEXT,
  requested_check_in TIMESTAMPTZ,
  requested_check_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approval_request_id UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_leave_encashments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  encashment_year INT NOT NULL,
  days_encashed NUMERIC(6,2) NOT NULL,
  daily_rate NUMERIC(14,2) NOT NULL,
  gross_amount NUMERIC(14,2) GENERATED ALWAYS AS (days_encashed * daily_rate) STORED,
  tax_deduction NUMERIC(14,2) DEFAULT 0,
  net_amount NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  approval_request_id UUID,
  payroll_run_id UUID,
  paid_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== PAYROLL RUNS & AUDIT =====
CREATE TABLE IF NOT EXISTS public.hr_payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  run_number TEXT,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  total_employees INT NOT NULL DEFAULT 0,
  total_gross NUMERIC(16,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(16,2) NOT NULL DEFAULT 0,
  total_net NUMERIC(16,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','calculated','approved','posted','paid','reversed')),
  approval_request_id UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  journal_entry_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_payroll_run_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.hr_payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  basic_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  housing_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(14,2) NOT NULL DEFAULT 0,
  overtime_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  gosi_employee NUMERIC(14,2) NOT NULL DEFAULT 0,
  gosi_employer NUMERIC(14,2) NOT NULL DEFAULT 0,
  loan_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  pay_components JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_payroll_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.hr_payroll_runs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID,
  performed_by_name TEXT,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  metadata JSONB,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== GRIEVANCE ESCALATIONS =====
CREATE TABLE IF NOT EXISTS public.hr_grievance_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID NOT NULL REFERENCES public.hr_grievances(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('comment','status_change','escalation','resolution','reopen','assignment')),
  performed_by UUID,
  performed_by_name TEXT,
  description TEXT,
  escalated_to UUID,
  metadata JSONB,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== LETTER TEMPLATES =====
CREATE TABLE IF NOT EXISTS public.hr_letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  template_code TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_name_ar TEXT,
  letter_type TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_html_ar TEXT,
  required_signatures TEXT[] DEFAULT ARRAY[]::TEXT[],
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== OFFBOARDING CLEARANCE =====
CREATE TABLE IF NOT EXISTS public.hr_offboarding_clearance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offboarding_id UUID NOT NULL REFERENCES public.offboarding_checklists(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  item_description TEXT NOT NULL,
  responsible_user_id UUID,
  responsible_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','cleared','blocked','waived')),
  cleared_at TIMESTAMPTZ,
  cleared_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== ESS / MSS =====
CREATE TABLE IF NOT EXISTS public.hr_self_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('leave','attendance_correction','letter','loan','expense','document','data_change','encashment','training','other')),
  reference_id UUID,
  reference_table TEXT,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft','submitted','in_review','approved','rejected','withdrawn','completed')),
  approval_request_id UUID,
  current_approver_id UUID,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== STATUTORY (multi-country) =====
CREATE TABLE IF NOT EXISTS public.hr_statutory_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  country_code TEXT NOT NULL,
  scheme_code TEXT NOT NULL,
  scheme_name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, country_code, scheme_code, effective_from)
);

CREATE TABLE IF NOT EXISTS public.hr_statutory_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  country_code TEXT NOT NULL,
  scheme_code TEXT NOT NULL,
  filing_period TEXT NOT NULL,
  filing_type TEXT NOT NULL,
  payroll_run_id UUID REFERENCES public.hr_payroll_runs(id),
  total_employees INT,
  total_amount NUMERIC(16,2),
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','submitted','accepted','rejected')),
  submitted_at TIMESTAMPTZ,
  reference_number TEXT,
  payload JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== APPRAISAL & 9-BOX =====
CREATE TABLE IF NOT EXISTS public.hr_appraisal_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  cycle_name TEXT NOT NULL,
  fiscal_year INT NOT NULL,
  cycle_type TEXT NOT NULL DEFAULT 'annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','calibration','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.hr_appraisal_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES public.employees(id),
  self_rating NUMERIC(3,1),
  manager_rating NUMERIC(3,1),
  final_rating NUMERIC(3,1),
  performance_score NUMERIC(5,2),
  potential_score NUMERIC(5,2),
  nine_box_cell INT CHECK (nine_box_cell BETWEEN 1 AND 9),
  calibrated_nine_box_cell INT CHECK (calibrated_nine_box_cell BETWEEN 1 AND 9),
  comments TEXT,
  goals JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','self_review','manager_review','calibration','signed_off','disputed')),
  signed_off_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.hr_appraisal_calibration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.hr_appraisal_cycles(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  scheduled_at TIMESTAMPTZ,
  facilitator_id UUID,
  attendees JSONB,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_appraisal_calibration_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.hr_appraisal_calibration_sessions(id) ON DELETE CASCADE,
  appraisal_id UUID NOT NULL REFERENCES public.hr_appraisals(id) ON DELETE CASCADE,
  original_rating NUMERIC(3,1),
  adjusted_rating NUMERIC(3,1),
  original_nine_box INT,
  adjusted_nine_box INT,
  rationale TEXT,
  adjusted_by UUID,
  adjusted_by_name TEXT,
  adjusted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== WORKFORCE PLANNING =====
CREATE TABLE IF NOT EXISTS public.hr_workforce_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  plan_name TEXT NOT NULL,
  fiscal_year INT NOT NULL,
  scenario TEXT NOT NULL DEFAULT 'baseline',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','active','archived')),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_workforce_plan_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.hr_workforce_plans(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id),
  position_id UUID REFERENCES public.positions(id),
  current_headcount INT NOT NULL DEFAULT 0,
  planned_headcount INT NOT NULL DEFAULT 0,
  attrition_estimate INT NOT NULL DEFAULT 0,
  hires_planned INT NOT NULL DEFAULT 0,
  budget_amount NUMERIC(16,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== COMPETENCY MATRICES =====
CREATE TABLE IF NOT EXISTS public.hr_competency_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  matrix_name TEXT NOT NULL,
  position_id UUID REFERENCES public.positions(id),
  department_id UUID REFERENCES public.departments(id),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_competency_matrix_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID NOT NULL REFERENCES public.hr_competency_matrices(id) ON DELETE CASCADE,
  competency_name TEXT NOT NULL,
  required_level INT NOT NULL CHECK (required_level BETWEEN 1 AND 5),
  weight NUMERIC(5,2) DEFAULT 1.0,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_hr_candidates_req ON public.hr_candidates(requisition_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_candidate_stages_cand ON public.hr_candidate_stages(candidate_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_instances_emp ON public.hr_onboarding_instances(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_tasks_inst ON public.hr_onboarding_tasks(instance_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_exc_emp ON public.hr_attendance_exceptions(employee_id, exception_date);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_run_lines_run ON public.hr_payroll_run_lines(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_audit_run ON public.hr_payroll_audit_log(payroll_run_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_self_service_emp ON public.hr_self_service_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_self_service_approver ON public.hr_self_service_requests(current_approver_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_appraisals_cycle ON public.hr_appraisals(cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_calib_adj_session ON public.hr_appraisal_calibration_adjustments(session_id);
CREATE INDEX IF NOT EXISTS idx_hr_statutory_filings_period ON public.hr_statutory_filings(country_code, scheme_code, filing_period);
CREATE INDEX IF NOT EXISTS idx_hr_workforce_plan_lines_plan ON public.hr_workforce_plan_lines(plan_id);

-- =========================================================
-- RLS — enable + policies
-- =========================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'hr_job_requisitions','hr_candidates','hr_candidate_stages','hr_offers',
    'hr_onboarding_templates','hr_onboarding_template_tasks','hr_onboarding_instances','hr_onboarding_tasks',
    'hr_attendance_exceptions','hr_leave_encashments',
    'hr_payroll_runs','hr_payroll_run_lines','hr_payroll_audit_log',
    'hr_grievance_actions','hr_letter_templates','hr_offboarding_clearance_items',
    'hr_self_service_requests',
    'hr_statutory_configs','hr_statutory_filings',
    'hr_appraisal_cycles','hr_appraisals','hr_appraisal_calibration_sessions','hr_appraisal_calibration_adjustments',
    'hr_workforce_plans','hr_workforce_plan_lines',
    'hr_competency_matrices','hr_competency_matrix_requirements'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Helper: HR admin/manager check via existing has_role
-- (assumes 'admin' role; HR org permissions can layer in app code)

-- Generic authenticated read access
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'hr_job_requisitions','hr_candidates','hr_candidate_stages','hr_offers',
    'hr_onboarding_templates','hr_onboarding_template_tasks','hr_onboarding_instances','hr_onboarding_tasks',
    'hr_attendance_exceptions','hr_leave_encashments',
    'hr_payroll_runs','hr_payroll_run_lines','hr_payroll_audit_log',
    'hr_grievance_actions','hr_letter_templates','hr_offboarding_clearance_items',
    'hr_self_service_requests',
    'hr_statutory_configs','hr_statutory_filings',
    'hr_appraisal_cycles','hr_appraisals','hr_appraisal_calibration_sessions','hr_appraisal_calibration_adjustments',
    'hr_workforce_plans','hr_workforce_plan_lines',
    'hr_competency_matrices','hr_competency_matrix_requirements'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      t || '_select', t
    );
  END LOOP;
END $$;

-- Authenticated insert (employee-scoped tables open to all signed-in;
-- payroll/statutory/appraisal cycles/workforce plans restricted to admins)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'hr_job_requisitions','hr_candidates','hr_candidate_stages','hr_offers',
    'hr_onboarding_templates','hr_onboarding_template_tasks','hr_onboarding_instances','hr_onboarding_tasks',
    'hr_attendance_exceptions','hr_leave_encashments',
    'hr_grievance_actions','hr_letter_templates','hr_offboarding_clearance_items',
    'hr_self_service_requests',
    'hr_appraisals','hr_appraisal_calibration_sessions','hr_appraisal_calibration_adjustments',
    'hr_workforce_plan_lines',
    'hr_competency_matrices','hr_competency_matrix_requirements'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)',
      t || '_insert', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL)',
      t || '_update', t
    );
  END LOOP;
END $$;

-- Admin-only sensitive tables
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'hr_payroll_runs','hr_payroll_run_lines','hr_payroll_audit_log',
    'hr_statutory_configs','hr_statutory_filings',
    'hr_appraisal_cycles','hr_workforce_plans'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin''))',
      t || '_insert_admin', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin''))',
      t || '_update_admin', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''))',
      t || '_delete_admin', t
    );
  END LOOP;
END $$;

-- =========================================================
-- Auto audit on payroll changes
-- =========================================================
CREATE OR REPLACE FUNCTION public.hr_log_payroll_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.hr_payroll_audit_log
      (payroll_run_id, action, performed_by, field_changed, old_value, new_value)
    VALUES
      (NEW.id, 'status_change', auth.uid(), 'status', OLD.status, NEW.status);
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.hr_payroll_audit_log (payroll_run_id, action, performed_by)
    VALUES (NEW.id, 'created', auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hr_payroll_audit ON public.hr_payroll_runs;
CREATE TRIGGER trg_hr_payroll_audit
AFTER INSERT OR UPDATE ON public.hr_payroll_runs
FOR EACH ROW EXECUTE FUNCTION public.hr_log_payroll_change();

-- =========================================================
-- Workforce gap view
-- =========================================================
CREATE OR REPLACE VIEW public.v_hr_workforce_gap
WITH (security_invoker = true) AS
SELECT
  pl.id,
  pl.plan_id,
  pl.department_id,
  pl.position_id,
  pl.current_headcount,
  pl.planned_headcount,
  pl.attrition_estimate,
  pl.hires_planned,
  (pl.planned_headcount - (pl.current_headcount - pl.attrition_estimate)) AS net_gap,
  pl.budget_amount,
  d.name AS department_name,
  p.title AS position_title
FROM public.hr_workforce_plan_lines pl
LEFT JOIN public.departments d ON d.id = pl.department_id
LEFT JOIN public.positions p ON p.id = pl.position_id;
