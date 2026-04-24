
-- =============================================
-- SAP B1-Style Account Determination Schema
-- =============================================

-- 1. Default G/L Account Determination
CREATE TABLE public.gl_account_defaults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  functional_area TEXT NOT NULL, -- sales, purchasing, general, inventory
  account_type TEXT NOT NULL, -- revenue, cogs, inventory, ar_control, ap_control, etc.
  acct_code TEXT,
  acct_name TEXT,
  description TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(functional_area, account_type, company_id)
);

ALTER TABLE public.gl_account_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view gl_account_defaults"
  ON public.gl_account_defaults FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert gl_account_defaults"
  ON public.gl_account_defaults FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update gl_account_defaults"
  ON public.gl_account_defaults FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete gl_account_defaults"
  ON public.gl_account_defaults FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_gl_account_defaults_updated_at
  BEFORE UPDATE ON public.gl_account_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Advanced Criteria Configuration
CREATE TABLE public.gl_advanced_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criterion_key TEXT NOT NULL UNIQUE, -- item_group, item_code, warehouse, bp_group, bp_code, ship_to_country, ship_to_state, document_type, branch, project, cost_center, company
  criterion_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  priority_order INT NOT NULL DEFAULT 100,
  depends_on TEXT, -- criterion_key that must also be active
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gl_advanced_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage gl_advanced_criteria"
  ON public.gl_advanced_criteria FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Advanced Rules
CREATE TABLE public.gl_advanced_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT,
  priority INT NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, inactive
  effective_from DATE,
  effective_to DATE,
  posting_period TEXT, -- e.g. '2026-01', null = any
  match_type TEXT NOT NULL DEFAULT 'exact', -- exact, partial
  criteria_values JSONB NOT NULL DEFAULT '{}', -- {"item_group":"RAW","warehouse":"WH01","bp_group":"LOCAL"}
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gl_advanced_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view gl_advanced_rules"
  ON public.gl_advanced_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert gl_advanced_rules"
  ON public.gl_advanced_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update gl_advanced_rules"
  ON public.gl_advanced_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete gl_advanced_rules"
  ON public.gl_advanced_rules FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_gl_advanced_rules_updated_at
  BEFORE UPDATE ON public.gl_advanced_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_gl_advanced_rules_status ON public.gl_advanced_rules(status);
CREATE INDEX idx_gl_advanced_rules_priority ON public.gl_advanced_rules(priority);
CREATE INDEX idx_gl_advanced_rules_criteria ON public.gl_advanced_rules USING GIN(criteria_values);

