
-- TMO Technology Portfolio Tables

-- Technology assets registry
CREATE TABLE public.tmo_tech_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  asset_code TEXT,
  category TEXT NOT NULL DEFAULT 'enterprise_it', -- core_network, oss_bss, digital, enterprise_it, security
  subcategory TEXT,
  vendor TEXT,
  version TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'active', -- active, supported, end_of_life, decommissioned, planned
  deployment_type TEXT DEFAULT 'on_premise', -- on_premise, cloud, hybrid, saas
  owner_department TEXT,
  owner_name TEXT,
  business_criticality TEXT DEFAULT 'medium', -- low, medium, high, critical
  -- Health scoring (1-5 each)
  stability_score INTEGER DEFAULT 3,
  supportability_score INTEGER DEFAULT 3,
  strategic_fit_score INTEGER DEFAULT 3,
  cost_efficiency_score INTEGER DEFAULT 3,
  health_score NUMERIC GENERATED ALWAYS AS (
    (stability_score + supportability_score + strategic_fit_score + cost_efficiency_score) / 4.0
  ) STORED,
  -- TCO
  acquisition_cost NUMERIC DEFAULT 0,
  annual_license_cost NUMERIC DEFAULT 0,
  annual_support_cost NUMERIC DEFAULT 0,
  annual_infra_cost NUMERIC DEFAULT 0,
  total_cost_of_ownership NUMERIC GENERATED ALWAYS AS (
    acquisition_cost + (annual_license_cost + annual_support_cost + annual_infra_cost) * 3
  ) STORED,
  -- Dates
  go_live_date DATE,
  end_of_support_date DATE,
  planned_retirement_date DATE,
  last_review_date DATE,
  -- Metadata
  integration_points JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Technology roadmap items
CREATE TABLE public.tmo_roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  tech_asset_id UUID REFERENCES public.tmo_tech_assets(id) ON DELETE SET NULL,
  domain TEXT DEFAULT 'enterprise_it', -- core_network, oss_bss, digital, enterprise_it, security
  item_type TEXT DEFAULT 'upgrade', -- new_deployment, upgrade, migration, replacement, retirement, integration
  status TEXT DEFAULT 'planned', -- planned, in_progress, completed, deferred, cancelled
  priority TEXT DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  strategic_objective TEXT,
  dependencies JSONB DEFAULT '[]',
  horizon TEXT DEFAULT '1_year', -- 1_year, 3_year, 5_year
  version INTEGER DEFAULT 1,
  linked_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Architecture Decision Records (ADR)
CREATE TABLE public.tmo_architecture_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adr_number TEXT,
  title TEXT NOT NULL,
  context TEXT,
  decision TEXT,
  consequences TEXT,
  status TEXT DEFAULT 'proposed', -- proposed, accepted, deprecated, superseded
  category TEXT DEFAULT 'general', -- infrastructure, application, integration, security, data
  decided_by TEXT,
  decided_at DATE,
  superseded_by UUID REFERENCES public.tmo_architecture_decisions(id) ON DELETE SET NULL,
  related_tech_asset_id UUID REFERENCES public.tmo_tech_assets(id) ON DELETE SET NULL,
  compliance_score INTEGER DEFAULT 0, -- 0-100
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Technology standards register
CREATE TABLE public.tmo_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'platform', -- platform, vendor, integration_pattern, security, data
  standard_type TEXT DEFAULT 'mandatory', -- mandatory, recommended, deprecated
  approved_options JSONB DEFAULT '[]', -- list of approved vendors/platforms
  version TEXT DEFAULT '1.0',
  effective_date DATE,
  review_date DATE,
  approved_by TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TMO Vendor registry (extends business_partners for tech context)
CREATE TABLE public.tmo_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'transactional', -- strategic, preferred, transactional
  category TEXT, -- hardware, software, services, telecom, cloud
  contact_name TEXT,
  contact_email TEXT,
  contract_value NUMERIC DEFAULT 0,
  contract_start_date DATE,
  contract_end_date DATE,
  sla_terms TEXT,
  -- Scorecard (1-5 each)
  delivery_score INTEGER DEFAULT 3,
  quality_score INTEGER DEFAULT 3,
  responsiveness_score INTEGER DEFAULT 3,
  innovation_score INTEGER DEFAULT 3,
  overall_score NUMERIC GENERATED ALWAYS AS (
    (delivery_score + quality_score + responsiveness_score + innovation_score) / 4.0
  ) STORED,
  -- Risk
  financial_risk TEXT DEFAULT 'low', -- low, medium, high
  dependency_risk TEXT DEFAULT 'low',
  geopolitical_risk TEXT DEFAULT 'low',
  notes TEXT,
  business_partner_id UUID REFERENCES public.business_partners(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tmo_tech_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmo_roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmo_architecture_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmo_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmo_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage tech_assets" ON public.tmo_tech_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage roadmap" ON public.tmo_roadmap_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage adrs" ON public.tmo_architecture_decisions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage standards" ON public.tmo_standards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage tmo_vendors" ON public.tmo_vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
