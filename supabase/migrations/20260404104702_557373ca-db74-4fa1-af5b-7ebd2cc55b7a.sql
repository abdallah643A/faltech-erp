
-- Accounting Determination Rules
CREATE TABLE public.acct_determination_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  fallback_rule_id UUID REFERENCES public.acct_determination_rules(id),
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.acct_determination_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_users_all_acct_rules" ON public.acct_determination_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_acct_determination_rules_updated_at BEFORE UPDATE ON public.acct_determination_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conditions
CREATE TABLE public.acct_determination_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.acct_determination_rules(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL,
  condition_value TEXT NOT NULL,
  operator TEXT NOT NULL DEFAULT 'equals',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.acct_determination_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_users_all_acct_conditions" ON public.acct_determination_conditions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- JE Line Templates
CREATE TABLE public.acct_determination_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.acct_determination_rules(id) ON DELETE CASCADE,
  line_order INTEGER NOT NULL DEFAULT 1,
  side TEXT NOT NULL CHECK (side IN ('debit', 'credit')),
  account_purpose TEXT NOT NULL,
  default_acct_code TEXT,
  amount_source TEXT NOT NULL DEFAULT 'total',
  amount_formula TEXT,
  dimension_1 TEXT,
  dimension_2 TEXT,
  dimension_3 TEXT,
  dimension_4 TEXT,
  description_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.acct_determination_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_users_all_acct_lines" ON public.acct_determination_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Posting Runs
CREATE TABLE public.acct_posting_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  document_id UUID,
  document_number TEXT,
  rule_id UUID REFERENCES public.acct_determination_rules(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','simulated')),
  total_debit NUMERIC NOT NULL DEFAULT 0,
  total_credit NUMERIC NOT NULL DEFAULT 0,
  is_balanced BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  journal_entry_id UUID,
  reversed_by_run_id UUID REFERENCES public.acct_posting_runs(id),
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.acct_posting_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_users_all_posting_runs" ON public.acct_posting_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Posting Run Lines
CREATE TABLE public.acct_posting_run_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.acct_posting_runs(id) ON DELETE CASCADE,
  line_order INTEGER NOT NULL DEFAULT 1,
  acct_code TEXT NOT NULL,
  acct_name TEXT,
  side TEXT NOT NULL CHECK (side IN ('debit', 'credit')),
  amount NUMERIC NOT NULL DEFAULT 0,
  dimension_1 TEXT,
  dimension_2 TEXT,
  dimension_3 TEXT,
  dimension_4 TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.acct_posting_run_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_users_all_posting_run_lines" ON public.acct_posting_run_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Posting Exceptions
CREATE TABLE public.acct_posting_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  document_id UUID,
  document_number TEXT,
  rule_id UUID REFERENCES public.acct_determination_rules(id),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','ignored')),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.acct_posting_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_users_all_posting_exceptions" ON public.acct_posting_exceptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Rule Audit Log
CREATE TABLE public.acct_rule_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.acct_determination_rules(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  changed_fields TEXT[],
  old_values JSONB,
  new_values JSONB,
  changed_by UUID,
  changed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.acct_rule_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_users_all_rule_audit" ON public.acct_rule_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_acct_rules_doc_type ON public.acct_determination_rules(document_type);
CREATE INDEX idx_acct_rules_company ON public.acct_determination_rules(company_id);
CREATE INDEX idx_acct_conditions_rule ON public.acct_determination_conditions(rule_id);
CREATE INDEX idx_acct_lines_rule ON public.acct_determination_lines(rule_id);
CREATE INDEX idx_posting_runs_doc ON public.acct_posting_runs(document_type, document_id);
CREATE INDEX idx_posting_runs_company ON public.acct_posting_runs(company_id);
CREATE INDEX idx_posting_exceptions_status ON public.acct_posting_exceptions(status);
CREATE INDEX idx_posting_exceptions_company ON public.acct_posting_exceptions(company_id);
CREATE INDEX idx_rule_audit_rule ON public.acct_rule_audit_log(rule_id);
