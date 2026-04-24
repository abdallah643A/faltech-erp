
-- Add company_id to budget tables if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='budget_scenarios' AND column_name='company_id') THEN
    ALTER TABLE public.budget_scenarios ADD COLUMN company_id uuid REFERENCES public.sap_companies(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='budget_distribution_methods' AND column_name='company_id') THEN
    ALTER TABLE public.budget_distribution_methods ADD COLUMN company_id uuid REFERENCES public.sap_companies(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='budgets' AND column_name='company_id') THEN
    ALTER TABLE public.budgets ADD COLUMN company_id uuid REFERENCES public.sap_companies(id);
  END IF;
END$$;

-- Assign existing records to default company
UPDATE public.budget_scenarios SET company_id = (SELECT id FROM public.sap_companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.budget_distribution_methods SET company_id = (SELECT id FROM public.sap_companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.budgets SET company_id = (SELECT id FROM public.sap_companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
