-- Create sequence for doc_num FIRST
CREATE SEQUENCE IF NOT EXISTS ar_invoices_doc_num_seq START WITH 1001;

-- Create A/R Invoices table with SAP B1 compatible fields
CREATE TABLE public.ar_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_num INTEGER NOT NULL DEFAULT nextval('ar_invoices_doc_num_seq'::regclass),
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  doc_due_date DATE,
  customer_id UUID REFERENCES public.business_partners(id),
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  contact_person TEXT,
  num_at_card TEXT,
  currency TEXT DEFAULT 'SAR',
  doc_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_terms TEXT,
  sales_rep_id UUID,
  billing_address TEXT,
  shipping_address TEXT,
  shipping_method TEXT,
  remarks TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  sap_doc_entry TEXT,
  sync_status sync_status DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create A/R Invoice Lines table
CREATE TABLE public.ar_invoice_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.ar_invoices(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_id UUID REFERENCES public.items(id),
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  tax_code TEXT,
  tax_percent NUMERIC DEFAULT 15,
  line_total NUMERIC NOT NULL DEFAULT 0,
  warehouse TEXT,
  cost_center TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ar_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_invoice_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ar_invoices
CREATE POLICY "Users can view their own invoices or all if manager/admin"
ON public.ar_invoices FOR SELECT
USING (
  (sales_rep_id = auth.uid()) OR 
  (created_by = auth.uid()) OR 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Sales reps and above can create invoices"
ON public.ar_invoices FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales_rep'::app_role]));

CREATE POLICY "Users can update their own invoices or all if manager/admin"
ON public.ar_invoices FOR UPDATE
USING (
  (sales_rep_id = auth.uid()) OR 
  (created_by = auth.uid()) OR 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Only admins can delete invoices"
ON public.ar_invoices FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ar_invoice_lines
CREATE POLICY "Users can view invoice lines for accessible invoices"
ON public.ar_invoice_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ar_invoices inv
    WHERE inv.id = ar_invoice_lines.invoice_id
    AND (
      (inv.sales_rep_id = auth.uid()) OR 
      (inv.created_by = auth.uid()) OR 
      has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
    )
  )
);

CREATE POLICY "Users can manage invoice lines for accessible invoices"
ON public.ar_invoice_lines FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.ar_invoices inv
    WHERE inv.id = ar_invoice_lines.invoice_id
    AND (
      (inv.sales_rep_id = auth.uid()) OR 
      (inv.created_by = auth.uid()) OR 
      has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
    )
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_ar_invoices_updated_at
BEFORE UPDATE ON public.ar_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();