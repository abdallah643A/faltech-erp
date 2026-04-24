
-- =====================================================
-- HR & PAYROLL ENHANCEMENT
-- =====================================================

-- 1) ATS Pipeline Stages
CREATE TABLE IF NOT EXISTS public.hr_ats_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  stage_code TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  stage_name_ar TEXT,
  stage_order INTEGER NOT NULL DEFAULT 1,
  stage_type TEXT NOT NULL DEFAULT 'active',
  is_terminal BOOLEAN DEFAULT false,
  sla_hours INTEGER,
  auto_advance BOOLEAN DEFAULT false,
  required_actions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, stage_code)
);

-- 2) ATS Screening Rules
CREATE TABLE IF NOT EXISTS public.hr_ats_screening_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  applies_to_requisition_id UUID,
  min_years_experience NUMERIC(4,1),
  required_education_level TEXT,
  required_keywords TEXT[],
  blocked_keywords TEXT[],
  preferred_locations TEXT[],
  max_expected_salary NUMERIC(18,2),
  required_languages TEXT[],
  required_nationality TEXT[],
  auto_action TEXT NOT NULL DEFAULT 'flag',
  weight INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) ATS Candidate Scores
CREATE TABLE IF NOT EXISTS public.hr_ats_candidate_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID,
  applicant_id UUID,
  requisition_id UUID,
  total_score NUMERIC(6,2) DEFAULT 0,
  experience_score NUMERIC(6,2) DEFAULT 0,
  education_score NUMERIC(6,2) DEFAULT 0,
  skills_score NUMERIC(6,2) DEFAULT 0,
  keywords_score NUMERIC(6,2) DEFAULT 0,
  rank_position INTEGER,
  recommendation TEXT,
  matched_keywords TEXT[],
  missing_keywords TEXT[],
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ats_scores_req ON public.hr_ats_candidate_scores(requisition_id, total_score DESC);

-- 4) Contracts
CREATE TABLE IF NOT EXISTS public.hr_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  employee_id UUID,
  contract_number TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'fixed_term',
  position_title TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  probation_end_date DATE,
  probation_passed BOOLEAN,
  basic_salary NUMERIC(18,2),
  housing_allowance NUMERIC(18,2) DEFAULT 0,
  transport_allowance NUMERIC(18,2) DEFAULT 0,
  other_allowances NUMERIC(18,2) DEFAULT 0,
  total_salary NUMERIC(18,2) GENERATED ALWAYS AS (
    COALESCE(basic_salary,0) + COALESCE(housing_allowance,0)
    + COALESCE(transport_allowance,0) + COALESCE(other_allowances,0)
  ) STORED,
  currency TEXT NOT NULL DEFAULT 'SAR',
  working_hours_per_week NUMERIC(5,2) DEFAULT 48,
  notice_period_days INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'active',
  signed_date DATE,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON public.hr_contracts(employee_id, status);

-- 5) Contract Amendments
CREATE TABLE IF NOT EXISTS public.hr_contract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.hr_contracts(id) ON DELETE CASCADE,
  amendment_type TEXT NOT NULL,
  effective_date DATE NOT NULL,
  reason TEXT,
  old_values JSONB,
  new_values JSONB,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) Regional Leave Policies
CREATE TABLE IF NOT EXISTS public.hr_leave_policies_regional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  country_code TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  policy_name_ar TEXT,
  leave_type TEXT NOT NULL,
  entitlement_days NUMERIC(6,2) NOT NULL,
  accrual_method TEXT DEFAULT 'annual',
  accrual_rate NUMERIC(6,4),
  applies_after_months INTEGER DEFAULT 0,
  carry_forward_max_days NUMERIC(6,2) DEFAULT 0,
  paid BOOLEAN DEFAULT true,
  pay_percentage NUMERIC(5,2) DEFAULT 100,
  requires_documentation BOOLEAN DEFAULT false,
  legal_reference TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) Attendance Exceptions
