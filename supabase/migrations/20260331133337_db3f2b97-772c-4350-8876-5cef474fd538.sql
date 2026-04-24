
-- Shipment number sequence
CREATE SEQUENCE IF NOT EXISTS shipment_number_seq START 1;

-- Shipments table
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number TEXT NOT NULL,
  shipment_type TEXT NOT NULL DEFAULT 'Ocean FCL',
  container_number TEXT,
  container_type TEXT DEFAULT 'N/A',
  seal_number TEXT,
  bill_of_lading TEXT,
  vessel_name TEXT,
  voyage_number TEXT,
  carrier TEXT,
  freight_forwarder TEXT,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  sales_order_id UUID REFERENCES public.sales_orders(id),
  incoterm TEXT,
  shipper_name TEXT,
  shipper_address TEXT,
  consignee_name TEXT,
  consignee_address TEXT,
  notify_party TEXT,
  port_of_loading TEXT,
  port_of_discharge TEXT,
  place_of_delivery TEXT,
  etd DATE,
  atd DATE,
  eta DATE,
  ata DATE,
  cargo_weight_kg NUMERIC DEFAULT 0,
  cargo_volume_cbm NUMERIC DEFAULT 0,
  cargo_value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Booking',
  tracking_url TEXT,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generate shipment number
CREATE OR REPLACE FUNCTION public.generate_shipment_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.shipment_number IS NULL OR NEW.shipment_number = '' THEN
    NEW.shipment_number := 'SH-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('shipment_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_shipment_number
  BEFORE INSERT ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_shipment_number();

-- Updated_at trigger
CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shipments"
  ON public.shipments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert shipments"
  ON public.shipments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update shipments"
  ON public.shipments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete shipments"
  ON public.shipments FOR DELETE TO authenticated USING (true);

-- Shipment activity log
CREATE TABLE public.shipment_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'status_change',
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shipment activities"
  ON public.shipment_activities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert shipment activities"
  ON public.shipment_activities FOR INSERT TO authenticated WITH CHECK (true);
