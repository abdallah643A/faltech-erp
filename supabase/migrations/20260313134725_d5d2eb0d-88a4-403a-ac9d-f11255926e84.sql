
-- =============================================
-- QTO (Quantity Take-Off) Module
-- =============================================
CREATE TABLE public.qto_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  bid_id UUID REFERENCES public.bids(id),
  sheet_name TEXT NOT NULL,
  description TEXT,
  drawing_reference TEXT,
  revision TEXT DEFAULT 'A',
  measurement_standard TEXT DEFAULT 'NRM' CHECK (measurement_standard IN ('NRM', 'CESMM4', 'SMM7', 'custom')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'reviewed', 'approved')),
  created_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.qto_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.qto_sheets(id) ON DELETE CASCADE,
  boq_item_id UUID,
  line_num INT NOT NULL DEFAULT 1,
  location TEXT,
  description TEXT NOT NULL,
  dimension_type TEXT DEFAULT 'length' CHECK (dimension_type IN ('length', 'area', 'volume', 'count', 'weight', 'time')),
  nr NUMERIC DEFAULT 1,
  length NUMERIC DEFAULT 0,
  width NUMERIC DEFAULT 0,
  height NUMERIC DEFAULT 0,
  quantity NUMERIC GENERATED ALWAYS AS (CASE 
    WHEN dimension_type = 'count' THEN nr
    WHEN dimension_type = 'length' THEN nr * length
    WHEN dimension_type = 'area' THEN nr * length * GREATEST(width, 1)
    WHEN dimension_type = 'volume' THEN nr * length * GREATEST(width, 1) * GREATEST(height, 1)
    WHEN dimension_type = 'weight' THEN nr * length
    ELSE nr * length
  END) STORED,
  unit TEXT DEFAULT 'm',
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- BOQ Management Module
-- =============================================
CREATE TABLE public.boq_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  bid_id UUID REFERENCES public.bids(id),
  version INT DEFAULT 1,
  version_label TEXT DEFAULT 'v1.0',
  section_code TEXT NOT NULL,
  section_title TEXT NOT NULL,
  parent_id UUID REFERENCES public.boq_sections(id),
  measurement_standard TEXT DEFAULT 'NRM' CHECK (measurement_standard IN ('NRM', 'CESMM4', 'SMM7', 'custom')),
  sort_order INT DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'priced', 'approved', 'superseded')),
  currency TEXT DEFAULT 'SAR',
  exchange_rate NUMERIC DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.boq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.boq_sections(id) ON DELETE CASCADE,
  item_ref TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'nr',
  quantity NUMERIC DEFAULT 0,
  qto_linked_quantity NUMERIC DEFAULT 0,
  rate NUMERIC DEFAULT 0,
  amount NUMERIC GENERATED ALWAYS AS (quantity * rate) STORED,
  labor_cost NUMERIC DEFAULT 0,
  material_cost NUMERIC DEFAULT 0,
  plant_cost NUMERIC DEFAULT 0,
  subcontract_cost NUMERIC DEFAULT 0,
  unit_cost NUMERIC GENERATED ALWAYS AS (labor_cost + material_cost + plant_cost + subcontract_cost) STORED,
  markup_percent NUMERIC DEFAULT 0,
  notes TEXT,
  is_provisional BOOLEAN DEFAULT false,
  is_prime_cost BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link QTO measurements to BOQ items
ALTER TABLE public.qto_measurements ADD CONSTRAINT qto_measurements_boq_item_id_fkey 
  FOREIGN KEY (boq_item_id) REFERENCES public.boq_items(id) ON DELETE SET NULL;

