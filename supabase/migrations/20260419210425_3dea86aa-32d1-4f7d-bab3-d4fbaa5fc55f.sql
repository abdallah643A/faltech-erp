
-- Fiscal calendars (templates)
CREATE TABLE IF NOT EXISTS public.org_fiscal_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_code TEXT REFERENCES public.org_countries(code),
  start_month INTEGER NOT NULL DEFAULT 1 CHECK (start_month BETWEEN 1 AND 12),
  period_count INTEGER NOT NULL DEFAULT 12 CHECK (period_count IN (12, 13)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_fiscal_calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read fiscal cals" ON public.org_fiscal_calendars FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage fiscal cals" ON public.org_fiscal_calendars FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Posting calendar periods (per fiscal year)
CREATE TABLE IF NOT EXISTS public.org_posting_calendar_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.org_fiscal_calendars(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  period_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','soft_close','closed','locked')),
  holidays JSONB NOT NULL DEFAULT '[]'::jsonb,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (calendar_id, fiscal_year, period_number)
);
CREATE INDEX IF NOT EXISTS idx_posting_periods_company_year ON public.org_posting_calendar_periods (company_id, fiscal_year);
ALTER TABLE public.org_posting_calendar_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read posting periods" ON public.org_posting_calendar_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage posting periods" ON public.org_posting_calendar_periods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Implementation checklist
CREATE TABLE IF NOT EXISTS public.org_implementation_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  task TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  owner_name TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','blocked')),
  blocks_go_live BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_implementation_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read checklist" ON public.org_implementation_checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage checklist" ON public.org_implementation_checklists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Setup wizard state
CREATE TABLE IF NOT EXISTS public.org_setup_wizard_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, step_key)
);
ALTER TABLE public.org_setup_wizard_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read wizard state" ON public.org_setup_wizard_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage wizard state" ON public.org_setup_wizard_state FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Triggers
DROP TRIGGER IF EXISTS trg_fiscal_cals_updated ON public.org_fiscal_calendars;
CREATE TRIGGER trg_fiscal_cals_updated BEFORE UPDATE ON public.org_fiscal_calendars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_posting_periods_updated ON public.org_posting_calendar_periods;
CREATE TRIGGER trg_posting_periods_updated BEFORE UPDATE ON public.org_posting_calendar_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_checklist_updated ON public.org_implementation_checklists;
CREATE TRIGGER trg_checklist_updated BEFORE UPDATE ON public.org_implementation_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: generate periods for a calendar/fiscal year
CREATE OR REPLACE FUNCTION public.generate_posting_periods(
  p_calendar_id UUID,
  p_company_id UUID,
  p_fiscal_year INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_start_month INTEGER;
  v_period_count INTEGER;
  v_period_start DATE;
  v_period_end DATE;
  v_inserted INTEGER := 0;
  i INTEGER;
BEGIN
  SELECT start_month, period_count INTO v_start_month, v_period_count
  FROM public.org_fiscal_calendars WHERE id = p_calendar_id;
  IF v_start_month IS NULL THEN RAISE EXCEPTION 'Calendar not found'; END IF;

  FOR i IN 1..v_period_count LOOP
    v_period_start := make_date(p_fiscal_year, v_start_month, 1) + ((i - 1) || ' months')::interval;
    v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::date;
    INSERT INTO public.org_posting_calendar_periods (calendar_id, company_id, fiscal_year, period_number, name, start_date, end_date, status)
    VALUES (p_calendar_id, p_company_id, p_fiscal_year, i, to_char(v_period_start, 'Mon YYYY'), v_period_start::date, v_period_end, 'open')
    ON CONFLICT (calendar_id, fiscal_year, period_number) DO NOTHING;
    GET DIAGNOSTICS i = ROW_COUNT;
    v_inserted := v_inserted + 1;
  END LOOP;
  RETURN v_inserted;
END;
$$;
