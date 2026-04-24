
-- Add unique constraint for upsert support on import
CREATE UNIQUE INDEX IF NOT EXISTS idx_coa_acct_code_company ON public.chart_of_accounts (acct_code, company_id);
