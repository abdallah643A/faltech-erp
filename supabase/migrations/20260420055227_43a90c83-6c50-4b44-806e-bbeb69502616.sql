-- PR1: CRM RevOps Foundations

-- 1) Territories (with self-referential hierarchy)
CREATE TABLE IF NOT EXISTS public.crm_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  code TEXT UNIQUE,
  parent_id UUID REFERENCES public.crm_territories(id) ON DELETE SET NULL,
  region TEXT,
  country_code TEXT,
  city TEXT,
  postal_codes TEXT[],
  owner_user_id UUID,
  owner_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_crm_territories_parent ON public.crm_territories(parent_id);
CREATE INDEX IF NOT EXISTS idx_crm_territories_owner ON public.crm_territories(owner_user_id);

ALTER TABLE public.crm_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view crm_territories" ON public.crm_territories FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage crm_territories" ON public.crm_territories FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') OR has_role(auth.uid(),'sales_rep'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') OR has_role(auth.uid(),'sales_rep'));

-- 2) Account hierarchies
CREATE TABLE IF NOT EXISTS public.crm_account_hierarchies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_bp_id UUID NOT NULL REFERENCES public.business_partners(id) ON DELETE CASCADE,
  child_bp_id UUID NOT NULL REFERENCES public.business_partners(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'subsidiary',
  ownership_percent NUMERIC,
  effective_from DATE,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (parent_bp_id, child_bp_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_acct_hier_parent ON public.crm_account_hierarchies(parent_bp_id);
CREATE INDEX IF NOT EXISTS idx_crm_acct_hier_child ON public.crm_account_hierarchies(child_bp_id);

ALTER TABLE public.crm_account_hierarchies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view crm_account_hierarchies" ON public.crm_account_hierarchies FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage crm_account_hierarchies" ON public.crm_account_hierarchies FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') OR has_role(auth.uid(),'sales_rep'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') OR has_role(auth.uid(),'sales_rep'));

-- 3) Consent log
CREATE TABLE IF NOT EXISTS public.crm_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner_id UUID REFERENCES public.business_partners(id) ON DELETE CASCADE,
  contact_email TEXT,
  contact_phone TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','whatsapp','call','marketing','all')),
  consent_status TEXT NOT NULL CHECK (consent_status IN ('granted','revoked','pending','expired')),
  source TEXT,
  basis TEXT,
  ip_address TEXT,
  user_agent TEXT,
  evidence_url TEXT,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_crm_consent_bp ON public.crm_consent_log(business_partner_id);
CREATE INDEX IF NOT EXISTS idx_crm_consent_email ON public.crm_consent_log(contact_email);
CREATE INDEX IF NOT EXISTS idx_crm_consent_phone ON public.crm_consent_log(contact_phone);

ALTER TABLE public.crm_consent_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view crm_consent_log" ON public.crm_consent_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert crm_consent_log" ON public.crm_consent_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update crm_consent_log" ON public.crm_consent_log FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));
CREATE POLICY "delete crm_consent_log" ON public.crm_consent_log FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- 4) Regional pipelines & stages
CREATE TABLE IF NOT EXISTS public.crm_regional_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  region TEXT NOT NULL,
  country_code TEXT,
  business_unit TEXT,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_region ON public.crm_regional_pipelines(region);

ALTER TABLE public.crm_regional_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view crm_regional_pipelines" ON public.crm_regional_pipelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage crm_regional_pipelines" ON public.crm_regional_pipelines FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.crm_regional_pipelines(id) ON DELETE CASCADE,
  stage_order INT NOT NULL,
  stage_key TEXT NOT NULL,
  label_en TEXT NOT NULL,
  label_ar TEXT,
  probability_pct NUMERIC NOT NULL DEFAULT 0,
  is_won BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  expected_duration_days INT,
  required_fields TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, stage_order),
  UNIQUE (pipeline_id, stage_key)
);
CREATE INDEX IF NOT EXISTS idx_crm_stages_pipeline ON public.crm_pipeline_stages(pipeline_id);

ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view crm_pipeline_stages" ON public.crm_pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage crm_pipeline_stages" ON public.crm_pipeline_stages FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

-- 5) Tag opportunities & business partners with territory + pipeline
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES public.crm_territories(id) ON DELETE SET NULL;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES public.crm_regional_pipelines(id) ON DELETE SET NULL;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS pipeline_stage_key TEXT;
ALTER TABLE public.business_partners ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES public.crm_territories(id) ON DELETE SET NULL;

-- 6) updated_at triggers
CREATE TRIGGER trg_crm_territories_updated BEFORE UPDATE ON public.crm_territories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_regional_pipelines_updated BEFORE UPDATE ON public.crm_regional_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();