-- 4. Advanced Rule Target Accounts
CREATE TABLE public.gl_advanced_rule_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.gl_advanced_rules(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL, -- inventory, cogs, revenue, purchase, purchase_returns, sales_returns, expense, variance, price_difference, gr_clearing, gi_offset, wip, revaluation, exchange_gain, exchange_loss, freight, tax, down_payment_clearing
  acct_code TEXT NOT NULL,
  acct_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gl_advanced_rule_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage gl_advanced_rule_accounts"
  ON public.gl_advanced_rule_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_gl_rule_accounts_rule ON public.gl_advanced_rule_accounts(rule_id);

-- 5. Posting Log (full trace per document)
CREATE TABLE public.gl_posting_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL,
  document_id TEXT,
  document_number TEXT,
  row_type TEXT, -- inventory_item, service, non_inventory, fixed_asset, freight, tax
  resolution_path JSONB NOT NULL DEFAULT '[]', -- array of steps: [{step, source, details}]
  matched_rule_id UUID REFERENCES public.gl_advanced_rules(id),
  used_defaults BOOLEAN NOT NULL DEFAULT false,
  account_source TEXT, -- advanced_rule, default, item_group, warehouse, item, bp_master, fallback
  posting_rationale TEXT,
  status TEXT NOT NULL DEFAULT 'posted', -- posted, reversed, error
  journal_entry_id UUID,
  total_debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_balanced BOOLEAN NOT NULL DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gl_posting_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view gl_posting_log"
  ON public.gl_posting_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert gl_posting_log"
  ON public.gl_posting_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_gl_posting_log_doc ON public.gl_posting_log(document_type, document_id);
CREATE INDEX idx_gl_posting_log_rule ON public.gl_posting_log(matched_rule_id);

-- 6. Posting Log Lines
CREATE TABLE public.gl_posting_log_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id UUID NOT NULL REFERENCES public.gl_posting_log(id) ON DELETE CASCADE,
  line_order INT NOT NULL DEFAULT 1,
  side TEXT NOT NULL, -- debit, credit
  acct_code TEXT NOT NULL,
  acct_name TEXT,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  account_purpose TEXT, -- revenue, cogs, inventory, ar_control, tax, etc.
  account_source TEXT, -- advanced_rule, default, item_group, warehouse, item, bp_master, fallback
  source_details TEXT, -- human-readable explanation of why this account was chosen
  bp_code TEXT,
  project_code TEXT,
  cost_center TEXT,
  dimension_1 TEXT,
  dimension_2 TEXT,
  dimension_3 TEXT,
  dimension_4 TEXT,
  tax_code TEXT,
  line_memo TEXT,
  source_doc_line_num INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gl_posting_log_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage gl_posting_log_lines"
  ON public.gl_posting_log_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_gl_posting_log_lines_log ON public.gl_posting_log_lines(log_id);

-- 7. Seed default criteria
INSERT INTO public.gl_advanced_criteria (criterion_key, criterion_label, is_active, priority_order, depends_on) VALUES
  ('item_group', 'Item Group', true, 10, null),
  ('item_code', 'Item Code', false, 20, 'item_group'),
  ('warehouse', 'Warehouse', true, 30, null),
  ('bp_group', 'Business Partner Group', true, 40, null),
  ('bp_code', 'Business Partner Code', false, 50, 'bp_group'),
  ('ship_to_country', 'Ship-to Country', false, 60, null),
  ('ship_to_state', 'Ship-to State/Region', false, 70, 'ship_to_country'),
  ('document_type', 'Document Type', true, 5, null),
  ('branch', 'Branch / Business Place', true, 80, null),
  ('project', 'Project', false, 90, null),
  ('cost_center', 'Cost Center / Distribution Rule', false, 100, null),
  ('company', 'Company / Legal Entity', true, 1, null);

-- 8. Seed default G/L account types
INSERT INTO public.gl_account_defaults (functional_area, account_type, description) VALUES
  -- Sales
  ('sales', 'revenue', 'Sales Revenue Account'),
  ('sales', 'sales_returns', 'Sales Returns Account'),
  ('sales', 'sales_discount', 'Sales Discounts Account'),
  ('sales', 'ar_control', 'Accounts Receivable Control Account'),
  ('sales', 'output_vat', 'Output VAT / Sales Tax Account'),
  ('sales', 'deferred_revenue', 'Deferred Revenue Account'),
  ('sales', 'down_payment_clearing_ar', 'Down Payment Clearing (A/R)'),
  ('sales', 'freight_revenue', 'Freight Revenue Account'),
  ('sales', 'rounding_revenue', 'Rounding Account (Sales)'),
  ('sales', 'exchange_diff_ar', 'Exchange Rate Diff - Receivables'),
  ('sales', 'write_off_ar', 'Write-off Account (A/R)'),
  -- Purchasing
  ('purchasing', 'purchase', 'Purchase Account'),
  ('purchasing', 'purchase_returns', 'Purchase Returns Account'),
  ('purchasing', 'purchase_discount', 'Purchase Discounts Account'),
  ('purchasing', 'ap_control', 'Accounts Payable Control Account'),
  ('purchasing', 'input_vat', 'Input VAT / Purchase Tax Account'),
  ('purchasing', 'expense_clearing', 'Expense Clearing Account'),
  ('purchasing', 'price_difference', 'Price Difference Account'),
  ('purchasing', 'gr_clearing', 'Goods Receipt Clearing (GR/IR)'),
  ('purchasing', 'down_payment_clearing_ap', 'Down Payment Clearing (A/P)'),
  ('purchasing', 'freight_expense', 'Freight Expense Account'),
  ('purchasing', 'rounding_purchase', 'Rounding Account (Purchasing)'),
  ('purchasing', 'exchange_diff_ap', 'Exchange Rate Diff - Payables'),
  -- General
  ('general', 'cash', 'Cash Account'),
  ('general', 'bank', 'Bank Account'),
  ('general', 'exchange_gain', 'Realized Exchange Rate Gain'),
  ('general', 'exchange_loss', 'Realized Exchange Rate Loss'),
  ('general', 'unrealized_exchange_gain', 'Unrealized Exchange Rate Gain'),
  ('general', 'unrealized_exchange_loss', 'Unrealized Exchange Rate Loss'),
  ('general', 'rounding', 'General Rounding Account'),
  ('general', 'allocation', 'Allocation Account'),
  ('general', 'accrual', 'Accrual Account'),
  ('general', 'deferral', 'Deferral Account'),
  ('general', 'intercompany_ar', 'Intercompany Receivable'),
  ('general', 'intercompany_ap', 'Intercompany Payable'),
  -- Inventory
  ('inventory', 'inventory', 'Inventory Account'),
  ('inventory', 'cogs', 'Cost of Goods Sold Account'),
  ('inventory', 'inventory_offset', 'Inventory Offset / Stock Account'),
  ('inventory', 'goods_shipped_not_invoiced', 'Goods Shipped Not Invoiced'),
  ('inventory', 'goods_received_not_invoiced', 'Goods Received Not Invoiced'),
  ('inventory', 'wip', 'Work in Progress Account'),
  ('inventory', 'variance', 'Variance Account'),
  ('inventory', 'revaluation', 'Inventory Revaluation Account'),
  ('inventory', 'production_issue', 'Production Issue Account'),
  ('inventory', 'production_receipt', 'Production Receipt Account'),
  ('inventory', 'landed_cost', 'Landed Cost Absorption Account'),
  ('inventory', 'landed_cost_variance', 'Landed Cost Variance Account'),
  ('inventory', 'inventory_counting_diff', 'Inventory Counting Difference'),
  ('inventory', 'negative_inventory', 'Negative Inventory Adjustment');

-- Audit trail trigger for gl_account_defaults
CREATE TRIGGER audit_gl_account_defaults
  AFTER INSERT OR UPDATE OR DELETE ON public.gl_account_defaults
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Audit trail trigger for gl_advanced_rules
CREATE TRIGGER audit_gl_advanced_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.gl_advanced_rules
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
