-- Add third approval level to material_requests
ALTER TABLE public.material_requests 
ADD COLUMN IF NOT EXISTS approved_by_3_id uuid,
ADD COLUMN IF NOT EXISTS approved_by_3_name text,
ADD COLUMN IF NOT EXISTS approved_by_3_email text,
ADD COLUMN IF NOT EXISTS approved_by_3_position text,
ADD COLUMN IF NOT EXISTS approved_at_3 timestamp with time zone;

-- Create workflow settings table for Material Requests
CREATE TABLE public.mr_workflow_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_level integer NOT NULL CHECK (approval_level >= 1 AND approval_level <= 3),
  role_required app_role,
  position_title text,
  department text,
  min_amount numeric DEFAULT 0,
  max_amount numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(approval_level)
);

-- Create table to track specific approvers for each level
CREATE TABLE public.mr_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_level integer NOT NULL CHECK (approval_level >= 1 AND approval_level <= 3),
  user_id uuid NOT NULL,
  user_name text,
  user_email text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(approval_level, user_id)
);

-- Enable RLS
ALTER TABLE public.mr_workflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_approvers ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow settings - only admins can manage
CREATE POLICY "Admins can manage MR workflow settings"
  ON public.mr_workflow_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view MR workflow settings"
  ON public.mr_workflow_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS policies for approvers
CREATE POLICY "Admins can manage MR approvers"
  ON public.mr_approvers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view MR approvers"
  ON public.mr_approvers FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert default workflow settings (3 levels)
INSERT INTO public.mr_workflow_settings (approval_level, role_required, position_title, is_active)
VALUES 
  (1, 'manager', 'Department Manager', true),
  (2, 'manager', 'Finance Manager', true),
  (3, 'admin', 'General Manager', true)
ON CONFLICT (approval_level) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_mr_workflow_settings_updated_at
  BEFORE UPDATE ON public.mr_workflow_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();