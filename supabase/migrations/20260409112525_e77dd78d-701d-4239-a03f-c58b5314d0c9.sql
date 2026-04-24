
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS external_code TEXT;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS is_cash_account BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS is_indexed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS is_reval_currency BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS block_manual_posting BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS cash_flow_relevant BOOLEAN NOT NULL DEFAULT false;
