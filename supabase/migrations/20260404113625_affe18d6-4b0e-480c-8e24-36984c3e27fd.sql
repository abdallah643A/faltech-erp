
-- 1. INTERCOMPANY TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.intercompany_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT NOT NULL,
  source_company_id UUID REFERENCES public.sap_companies(id),
  target_company_id UUID REFERENCES public.sap_companies(id),
  document_type TEXT NOT NULL,
  source_document_id TEXT,
  target_document_id TEXT,
  description TEXT,
  total_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  clearing_account_code TEXT,
  status TEXT DEFAULT 'draft',
  approval_status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intercompany_transaction_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.intercompany_transactions(id) ON DELETE CASCADE NOT NULL,
  line_order INT DEFAULT 1,
  account_code TEXT NOT NULL,
  account_name TEXT,
  description TEXT,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  dimension_1 TEXT,
  dimension_2 TEXT,
  company_side TEXT DEFAULT 'source',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.intercompany_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intercompany_transaction_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_intercompany_tx" ON public.intercompany_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_intercompany_tx_lines" ON public.intercompany_transaction_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. RECURRING DOCUMENTS ENGINE
CREATE TABLE IF NOT EXISTS public.recurring_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  template_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  frequency_interval INT DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE,
  last_run_date DATE,
  source_document_data JSONB,
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  reminder_days_before INT DEFAULT 3,
  total_runs INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recurring_document_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.recurring_document_templates(id) ON DELETE CASCADE NOT NULL,
  run_date DATE NOT NULL,
  run_number INT DEFAULT 1,
  status TEXT DEFAULT 'pending',
  generated_document_type TEXT,
  generated_document_id TEXT,
  generated_document_number TEXT,
  error_message TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recurring_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_document_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_recurring_templates" ON public.recurring_document_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_recurring_runs" ON public.recurring_document_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. PERIOD-END CLOSING CHECKLIST
