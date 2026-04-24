
CREATE TABLE public.outgoing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num SERIAL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE DEFAULT CURRENT_DATE,
  due_date DATE DEFAULT CURRENT_DATE,
  pay_to_type TEXT NOT NULL DEFAULT 'vendor' CHECK (pay_to_type IN ('vendor', 'customer', 'account')),
  vendor_code TEXT,
  vendor_name TEXT,
  vendor_id UUID REFERENCES public.business_partners(id),
  customer_code TEXT,
  customer_name TEXT,
  customer_id UUID REFERENCES public.business_partners(id),
  account_code TEXT,
  contact_person TEXT,
  project TEXT,
  blanket_agreement TEXT,
  payment_type TEXT DEFAULT 'bank_transfer',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_on_account NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  reference TEXT,
  transaction_no TEXT,
  remarks TEXT,
  journal_remarks TEXT,
  check_number TEXT,
  check_date DATE,
  bank_code TEXT,
  bank_account TEXT,
  credit_card_type TEXT,
  credit_card_number TEXT,
  cash_account TEXT,
  transfer_account TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled', 'closed')),
  open_balance NUMERIC DEFAULT 0,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.outgoing_payment_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.outgoing_payments(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'ap_invoice',
  document_id UUID,
  document_number TEXT,
  installment INTEGER DEFAULT 1,
  doc_date DATE,
  overdue_days INTEGER DEFAULT 0,
  total NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  amount_applied NUMERIC DEFAULT 0,
  selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outgoing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outgoing_payment_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage outgoing payments" ON public.outgoing_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can manage outgoing payment invoices" ON public.outgoing_payment_invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
