
-- AP Invoices (Accounts Payable)
CREATE TABLE public.ap_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  doc_due_date DATE,
  posting_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  vendor_code TEXT,
  vendor_name TEXT NOT NULL,
  vendor_id UUID REFERENCES public.business_partners(id),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  goods_receipt_id UUID REFERENCES public.goods_receipts(id),
  project_id UUID REFERENCES public.projects(id),
  branch_id UUID REFERENCES public.branches(id),
  contact_person TEXT,
  currency TEXT DEFAULT 'SAR',
  subtotal NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_terms TEXT,
  remarks TEXT,
  sap_doc_entry TEXT,
  sync_status TEXT,
  last_synced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ap_invoice_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ap_invoice_id UUID NOT NULL REFERENCES public.ap_invoices(id) ON DELETE CASCADE,
  line_num INT NOT NULL,
  item_code TEXT,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'EA',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  tax_code TEXT,
  tax_percent NUMERIC DEFAULT 15,
  warehouse TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ap_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_invoice_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view AP invoices" ON public.ap_invoices FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert AP invoices" ON public.ap_invoices FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update AP invoices" ON public.ap_invoices FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete AP invoices" ON public.ap_invoices FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view AP invoice lines" ON public.ap_invoice_lines FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert AP invoice lines" ON public.ap_invoice_lines FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update AP invoice lines" ON public.ap_invoice_lines FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete AP invoice lines" ON public.ap_invoice_lines FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_ap_invoices_updated_at BEFORE UPDATE ON public.ap_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
