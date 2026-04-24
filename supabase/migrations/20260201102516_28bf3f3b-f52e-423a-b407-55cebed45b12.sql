-- Add workflow fields to leave_requests table
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS approval_stage text DEFAULT 'pending_direct_manager',
ADD COLUMN IF NOT EXISTS direct_manager_id uuid REFERENCES public.employees(id),
ADD COLUMN IF NOT EXISTS direct_manager_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS direct_manager_notes text,
ADD COLUMN IF NOT EXISTS dept_manager_id uuid REFERENCES public.employees(id),
ADD COLUMN IF NOT EXISTS dept_manager_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS dept_manager_notes text,
ADD COLUMN IF NOT EXISTS hr_manager_id uuid REFERENCES public.employees(id),
ADD COLUMN IF NOT EXISTS hr_manager_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS hr_manager_notes text;

-- Create HR Manager designation table
CREATE TABLE IF NOT EXISTS public.hr_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

-- Enable RLS on hr_managers
ALTER TABLE public.hr_managers ENABLE ROW LEVEL SECURITY;

-- RLS policies for hr_managers
CREATE POLICY "Admins can manage HR managers"
ON public.hr_managers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers and admins can view HR managers"
ON public.hr_managers
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Create a function to get the approval chain for a leave request
CREATE OR REPLACE FUNCTION public.get_leave_approval_chain(p_employee_id uuid)
RETURNS TABLE (
  direct_manager_id uuid,
  direct_manager_name text,
  dept_manager_id uuid,
  dept_manager_name text,
  hr_manager_id uuid,
  hr_manager_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manager_id uuid;
  v_dept_id uuid;
  v_dept_manager_id uuid;
  v_hr_manager_id uuid;
BEGIN
  -- Get direct manager from employee record
  SELECT e.manager_id, e.department_id INTO v_manager_id, v_dept_id
  FROM employees e WHERE e.id = p_employee_id;
  
  -- Get department manager
  IF v_dept_id IS NOT NULL THEN
    SELECT d.manager_id INTO v_dept_manager_id
    FROM departments d WHERE d.id = v_dept_id;
  END IF;
  
  -- Get active HR manager
  SELECT hm.employee_id INTO v_hr_manager_id
  FROM hr_managers hm WHERE hm.is_active = true
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    v_manager_id as direct_manager_id,
    (SELECT CONCAT(first_name, ' ', last_name) FROM employees WHERE id = v_manager_id) as direct_manager_name,
    v_dept_manager_id as dept_manager_id,
    (SELECT CONCAT(first_name, ' ', last_name) FROM employees WHERE id = v_dept_manager_id) as dept_manager_name,
    v_hr_manager_id as hr_manager_id,
    (SELECT CONCAT(first_name, ' ', last_name) FROM employees WHERE id = v_hr_manager_id) as hr_manager_name;
END;
$$;