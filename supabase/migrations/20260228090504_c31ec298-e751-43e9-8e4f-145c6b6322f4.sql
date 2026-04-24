
-- ============================================
-- Numbering Series table (mirrors SAP NNM1)
-- ============================================
CREATE TABLE public.numbering_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  series INTEGER NOT NULL,
  series_name TEXT NOT NULL,
  prefix TEXT,
  first_no INTEGER,
  next_no INTEGER,
  last_no INTEGER,
  object_code TEXT NOT NULL,
  document_sub_type TEXT,
  is_default BOOLEAN DEFAULT false,
  locked BOOLEAN DEFAULT false,
  group_code TEXT,
  period_indicator TEXT,
  remarks TEXT,
  sap_series_id INTEGER,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(series, object_code)
);

ALTER TABLE public.numbering_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view numbering series"
ON public.numbering_series FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage numbering series"
ON public.numbering_series FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- ============================================
-- Sales Employees / Owners table (mirrors SAP OHEM)
-- ============================================
CREATE TABLE public.sales_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slp_code INTEGER NOT NULL UNIQUE,
  slp_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  department TEXT,
  position TEXT,
  branch TEXT,
  is_active BOOLEAN DEFAULT true,
  commission_percent NUMERIC(5,2),
  user_id UUID,
  sap_emp_id INTEGER,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales employees"
ON public.sales_employees FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage sales employees"
ON public.sales_employees FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- ============================================
-- Add series and owner columns to business_partners
-- ============================================
ALTER TABLE public.business_partners
  ADD COLUMN IF NOT EXISTS series INTEGER,
  ADD COLUMN IF NOT EXISTS owner_code INTEGER,
  ADD COLUMN IF NOT EXISTS card_foreign_name TEXT,
  ADD COLUMN IF NOT EXISTS phone2 TEXT,
  ADD COLUMN IF NOT EXISTS fax TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS free_text TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS alias_name TEXT,
  ADD COLUMN IF NOT EXISTS vat_reg_num TEXT,
  ADD COLUMN IF NOT EXISTS territory TEXT,
  ADD COLUMN IF NOT EXISTS valid_for BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS frozen_for BOOLEAN DEFAULT false;

-- Update triggers
CREATE TRIGGER update_numbering_series_updated_at
  BEFORE UPDATE ON public.numbering_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_employees_updated_at
  BEFORE UPDATE ON public.sales_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
