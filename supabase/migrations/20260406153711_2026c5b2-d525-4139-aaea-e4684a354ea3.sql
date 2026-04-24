
-- Balance Sheet Report Configuration Tables

CREATE TABLE public.bs_report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  header_ar TEXT NOT NULL,
  header_en TEXT NOT NULL,
  section_type TEXT NOT NULL DEFAULT 'section',
  display_order INT NOT NULL DEFAULT 0,
  total_label_ar TEXT,
  total_label_en TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, section_key)
);

CREATE TABLE public.bs_report_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.bs_report_sections(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  line_order INT NOT NULL DEFAULT 0,
  label_ar TEXT NOT NULL,
  label_en TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bs_report_line_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.bs_report_lines(id) ON DELETE CASCADE,
  acct_from TEXT NOT NULL,
  acct_to TEXT,
  label_ar TEXT NOT NULL DEFAULT '',
  balance_rule TEXT NOT NULL DEFAULT 'all',
  is_deduction BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bs_report_grand_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  total_key TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  label_en TEXT NOT NULL,
  sum_section_keys TEXT[] NOT NULL DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, total_key)
);

-- RLS
ALTER TABLE public.bs_report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bs_report_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bs_report_line_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bs_report_grand_totals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bs_report_sections" ON public.bs_report_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage bs_report_lines" ON public.bs_report_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage bs_report_line_accounts" ON public.bs_report_line_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage bs_report_grand_totals" ON public.bs_report_grand_totals FOR ALL TO authenticated USING (true) WITH CHECK (true);
