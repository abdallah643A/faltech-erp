
-- Journal Entries header
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num SERIAL,
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  doc_date DATE DEFAULT CURRENT_DATE,
  reference TEXT,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total_debit NUMERIC DEFAULT 0,
  total_credit NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  series INTEGER,
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Journal Entry lines
CREATE TABLE public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE NOT NULL,
  line_num INTEGER NOT NULL,
  acct_code TEXT NOT NULL,
  acct_name TEXT,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  bp_code TEXT,
  bp_name TEXT,
  cost_center TEXT,
  project_code TEXT,
  remarks TEXT,
  dim_branch_id UUID REFERENCES public.dimensions(id),
  dim_business_line_id UUID REFERENCES public.dimensions(id),
  dim_employee_id UUID REFERENCES public.dimensions(id),
  dim_factory_id UUID REFERENCES public.dimensions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial Periods
CREATE TABLE public.financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name TEXT NOT NULL,
  period_code TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  period_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  sub_periods JSONB DEFAULT '[]',
  locked_by UUID,
  locked_at TIMESTAMPTZ,
  closed_by UUID,
  closed_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fiscal_year, period_number, company_id)
);

-- Enable RLS
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;

-- RLS policies for journal_entries
CREATE POLICY "Authenticated users can view journal entries"
  ON public.journal_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert journal entries"
  ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update journal entries"
  ON public.journal_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete journal entries"
  ON public.journal_entries FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- RLS policies for journal_entry_lines
CREATE POLICY "Authenticated users can view JE lines"
  ON public.journal_entry_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert JE lines"
  ON public.journal_entry_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update JE lines"
  ON public.journal_entry_lines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete JE lines"
  ON public.journal_entry_lines FOR DELETE TO authenticated USING (true);

-- RLS policies for financial_periods
CREATE POLICY "Authenticated users can view financial periods"
  ON public.financial_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage financial periods"
  ON public.financial_periods FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Triggers
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_periods_updated_at
  BEFORE UPDATE ON public.financial_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
