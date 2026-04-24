
-- Exception Center enhancements

-- Escalation rules
CREATE TABLE IF NOT EXISTS public.exception_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  rule_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high',
  module TEXT,
  time_limit_hours INT NOT NULL DEFAULT 24,
  escalation_target_role TEXT,
  escalation_target_user_id UUID,
  notification_channels TEXT[] DEFAULT ARRAY['in_app'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.exception_escalation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage escalation rules" ON public.exception_escalation_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Resolution playbooks
CREATE TABLE IF NOT EXISTS public.exception_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  title TEXT NOT NULL,
  exception_type TEXT NOT NULL,
  module TEXT,
  severity TEXT,
  steps JSONB DEFAULT '[]',
  estimated_resolution_minutes INT,
  owner_role TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.exception_playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage playbooks" ON public.exception_playbooks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SLA configs per severity
CREATE TABLE IF NOT EXISTS public.exception_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  severity TEXT NOT NULL,
  module TEXT,
  target_response_hours INT NOT NULL DEFAULT 4,
  target_resolution_hours INT NOT NULL DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.exception_sla_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage sla configs" ON public.exception_sla_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enhance erp_exceptions table
ALTER TABLE public.erp_exceptions 
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recurrence_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS playbook_id UUID REFERENCES public.exception_playbooks(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS action_taken TEXT,
  ADD COLUMN IF NOT EXISTS source_module_link TEXT;

-- Intercompany Control Center tables

-- IC Mismatches
CREATE TABLE IF NOT EXISTS public.ic_mismatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  source_company_id UUID REFERENCES public.sap_companies(id),
  target_company_id UUID REFERENCES public.sap_companies(id),
  mismatch_type TEXT NOT NULL, -- missing_mirror, amount_diff, unmatched_balance, timing_diff
  source_document_type TEXT,
  source_document_number TEXT,
  source_document_id UUID,
  target_document_number TEXT,
  target_document_id UUID,
  source_amount NUMERIC DEFAULT 0,
  target_amount NUMERIC DEFAULT 0,
  difference NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  status TEXT DEFAULT 'open', -- open, investigating, resolved, ignored
  severity TEXT DEFAULT 'medium',
  assigned_to UUID,
  assigned_to_name TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  detected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ic_mismatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage ic mismatches" ON public.ic_mismatches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- IC Reconciliation
CREATE TABLE IF NOT EXISTS public.ic_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  entity_a_id UUID REFERENCES public.sap_companies(id),
  entity_b_id UUID REFERENCES public.sap_companies(id),
  account_type TEXT DEFAULT 'due_to', -- due_to, due_from
  entity_a_balance NUMERIC DEFAULT 0,
  entity_b_balance NUMERIC DEFAULT 0,
  difference NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  period TEXT, -- e.g. 2026-03
  status TEXT DEFAULT 'unmatched', -- unmatched, matched, adjusted, disputed
  adjustment_entry_id UUID,
  notes TEXT,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ic_reconciliation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage ic reconciliation" ON public.ic_reconciliation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- IC Disputes
CREATE TABLE IF NOT EXISTS public.ic_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  source_company_id UUID REFERENCES public.sap_companies(id),
  target_company_id UUID REFERENCES public.sap_companies(id),
  dispute_type TEXT NOT NULL, -- pricing, quantity, timing, missing_document
  title TEXT NOT NULL,
  description TEXT,
  amount_in_dispute NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  related_mismatch_id UUID REFERENCES public.ic_mismatches(id),
  status TEXT DEFAULT 'open', -- open, under_review, escalated, resolved, closed
  priority TEXT DEFAULT 'medium',
  raised_by UUID,
  raised_by_name TEXT,
  assigned_to UUID,
  assigned_to_name TEXT,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ic_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage ic disputes" ON public.ic_disputes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- IC Elimination entries
CREATE TABLE IF NOT EXISTS public.ic_elimination_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  period TEXT NOT NULL,
  source_company_id UUID REFERENCES public.sap_companies(id),
  target_company_id UUID REFERENCES public.sap_companies(id),
  elimination_type TEXT NOT NULL, -- revenue_expense, profit_inventory, balance, dividend
  debit_account TEXT,
  credit_account TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  status TEXT DEFAULT 'draft', -- draft, reviewed, posted, reversed
  journal_entry_id UUID,
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.ic_elimination_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage ic eliminations" ON public.ic_elimination_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
