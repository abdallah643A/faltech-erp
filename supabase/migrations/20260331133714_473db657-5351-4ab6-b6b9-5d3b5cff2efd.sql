
CREATE TABLE public.shipment_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL DEFAULT 'Other',
  cost_category TEXT NOT NULL DEFAULT 'Other',
  vendor_name TEXT,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  exchange_rate NUMERIC DEFAULT 1,
  amount_home_currency NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  paid BOOLEAN DEFAULT false,
  paid_date DATE,
  invoice_reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_shipment_costs_updated_at
  BEFORE UPDATE ON public.shipment_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shipment_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shipment_costs"
  ON public.shipment_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert shipment_costs"
  ON public.shipment_costs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update shipment_costs"
  ON public.shipment_costs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete shipment_costs"
  ON public.shipment_costs FOR DELETE TO authenticated USING (true);