CREATE TABLE IF NOT EXISTS public.hr_attendance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  employee_id UUID,
  exception_date DATE NOT NULL,
  exception_type TEXT NOT NULL,
  expected_in TIME,
  actual_in TIME,
  expected_out TIME,
  actual_out TIME,
  variance_minutes INTEGER,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_att_exc_emp ON public.hr_attendance_exceptions(employee_id, exception_date DESC);

-- 8) Payroll Controls
CREATE TABLE IF NOT EXISTS public.hr_payroll_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  control_code TEXT NOT NULL,
  control_name TEXT NOT NULL,
  control_name_ar TEXT,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  check_expression TEXT,
  description TEXT,
  blocks_payroll BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, control_code)
);

-- 9) Grievances
CREATE TABLE IF NOT EXISTS public.hr_grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  grievance_number TEXT NOT NULL,
  filed_by UUID,
  filed_by_name TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  subject TEXT NOT NULL,
  description TEXT,
  related_employee_id UUID,
  related_department TEXT,
  filed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_to UUID,
  assigned_to_name TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_date DATE,
  escalated_to_legal BOOLEAN DEFAULT false,
  confidential BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10) Offboarding Checklists
CREATE TABLE IF NOT EXISTS public.hr_offboarding_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  employee_id UUID,
  checklist_number TEXT NOT NULL,
  separation_type TEXT NOT NULL,
  notice_date DATE NOT NULL,
  last_working_date DATE NOT NULL,
  reason TEXT,
  exit_interview_done BOOLEAN DEFAULT false,
  exit_interview_notes TEXT,
  assets_returned BOOLEAN DEFAULT false,
  access_revoked BOOLEAN DEFAULT false,
  final_settlement_amount NUMERIC(18,2),
  eosb_amount NUMERIC(18,2),
  unused_leave_payout NUMERIC(18,2),
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11) Offboarding Tasks
CREATE TABLE IF NOT EXISTS public.hr_offboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.hr_offboarding_checklists(id) ON DELETE CASCADE,
  task_order INTEGER NOT NULL DEFAULT 1,
  task_name TEXT NOT NULL,
  task_name_ar TEXT,
  category TEXT NOT NULL,
  responsible_role TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12) Talent Development
CREATE TABLE IF NOT EXISTS public.hr_talent_development (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  employee_id UUID,
  record_type TEXT NOT NULL,
  title TEXT NOT NULL,
  provider TEXT,
  start_date DATE,
  end_date DATE,
  hours NUMERIC(6,2),
  cost NUMERIC(18,2),
  proficiency_level TEXT,
  expiry_date DATE,
  certificate_url TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  manager_endorsed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13) Document Expiry
CREATE TABLE IF NOT EXISTS public.hr_document_expiry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  employee_id UUID,
  document_type TEXT NOT NULL,
  document_number TEXT,
  issuing_authority TEXT,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  reminder_30 BOOLEAN DEFAULT false,
  reminder_60 BOOLEAN DEFAULT false,
  reminder_90 BOOLEAN DEFAULT false,
  renewal_status TEXT NOT NULL DEFAULT 'active',
  renewal_initiated_at TIMESTAMPTZ,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_exp_lookup ON public.hr_document_expiry(employee_id, expiry_date);

-- 14) Workforce Analytics Snapshots
CREATE TABLE IF NOT EXISTS public.hr_workforce_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  branch_id UUID,
  snapshot_date DATE NOT NULL,
  headcount INTEGER DEFAULT 0,
  new_hires INTEGER DEFAULT 0,
  separations INTEGER DEFAULT 0,
  turnover_pct NUMERIC(6,2),
  saudization_pct NUMERIC(6,2),
  avg_tenure_months NUMERIC(8,2),
  total_payroll_cost NUMERIC(18,2),
  avg_salary NUMERIC(18,2),
  open_positions INTEGER DEFAULT 0,
  female_pct NUMERIC(6,2),
  manager_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, branch_id, snapshot_date)
);

