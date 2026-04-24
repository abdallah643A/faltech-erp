ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS is_confidential boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_control_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_currency text DEFAULT 'SAR';

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric NOT NULL,
  rate_date date NOT NULL,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exchange_rates_read" ON public.exchange_rates FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exchange_rates_write" ON public.exchange_rates FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;