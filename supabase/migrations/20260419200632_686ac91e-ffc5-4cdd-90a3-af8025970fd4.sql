-- Industry pack catalog
CREATE TABLE IF NOT EXISTS public.industry_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_key TEXT NOT NULL UNIQUE,
  pack_name TEXT NOT NULL,
  pack_name_ar TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'industry',
  status TEXT NOT NULL DEFAULT 'optional',
  version TEXT NOT NULL DEFAULT '1.0.0',
  icon TEXT,
  route_prefixes TEXT[] DEFAULT '{}',
  dependencies TEXT[] DEFAULT '{}',
  features JSONB DEFAULT '[]'::jsonb,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  default_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.industry_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "industry_packs_read_all" ON public.industry_packs
  FOR SELECT USING (true);
CREATE POLICY "industry_packs_admin_write" ON public.industry_packs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Per-company activation
CREATE TABLE IF NOT EXISTS public.tenants_industry_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  pack_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  activated_by UUID,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID,
  config JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, pack_key)
);
ALTER TABLE public.tenants_industry_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tia_read_all" ON public.tenants_industry_activations
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tia_admin_write" ON public.tenants_industry_activations
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE INDEX IF NOT EXISTS idx_tia_company ON public.tenants_industry_activations(company_id);
CREATE INDEX IF NOT EXISTS idx_tia_pack ON public.tenants_industry_activations(pack_key);

CREATE OR REPLACE FUNCTION public.update_industry_packs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_industry_packs_updated ON public.industry_packs;
CREATE TRIGGER trg_industry_packs_updated BEFORE UPDATE ON public.industry_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_industry_packs_updated_at();

DROP TRIGGER IF EXISTS trg_tia_updated ON public.tenants_industry_activations;
CREATE TRIGGER trg_tia_updated BEFORE UPDATE ON public.tenants_industry_activations
  FOR EACH ROW EXECUTE FUNCTION public.update_industry_packs_updated_at();

-- Seed catalog
INSERT INTO public.industry_packs (pack_key, pack_name, pack_name_ar, description, category, status, route_prefixes, default_enabled, is_premium, features) VALUES
  ('construction', 'Construction & Projects (CPMS)', 'الإنشاءات والمشاريع', 'BOQ, WBS, progress, subcontractor management, QA/QC.', 'core', 'active',
    ARRAY['/cpms','/projects','/construction'], true, false,
    '["BOQ","Schedule","Progress","Subcontractors","QAQC"]'::jsonb),
  ('manufacturing', 'Manufacturing / Industrial', 'التصنيع', 'Production orders, BOM, factory operations.', 'core', 'active',
    ARRAY['/manufacturing','/industrial','/production'], true, false,
    '["BOM","ProductionOrders","ShopFloor"]'::jsonb),
  ('fleet', 'Fleet Management', 'إدارة الأسطول', 'Vehicles, drivers, trips, fuel and maintenance.', 'core', 'active',
    ARRAY['/fleet'], true, false,
    '["Vehicles","Drivers","Maintenance","Fuel"]'::jsonb),
  ('hospital', 'Hospital / Clinic', 'المستشفى', 'OPD, ER, IPD, Pharmacy, Lab, Radiology, Insurance.', 'industry', 'optional',
    ARRAY['/hospital'], false, true,
    '["OPD","ER","IPD","Pharmacy","Lab","Radiology","Insurance"]'::jsonb),
  ('restaurant', 'Restaurant / F&B', 'المطاعم', 'Tables, KOT, recipes, kitchen display.', 'industry', 'optional',
    ARRAY['/restaurant'], false, true,
    '["Tables","KOT","Recipes","KDS"]'::jsonb),
  ('retail_pos', 'Retail POS', 'نقاط البيع بالتجزئة', 'Terminal, sessions, returns, promotions.', 'industry', 'optional',
    ARRAY['/pos'], false, true,
    '["Terminal","Sessions","Returns","Promotions"]'::jsonb),
  ('education', 'Education / Schools', 'التعليم', 'Students, classes, fees, attendance.', 'industry', 'optional',
    ARRAY['/education','/school'], false, true,
    '["Students","Classes","Fees"]'::jsonb)
ON CONFLICT (pack_key) DO UPDATE
  SET pack_name = EXCLUDED.pack_name,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      route_prefixes = EXCLUDED.route_prefixes,
      features = EXCLUDED.features,
      updated_at = now();