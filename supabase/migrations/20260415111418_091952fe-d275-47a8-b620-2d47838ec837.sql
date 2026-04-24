
-- Add configuration columns to sap_companies
ALTER TABLE public.sap_companies 
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS enabled_modules text[] DEFAULT ARRAY['dashboard','finance','sales','purchasing','inventory','banking','reports']::text[],
  ADD COLUMN IF NOT EXISTS master_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS coa_template jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid NULL;

-- Create trigger to auto-assign company to creator
CREATE OR REPLACE FUNCTION public.auto_assign_company_to_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.user_company_assignments (user_id, company_id)
    VALUES (NEW.created_by, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_company ON public.sap_companies;
CREATE TRIGGER trg_auto_assign_company
  AFTER INSERT ON public.sap_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_company_to_creator();
