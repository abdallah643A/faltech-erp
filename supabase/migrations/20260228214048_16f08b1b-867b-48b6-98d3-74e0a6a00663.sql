
-- ============================================
-- QUOTES: Add SAP sync and missing SAP B1 fields
-- ============================================
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS sap_doc_entry TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS doc_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS sales_employee_code INTEGER;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS num_at_card TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS posting_date DATE;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS sales_rep_id UUID;

-- Quote lines: add missing SAP fields
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS tax_code TEXT;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS warehouse TEXT;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS unit TEXT;

-- ============================================
-- SALES ORDERS: Add missing SAP B1 fields
-- ============================================
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS sales_employee_code INTEGER;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS num_at_card TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS posting_date DATE;

-- Sales order lines: add unit field
ALTER TABLE public.sales_order_lines ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.sales_order_lines ADD COLUMN IF NOT EXISTS cost_center TEXT;

-- ============================================
-- AR INVOICES: Add missing SAP B1 fields
-- ============================================
ALTER TABLE public.ar_invoices ADD COLUMN IF NOT EXISTS sales_employee_code INTEGER;
ALTER TABLE public.ar_invoices ADD COLUMN IF NOT EXISTS posting_date DATE;

-- AR invoice lines: add unit field
ALTER TABLE public.ar_invoice_lines ADD COLUMN IF NOT EXISTS unit TEXT;

-- ============================================
-- INCOMING PAYMENTS: Add missing SAP B1 fields
-- ============================================
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS sales_employee_code INTEGER;
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS transfer_reference TEXT;
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS transfer_date DATE;
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS transfer_account TEXT;
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS cash_account TEXT;
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS cash_sum NUMERIC DEFAULT 0;
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS check_sum NUMERIC DEFAULT 0;
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS transfer_sum NUMERIC DEFAULT 0;
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS num_at_card TEXT;

-- Incoming payment invoices (line-level link to invoices)
CREATE TABLE IF NOT EXISTS public.incoming_payment_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.incoming_payments(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.ar_invoices(id),
  doc_entry TEXT,
  invoice_type TEXT DEFAULT 'it_Invoice',
  sum_applied NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incoming_payment_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payment invoices"
  ON public.incoming_payment_invoices FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert payment invoices"
  ON public.incoming_payment_invoices FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update payment invoices"
  ON public.incoming_payment_invoices FOR UPDATE
  TO authenticated USING (true);
