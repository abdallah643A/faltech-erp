
CREATE TABLE public.cpms_invoice_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.cpms_invoices(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  collection_number TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'bank_transfer',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  bank_name TEXT,
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cpms_invoice_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage invoice collections"
  ON public.cpms_invoice_collections FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_cpms_invoice_collections_invoice ON public.cpms_invoice_collections(invoice_id);
CREATE INDEX idx_cpms_invoice_collections_project ON public.cpms_invoice_collections(project_id);
