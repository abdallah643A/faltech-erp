
-- Tax Groups
CREATE TABLE public.tax_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE NOT NULL,
  tax_code TEXT NOT NULL,
  tax_name TEXT NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_type TEXT NOT NULL DEFAULT 'VAT',
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, tax_code)
);
ALTER TABLE public.tax_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tax_groups" ON public.tax_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payment Terms
CREATE TABLE public.payment_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE NOT NULL,
  terms_code TEXT NOT NULL,
  terms_name TEXT NOT NULL,
  due_days INTEGER NOT NULL DEFAULT 0,
  cash_discount_percent NUMERIC(5,2) DEFAULT 0,
  installments INTEGER DEFAULT 1,
  starting_from TEXT DEFAULT 'doc_date',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, terms_code)
);
ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payment_terms" ON public.payment_terms FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Banks
CREATE TABLE public.banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE NOT NULL,
  country TEXT NOT NULL DEFAULT 'SA',
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  swift_code TEXT,
  branch_name TEXT,
  account_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, bank_code)
);
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage banks" ON public.banks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customer Groups
CREATE TABLE public.customer_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE NOT NULL,
  group_code SERIAL,
  group_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, group_name)
);
ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage customer_groups" ON public.customer_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Vendor Groups
CREATE TABLE public.vendor_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE NOT NULL,
  group_code SERIAL,
  group_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, group_name)
);
ALTER TABLE public.vendor_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage vendor_groups" ON public.vendor_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- General Settings (key-value per company)
CREATE TABLE public.general_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE NOT NULL,
  setting_group TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, setting_group, setting_key)
);
ALTER TABLE public.general_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage general_settings" ON public.general_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Print Preferences
CREATE TABLE public.print_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  default_layout TEXT DEFAULT 'Standard',
  copies INTEGER DEFAULT 1,
  print_logo BOOLEAN DEFAULT true,
  print_as TEXT DEFAULT 'PDF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, document_type)
);
ALTER TABLE public.print_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage print_preferences" ON public.print_preferences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- User Authorizations (module-level permissions)
CREATE TABLE public.user_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  module_path TEXT NOT NULL,
  permission_level TEXT NOT NULL DEFAULT 'no_access',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id, module_path)
);
ALTER TABLE public.user_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage user_authorizations" ON public.user_authorizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payment Term Installments (child table)
CREATE TABLE public.payment_term_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_term_id UUID REFERENCES public.payment_terms(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL DEFAULT 1,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 100,
  due_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_term_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payment_term_installments" ON public.payment_term_installments FOR ALL TO authenticated USING (true) WITH CHECK (true);
