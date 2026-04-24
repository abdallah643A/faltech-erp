
CREATE TABLE public.cpms_cash_flow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'cash_in',
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  forecast_month DATE NOT NULL,
  forecast_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  variance NUMERIC GENERATED ALWAYS AS (actual_amount - forecast_amount) STORED,
  confidence TEXT DEFAULT 'medium',
  source_ref TEXT,
  source_id UUID,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_months INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cpms_cash_flow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage cash flow entries" ON public.cpms_cash_flow_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_cpms_cash_flow_entries_updated_at
  BEFORE UPDATE ON public.cpms_cash_flow_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cash_flow_project_month ON public.cpms_cash_flow_entries(project_id, forecast_month);