CREATE TABLE IF NOT EXISTS public.period_close_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  fiscal_year INT NOT NULL,
  period_number INT NOT NULL,
  close_type TEXT NOT NULL DEFAULT 'monthly',
  status TEXT DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.period_close_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.period_close_checklists(id) ON DELETE CASCADE NOT NULL,
  task_order INT DEFAULT 1,
  task_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  owner_user_id UUID,
  owner_name TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  evidence_url TEXT,
  evidence_notes TEXT,
  signoff_status TEXT DEFAULT 'pending',
  signoff_by UUID,
  signoff_at TIMESTAMPTZ,
  depends_on_task_id UUID,
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.period_close_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_close_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_close_checklists" ON public.period_close_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_close_tasks" ON public.period_close_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. SOFT/HARD CLOSE CONTROLS
CREATE TABLE IF NOT EXISTS public.period_close_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  fiscal_year INT NOT NULL,
  period_number INT NOT NULL,
  close_type TEXT DEFAULT 'soft',
  status TEXT DEFAULT 'open',
  soft_closed_by UUID,
  soft_closed_at TIMESTAMPTZ,
  hard_closed_by UUID,
  hard_closed_at TIMESTAMPTZ,
  reopened_by UUID,
  reopened_at TIMESTAMPTZ,
  reopen_reason TEXT,
  restricted_modules TEXT[],
  restricted_branches UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.period_reopen_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID REFERENCES public.period_close_controls(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID,
  requester_name TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.period_close_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_reopen_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_close_controls" ON public.period_close_controls FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_reopen_requests" ON public.period_reopen_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. TREASURY WORKSPACE
CREATE TABLE IF NOT EXISTS public.treasury_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  account_name TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  iban TEXT,
  swift_code TEXT,
  currency TEXT DEFAULT 'SAR',
  current_balance NUMERIC DEFAULT 0,
  available_balance NUMERIC DEFAULT 0,
  account_type TEXT DEFAULT 'current',
  gl_account_code TEXT,
  is_active BOOLEAN DEFAULT true,
  last_reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.treasury_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT NOT NULL,
  from_account_id UUID REFERENCES public.treasury_accounts(id),
  to_account_id UUID REFERENCES public.treasury_accounts(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'SAR',
  transfer_date DATE DEFAULT CURRENT_DATE,
  reference TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.treasury_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_treasury_accts" ON public.treasury_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_treasury_transfers" ON public.treasury_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. FIXED ASSETS REGISTER
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  asset_code TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  category TEXT,
  sub_category TEXT,
  description TEXT,
  serial_number TEXT,
  barcode TEXT,
  acquisition_date DATE,
  acquisition_cost NUMERIC DEFAULT 0,
  salvage_value NUMERIC DEFAULT 0,
  useful_life_years INT DEFAULT 5,
  depreciation_method TEXT DEFAULT 'straight_line',
  depreciation_rate NUMERIC,
  accumulated_depreciation NUMERIC DEFAULT 0,
  book_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  location TEXT,
  department TEXT,
  assigned_to TEXT,
  vendor_id UUID,
  gl_asset_account TEXT,
  gl_depreciation_account TEXT,
  gl_expense_account TEXT,
  last_depreciation_date DATE,
  disposal_date DATE,
  disposal_amount NUMERIC,
  disposal_method TEXT,
  insurance_policy TEXT,
  warranty_expiry DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fixed_asset_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.fixed_assets(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL,
  transaction_date DATE DEFAULT CURRENT_DATE,
  amount NUMERIC DEFAULT 0,
  description TEXT,
  reference_document TEXT,
  from_location TEXT,
  to_location TEXT,
  journal_entry_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_asset_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_fixed_assets" ON public.fixed_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_fixed_asset_tx" ON public.fixed_asset_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. LEASE ACCOUNTING
CREATE TABLE IF NOT EXISTS public.lease_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  contract_number TEXT NOT NULL,
  vendor_id UUID,
  vendor_name TEXT,
  lease_type TEXT DEFAULT 'operating',
  asset_description TEXT,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_amount NUMERIC DEFAULT 0,
  annual_amount NUMERIC DEFAULT 0,
  total_liability NUMERIC DEFAULT 0,
  remaining_liability NUMERIC DEFAULT 0,
  payment_day INT DEFAULT 1,
  currency TEXT DEFAULT 'SAR',
  renewal_date DATE,
  auto_renew BOOLEAN DEFAULT false,
  notice_period_days INT DEFAULT 30,
  gl_expense_account TEXT,
  gl_liability_account TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lease_payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.lease_contracts(id) ON DELETE CASCADE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'upcoming',
  paid_date DATE,
  paid_amount NUMERIC,
  payment_reference TEXT,
  vendor_payment_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lease_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_lease_contracts" ON public.lease_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lease_payments" ON public.lease_payment_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. BUDGET REQUEST WORKFLOW
CREATE TABLE IF NOT EXISTS public.budget_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  request_number TEXT NOT NULL,
  fiscal_year INT NOT NULL,
  department TEXT,
  project_id UUID,
  account_code TEXT,
  account_name TEXT,
  branch_id UUID REFERENCES public.branches(id),
  requested_amount NUMERIC DEFAULT 0,
  approved_amount NUMERIC,
  justification TEXT,
  status TEXT DEFAULT 'draft',
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budget_request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.budget_requests(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID,
  approver_name TEXT,
  action TEXT NOT NULL,
  approved_amount NUMERIC,
  comments TEXT,
  acted_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.budget_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_request_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_budget_requests" ON public.budget_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_budget_approvals" ON public.budget_request_approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. BANK RECONCILIATION
CREATE TABLE IF NOT EXISTS public.bank_recon_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  treasury_account_id UUID REFERENCES public.treasury_accounts(id),
  statement_date DATE NOT NULL,
  period_from DATE,
  period_to DATE,
  opening_balance NUMERIC DEFAULT 0,
  closing_balance NUMERIC DEFAULT 0,
  total_debits NUMERIC DEFAULT 0,
  total_credits NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_recon_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID REFERENCES public.bank_recon_statements(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  reference TEXT,
  description TEXT,
  amount NUMERIC NOT NULL,
  entry_type TEXT DEFAULT 'debit',
  match_status TEXT DEFAULT 'unmatched',
  match_type TEXT,
  matched_document_type TEXT,
  matched_document_id TEXT,
  matched_amount NUMERIC,
  matched_by UUID,
  matched_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bank_recon_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_recon_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_bank_recon_stmts" ON public.bank_recon_statements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_bank_recon_entries" ON public.bank_recon_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
