
-- Enhance existing contracts table
ALTER TABLE public.contracts 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS counterparty_code TEXT,
  ADD COLUMN IF NOT EXISTS signing_date DATE,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS retention_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS governing_law TEXT,
  ADD COLUMN IF NOT EXISTS jurisdiction TEXT,
  ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS e_sign_status TEXT DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS e_sign_reference TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS linked_purchase_order_id UUID REFERENCES public.purchase_orders(id),
  ADD COLUMN IF NOT EXISTS linked_cpms_project_id UUID REFERENCES public.cpms_projects(id),
  ADD COLUMN IF NOT EXISTS business_partner_id UUID REFERENCES public.business_partners(id);

-- Contract amendments
CREATE TABLE public.contract_amendments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  amendment_number TEXT NOT NULL,
  amendment_type TEXT DEFAULT 'modification',
  title TEXT NOT NULL,
  description TEXT,
  old_value NUMERIC,
  new_value NUMERIC,
  cost_impact NUMERIC DEFAULT 0,
  schedule_impact_days INTEGER DEFAULT 0,
  effective_date DATE,
  status TEXT DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_contract_amendments" ON public.contract_amendments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contract obligations
CREATE TABLE public.contract_obligations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  obligation_type TEXT DEFAULT 'deliverable',
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_date DATE,
  responsible_party TEXT,
  responsible_user_id UUID,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  reminder_days_before INTEGER DEFAULT 7,
  reminder_sent BOOLEAN DEFAULT false,
  linked_document_type TEXT,
  linked_document_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_obligations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_contract_obligations" ON public.contract_obligations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_obligations_due ON public.contract_obligations(due_date);

-- Clause library
CREATE TABLE public.contract_clauses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  clause_code TEXT,
  title TEXT NOT NULL,
  body TEXT,
  category TEXT DEFAULT 'general',
  is_template BOOLEAN DEFAULT true,
  is_mandatory BOOLEAN DEFAULT false,
  risk_level TEXT DEFAULT 'low',
  language TEXT DEFAULT 'en',
  version INTEGER DEFAULT 1,
  tags TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_clauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_contract_clauses" ON public.contract_clauses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clause assignments
CREATE TABLE public.contract_clause_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  clause_id UUID NOT NULL REFERENCES public.contract_clauses(id),
  custom_body TEXT,
  sort_order INTEGER DEFAULT 0,
  is_accepted BOOLEAN DEFAULT true,
  negotiation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_clause_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_clause_assignments" ON public.contract_clause_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Guarantees / bonds / insurances
CREATE TABLE public.contract_guarantees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  guarantee_type TEXT NOT NULL DEFAULT 'performance_bond',
  title TEXT NOT NULL,
  provider TEXT,
  reference_number TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  issue_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'active',
  beneficiary TEXT,
  notes TEXT,
  document_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_guarantees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_contract_guarantees" ON public.contract_guarantees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Claims
CREATE TABLE public.contract_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  claim_type TEXT DEFAULT 'cost',
  title TEXT NOT NULL,
  description TEXT,
  amount_claimed NUMERIC DEFAULT 0,
  amount_approved NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  submission_date DATE,
  response_due_date DATE,
  resolution_date DATE,
  status TEXT DEFAULT 'draft',
  claimant TEXT,
  respondent TEXT,
  financial_impact_assessed BOOLEAN DEFAULT false,
  linked_variation_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_contract_claims" ON public.contract_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Variation orders
CREATE TABLE public.contract_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  variation_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  variation_type TEXT DEFAULT 'addition',
  cost_impact NUMERIC DEFAULT 0,
  schedule_impact_days INTEGER DEFAULT 0,
  original_value NUMERIC DEFAULT 0,
  revised_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  requested_by TEXT,
  requested_date DATE,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  linked_claim_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_variations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_contract_variations" ON public.contract_variations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contract documents
CREATE TABLE public.contract_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  document_type TEXT DEFAULT 'contract',
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  uploaded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_contract_documents" ON public.contract_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contract history
CREATE TABLE public.contract_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  changed_by UUID,
  changed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_contract_history" ON public.contract_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sequences
CREATE SEQUENCE IF NOT EXISTS contract_amendment_seq START 1;
CREATE SEQUENCE IF NOT EXISTS contract_claim_seq START 1;
CREATE SEQUENCE IF NOT EXISTS contract_variation_seq START 1;

-- Updated_at triggers
CREATE TRIGGER update_contract_amendments_updated_at BEFORE UPDATE ON public.contract_amendments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contract_obligations_updated_at BEFORE UPDATE ON public.contract_obligations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contract_clauses_updated_at BEFORE UPDATE ON public.contract_clauses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contract_guarantees_updated_at BEFORE UPDATE ON public.contract_guarantees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contract_claims_updated_at BEFORE UPDATE ON public.contract_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contract_variations_updated_at BEFORE UPDATE ON public.contract_variations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