-- 15) ESS Self-Service Requests
CREATE TABLE IF NOT EXISTS public.hr_self_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  employee_id UUID,
  request_number TEXT NOT NULL,
  request_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted',
  priority TEXT DEFAULT 'normal',
  manager_id UUID,
  manager_decision TEXT,
  manager_decision_at TIMESTAMPTZ,
  manager_notes TEXT,
  hr_reviewer UUID,
  hr_decision TEXT,
  hr_decision_at TIMESTAMPTZ,
  hr_notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ess_emp ON public.hr_self_service_requests(employee_id, status);

-- =====================================================
-- RLS
-- =====================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'hr_ats_pipeline_stages','hr_ats_screening_rules','hr_ats_candidate_scores',
    'hr_contracts','hr_contract_amendments','hr_leave_policies_regional',
    'hr_attendance_exceptions','hr_payroll_controls','hr_grievances',
    'hr_offboarding_checklists','hr_offboarding_tasks','hr_talent_development',
    'hr_document_expiry','hr_workforce_analytics_snapshots','hr_self_service_requests'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "auth_select_%I" ON public.%I FOR SELECT TO authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%I" ON public.%I FOR INSERT TO authenticated WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%I" ON public.%I FOR UPDATE TO authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%I" ON public.%I FOR DELETE TO authenticated USING (true);', t, t);
  END LOOP;
END $$;

-- Timestamp triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'hr_ats_screening_rules','hr_contracts','hr_leave_policies_regional',
    'hr_grievances','hr_offboarding_checklists','hr_talent_development',
    'hr_document_expiry','hr_self_service_requests'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;

