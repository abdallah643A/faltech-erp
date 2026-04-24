
-- 1. Bank statement imports (file-level)
CREATE TABLE public.bank_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bank_account_id UUID,
  file_name TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK (file_format IN ('mt940','camt053','csv','xlsx')),
  statement_date DATE,
  opening_balance NUMERIC(18,2),
  closing_balance NUMERIC(18,2),
  currency TEXT DEFAULT 'SAR',
  total_lines INTEGER DEFAULT 0,
  duplicate_lines INTEGER DEFAULT 0,
  matched_lines INTEGER DEFAULT 0,
  exception_lines INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'parsing' CHECK (status IN ('parsing','parsed','reconciling','reconciled','failed','rejected')),
  error_message TEXT,
  raw_payload JSONB,
  imported_by UUID,
  imported_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Raw statement lines
CREATE TABLE public.bank_statement_raw_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.bank_statement_imports(id) ON DELETE CASCADE,
  bank_account_id UUID,
  line_number INTEGER NOT NULL,
  value_date DATE NOT NULL,
  posting_date DATE,
  amount NUMERIC(18,2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('debit','credit')),
  currency TEXT DEFAULT 'SAR',
  bank_reference TEXT,
  customer_reference TEXT,
  counterparty_name TEXT,
  counterparty_account TEXT,
  description TEXT,
  transaction_code TEXT,
  dedupe_hash TEXT NOT NULL,
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID REFERENCES public.bank_statement_raw_lines(id),
  match_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (match_status IN ('unmatched','suggested','matched','split','exception','ignored')),
  matched_at TIMESTAMPTZ,
  matched_by UUID,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_bank_raw_dedupe ON public.bank_statement_raw_lines(bank_account_id, dedupe_hash) WHERE is_duplicate = false;
CREATE INDEX idx_bank_raw_status ON public.bank_statement_raw_lines(match_status);
CREATE INDEX idx_bank_raw_import ON public.bank_statement_raw_lines(import_id);

-- 3. Match candidates (suggestions)
CREATE TABLE public.bank_match_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_line_id UUID NOT NULL REFERENCES public.bank_statement_raw_lines(id) ON DELETE CASCADE,
  ledger_doc_type TEXT NOT NULL,
  ledger_doc_id UUID,
  ledger_doc_number TEXT,
  ledger_amount NUMERIC(18,2),
  ledger_date DATE,
  ledger_party TEXT,
  match_source TEXT NOT NULL CHECK (match_source IN ('rule_exact','rule_amount_date','fuzzy','ai')),
  confidence_score NUMERIC(5,2) NOT NULL,
  confidence_band TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN confidence_score >= 90 THEN 'high'
      WHEN confidence_score >= 70 THEN 'medium'
      ELSE 'low'
    END
  ) STORED,
  rationale TEXT,
  is_selected BOOLEAN DEFAULT false,
  selected_by UUID,
  selected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bank_candidates_line ON public.bank_match_candidates(raw_line_id);

-- 4. Recon splits (one bank line -> N ledger entries)
CREATE TABLE public.bank_recon_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_line_id UUID NOT NULL REFERENCES public.bank_statement_raw_lines(id) ON DELETE CASCADE,
  split_number INTEGER NOT NULL,
  ledger_doc_type TEXT NOT NULL,
  ledger_doc_id UUID,
  ledger_doc_number TEXT,
  amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Bank exceptions
CREATE TABLE public.bank_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  raw_line_id UUID REFERENCES public.bank_statement_raw_lines(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('unmatched','duplicate','amount_mismatch','missing_ledger','foreign_currency','reversal','suspense','other')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  description TEXT,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','wont_fix','escalated')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bank_exc_status ON public.bank_exceptions(status);

-- 6. Auto-recon runs
CREATE TABLE public.bank_auto_recon_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bank_account_id UUID,
  import_id UUID REFERENCES public.bank_statement_imports(id) ON DELETE CASCADE,
  triggered_by UUID,
  total_lines INTEGER DEFAULT 0,
  rule_matched INTEGER DEFAULT 0,
  fuzzy_matched INTEGER DEFAULT 0,
  ai_suggested INTEGER DEFAULT 0,
  unresolved INTEGER DEFAULT 0,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers
CREATE TRIGGER trg_bank_imports_updated BEFORE UPDATE ON public.bank_statement_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bank_exc_updated BEFORE UPDATE ON public.bank_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_raw_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_match_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_recon_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_auto_recon_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read bank_imports" ON public.bank_statement_imports FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write bank_imports" ON public.bank_statement_imports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update bank_imports" ON public.bank_statement_imports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete bank_imports" ON public.bank_statement_imports FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "auth all bank_raw" ON public.bank_statement_raw_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all bank_cand" ON public.bank_match_candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all bank_splits" ON public.bank_recon_splits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all bank_exc" ON public.bank_exceptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all bank_runs" ON public.bank_auto_recon_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
