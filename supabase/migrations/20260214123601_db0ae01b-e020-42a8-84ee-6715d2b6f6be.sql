
-- Create role_permissions table to persist authorization settings
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL,
  module_key TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_key, module_key)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can read permissions
CREATE POLICY "Authenticated users can read permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete permissions
CREATE POLICY "Admins can insert permissions"
  ON public.role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update permissions"
  ON public.role_permissions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete permissions"
  ON public.role_permissions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
