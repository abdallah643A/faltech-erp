
-- Add mirror reference to intercompany_transactions
ALTER TABLE public.intercompany_transactions 
ADD COLUMN IF NOT EXISTS mirror_of_id UUID REFERENCES public.intercompany_transactions(id);

-- Create intercompany alerts table
CREATE TABLE IF NOT EXISTS public.intercompany_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.intercompany_transactions(id) ON DELETE CASCADE,
  target_company_id UUID REFERENCES public.sap_companies(id),
  alert_type TEXT NOT NULL DEFAULT 'incoming_transaction',
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  acted_on BOOLEAN NOT NULL DEFAULT false,
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intercompany_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view intercompany alerts"
ON public.intercompany_alerts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert intercompany alerts"
ON public.intercompany_alerts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update intercompany alerts"
ON public.intercompany_alerts FOR UPDATE TO authenticated USING (true);
