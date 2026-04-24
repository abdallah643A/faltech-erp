
-- Add company_id to remaining tables missing it

-- Recruitment
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_job_postings_company ON public.job_postings(company_id);

-- Bank Reconciliation
ALTER TABLE public.bank_reconciliations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_company ON public.bank_reconciliations(company_id);

-- Bank POS
ALTER TABLE public.bank_pos_terminals ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_bank_pos_terminals_company ON public.bank_pos_terminals(company_id);

ALTER TABLE public.bank_pos_payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_bank_pos_payments_company ON public.bank_pos_payments(company_id);

-- Cadences
ALTER TABLE public.follow_up_cadences ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_follow_up_cadences_company ON public.follow_up_cadences(company_id);

-- Landed Costs
ALTER TABLE public.landed_cost_documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_landed_cost_documents_company ON public.landed_cost_documents(company_id);

-- Approval Templates (already has company_id in schema, skip)

-- EVM
ALTER TABLE public.evm_snapshots ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_evm_snapshots_company ON public.evm_snapshots(company_id);

ALTER TABLE public.payment_applications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_company ON public.payment_applications(company_id);

ALTER TABLE public.subcontractor_quotes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_subcontractor_quotes_company ON public.subcontractor_quotes(company_id);

ALTER TABLE public.bid_scenarios ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_bid_scenarios_company ON public.bid_scenarios(company_id);

-- Project Control
ALTER TABLE public.project_control_alerts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_project_control_alerts_company ON public.project_control_alerts(company_id);

ALTER TABLE public.project_control_thresholds ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

ALTER TABLE public.variance_explanations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

ALTER TABLE public.project_baselines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

ALTER TABLE public.budget_transfers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_budget_transfers_company ON public.budget_transfers(company_id);

ALTER TABLE public.contingency_reserves ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

ALTER TABLE public.contingency_releases ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

ALTER TABLE public.financial_commitments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_financial_commitments_company ON public.financial_commitments(company_id);

ALTER TABLE public.financial_scenarios ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
