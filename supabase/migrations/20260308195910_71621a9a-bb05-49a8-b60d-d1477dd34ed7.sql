
-- Delivery Notes (ODLN equivalent in SAP B1)
CREATE TABLE public.delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num SERIAL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE,
  doc_due_date DATE,
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id UUID REFERENCES public.business_partners(id),
  contact_person TEXT,
  sales_employee_code INT,
  sales_rep_id UUID,
  -- Base document reference
  base_doc_type TEXT, -- 'sales_order', 'quote'
  base_doc_id UUID,
  base_doc_num INT,
  -- Addresses
  shipping_address TEXT,
  billing_address TEXT,
  ship_to_code TEXT,
  -- Logistics
  shipping_method TEXT,
  tracking_number TEXT,
  carrier_name TEXT,
  pick_date DATE,
  ship_date DATE,
  -- Financial
  currency TEXT DEFAULT 'SAR',
  doc_rate NUMERIC(15,6) DEFAULT 1,
  subtotal NUMERIC(15,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  -- Status
  status TEXT NOT NULL DEFAULT 'open',
  -- SAP sync
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  series INT,
  -- Metadata
  remarks TEXT,
  num_at_card TEXT,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delivery Note Lines (DLN1 equivalent)
CREATE TABLE public.delivery_note_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id UUID NOT NULL REFERENCES public.delivery_notes(id) ON DELETE CASCADE,
  line_num INT NOT NULL,
  item_code TEXT,
  item_id UUID REFERENCES public.items(id),
  description TEXT NOT NULL,
  quantity NUMERIC(15,4) NOT NULL DEFAULT 1,
  delivered_quantity NUMERIC(15,4) DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC(15,4) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  tax_code TEXT,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(15,2) DEFAULT 0,
  warehouse TEXT,
  -- Base document line reference
  base_doc_line_id UUID,
  base_doc_line_num INT,
  -- Dimensions
  dim_employee_id UUID REFERENCES public.dimensions(id),
  dim_branch_id UUID REFERENCES public.dimensions(id),
  dim_business_line_id UUID REFERENCES public.dimensions(id),
  dim_factory_id UUID REFERENCES public.dimensions(id),
  -- Batch/Serial
  batch_number TEXT,
  serial_number TEXT,
  cost_center TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view delivery notes"
  ON public.delivery_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert delivery notes"
  ON public.delivery_notes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update delivery notes"
  ON public.delivery_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete delivery notes"
  ON public.delivery_notes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view delivery note lines"
  ON public.delivery_note_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert delivery note lines"
  ON public.delivery_note_lines FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update delivery note lines"
  ON public.delivery_note_lines FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete delivery note lines"
  ON public.delivery_note_lines FOR DELETE TO authenticated USING (true);

-- Updated_at trigger
CREATE TRIGGER update_delivery_notes_updated_at
  BEFORE UPDATE ON public.delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_notes;