-- =============================================
-- EVM / Project Controls
-- =============================================
CREATE TABLE public.evm_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reporting_period TEXT,
  bac NUMERIC DEFAULT 0,
  pv NUMERIC DEFAULT 0,
  ev NUMERIC DEFAULT 0,
  ac NUMERIC DEFAULT 0,
  sv NUMERIC GENERATED ALWAYS AS (ev - pv) STORED,
  cv NUMERIC GENERATED ALWAYS AS (ev - ac) STORED,
  spi NUMERIC GENERATED ALWAYS AS (CASE WHEN pv > 0 THEN ev / pv ELSE 0 END) STORED,
  cpi NUMERIC GENERATED ALWAYS AS (CASE WHEN ac > 0 THEN ev / ac ELSE 0 END) STORED,
  eac NUMERIC GENERATED ALWAYS AS (CASE WHEN (CASE WHEN ac > 0 THEN ev / ac ELSE 0 END) > 0 THEN bac / (CASE WHEN ac > 0 THEN ev / ac ELSE 0 END) ELSE bac END) STORED,
  etc_value NUMERIC GENERATED ALWAYS AS (
    CASE WHEN (CASE WHEN ac > 0 THEN ev / ac ELSE 0 END) > 0 
    THEN (bac / (CASE WHEN ac > 0 THEN ev / ac ELSE 0 END)) - ac 
    ELSE bac - ac END
  ) STORED,
  vac NUMERIC GENERATED ALWAYS AS (
    bac - (CASE WHEN (CASE WHEN ac > 0 THEN ev / ac ELSE 0 END) > 0 THEN bac / (CASE WHEN ac > 0 THEN ev / ac ELSE 0 END) ELSE bac END)
  ) STORED,
  percent_complete NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.change_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  change_type TEXT DEFAULT 'scope' CHECK (change_type IN ('scope', 'cost', 'schedule', 'design', 'other')),
  impact_cost NUMERIC DEFAULT 0,
  impact_days INT DEFAULT 0,
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'assessed', 'approved', 'rejected', 'implemented', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  raised_by TEXT,
  raised_date DATE DEFAULT CURRENT_DATE,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,
  contract_clause TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Bid Scenarios (Cost Estimating Enhancement)
-- =============================================
CREATE TABLE public.bid_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT DEFAULT 'base' CHECK (scenario_type IN ('base', 'optimistic', 'pessimistic', 'alternative')),
  cost_multiplier NUMERIC DEFAULT 1.0,
  schedule_multiplier NUMERIC DEFAULT 1.0,
  risk_contingency_percent NUMERIC DEFAULT 5,
  total_cost NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  margin_percent NUMERIC DEFAULT 0,
  is_selected BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Subcontractor Quote Matrix
-- =============================================
CREATE TABLE public.subcontractor_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  bid_id UUID REFERENCES public.bids(id),
  project_id UUID REFERENCES public.projects(id),
  subcontractor_name TEXT NOT NULL,
  trade TEXT NOT NULL,
  scope_description TEXT,
  quote_reference TEXT,
  quote_date DATE DEFAULT CURRENT_DATE,
  validity_days INT DEFAULT 30,
  total_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  status TEXT DEFAULT 'received' CHECK (status IN ('invited', 'received', 'under_review', 'accepted', 'rejected', 'expired')),
  exclusions TEXT,
  inclusions TEXT,
  payment_terms TEXT,
  mobilization_days INT,
  score NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Payment Applications (Interim)
-- =============================================
CREATE TABLE public.payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  application_number TEXT NOT NULL,
  application_date DATE DEFAULT CURRENT_DATE,
  valuation_date DATE,
  period_from DATE,
  period_to DATE,
  contract_sum NUMERIC DEFAULT 0,
  previous_certified NUMERIC DEFAULT 0,
  this_period_gross NUMERIC DEFAULT 0,
  cumulative_gross NUMERIC DEFAULT 0,
  retention_percent NUMERIC DEFAULT 5,
  retention_amount NUMERIC GENERATED ALWAYS AS (
    CASE WHEN retention_percent > 0 THEN this_period_gross * (retention_percent / 100) ELSE 0 END
  ) STORED,
  previous_retention_released NUMERIC DEFAULT 0,
  materials_on_site NUMERIC DEFAULT 0,
  variations_approved NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  net_payment NUMERIC GENERATED ALWAYS AS (
    this_period_gross - CASE WHEN retention_percent > 0 THEN this_period_gross * (retention_percent / 100) ELSE 0 END + previous_retention_released + materials_on_site - deductions
  ) STORED,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'certified', 'paid', 'disputed')),
  certified_by TEXT,
  certified_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.qto_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qto_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evm_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_qto_sheets" ON public.qto_sheets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_qto_measurements" ON public.qto_measurements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_boq_sections" ON public.boq_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_boq_items" ON public.boq_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_evm_snapshots" ON public.evm_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_change_register" ON public.change_register FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_bid_scenarios" ON public.bid_scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_subcontractor_quotes" ON public.subcontractor_quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_payment_applications" ON public.payment_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
