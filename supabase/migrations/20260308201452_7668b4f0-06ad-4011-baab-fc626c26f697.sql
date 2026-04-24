
-- Currency Exchange Rates (ORTT equivalent in SAP B1)
CREATE TABLE public.currency_exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL DEFAULT 'SAR',
  to_currency TEXT NOT NULL,
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rate NUMERIC NOT NULL,
  inverse_rate NUMERIC GENERATED ALWAYS AS (CASE WHEN rate > 0 THEN 1.0 / rate ELSE 0 END) STORED,
  source TEXT DEFAULT 'manual', -- manual, sap, api
  sap_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency, rate_date)
);

-- Currencies master list
CREATE TABLE public.currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  symbol TEXT,
  decimal_places INT DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  is_system_currency BOOLEAN DEFAULT false,
  sap_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bank Statements (OBNK equivalent)
CREATE TABLE public.bank_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_number TEXT NOT NULL,
  bank_code TEXT,
  bank_name TEXT,
  account_number TEXT,
  currency TEXT DEFAULT 'SAR',
  statement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_balance NUMERIC DEFAULT 0,
  closing_balance NUMERIC DEFAULT 0,
  total_credits NUMERIC DEFAULT 0,
  total_debits NUMERIC DEFAULT 0,
  line_count INT DEFAULT 0,
  status TEXT DEFAULT 'imported', -- imported, in_progress, reconciled, closed
  imported_at TIMESTAMPTZ DEFAULT now(),
  imported_by TEXT,
  file_name TEXT,
  notes TEXT,
  branch_id UUID REFERENCES public.branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bank Statement Lines
CREATE TABLE public.bank_statement_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  line_num INT NOT NULL,
  transaction_date DATE NOT NULL,
  value_date DATE,
  reference TEXT,
  description TEXT,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  balance_after NUMERIC,
  transaction_type TEXT, -- payment, receipt, transfer, charge, interest
  counterparty_name TEXT,
  counterparty_account TEXT,
  reconciliation_status TEXT DEFAULT 'unmatched', -- unmatched, matched, partially_matched, manual
  matched_payment_id UUID,
  matched_invoice_id UUID,
  matched_at TIMESTAMPTZ,
  matched_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment Reconciliation Log
CREATE TABLE public.payment_reconciliations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reconciliation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_statement_id UUID REFERENCES public.bank_statements(id),
  statement_line_id UUID REFERENCES public.bank_statement_lines(id),
  payment_id UUID,
  payment_type TEXT, -- incoming_payment, outgoing_payment, journal_entry
  payment_reference TEXT,
  statement_amount NUMERIC NOT NULL,
  payment_amount NUMERIC NOT NULL,
  difference NUMERIC GENERATED ALWAYS AS (statement_amount - payment_amount) STORED,
  match_type TEXT DEFAULT 'auto', -- auto, manual, partial
  match_confidence NUMERIC, -- 0-100 percentage
  status TEXT DEFAULT 'pending', -- pending, confirmed, rejected
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.currency_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reconciliations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Auth read currency_exchange_rates" ON public.currency_exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage currency_exchange_rates" ON public.currency_exchange_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth read currencies" ON public.currencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage currencies" ON public.currencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth read bank_statements" ON public.bank_statements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage bank_statements" ON public.bank_statements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth read bank_statement_lines" ON public.bank_statement_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage bank_statement_lines" ON public.bank_statement_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth read payment_reconciliations" ON public.payment_reconciliations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage payment_reconciliations" ON public.payment_reconciliations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_exchange_rates_date ON public.currency_exchange_rates(rate_date DESC);
CREATE INDEX idx_exchange_rates_currencies ON public.currency_exchange_rates(from_currency, to_currency);
CREATE INDEX idx_bank_statements_date ON public.bank_statements(statement_date DESC);
CREATE INDEX idx_bank_statement_lines_stmt ON public.bank_statement_lines(statement_id);
CREATE INDEX idx_bank_statement_lines_status ON public.bank_statement_lines(reconciliation_status);
CREATE INDEX idx_reconciliations_stmt ON public.payment_reconciliations(bank_statement_id);

-- Seed common currencies
INSERT INTO public.currencies (code, name, name_ar, symbol, is_system_currency) VALUES
  ('SAR', 'Saudi Riyal', 'ريال سعودي', '﷼', true),
  ('USD', 'US Dollar', 'دولار أمريكي', '$', false),
  ('EUR', 'Euro', 'يورو', '€', false),
  ('GBP', 'British Pound', 'جنيه إسترليني', '£', false),
  ('AED', 'UAE Dirham', 'درهم إماراتي', 'د.إ', false),
  ('KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'د.ك', false),
  ('BHD', 'Bahraini Dinar', 'دينار بحريني', 'د.ب', false),
  ('QAR', 'Qatari Riyal', 'ريال قطري', 'ر.ق', false),
  ('OMR', 'Omani Rial', 'ريال عماني', 'ر.ع', false),
  ('EGP', 'Egyptian Pound', 'جنيه مصري', 'ج.م', false),
  ('JOD', 'Jordanian Dinar', 'دينار أردني', 'د.ا', false),
  ('CNY', 'Chinese Yuan', 'يوان صيني', '¥', false),
  ('INR', 'Indian Rupee', 'روبية هندية', '₹', false),
  ('JPY', 'Japanese Yen', 'ين ياباني', '¥', false)
ON CONFLICT (code) DO NOTHING;
