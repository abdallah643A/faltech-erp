CREATE TABLE IF NOT EXISTS public.sales_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,

  rep_user_id UUID NOT NULL,
  rep_name TEXT,

  business_partner_id UUID REFERENCES public.business_partners(id) ON DELETE SET NULL,
  customer_code TEXT,
  customer_name TEXT,
  contact_name TEXT,

  visit_purpose TEXT NOT NULL DEFAULT 'Sales Call',
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,

  check_in_at TIMESTAMPTZ,
  check_in_lat NUMERIC(10, 7),
  check_in_lng NUMERIC(10, 7),
  check_in_accuracy NUMERIC,
  check_in_address TEXT,

  check_out_at TIMESTAMPTZ,
  check_out_lat NUMERIC(10, 7),
  check_out_lng NUMERIC(10, 7),
  duration_minutes INTEGER,

  outcome TEXT,
  next_action TEXT,
  next_action_date DATE,
  notes TEXT,

  related_opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  related_lead_id UUID,
  related_quotation_id UUID,

  status TEXT NOT NULL DEFAULT 'Planned',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_sales_visits_rep_date ON public.sales_visits(rep_user_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_visits_partner ON public.sales_visits(business_partner_id);
CREATE INDEX IF NOT EXISTS idx_sales_visits_company ON public.sales_visits(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_visits_status ON public.sales_visits(status);

ALTER TABLE public.sales_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps can view own visits"
  ON public.sales_visits FOR SELECT
  USING (
    rep_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Reps can create own visits"
  ON public.sales_visits FOR INSERT
  WITH CHECK (rep_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Reps can update own visits"
  ON public.sales_visits FOR UPDATE
  USING (rep_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins/managers can delete visits"
  ON public.sales_visits FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER update_sales_visits_updated_at
  BEFORE UPDATE ON public.sales_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sales_visits_compute_duration()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.check_in_at IS NOT NULL AND NEW.check_out_at IS NOT NULL THEN
    NEW.duration_minutes := GREATEST(0, EXTRACT(EPOCH FROM (NEW.check_out_at - NEW.check_in_at))::INTEGER / 60);
    IF NEW.status = 'In Progress' OR NEW.status = 'Planned' THEN
      NEW.status := 'Completed';
    END IF;
  ELSIF NEW.check_in_at IS NOT NULL AND NEW.check_out_at IS NULL AND NEW.status = 'Planned' THEN
    NEW.status := 'In Progress';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_visits_compute_duration_trg
  BEFORE INSERT OR UPDATE ON public.sales_visits
  FOR EACH ROW EXECUTE FUNCTION public.sales_visits_compute_duration();