-- =====================================================
-- SEEDS
-- =====================================================
INSERT INTO public.hr_ats_pipeline_stages (stage_code, stage_name, stage_name_ar, stage_order, stage_type, is_terminal, sla_hours) VALUES
  ('APPLIED', 'Applied', 'تم التقديم', 1, 'active', false, 48),
  ('SCREENING', 'Resume Screening', 'فحص السيرة الذاتية', 2, 'active', false, 72),
  ('PHONE', 'Phone Screen', 'مقابلة هاتفية', 3, 'active', false, 96),
  ('INTERVIEW', 'Interview', 'مقابلة', 4, 'active', false, 168),
  ('ASSESSMENT', 'Assessment', 'تقييم', 5, 'active', false, 168),
  ('OFFER', 'Offer Extended', 'تم تقديم العرض', 6, 'active', false, 120),
  ('HIRED', 'Hired', 'تم التعيين', 7, 'success', true, NULL),
  ('REJECTED', 'Rejected', 'مرفوض', 99, 'rejection', true, NULL),
  ('WITHDRAWN', 'Withdrawn', 'انسحب', 98, 'rejection', true, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_leave_policies_regional (country_code, policy_name, policy_name_ar, leave_type, entitlement_days, accrual_method, applies_after_months, carry_forward_max_days, paid, pay_percentage, requires_documentation, legal_reference) VALUES
  ('SA', 'Annual Leave (1-5 yrs)', 'الإجازة السنوية (١-٥ سنوات)', 'annual', 21, 'annual', 12, 21, true, 100, false, 'Saudi Labor Law Article 109'),
  ('SA', 'Annual Leave (5+ yrs)', 'الإجازة السنوية (٥+ سنوات)', 'annual', 30, 'annual', 60, 30, true, 100, false, 'Saudi Labor Law Article 109'),
  ('SA', 'Sick Leave - First 30d', 'الإجازة المرضية - ٣٠ يوم الأولى', 'sick', 30, 'annual', 0, 0, true, 100, true, 'Saudi Labor Law Article 117'),
  ('SA', 'Sick Leave - Next 60d', 'الإجازة المرضية - ٦٠ يوم التالية', 'sick', 60, 'annual', 0, 0, true, 75, true, 'Saudi Labor Law Article 117'),
  ('SA', 'Sick Leave - Final 30d', 'الإجازة المرضية - ٣٠ يوم الأخيرة', 'sick', 30, 'annual', 0, 0, false, 0, true, 'Saudi Labor Law Article 117'),
  ('SA', 'Hajj Leave', 'إجازة الحج', 'hajj', 10, 'lifetime', 24, 0, true, 100, true, 'Saudi Labor Law Article 114'),
  ('SA', 'Maternity Leave', 'إجازة الأمومة', 'maternity', 70, 'per_event', 0, 0, true, 100, true, 'Saudi Labor Law Article 151'),
  ('SA', 'Iddah Leave', 'إجازة العدة', 'iddah', 130, 'per_event', 0, 0, true, 100, true, 'Saudi Labor Law Article 160'),
  ('SA', 'Bereavement (Spouse)', 'إجازة وفاة (زوج)', 'bereavement', 5, 'per_event', 0, 0, true, 100, true, 'Saudi Labor Law Article 113'),
  ('SA', 'Marriage Leave', 'إجازة الزواج', 'marriage', 5, 'per_event', 0, 0, true, 100, false, 'Saudi Labor Law Article 113'),
  ('SA', 'Paternity Leave', 'إجازة الأبوة', 'paternity', 3, 'per_event', 0, 0, true, 100, false, 'Saudi Labor Law Article 113'),
  ('AE', 'Annual Leave UAE', 'الإجازة السنوية - الإمارات', 'annual', 30, 'annual', 12, 30, true, 100, false, 'UAE Labor Law'),
  ('KW', 'Annual Leave Kuwait', 'الإجازة السنوية - الكويت', 'annual', 30, 'annual', 9, 30, true, 100, false, 'Kuwait Labor Law')
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_payroll_controls (control_code, control_name, control_name_ar, category, severity, description, blocks_payroll) VALUES
  ('NEG_NET', 'Negative Net Salary', 'صافي راتب سالب', 'validation', 'critical', 'Net salary after deductions is below zero', true),
  ('MISSING_IBAN', 'Missing IBAN', 'رقم آيبان مفقود', 'banking', 'critical', 'Employee has no IBAN configured for WPS transfer', true),
  ('EXPIRED_IQAMA', 'Expired Iqama', 'إقامة منتهية', 'compliance', 'critical', 'Employee Iqama is expired - cannot pay legally', true),
  ('MISSING_GOSI', 'Missing GOSI Registration', 'تسجيل تأمينات اجتماعية مفقود', 'compliance', 'critical', 'Saudi/GCC national without GOSI base salary', true),
  ('EXCESS_OT', 'Excessive Overtime', 'ساعات إضافية مفرطة', 'validation', 'warning', 'Overtime exceeds 50% of basic — requires approval', false),
  ('UNPAID_LOAN', 'Outstanding Loan', 'قرض مستحق', 'deductions', 'info', 'Employee has active loan deductions', false),
  ('CONTRACT_EXPIRED', 'Contract Expired', 'عقد منتهي', 'compliance', 'critical', 'Employment contract has expired without renewal', true),
  ('DUPLICATE_PUNCH', 'Duplicate Attendance', 'حضور مكرر', 'attendance', 'warning', 'Same employee punched in multiple devices', false),
  ('SAUDIZATION_LOW', 'Below Saudization Quota', 'أقل من نسبة السعودة', 'compliance', 'warning', 'Branch falls below required Saudization % (Nitaqat)', false),
  ('WPS_REJECTED', 'WPS File Rejected', 'ملف حماية الأجور مرفوض', 'banking', 'critical', 'Last WPS submission was rejected by SAMA', true)
ON CONFLICT DO NOTHING;
