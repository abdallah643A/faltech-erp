-- Fix 1: Create is_hr_manager function to check if user is an HR manager
CREATE OR REPLACE FUNCTION public.is_hr_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM hr_managers hm
    JOIN employees e ON e.id = hm.employee_id
    WHERE e.user_id = _user_id AND hm.is_active = true
  );
$$;

-- Fix 2: Update employees RLS - Only HR managers and admins can view all employee data (including sensitive fields)
-- Regular managers should NOT have access to full employee data
DROP POLICY IF EXISTS "Managers and admins can view all employees" ON employees;

CREATE POLICY "HR managers and admins can view all employees"
  ON employees FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_hr_manager(auth.uid())
  );

-- Note: "Employees can view own record" policy already exists and allows employees to see their own data
-- Note: "Admins can manage employees" policy already exists for admin full access

-- Fix 3: Remove api_key column from whatsapp_config and add key_name for secret reference
-- First, add the key_name column to reference secrets
ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS key_name text DEFAULT 'default';

-- Update RLS to restrict whatsapp_config access to admins only (not managers)
DROP POLICY IF EXISTS "Managers can view WhatsApp config" ON whatsapp_config;
DROP POLICY IF EXISTS "Admins and managers can view WhatsApp config" ON whatsapp_config;
DROP POLICY IF EXISTS "Admins can manage WhatsApp config" ON whatsapp_config;

-- Only admins can view and manage WhatsApp config (managers no longer need direct access)
CREATE POLICY "Admins can view WhatsApp config"
  ON whatsapp_config FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage WhatsApp config"
  ON whatsapp_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop the api_key column since it will now be stored in secrets
ALTER TABLE public.whatsapp_config DROP COLUMN IF EXISTS api_key;