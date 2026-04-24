
-- Exchange Rates (may already exist from partial run, use IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code TEXT NOT NULL,
  currency_name TEXT NOT NULL DEFAULT '',
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  indirect_rate NUMERIC(18,6),
  rate_type TEXT NOT NULL DEFAULT 'daily',
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchange_rates' AND policyname = 'Authenticated users can manage exchange_rates') THEN
    CREATE POLICY "Authenticated users can manage exchange_rates"
      ON public.exchange_rates FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_exchange_rates_updated_at ON public.exchange_rates;
CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User Authorizations Detail
CREATE TABLE IF NOT EXISTS public.user_authorizations_detail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_path TEXT NOT NULL,
  permission_level TEXT NOT NULL DEFAULT 'no_access',
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_path, company_id)
);

ALTER TABLE public.user_authorizations_detail ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_authorizations_detail' AND policyname = 'Authenticated users can manage authorizations_detail') THEN
    CREATE POLICY "Authenticated users can manage authorizations_detail"
      ON public.user_authorizations_detail FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_user_authorizations_detail_updated_at ON public.user_authorizations_detail;
CREATE TRIGGER update_user_authorizations_detail_updated_at
  BEFORE UPDATE ON public.user_authorizations_detail
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
