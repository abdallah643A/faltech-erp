-- Add missing columns to cpms_subcontractors
ALTER TABLE public.cpms_subcontractors
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create subcontractor invoices table with lien waiver tracking
CREATE TABLE IF NOT EXISTS public.cpms_subcontractor_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcontract_order_id UUID NOT NULL REFERENCES public.cpms_subcontract_orders(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES public.cpms_subcontractors(id),
  project_id UUID REFERENCES public.cpms_projects(id),
  company_id UUID REFERENCES public.sap_companies(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  retention_held NUMERIC NOT NULL DEFAULT 0,
  amount_to_pay NUMERIC NOT NULL DEFAULT 0,
  paid BOOLEAN DEFAULT false,
  paid_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  lien_waiver_type TEXT DEFAULT 'none',
  lien_waiver_received BOOLEAN DEFAULT false,
  lien_waiver_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cpms_subcontractor_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view subcontractor invoices"
  ON public.cpms_subcontractor_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert subcontractor invoices"
  ON public.cpms_subcontractor_invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update subcontractor invoices"
  ON public.cpms_subcontractor_invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete subcontractor invoices"
  ON public.cpms_subcontractor_invoices FOR DELETE TO authenticated USING (true);

CREATE SEQUENCE IF NOT EXISTS cpms_sub_order_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_cpms_sub_order_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'SUB-' || LPAD(nextval('cpms_sub_order_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cpms_sub_order_number ON public.cpms_subcontract_orders;
CREATE TRIGGER trg_cpms_sub_order_number
  BEFORE INSERT ON public.cpms_subcontract_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_cpms_sub_order_number();

DO $$
DECLARE max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::INTEGER), 0)
  INTO max_num FROM public.cpms_subcontract_orders;
  IF max_num > 0 THEN PERFORM setval('cpms_sub_order_number_seq', max_num); END IF;
END $$;

CREATE TRIGGER update_cpms_subcontractor_invoices_updated_at
  BEFORE UPDATE ON public.cpms_subcontractor_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();