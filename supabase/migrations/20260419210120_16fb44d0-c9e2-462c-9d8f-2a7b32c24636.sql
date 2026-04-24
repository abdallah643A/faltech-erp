
-- =============================================================
-- PR1: Group Structure, Locales & Numbering
-- =============================================================

-- Countries master
CREATE TABLE IF NOT EXISTS public.org_countries (
  code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  default_language TEXT NOT NULL DEFAULT 'en',
  default_timezone TEXT NOT NULL DEFAULT 'UTC',
  vat_required BOOLEAN NOT NULL DEFAULT false,
  einvoicing_standard TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read countries" ON public.org_countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage countries" ON public.org_countries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Seed common countries
INSERT INTO public.org_countries (code, name_en, name_ar, default_currency, default_language, default_timezone, vat_required, einvoicing_standard) VALUES
  ('SA', 'Saudi Arabia', 'المملكة العربية السعودية', 'SAR', 'ar', 'Asia/Riyadh', true, 'ZATCA'),
  ('AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', 'AED', 'ar', 'Asia/Dubai', true, 'FTA'),
  ('EG', 'Egypt', 'مصر', 'EGP', 'ar', 'Africa/Cairo', true, 'ETA'),
  ('IN', 'India', 'الهند', 'INR', 'hi', 'Asia/Kolkata', true, 'GST'),
  ('PK', 'Pakistan', 'باكستان', 'PKR', 'ur', 'Asia/Karachi', true, 'FBR'),
  ('GB', 'United Kingdom', 'المملكة المتحدة', 'GBP', 'en', 'Europe/London', true, 'MTD'),
  ('US', 'United States', 'الولايات المتحدة', 'USD', 'en', 'America/New_York', false, NULL),
  ('JO', 'Jordan', 'الأردن', 'JOD', 'ar', 'Asia/Amman', true, NULL),
  ('KW', 'Kuwait', 'الكويت', 'KWD', 'ar', 'Asia/Kuwait', false, NULL),
  ('QA', 'Qatar', 'قطر', 'QAR', 'ar', 'Asia/Qatar', false, NULL),
  ('BH', 'Bahrain', 'البحرين', 'BHD', 'ar', 'Asia/Bahrain', true, NULL),
  ('OM', 'Oman', 'عمان', 'OMR', 'ar', 'Asia/Muscat', true, NULL)
ON CONFLICT (code) DO NOTHING;

-- Extend sap_companies
ALTER TABLE public.sap_companies
  ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES public.org_countries(code),
  ADD COLUMN IF NOT EXISTS default_branch_id UUID,
  ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS base_currency TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS fiscal_year_start_month INTEGER DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12);

-- Backfill base_currency from existing default_currency
UPDATE public.sap_companies SET base_currency = default_currency WHERE base_currency IS NULL;

-- Extend branches
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES public.org_countries(code),
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- Per-company enabled languages
CREATE TABLE IF NOT EXISTS public.org_company_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, language_code)
);
ALTER TABLE public.org_company_languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read company langs" ON public.org_company_languages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage company langs" ON public.org_company_languages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Per-company enabled currencies
CREATE TABLE IF NOT EXISTS public.org_company_currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL,
  is_base BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, currency_code)
);
ALTER TABLE public.org_company_currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read company ccys" ON public.org_company_currencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage company ccys" ON public.org_company_currencies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Strengthen numbering scope: branch_id + country_code + uniqueness
ALTER TABLE public.acct_numbering_series
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES public.org_countries(code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_numbering_company_doc_year_branch
  ON public.acct_numbering_series (
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    doc_type,
    COALESCE(fiscal_year, 0),
    COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- updated_at trigger for org_countries (uses existing function)
DROP TRIGGER IF EXISTS trg_org_countries_updated ON public.org_countries;
CREATE TRIGGER trg_org_countries_updated BEFORE UPDATE ON public.org_countries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
