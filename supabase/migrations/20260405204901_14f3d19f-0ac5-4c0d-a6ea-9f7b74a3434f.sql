
-- Overtime Policies
CREATE TABLE public.overtime_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  policy_name TEXT NOT NULL,
  policy_code TEXT,
  description TEXT,
  max_daily_hours NUMERIC DEFAULT 4,
  max_weekly_hours NUMERIC DEFAULT 20,
  max_monthly_hours NUMERIC DEFAULT 60,
  approval_threshold_hours NUMERIC DEFAULT 2,
  manager_approval_required BOOLEAN DEFAULT true,
  hr_approval_required BOOLEAN DEFAULT false,
  hr_approval_above_hours NUMERIC DEFAULT 8,
  regular_multiplier NUMERIC DEFAULT 1.5,
  weekend_multiplier NUMERIC DEFAULT 2.0,
  holiday_multiplier NUMERIC DEFAULT 2.5,
  night_multiplier NUMERIC DEFAULT 1.75,
  meal_break_after_hours NUMERIC DEFAULT 5,
  meal_break_duration_minutes INTEGER DEFAULT 30,
  applies_to_weekends BOOLEAN DEFAULT true,
  applies_to_holidays BOOLEAN DEFAULT true,
  excluded_grades TEXT[],
  excluded_departments TEXT[],
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.overtime_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage overtime_policies" ON public.overtime_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_overtime_policies_updated_at BEFORE UPDATE ON public.overtime_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Overtime Requests
CREATE TABLE public.overtime_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  department TEXT,
  policy_id UUID REFERENCES public.overtime_policies(id),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type TEXT DEFAULT 'regular',
  overtime_type TEXT DEFAULT 'regular' CHECK (overtime_type IN ('regular','weekend','holiday','emergency','night')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  hours_requested NUMERIC NOT NULL DEFAULT 0,
  hours_approved NUMERIC,
  reason TEXT,
  task_description TEXT,
  project_id UUID REFERENCES public.projects(id),
  multiplier NUMERIC DEFAULT 1.5,
  base_hourly_rate NUMERIC DEFAULT 0,
  payroll_amount NUMERIC DEFAULT 0,
  includes_meal_break BOOLEAN DEFAULT false,
  meal_break_deducted_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','manager_approved','hr_approved','approved','rejected','cancelled')),
  manager_id UUID,
  manager_name TEXT,
  manager_approved_at TIMESTAMPTZ,
  manager_comments TEXT,
  hr_approved_by UUID,
  hr_approved_at TIMESTAMPTZ,
  hr_comments TEXT,
  rejection_reason TEXT,
  is_pre_approved BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage overtime_requests" ON public.overtime_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_overtime_requests_updated_at BEFORE UPDATE ON public.overtime_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Overtime Exceptions/Alerts
CREATE TABLE public.overtime_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  request_id UUID REFERENCES public.overtime_requests(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('daily_limit','weekly_limit','monthly_limit','consecutive_days','missing_break','unapproved','holiday_violation','budget_exceeded')),
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  description TEXT NOT NULL,
  policy_id UUID REFERENCES public.overtime_policies(id),
  policy_name TEXT,
  current_value NUMERIC,
  limit_value NUMERIC,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.overtime_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage overtime_exceptions" ON public.overtime_exceptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_overtime_requests_employee ON public.overtime_requests(employee_id);
CREATE INDEX idx_overtime_requests_date ON public.overtime_requests(request_date);
CREATE INDEX idx_overtime_requests_status ON public.overtime_requests(status);
CREATE INDEX idx_overtime_exceptions_employee ON public.overtime_exceptions(employee_id);
