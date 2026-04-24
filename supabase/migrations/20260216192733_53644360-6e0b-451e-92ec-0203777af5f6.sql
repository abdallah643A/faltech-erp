
-- Add general_manager and ceo roles to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'general_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ceo';

-- Add system roles entries
INSERT INTO public.system_roles (role_key, description, description_ar, is_system, sort_order, is_active)
VALUES 
  ('general_manager', 'General Manager', 'مدير عام', false, 9, true),
  ('ceo', 'CEO', 'الرئيس التنفيذي', false, 10, true)
ON CONFLICT DO NOTHING;
