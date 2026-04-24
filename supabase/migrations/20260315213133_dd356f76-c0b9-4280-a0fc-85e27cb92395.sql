
-- ============================================================
-- PRD Section 3.1: finance_journal_entries (Header)
-- ============================================================
CREATE TABLE public.finance_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  je_number VARCHAR(30) NOT NULL UNIQUE,
  source_document_type VARCHAR(50) NOT NULL,
  source_document_id UUID NOT NULL,
  source_document_ref VARCHAR(50) NOT NULL,
  posting_date DATE NOT NULL,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period VARCHAR(7) NOT NULL, -- YYYY-MM
  fiscal_year SMALLINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  total_debit NUMERIC(18,4) NOT NULL,
  total_credit NUMERIC(18,4) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, POSTED, SYNCED, REVERSED, ERROR
  sap_transaction_number VARCHAR(30),
  sap_sync_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SYNCED, FAILED, SKIPPED
  sap_sync_at TIMESTAMPTZ,
  sap_sync_error TEXT,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at TIMESTAMPTZ,
  reversed_by_je_id UUID REFERENCES public.finance_journal_entries(id),
  company_id UUID REFERENCES public.sap_companies(id),
  business_vertical VARCHAR(20) -- trading, industrial, construction
);

-- ============================================================
-- PRD Section 3.2: finance_journal_entry_lines (Lines)
-- ============================================================
CREATE TABLE public.finance_journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  je_id UUID NOT NULL REFERENCES public.finance_journal_entries(id) ON DELETE CASCADE,
  line_number SMALLINT NOT NULL,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(120) NOT NULL,
  debit_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  cost_center VARCHAR(30),
  project_code VARCHAR(30),
  description VARCHAR(255),
  tax_code VARCHAR(10),
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  amount_local NUMERIC(18,4) NOT NULL DEFAULT 0,
  exchange_rate NUMERIC(12,6) NOT NULL DEFAULT 1.000000,
  partner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PRD Section 3.3: sap_sync_queue (Outbox)
-- ============================================================
CREATE TABLE public.sap_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  je_id UUID NOT NULL REFERENCES public.finance_journal_entries(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'QUEUED', -- QUEUED, SENDING, DONE, RETRY, FAILED
  attempt_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Add business_vertical to je_mapping_rules
-- ============================================================
ALTER TABLE public.je_mapping_rules
  ADD COLUMN IF NOT EXISTS business_vertical VARCHAR(20); -- trading, industrial, construction, all

-- Add tax_code to je_mapping_rule_lines
ALTER TABLE public.je_mapping_rule_lines
  ADD COLUMN IF NOT EXISTS tax_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS currency_source VARCHAR(30);

-- ============================================================
-- JE Number Sequence
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS finance_je_number_seq START WITH 1;

-- ============================================================
-- DB Function: check_je_balance (PRD Section 3)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_je_balance(p_je_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ABS(
    COALESCE(SUM(debit_amount), 0) - COALESCE(SUM(credit_amount), 0)
  ) < 0.01
  FROM public.finance_journal_entry_lines
  WHERE je_id = p_je_id;
$$;

-- ============================================================
-- DB Function: generate_je_number
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_je_number()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('finance_je_number_seq')::TEXT, 6, '0');
$$;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.finance_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sap_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage finance JEs" ON public.finance_journal_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage finance JE lines" ON public.finance_journal_entry_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage sync queue" ON public.sap_sync_queue
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER update_sap_sync_queue_updated_at
  BEFORE UPDATE ON public.sap_sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast sync queue polling
CREATE INDEX idx_sap_sync_queue_status ON public.sap_sync_queue(status) WHERE status IN ('QUEUED', 'RETRY');
CREATE INDEX idx_finance_je_period ON public.finance_journal_entries(period, fiscal_year);
CREATE INDEX idx_finance_je_source ON public.finance_journal_entries(source_document_type, source_document_id);
CREATE INDEX idx_finance_je_sap_sync ON public.finance_journal_entries(sap_sync_status) WHERE sap_sync_status IN ('PENDING', 'FAILED');
