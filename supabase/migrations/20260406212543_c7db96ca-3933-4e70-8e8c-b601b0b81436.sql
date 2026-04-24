
-- P&L Report Sections (Revenue, COGS, Gross Profit, OpEx, etc.)
CREATE TABLE IF NOT EXISTS public.pl_report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  section_key TEXT NOT NULL,
  header_en TEXT NOT NULL,
  header_ar TEXT,
  section_type TEXT NOT NULL DEFAULT 'normal',
  display_order INT NOT NULL DEFAULT 0,
  total_label_en TEXT,
  total_label_ar TEXT,
  formula TEXT,
  sign_inversion BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pl_report_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_pl_sections" ON public.pl_report_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- P&L Report Lines within sections
CREATE TABLE IF NOT EXISTS public.pl_report_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.pl_report_sections(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  line_order INT NOT NULL DEFAULT 0,
  label_en TEXT NOT NULL,
  label_ar TEXT,
  is_bold BOOLEAN DEFAULT false,
  indent_level INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pl_report_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_pl_lines" ON public.pl_report_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Account range mappings per line
CREATE TABLE IF NOT EXISTS public.pl_report_line_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID REFERENCES public.pl_report_lines(id) ON DELETE CASCADE,
  acct_from TEXT NOT NULL,
  acct_to TEXT NOT NULL,
  label_ar TEXT,
  balance_rule TEXT DEFAULT 'credit_minus_debit',
  is_deduction BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pl_report_line_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_pl_line_accounts" ON public.pl_report_line_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Finance notes on P&L lines
CREATE TABLE IF NOT EXISTS public.pl_report_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  section_key TEXT NOT NULL,
  line_label TEXT,
  period TEXT NOT NULL,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'commentary',
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pl_report_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_pl_notes" ON public.pl_report_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Saved filter templates
CREATE TABLE IF NOT EXISTS public.pl_report_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pl_report_saved_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_pl_filters" ON public.pl_report_saved_filters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
