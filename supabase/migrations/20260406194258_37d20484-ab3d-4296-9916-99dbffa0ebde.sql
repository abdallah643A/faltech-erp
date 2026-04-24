
-- Unified supplier portal accounts (vendors + subcontractors)
CREATE TABLE IF NOT EXISTS public.supplier_portal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  vendor_id UUID REFERENCES public.business_partners(id),
  subcontractor_id UUID REFERENCES public.cpms_subcontractors(id),
  portal_role TEXT NOT NULL DEFAULT 'vendor' CHECK (portal_role IN ('vendor', 'subcontractor', 'both')),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"view_rfqs":true,"submit_quotes":true,"view_pos":true,"ack_pos":true,"submit_invoices":true,"view_payments":true,"upload_documents":true}'::jsonb,
  last_login_at TIMESTAMPTZ,
  login_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Interaction audit log
CREATE TABLE IF NOT EXISTS public.supplier_portal_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  portal_account_id UUID REFERENCES public.supplier_portal_accounts(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- login, rfq_view, quote_submit, po_ack, invoice_submit, document_upload, payment_inquiry, etc
  entity_type TEXT, -- rfq, purchase_order, invoice, document, etc
  entity_id UUID,
  entity_reference TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Communication threads
CREATE TABLE IF NOT EXISTS public.supplier_portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  portal_account_id UUID REFERENCES public.supplier_portal_accounts(id),
  thread_key TEXT NOT NULL, -- e.g. "po:uuid" or "invoice:uuid" or "rfq:uuid"
  sender_type TEXT NOT NULL CHECK (sender_type IN ('internal', 'supplier')),
  sender_name TEXT,
  sender_user_id UUID,
  message TEXT NOT NULL,
  attachments JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reminder engine
CREATE TABLE IF NOT EXISTS public.supplier_portal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  portal_account_id UUID REFERENCES public.supplier_portal_accounts(id),
  reminder_type TEXT NOT NULL, -- document_expiry, po_confirmation, invoice_dispute, rfq_deadline, compliance_renewal
  entity_type TEXT,
  entity_id UUID,
  entity_reference TEXT,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'resolved', 'expired')),
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Portal document tracking
CREATE TABLE IF NOT EXISTS public.supplier_portal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  portal_account_id UUID REFERENCES public.supplier_portal_accounts(id),
  vendor_id UUID REFERENCES public.business_partners(id),
  document_type TEXT NOT NULL, -- trade_license, insurance, iso_cert, tax_cert, bank_guarantee, safety_cert
  document_name TEXT NOT NULL,
  file_url TEXT,
  file_size INT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'expired', 'expiring_soon')),
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed', 'not_applicable')),
  ocr_extracted_data JSONB,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  version INT DEFAULT 1,
  previous_version_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RFQ responses from suppliers
CREATE TABLE IF NOT EXISTS public.supplier_rfq_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  portal_account_id UUID REFERENCES public.supplier_portal_accounts(id),
  rfq_id UUID,
  rfq_number TEXT,
  vendor_id UUID REFERENCES public.business_partners(id),
  vendor_name TEXT,
  total_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  delivery_days INT,
  payment_terms TEXT,
  validity_days INT DEFAULT 30,
  notes TEXT,
  line_items JSONB, -- [{item_code, description, qty, unit_price, total}]
  attachments JSONB,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'expired')),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PO acknowledgements
