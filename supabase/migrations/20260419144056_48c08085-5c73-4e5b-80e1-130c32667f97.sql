-- Cash position snapshots
CREATE TABLE public.bank_cash_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_account_id UUID,
  bank_name TEXT,
  account_number TEXT,
  currency TEXT NOT NULL DEFAULT 'SAR',
  opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  pending_inflows NUMERIC(18,2) NOT NULL DEFAULT 0,
  pending_outflows NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_consolidated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(company_id, snapshot_date, bank_account_id)
);

CREATE INDEX idx_bank_cash_positions_company_date ON public.bank_cash_positions(company_id, snapshot_date DESC);

-- Forecast scenarios with versioning
CREATE TABLE public.bank_forecast_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL DEFAULT 'base' CHECK (scenario_type IN ('base','best','worst','custom')),
  description TEXT,
  horizon_weeks INT NOT NULL DEFAULT 13,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','locked','archived')),
  is_baseline BOOLEAN DEFAULT false,
  parent_scenario_id UUID REFERENCES public.bank_forecast_scenarios(id),
  version INT NOT NULL DEFAULT 1,
  -- Driver assumptions
  dso_days NUMERIC(8,2),
  dpo_days NUMERIC(8,2),
  collection_rate NUMERIC(5,2),
  fx_adjustment NUMERIC(8,4) DEFAULT 1.0,
  growth_rate NUMERIC(5,2) DEFAULT 0,
  drivers JSONB DEFAULT '{}',
  notes TEXT,
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_bank_forecast_scenarios_company ON public.bank_forecast_scenarios(company_id, status);

-- Forecast lines (per period)
CREATE TABLE public.bank_forecast_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.bank_forecast_scenarios(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label TEXT,
  category TEXT NOT NULL,
  forecast_inflow NUMERIC(18,2) NOT NULL DEFAULT 0,
  forecast_outflow NUMERIC(18,2) NOT NULL DEFAULT 0,
  actual_inflow NUMERIC(18,2) DEFAULT 0,
  actual_outflow NUMERIC(18,2) DEFAULT 0,
  variance_amount NUMERIC(18,2) DEFAULT 0,
  variance_percent NUMERIC(8,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_forecast_lines_scenario ON public.bank_forecast_lines(scenario_id, period_start);

-- Payment optimization runs
CREATE TABLE public.bank_payment_optimization_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  optimization_horizon_days INT NOT NULL DEFAULT 30,
  available_cash NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_payable NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_recommended NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_captured NUMERIC(18,2) DEFAULT 0,
  late_fees_avoided NUMERIC(18,2) DEFAULT 0,
  strategy TEXT DEFAULT 'balanced' CHECK (strategy IN ('balanced','discount_max','liquidity_preserve','priority')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','executed','cancelled')),
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Payment optimization recommendations
CREATE TABLE public.bank_payment_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.bank_payment_optimization_runs(id) ON DELETE CASCADE,
  ap_invoice_id UUID,
  vendor_name TEXT,
  invoice_number TEXT,
  invoice_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  recommended_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  recommended_date DATE,
  due_date DATE,
  discount_available NUMERIC(18,2) DEFAULT 0,
  late_fee_risk NUMERIC(18,2) DEFAULT 0,
  priority_score NUMERIC(5,2) DEFAULT 0,
  reason TEXT,
  is_selected BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_pay_recs_run ON public.bank_payment_recommendations(run_id);

-- Payment approval workflow
CREATE TABLE public.bank_payment_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  payment_id UUID,
  payment_reference TEXT,
  payment_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  vendor_name TEXT,
  approval_level INT NOT NULL DEFAULT 1,
  required_levels INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','escalated','cancelled')),
  approver_id UUID,
  approver_name TEXT,
  approval_notes TEXT,
  decided_at TIMESTAMPTZ,
  due_by TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_bank_payment_approvals_status ON public.bank_payment_approvals(company_id, status);

-- Enable RLS
ALTER TABLE public.bank_cash_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_forecast_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_forecast_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_payment_optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_payment_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_payment_approvals ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated read, admin write
CREATE POLICY "auth read cash positions" ON public.bank_cash_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage cash positions" ON public.bank_cash_positions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "auth read forecast scenarios" ON public.bank_forecast_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage forecast scenarios" ON public.bank_forecast_scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read forecast lines" ON public.bank_forecast_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage forecast lines" ON public.bank_forecast_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read pay opt runs" ON public.bank_payment_optimization_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage pay opt runs" ON public.bank_payment_optimization_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read pay recs" ON public.bank_payment_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage pay recs" ON public.bank_payment_recommendations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read pay approvals" ON public.bank_payment_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage pay approvals" ON public.bank_payment_approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_bank_forecast_scenarios_updated_at
  BEFORE UPDATE ON public.bank_forecast_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();