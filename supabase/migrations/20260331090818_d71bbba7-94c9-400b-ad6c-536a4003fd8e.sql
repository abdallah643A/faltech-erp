
-- Retainers table
CREATE TABLE public.retainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT NOT NULL,
  customer_code TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','monthly','quarterly','yearly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_invoice_date DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','completed')),
  hours_included NUMERIC,
  hours_used NUMERIC DEFAULT 0,
  auto_send BOOLEAN DEFAULT false,
  send_channel TEXT DEFAULT 'email' CHECK (send_channel IN ('email','whatsapp','both')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Retainer invoices (track generated invoices)
CREATE TABLE public.retainer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retainer_id UUID REFERENCES public.retainers(id) ON DELETE CASCADE NOT NULL,
  ar_invoice_id UUID REFERENCES public.ar_invoices(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated','sent','paid','overdue','cancelled')),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client portal configuration
CREATE TABLE public.client_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  customer_id UUID REFERENCES public.business_partners(id) NOT NULL,
  customer_name TEXT NOT NULL,
  portal_slug TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  welcome_message TEXT,
  show_invoices BOOLEAN DEFAULT true,
  show_retainers BOOLEAN DEFAULT true,
  show_files BOOLEAN DEFAULT true,
  show_pay_button BOOLEAN DEFAULT true,
  custom_domain TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Portal access tokens (magic link sessions)
CREATE TABLE public.portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID REFERENCES public.client_portals(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.retainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retainer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage retainers" ON public.retainers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage retainer_invoices" ON public.retainer_invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage client_portals" ON public.client_portals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage portal_sessions" ON public.portal_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read for portal_sessions (for magic link validation)
CREATE POLICY "Public can read portal sessions by token" ON public.portal_sessions
  FOR SELECT TO anon USING (true);

CREATE POLICY "Public can read enabled portals by slug" ON public.client_portals
  FOR SELECT TO anon USING (is_enabled = true);

-- Update trigger
CREATE TRIGGER update_retainers_updated_at BEFORE UPDATE ON public.retainers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_portals_updated_at BEFORE UPDATE ON public.client_portals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