CREATE TABLE IF NOT EXISTS public.supplier_po_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  portal_account_id UUID REFERENCES public.supplier_portal_accounts(id),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  po_number TEXT,
  vendor_id UUID REFERENCES public.business_partners(id),
  acknowledgement_status TEXT DEFAULT 'pending' CHECK (acknowledgement_status IN ('pending', 'acknowledged', 'rejected', 'partially_accepted')),
  confirmed_delivery_date DATE,
  original_delivery_date DATE,
  rejection_reason TEXT,
  notes TEXT,
  delivery_schedule JSONB, -- [{line_num, item, qty, delivery_date}]
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice submissions from portal
CREATE TABLE IF NOT EXISTS public.supplier_invoice_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  portal_account_id UUID REFERENCES public.supplier_portal_accounts(id),
  vendor_id UUID REFERENCES public.business_partners(id),
  vendor_name TEXT,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  po_number TEXT,
  total_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  line_items JSONB,
  attachments JSONB,
  matching_status TEXT DEFAULT 'pending' CHECK (matching_status IN ('pending', 'matched', 'partial_match', 'mismatch', 'disputed')),
  approval_status TEXT DEFAULT 'submitted' CHECK (approval_status IN ('submitted', 'under_review', 'approved', 'rejected', 'paid')),
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  payment_date DATE,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_portal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_portal_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_portal_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_portal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_rfq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_po_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoice_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "auth_select_supplier_portal_accounts" ON public.supplier_portal_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_supplier_portal_accounts" ON public.supplier_portal_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_supplier_portal_accounts" ON public.supplier_portal_accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_supplier_portal_accounts" ON public.supplier_portal_accounts FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_select_supplier_portal_interactions" ON public.supplier_portal_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_supplier_portal_interactions" ON public.supplier_portal_interactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_all_supplier_portal_messages" ON public.supplier_portal_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_supplier_portal_reminders" ON public.supplier_portal_reminders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_supplier_portal_documents" ON public.supplier_portal_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_supplier_rfq_responses" ON public.supplier_rfq_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_supplier_po_acknowledgements" ON public.supplier_po_acknowledgements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_supplier_invoice_submissions" ON public.supplier_invoice_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon policies for portal login flow
CREATE POLICY "anon_select_supplier_portal_accounts" ON public.supplier_portal_accounts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_supplier_portal_accounts" ON public.supplier_portal_accounts FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_insert_supplier_portal_interactions" ON public.supplier_portal_interactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_supplier_portal_messages" ON public.supplier_portal_messages FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_supplier_portal_messages" ON public.supplier_portal_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_supplier_portal_reminders" ON public.supplier_portal_reminders FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_supplier_portal_reminders" ON public.supplier_portal_reminders FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_select_supplier_portal_documents" ON public.supplier_portal_documents FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_supplier_portal_documents" ON public.supplier_portal_documents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_supplier_rfq_responses" ON public.supplier_rfq_responses FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_supplier_rfq_responses" ON public.supplier_rfq_responses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_supplier_rfq_responses" ON public.supplier_rfq_responses FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_select_supplier_po_acknowledgements" ON public.supplier_po_acknowledgements FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_supplier_po_acknowledgements" ON public.supplier_po_acknowledgements FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_supplier_po_acknowledgements" ON public.supplier_po_acknowledgements FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_select_supplier_invoice_submissions" ON public.supplier_invoice_submissions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_supplier_invoice_submissions" ON public.supplier_invoice_submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_supplier_invoice_submissions" ON public.supplier_invoice_submissions FOR UPDATE TO anon USING (true);

-- Indexes
CREATE INDEX idx_supplier_portal_accounts_email ON public.supplier_portal_accounts(email);
CREATE INDEX idx_supplier_portal_accounts_vendor ON public.supplier_portal_accounts(vendor_id);
CREATE INDEX idx_supplier_portal_interactions_account ON public.supplier_portal_interactions(portal_account_id);
CREATE INDEX idx_supplier_portal_interactions_type ON public.supplier_portal_interactions(interaction_type);
CREATE INDEX idx_supplier_portal_messages_thread ON public.supplier_portal_messages(thread_key);
CREATE INDEX idx_supplier_portal_documents_expiry ON public.supplier_portal_documents(expiry_date);
CREATE INDEX idx_supplier_portal_documents_vendor ON public.supplier_portal_documents(vendor_id);
CREATE INDEX idx_supplier_rfq_responses_rfq ON public.supplier_rfq_responses(rfq_id);
CREATE INDEX idx_supplier_po_ack_po ON public.supplier_po_acknowledgements(purchase_order_id);
CREATE INDEX idx_supplier_invoice_sub_vendor ON public.supplier_invoice_submissions(vendor_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_supplier_portal_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_supplier_portal_accounts_updated BEFORE UPDATE ON public.supplier_portal_accounts FOR EACH ROW EXECUTE FUNCTION public.update_supplier_portal_updated_at();
CREATE TRIGGER trg_supplier_portal_documents_updated BEFORE UPDATE ON public.supplier_portal_documents FOR EACH ROW EXECUTE FUNCTION public.update_supplier_portal_updated_at();
CREATE TRIGGER trg_supplier_rfq_responses_updated BEFORE UPDATE ON public.supplier_rfq_responses FOR EACH ROW EXECUTE FUNCTION public.update_supplier_portal_updated_at();
CREATE TRIGGER trg_supplier_po_ack_updated BEFORE UPDATE ON public.supplier_po_acknowledgements FOR EACH ROW EXECUTE FUNCTION public.update_supplier_portal_updated_at();
CREATE TRIGGER trg_supplier_invoice_sub_updated BEFORE UPDATE ON public.supplier_invoice_submissions FOR EACH ROW EXECUTE FUNCTION public.update_supplier_portal_updated_at();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_portal_messages;
