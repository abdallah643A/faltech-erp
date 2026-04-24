
-- JE Mapping Rules: defines how each document type auto-generates journal entries
CREATE TABLE public.je_mapping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL, -- ar_invoice, ap_invoice, incoming_payment, outgoing_payment, goods_receipt, goods_issue, credit_memo, etc.
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trigger_on TEXT NOT NULL DEFAULT 'post', -- post, approve, status_change
  trigger_status TEXT, -- specific status that triggers the rule (e.g. 'approved', 'posted')
  company_id UUID REFERENCES public.sap_companies(id),
  priority INT NOT NULL DEFAULT 0, -- higher = runs first
  conditions JSONB DEFAULT '{}', -- additional filter conditions
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- JE Mapping Rule Lines: debit/credit line definitions for each rule
CREATE TABLE public.je_mapping_rule_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.je_mapping_rules(id) ON DELETE CASCADE,
  line_order INT NOT NULL DEFAULT 1,
  description TEXT,
  acct_code TEXT NOT NULL, -- GL account code
  acct_name TEXT, -- GL account name (for display)
  entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount_source TEXT NOT NULL DEFAULT 'total', -- total, subtotal, tax_amount, line_total, custom_field, fixed
  amount_field TEXT, -- custom field name if amount_source = 'custom_field'
  fixed_amount NUMERIC, -- fixed amount if amount_source = 'fixed'
  percentage NUMERIC, -- percentage of source amount (100 = full amount)
  cost_center_source TEXT, -- field to pull cost center from, or fixed value
  project_source TEXT, -- field to pull project code from
  bp_source TEXT, -- field to pull business partner from (e.g. 'customer_code', 'vendor_code')
  remarks_template TEXT, -- template for line remarks, e.g. '{doc_type} #{doc_num} - {customer_name}'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- JE Mapping Test Log: stores results of test runs
CREATE TABLE public.je_mapping_test_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.je_mapping_rules(id) ON DELETE CASCADE,
  test_document_id TEXT,
  test_document_type TEXT,
  result_status TEXT NOT NULL DEFAULT 'success', -- success, error, warning
  generated_lines JSONB, -- the JE lines that would be generated
  error_message TEXT,
  tested_by UUID,
  tested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.je_mapping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.je_mapping_rule_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.je_mapping_test_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage JE mapping rules" ON public.je_mapping_rules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage JE mapping rule lines" ON public.je_mapping_rule_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage JE mapping test logs" ON public.je_mapping_test_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_je_mapping_rules_updated_at
  BEFORE UPDATE ON public.je_mapping_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
