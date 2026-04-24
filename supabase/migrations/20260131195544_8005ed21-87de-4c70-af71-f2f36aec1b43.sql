-- HR Module Database Schema

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  manager_id UUID,
  parent_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create positions table
CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  code TEXT UNIQUE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  description TEXT,
  min_salary NUMERIC DEFAULT 0,
  max_salary NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table (main HR records, can link to profiles)
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  national_id TEXT,
  nationality TEXT,
  marital_status TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  postal_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  termination_date DATE,
  employment_type TEXT DEFAULT 'full_time',
  employment_status TEXT DEFAULT 'active',
  work_location TEXT,
  bank_name TEXT,
  bank_account TEXT,
  iban TEXT,
  basic_salary NUMERIC DEFAULT 0,
  housing_allowance NUMERIC DEFAULT 0,
  transport_allowance NUMERIC DEFAULT 0,
  other_allowances NUMERIC DEFAULT 0,
  profile_image_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add manager_id FK to departments after employees table exists
ALTER TABLE public.departments ADD CONSTRAINT departments_manager_id_fkey 
  FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;

-- Create leave types table
CREATE TABLE public.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  default_days_per_year INTEGER DEFAULT 0,
  is_paid BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default leave types
INSERT INTO public.leave_types (name, code, default_days_per_year, is_paid) VALUES
  ('Annual Leave', 'AL', 21, true),
  ('Sick Leave', 'SL', 15, true),
  ('Maternity Leave', 'ML', 70, true),
  ('Paternity Leave', 'PL', 3, true),
  ('Unpaid Leave', 'UL', 0, false),
  ('Emergency Leave', 'EL', 5, true);

-- Create leave requests table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leave balances table
CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  entitled_days NUMERIC DEFAULT 0,
  used_days NUMERIC DEFAULT 0,
  pending_days NUMERIC DEFAULT 0,
  carried_over_days NUMERIC DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  check_in_location TEXT,
  check_out_location TEXT,
  check_in_latitude NUMERIC,
  check_in_longitude NUMERIC,
  check_out_latitude NUMERIC,
  check_out_longitude NUMERIC,
  status TEXT DEFAULT 'present',
  work_hours NUMERIC,
  overtime_hours NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

-- Create payroll periods table
CREATE TABLE public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pay_date DATE,
  status TEXT DEFAULT 'draft',
  total_gross NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  total_net NUMERIC DEFAULT 0,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payslips table
CREATE TABLE public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  basic_salary NUMERIC DEFAULT 0,
  housing_allowance NUMERIC DEFAULT 0,
  transport_allowance NUMERIC DEFAULT 0,
  other_allowances NUMERIC DEFAULT 0,
  overtime_pay NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  gross_salary NUMERIC DEFAULT 0,
  gosi_deduction NUMERIC DEFAULT 0,
  tax_deduction NUMERIC DEFAULT 0,
  loan_deduction NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  net_salary NUMERIC DEFAULT 0,
  work_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  payment_method TEXT DEFAULT 'bank_transfer',
  payment_reference TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(payroll_period_id, employee_id)
);

-- Create performance review cycles table
CREATE TABLE public.performance_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create performance goals table
CREATE TABLE public.performance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.performance_cycles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  weight NUMERIC DEFAULT 0,
  target_value NUMERIC,
  actual_value NUMERIC,
  status TEXT DEFAULT 'in_progress',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create performance reviews table
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.performance_cycles(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  review_date DATE,
  overall_rating NUMERIC,
  strengths TEXT,
  areas_for_improvement TEXT,
  achievements TEXT,
  goals_for_next_period TEXT,
  employee_comments TEXT,
  reviewer_comments TEXT,
  status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all HR tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments (managers and admins can view all)
CREATE POLICY "Managers and admins can view departments" ON public.departments
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins can manage departments" ON public.departments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for positions
CREATE POLICY "Managers and admins can view positions" ON public.positions
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins can manage positions" ON public.positions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for employees
CREATE POLICY "Employees can view own record" ON public.employees
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers and admins can view all employees" ON public.employees
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins can manage employees" ON public.employees
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for leave_types
CREATE POLICY "All authenticated can view leave types" ON public.leave_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage leave types" ON public.leave_types
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for leave_requests
CREATE POLICY "Employees can view own leave requests" ON public.leave_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = leave_requests.employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Employees can create own leave requests" ON public.leave_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = leave_requests.employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Managers and admins can view all leave requests" ON public.leave_requests
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Managers and admins can manage leave requests" ON public.leave_requests
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- RLS Policies for leave_balances
CREATE POLICY "Employees can view own balances" ON public.leave_balances
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = leave_balances.employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Managers and admins can view all balances" ON public.leave_balances
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins can manage balances" ON public.leave_balances
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for attendance
CREATE POLICY "Employees can view own attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = attendance.employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Employees can create own attendance" ON public.attendance
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = attendance.employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Managers and admins can view all attendance" ON public.attendance
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Managers and admins can manage attendance" ON public.attendance
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- RLS Policies for payroll (admin and manager only)
CREATE POLICY "Managers and admins can view payroll periods" ON public.payroll_periods
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins can manage payroll periods" ON public.payroll_periods
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view own payslips" ON public.payslips
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = payslips.employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Managers and admins can view all payslips" ON public.payslips
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins can manage payslips" ON public.payslips
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for performance
CREATE POLICY "All authenticated can view performance cycles" ON public.performance_cycles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage performance cycles" ON public.performance_cycles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view own goals" ON public.performance_goals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = performance_goals.employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Managers and admins can view all goals" ON public.performance_goals
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Managers and admins can manage goals" ON public.performance_goals
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Employees can view own reviews" ON public.performance_reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = performance_reviews.employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Managers and admins can view all reviews" ON public.performance_reviews
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Managers and admins can manage reviews" ON public.performance_reviews
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Create updated_at triggers for HR tables
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payslips_updated_at BEFORE UPDATE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_goals_updated_at BEFORE UPDATE ON public.performance_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();