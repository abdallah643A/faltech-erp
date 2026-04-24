
-- Public holidays configuration table
CREATE TABLE public.public_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  name_ar TEXT,
  holiday_date DATE NOT NULL,
  year INTEGER NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view public holidays" ON public.public_holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage public holidays" ON public.public_holidays FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document expiry alerts table
CREATE TABLE public.document_expiry_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.employee_documents(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  days_before INTEGER NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'warning',
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  notified_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_expiry_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view document expiry alerts" ON public.document_expiry_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage document expiry alerts" ON public.document_expiry_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
