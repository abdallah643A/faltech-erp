
-- Add preferred workspace to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_workspace TEXT DEFAULT NULL;

-- Workspace configuration table for admin customization
CREATE TABLE public.workspace_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_key TEXT NOT NULL,
  widget_id TEXT NOT NULL,
  widget_label TEXT NOT NULL,
  widget_label_ar TEXT,
  default_visible BOOLEAN NOT NULL DEFAULT true,
  default_order INTEGER NOT NULL DEFAULT 0,
  widget_size TEXT DEFAULT 'full',
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_key, widget_id, company_id)
);

ALTER TABLE public.workspace_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workspace configs"
ON public.workspace_configs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage workspace configs"
ON public.workspace_configs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_workspace_configs_updated_at
BEFORE UPDATE ON public.workspace_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
