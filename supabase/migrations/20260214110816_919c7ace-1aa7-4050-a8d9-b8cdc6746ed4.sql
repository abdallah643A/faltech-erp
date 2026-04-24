
-- User Departments configuration table
CREATE TABLE public.user_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view departments"
ON public.user_departments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage departments"
ON public.user_departments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_departments_updated_at
BEFORE UPDATE ON public.user_departments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default departments
INSERT INTO public.user_departments (name, name_ar, sort_order) VALUES
  ('IT', 'تقنية المعلومات', 1),
  ('Sales', 'المبيعات', 2),
  ('Finance', 'المالية', 3),
  ('HR', 'الموارد البشرية', 4),
  ('Admin', 'الإدارة', 5),
  ('Operations', 'العمليات', 6),
  ('Marketing', 'التسويق', 7);

-- Custom Role Labels configuration table (maps to app_role enum)
CREATE TABLE public.custom_role_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_role TEXT NOT NULL,
  display_name TEXT NOT NULL,
  display_name_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_role_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role labels"
ON public.custom_role_labels FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage role labels"
ON public.custom_role_labels FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_custom_role_labels_updated_at
BEFORE UPDATE ON public.custom_role_labels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default role labels
INSERT INTO public.custom_role_labels (system_role, display_name, display_name_ar, sort_order) VALUES
  ('admin', 'Admin', 'مدير النظام', 1),
  ('manager', 'Manager', 'مدير', 2),
  ('sales_rep', 'Sales Rep', 'مندوب مبيعات', 3),
  ('user', 'User', 'مستخدم', 4);
