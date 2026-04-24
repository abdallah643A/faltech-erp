
-- Create system_roles config table for UI configuration
CREATE TABLE public.system_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key TEXT NOT NULL UNIQUE,
  description TEXT,
  description_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Authenticated users can view system roles"
ON public.system_roles FOR SELECT TO authenticated USING (true);

-- Only admins can manage
CREATE POLICY "Admins can insert system roles"
ON public.system_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update system roles"
ON public.system_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete system roles"
ON public.system_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed existing roles
INSERT INTO public.system_roles (role_key, description, description_ar, is_system, sort_order) VALUES
  ('admin', 'Full system access', 'وصول كامل للنظام', true, 1),
  ('manager', 'Management access', 'صلاحيات إدارية', true, 2),
  ('sales_rep', 'Sales representative access', 'صلاحيات مندوب مبيعات', true, 3),
  ('user', 'Standard user access', 'صلاحيات مستخدم عادي', true, 4);
