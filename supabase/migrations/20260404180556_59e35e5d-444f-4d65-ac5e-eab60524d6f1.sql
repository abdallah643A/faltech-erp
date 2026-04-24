
-- Sequence for journal voucher doc numbers
CREATE SEQUENCE IF NOT EXISTS journal_voucher_doc_num_seq START 1;

-- Journal Vouchers (draft JEs)
CREATE TABLE public.journal_vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_num INTEGER NOT NULL DEFAULT nextval('journal_voucher_doc_num_seq'),
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  doc_date DATE,
  reference TEXT,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total_debit NUMERIC NOT NULL DEFAULT 0,
  total_credit NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  posted_je_id UUID REFERENCES public.journal_entries(id),
  sap_doc_entry TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'local',
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Journal Voucher Lines
CREATE TABLE public.journal_voucher_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID NOT NULL REFERENCES public.journal_vouchers(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL DEFAULT 1,
  acct_code TEXT NOT NULL,
  acct_name TEXT DEFAULT '',
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  bp_code TEXT,
  bp_name TEXT,
  cost_center TEXT,
  project_code TEXT,
  dim_employee_id TEXT,
  dim_branch_id TEXT,
  dim_business_line_id TEXT,
  dim_factory_id TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_journal_vouchers_company ON public.journal_vouchers(company_id);
CREATE INDEX idx_journal_vouchers_status ON public.journal_vouchers(status);
CREATE INDEX idx_journal_voucher_lines_voucher ON public.journal_voucher_lines(voucher_id);

-- RLS
ALTER TABLE public.journal_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_voucher_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage journal vouchers"
  ON public.journal_vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage journal voucher lines"
  ON public.journal_voucher_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_journal_vouchers_updated_at
  BEFORE UPDATE ON public.journal_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
