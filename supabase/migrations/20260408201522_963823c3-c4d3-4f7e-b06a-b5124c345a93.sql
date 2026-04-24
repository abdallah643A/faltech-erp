
-- Admin Alerts
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_name TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'user_defined',
  frequency TEXT NOT NULL DEFAULT 'always',
  priority TEXT NOT NULL DEFAULT 'medium',
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB DEFAULT '[]'::jsonb,
  recipients JSONB DEFAULT '[]'::jsonb,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage admin_alerts"
  ON public.admin_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_admin_alerts_updated_at ON public.admin_alerts;
CREATE TRIGGER update_admin_alerts_updated_at
  BEFORE UPDATE ON public.admin_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin Licenses
CREATE TABLE IF NOT EXISTS public.admin_licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_email TEXT,
  license_type TEXT NOT NULL DEFAULT 'Professional',
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_login TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage admin_licenses"
  ON public.admin_licenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_admin_licenses_updated_at ON public.admin_licenses;
CREATE TRIGGER update_admin_licenses_updated_at
  BEFORE UPDATE ON public.admin_licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin Addons
CREATE TABLE IF NOT EXISTS public.admin_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'inactive',
  installed_date DATE DEFAULT CURRENT_DATE,
  publisher TEXT,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage admin_addons"
  ON public.admin_addons FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_admin_addons_updated_at ON public.admin_addons;
CREATE TRIGGER update_admin_addons_updated_at
  BEFORE UPDATE ON public.admin_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin Work Items
CREATE TABLE IF NOT EXISTS public.admin_work_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type TEXT NOT NULL DEFAULT 'general',
  related_doc_type TEXT,
  related_doc_id TEXT,
  assigned_to UUID,
  assigned_to_name TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT,
  comments JSONB DEFAULT '[]'::jsonb,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_work_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage admin_work_items"
  ON public.admin_work_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_admin_work_items_updated_at ON public.admin_work_items;
CREATE TRIGGER update_admin_work_items_updated_at
  BEFORE UPDATE ON public.admin_work_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
