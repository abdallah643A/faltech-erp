
-- ═══════════════════════════════════════════
-- REVENUE RECOGNITION ENGINE
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.revenue_recognition_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  rule_name TEXT NOT NULL,
  recognition_method TEXT NOT NULL DEFAULT 'milestone', -- milestone, percentage_of_completion, delivery, deferred, manual
  document_type TEXT, -- sales_order, ar_invoice, contract, service_order
  project_type TEXT,
  revenue_account TEXT,
  deferred_revenue_account TEXT,
  description TEXT,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.revenue_recognition_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage rev rec rules" ON public.revenue_recognition_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.revenue_recognition_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  rule_id UUID REFERENCES public.revenue_recognition_rules(id),
  contract_id UUID,
  sales_order_id UUID,
  project_id UUID,
  document_number TEXT,
  customer_name TEXT,
  total_contract_value NUMERIC DEFAULT 0,
  recognized_to_date NUMERIC DEFAULT 0,
  deferred_balance NUMERIC DEFAULT 0,
  schedule_period TEXT, -- e.g. 2026-03
  scheduled_amount NUMERIC DEFAULT 0,
  actual_recognized NUMERIC DEFAULT 0,
  recognition_date DATE,
  milestone_name TEXT,
  completion_percentage NUMERIC,
  status TEXT DEFAULT 'scheduled', -- scheduled, recognized, posted, deferred, overridden, exception
  journal_entry_id UUID,
  override_reason TEXT,
  override_by UUID,
  override_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.revenue_recognition_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage rev rec schedules" ON public.revenue_recognition_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.revenue_contract_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  contract_id UUID,
  sales_order_id UUID,
  project_id UUID,
  document_number TEXT,
  customer_name TEXT,
  contract_value NUMERIC DEFAULT 0,
  rule_id UUID REFERENCES public.revenue_recognition_rules(id),
  recognition_method TEXT,
  start_date DATE,
  end_date DATE,
  retention_percentage NUMERIC DEFAULT 0,
  retention_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, completed, suspended
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.revenue_contract_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage rev contract maps" ON public.revenue_contract_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.revenue_recognition_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  schedule_id UUID REFERENCES public.revenue_recognition_schedules(id),
  contract_mapping_id UUID REFERENCES public.revenue_contract_mappings(id),
  exception_type TEXT NOT NULL, -- missing_milestone, over_recognition, deferred_mismatch, retention_conflict, manual_required
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open', -- open, investigating, resolved, ignored
  assigned_to TEXT,
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.revenue_recognition_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage rev rec exceptions" ON public.revenue_recognition_exceptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- BUDGET CONTROL & COMMITMENT MANAGEMENT
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  fiscal_year INT NOT NULL,
  period TEXT, -- e.g. 2026-01, or 'annual'
  account_code TEXT,
  account_name TEXT,
  department_id UUID,
  department_name TEXT,
  project_id UUID,
  project_name TEXT,
  cost_code TEXT,
  branch_id UUID,
  original_amount NUMERIC DEFAULT 0,
  revised_amount NUMERIC DEFAULT 0,
  transferred_in NUMERIC DEFAULT 0,
  transferred_out NUMERIC DEFAULT 0,
  committed_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  forecast_amount NUMERIC DEFAULT 0,
  available_amount NUMERIC GENERATED ALWAYS AS (revised_amount + transferred_in - transferred_out - committed_amount - actual_amount) STORED,
  utilization_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN (revised_amount + transferred_in - transferred_out) > 0 
    THEN ROUND(((committed_amount + actual_amount) / (revised_amount + transferred_in - transferred_out)) * 100, 1) 
    ELSE 0 END
  ) STORED,
  threshold_warning NUMERIC DEFAULT 80,
  threshold_block NUMERIC DEFAULT 100,
  is_locked BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage budget lines" ON public.budget_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.budget_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  budget_line_id UUID REFERENCES public.budget_lines(id),
  commitment_type TEXT NOT NULL DEFAULT 'commitment', -- pre_commitment, commitment
  source_document_type TEXT, -- purchase_request, purchase_order, contract
  source_document_id UUID,
  source_document_number TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  released_amount NUMERIC DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (amount - released_amount) STORED,
  status TEXT DEFAULT 'active', -- active, partially_released, fully_released, cancelled
  vendor_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.budget_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage budget commitments" ON public.budget_commitments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.budget_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  budget_line_id UUID REFERENCES public.budget_lines(id),
  override_type TEXT DEFAULT 'emergency', -- emergency, exception
  requested_amount NUMERIC DEFAULT 0,
  justification TEXT,
  source_document_type TEXT,
  source_document_number TEXT,
  requested_by UUID,
  requested_by_name TEXT,
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.budget_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage budget overrides" ON public.budget_overrides FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.budget_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  from_budget_line_id UUID REFERENCES public.budget_lines(id),
  to_budget_line_id UUID REFERENCES public.budget_lines(id),
  transfer_amount NUMERIC DEFAULT 0,
  reason TEXT,
  requested_by UUID,
  requested_by_name TEXT,
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, posted
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.budget_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage budget transfers" ON public.budget_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- PROCUREMENT CATEGORY MANAGEMENT
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.procurement_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  parent_id UUID REFERENCES public.procurement_categories(id),
  level INT DEFAULT 1,
  description TEXT,
  strategy_notes TEXT,
  preferred_supplier_ids UUID[],
  preferred_supplier_names TEXT[],
  annual_spend_target NUMERIC DEFAULT 0,
  savings_target_pct NUMERIC DEFAULT 0,
  savings_achieved NUMERIC DEFAULT 0,
  contract_coverage_pct NUMERIC DEFAULT 0,
  supplier_count INT DEFAULT 0,
  top_supplier_concentration_pct NUMERIC DEFAULT 0,
  risk_level TEXT DEFAULT 'low', -- low, medium, high, critical
  category_manager TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.procurement_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage procurement categories" ON public.procurement_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.sourcing_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  category_id UUID REFERENCES public.procurement_categories(id),
  initiative_name TEXT NOT NULL,
  description TEXT,
  wave TEXT, -- e.g. Wave 1, Wave 2
  target_savings NUMERIC DEFAULT 0,
  actual_savings NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planned', -- planned, in_progress, completed, cancelled
  owner_name TEXT,
  supplier_shortlist TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.sourcing_initiatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage sourcing initiatives" ON public.sourcing_initiatives FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- SUPPLIER REBATE & INCENTIVE MANAGEMENT
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rebate_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  agreement_number TEXT,
  supplier_id UUID,
  supplier_name TEXT NOT NULL,
  rebate_type TEXT DEFAULT 'volume', -- volume, value, growth, mix, loyalty
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  volume_threshold NUMERIC DEFAULT 0,
  value_threshold NUMERIC DEFAULT 0,
  rebate_percentage NUMERIC DEFAULT 0,
  rebate_fixed_amount NUMERIC DEFAULT 0,
  is_retroactive BOOLEAN DEFAULT false,
  tier_structure JSONB DEFAULT '[]', -- [{threshold: 100000, percentage: 2}, ...]
  currency TEXT DEFAULT 'SAR',
  total_eligible_spend NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  total_claimed NUMERIC DEFAULT 0,
  total_settled NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active', -- draft, active, expired, suspended, closed
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.rebate_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage rebate agreements" ON public.rebate_agreements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.rebate_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  agreement_id UUID REFERENCES public.rebate_agreements(id),
  period TEXT NOT NULL, -- e.g. 2026-03
  eligible_spend NUMERIC DEFAULT 0,
  accrued_amount NUMERIC DEFAULT 0,
  cumulative_spend NUMERIC DEFAULT 0,
  cumulative_accrual NUMERIC DEFAULT 0,
  tier_applied TEXT,
  status TEXT DEFAULT 'accrued', -- accrued, posted, reversed
  journal_entry_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.rebate_accruals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage rebate accruals" ON public.rebate_accruals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.rebate_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  agreement_id UUID REFERENCES public.rebate_agreements(id),
  claim_number TEXT,
  claim_date DATE DEFAULT CURRENT_DATE,
  period_from TEXT,
  period_to TEXT,
  eligible_spend NUMERIC DEFAULT 0,
  claimed_amount NUMERIC DEFAULT 0,
  approved_amount NUMERIC DEFAULT 0,
  settled_amount NUMERIC DEFAULT 0,
  settlement_date DATE,
  settlement_method TEXT, -- credit_note, payment, offset
  status TEXT DEFAULT 'draft', -- draft, submitted, approved, rejected, settled, disputed
  supplier_reference TEXT,
  notes TEXT,
  submitted_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.rebate_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage rebate claims" ON public.rebate_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);
