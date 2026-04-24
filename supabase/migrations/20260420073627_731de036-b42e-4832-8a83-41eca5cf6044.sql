
-- ============================================================================
-- PHASE 1: PRICING & AGREEMENTS
-- ============================================================================

CREATE TABLE public.sales_blanket_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  agreement_number TEXT NOT NULL,
  customer_id UUID,
  customer_code TEXT,
  customer_name TEXT,
  agreement_type TEXT NOT NULL DEFAULT 'general',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  total_committed_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_drawn_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_terms TEXT,
  delivery_terms TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_blanket_agreement_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id UUID NOT NULL REFERENCES public.sales_blanket_agreements(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  item_description TEXT,
  committed_quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  drawn_quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_discount_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  rule_name TEXT NOT NULL,
  customer_id UUID,
  customer_group TEXT,
  item_code TEXT,
  item_group TEXT,
  min_quantity NUMERIC(18,4) DEFAULT 0,
  max_quantity NUMERIC(18,4),
  discount_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_customer_price_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  price_book_name TEXT NOT NULL,
  customer_id UUID,
  customer_code TEXT,
  currency TEXT NOT NULL DEFAULT 'SAR',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_price_book_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_book_id UUID NOT NULL REFERENCES public.sales_customer_price_books(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_description TEXT,
  unit TEXT,
  unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  min_quantity NUMERIC(18,4) DEFAULT 0,
  discount_percent NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 2: CREDIT MANAGEMENT
-- ============================================================================

CREATE TABLE public.ar_credit_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  customer_id UUID NOT NULL,
  customer_code TEXT,
  customer_name TEXT,
  credit_limit NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_exposure NUMERIC(18,2) NOT NULL DEFAULT 0,
  available_credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_score INTEGER DEFAULT 0,
  risk_category TEXT NOT NULL DEFAULT 'medium',
  on_hold BOOLEAN NOT NULL DEFAULT false,
  hold_reason TEXT,
  payment_terms TEXT DEFAULT 'NET30',
  insurance_provider TEXT,
  insurance_amount NUMERIC(18,2),
  last_review_date DATE,
  next_review_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, customer_id)
);

CREATE TABLE public.ar_credit_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  customer_id UUID NOT NULL,
  sales_order_id UUID,
  check_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  requested_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_limit NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_exposure NUMERIC(18,2) NOT NULL DEFAULT 0,
  decision TEXT NOT NULL DEFAULT 'approved',
  decision_reason TEXT,
  override_by UUID,
  override_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 3: COLLECTIONS & DUNNING
-- ============================================================================

CREATE TABLE public.ar_dunning_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  policy_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  language TEXT NOT NULL DEFAULT 'en',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ar_dunning_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  policy_id UUID REFERENCES public.ar_dunning_policies(id),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  total_invoices INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  letters_generated INTEGER NOT NULL DEFAULT 0,
  letters_sent INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE public.ar_dunning_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dunning_run_id UUID REFERENCES public.ar_dunning_runs(id) ON DELETE CASCADE,
  company_id UUID,
  customer_id UUID NOT NULL,
  customer_name TEXT,
  invoice_id UUID,
  invoice_number TEXT,
  stage INTEGER NOT NULL DEFAULT 1,
  stage_name TEXT,
  amount_overdue NUMERIC(18,2) NOT NULL DEFAULT 0,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  letter_content TEXT,
  language TEXT DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  sent_to_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ar_collection_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  case_number TEXT NOT NULL,
  customer_id UUID NOT NULL,
  customer_name TEXT,
  total_overdue NUMERIC(18,2) NOT NULL DEFAULT 0,
  oldest_invoice_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID,
  assigned_to_name TEXT,
  promise_to_pay_date DATE,
  promise_to_pay_amount NUMERIC(18,2),
  resolution_notes TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ar_collection_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.ar_collection_cases(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_person TEXT,
  outcome TEXT,
  notes TEXT,
  next_action TEXT,
  next_action_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 4: DISPUTES & REVENUE RECOGNITION
-- ============================================================================

CREATE TABLE public.ar_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  dispute_number TEXT NOT NULL,
  invoice_id UUID,
  invoice_number TEXT,
  customer_id UUID NOT NULL,
  customer_name TEXT,
  dispute_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  dispute_reason TEXT NOT NULL,
  dispute_category TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  raised_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_resolution_date DATE,
  blocks_dunning BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ar_dispute_resolutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_id UUID NOT NULL REFERENCES public.ar_disputes(id) ON DELETE CASCADE,
  resolution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resolution_type TEXT NOT NULL,
  approved_amount NUMERIC(18,2) DEFAULT 0,
  credit_memo_id UUID,
  notes TEXT,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ar_revenue_recognition_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  invoice_id UUID,
  invoice_number TEXT,
  invoice_line_id UUID,
  customer_id UUID,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  recognized_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  deferred_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  recognition_method TEXT NOT NULL DEFAULT 'straight_line',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  schedule_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 5: TAX & INTERNATIONAL TRADE
-- ============================================================================

CREATE TABLE public.sales_tax_determination_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  rule_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  region_code TEXT,
  tax_type TEXT NOT NULL DEFAULT 'VAT',
  tax_code TEXT NOT NULL,
  tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  customer_type TEXT,
  item_category TEXT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_incoterms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  transport_mode TEXT,
  seller_responsibility TEXT,
  buyer_responsibility TEXT,
  risk_transfer_point TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_export_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  doc_number TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  related_doc_type TEXT,
  related_doc_id UUID,
  related_doc_number TEXT,
  customer_id UUID,
  customer_name TEXT,
  destination_country TEXT,
  port_of_loading TEXT,
  port_of_discharge TEXT,
  vessel_name TEXT,
  bill_of_lading_number TEXT,
  incoterm_code TEXT,
  hs_codes JSONB DEFAULT '[]'::jsonb,
  total_packages INTEGER DEFAULT 0,
  total_gross_weight NUMERIC(12,3),
  total_net_weight NUMERIC(12,3),
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 6: CUSTOMER PORTAL SHARING
-- ============================================================================

CREATE TABLE public.customer_portal_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  customer_id UUID,
  customer_email TEXT,
  doc_type TEXT NOT NULL,
  doc_id UUID,
  doc_number TEXT,
  expires_at TIMESTAMPTZ,
  password_hash TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_sba_company ON public.sales_blanket_agreements(company_id);
CREATE INDEX idx_sba_customer ON public.sales_blanket_agreements(customer_id);
CREATE INDEX idx_sba_lines_agreement ON public.sales_blanket_agreement_lines(agreement_id);
CREATE INDEX idx_sdm_company ON public.sales_discount_matrix(company_id);
CREATE INDEX idx_sdm_customer ON public.sales_discount_matrix(customer_id);
CREATE INDEX idx_scpb_customer ON public.sales_customer_price_books(customer_id);
CREATE INDEX idx_spbi_book ON public.sales_price_book_items(price_book_id);
CREATE INDEX idx_acp_customer ON public.ar_credit_profiles(customer_id);
CREATE INDEX idx_acc_customer ON public.ar_credit_checks(customer_id);
CREATE INDEX idx_adr_company ON public.ar_dunning_runs(company_id);
CREATE INDEX idx_adl_run ON public.ar_dunning_letters(dunning_run_id);
CREATE INDEX idx_adl_customer ON public.ar_dunning_letters(customer_id);
CREATE INDEX idx_acase_customer ON public.ar_collection_cases(customer_id);
CREATE INDEX idx_aca_case ON public.ar_collection_activities(case_id);
CREATE INDEX idx_adisp_invoice ON public.ar_disputes(invoice_id);
CREATE INDEX idx_arrs_invoice ON public.ar_revenue_recognition_schedules(invoice_id);
CREATE INDEX idx_stdr_country ON public.sales_tax_determination_rules(country_code);
CREATE INDEX idx_sed_related ON public.sales_export_docs(related_doc_type, related_doc_id);
CREATE INDEX idx_cps_token ON public.customer_portal_shares(share_token);
CREATE INDEX idx_cps_doc ON public.customer_portal_shares(doc_type, doc_id);

-- ============================================================================
-- TIMESTAMP TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_sba_updated BEFORE UPDATE ON public.sales_blanket_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sdm_updated BEFORE UPDATE ON public.sales_discount_matrix
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_scpb_updated BEFORE UPDATE ON public.sales_customer_price_books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_acp_updated BEFORE UPDATE ON public.ar_credit_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_adp_updated BEFORE UPDATE ON public.ar_dunning_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_acase_updated BEFORE UPDATE ON public.ar_collection_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_adisp_updated BEFORE UPDATE ON public.ar_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_arrs_updated BEFORE UPDATE ON public.ar_revenue_recognition_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sed_updated BEFORE UPDATE ON public.sales_export_docs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.sales_blanket_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_blanket_agreement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_discount_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_customer_price_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_price_book_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_credit_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_dunning_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_dunning_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_dunning_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_collection_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_collection_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_dispute_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_revenue_recognition_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_tax_determination_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_incoterms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_export_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_portal_shares ENABLE ROW LEVEL SECURITY;

-- Authenticated users full access (multi-tenant filtering happens in app via company_id)
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'sales_blanket_agreements','sales_blanket_agreement_lines','sales_discount_matrix',
    'sales_customer_price_books','sales_price_book_items','ar_credit_profiles',
    'ar_credit_checks','ar_dunning_policies','ar_dunning_runs','ar_dunning_letters',
    'ar_collection_cases','ar_collection_activities','ar_disputes','ar_dispute_resolutions',
    'ar_revenue_recognition_schedules','sales_tax_determination_rules','sales_export_docs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('CREATE POLICY "auth_select_%I" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%I" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%I" ON public.%I FOR UPDATE TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%I" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- Incoterms: read-only reference for all authenticated users
CREATE POLICY "auth_select_incoterms" ON public.sales_incoterms FOR SELECT TO authenticated USING (true);

-- Customer portal shares: authenticated can manage; public can read by token (handled via edge function)
CREATE POLICY "auth_select_cps" ON public.customer_portal_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_cps" ON public.customer_portal_shares FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_cps" ON public.customer_portal_shares FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_cps" ON public.customer_portal_shares FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- SEED DATA: Incoterms 2020
-- ============================================================================

INSERT INTO public.sales_incoterms (code, name, description, transport_mode, seller_responsibility, buyer_responsibility, risk_transfer_point) VALUES
('EXW', 'Ex Works', 'Seller makes goods available at their premises', 'Any', 'Make goods available at premises', 'All transport, export, and import', 'At seller premises'),
('FCA', 'Free Carrier', 'Seller delivers goods to carrier nominated by buyer', 'Any', 'Export clearance, deliver to carrier', 'Main carriage and import', 'On delivery to carrier'),
('CPT', 'Carriage Paid To', 'Seller pays carriage to named destination', 'Any', 'Carriage to destination', 'Risk during transit, import', 'On delivery to first carrier'),
('CIP', 'Carriage and Insurance Paid To', 'Seller pays carriage and insurance to destination', 'Any', 'Carriage + insurance to destination', 'Import clearance', 'On delivery to first carrier'),
('DAP', 'Delivered at Place', 'Seller delivers to named place ready for unloading', 'Any', 'All costs and risks to destination', 'Unloading, import clearance', 'At named place'),
('DPU', 'Delivered at Place Unloaded', 'Seller delivers and unloads at named place', 'Any', 'All costs, risks, unloading', 'Import clearance only', 'After unloading at place'),
('DDP', 'Delivered Duty Paid', 'Seller delivers cleared for import at destination', 'Any', 'Everything including import duties', 'Receive goods', 'At named place'),
('FAS', 'Free Alongside Ship', 'Seller delivers alongside vessel at port of shipment', 'Sea/Inland Waterway', 'Deliver alongside vessel, export clearance', 'Loading, freight, import', 'Alongside vessel'),
('FOB', 'Free On Board', 'Seller delivers on board vessel at port of shipment', 'Sea/Inland Waterway', 'Load on vessel, export clearance', 'Freight, insurance, import', 'On board vessel'),
('CFR', 'Cost and Freight', 'Seller pays freight to destination port', 'Sea/Inland Waterway', 'Freight to destination port', 'Risk during transit, insurance, import', 'On board vessel at origin'),
('CIF', 'Cost, Insurance and Freight', 'Seller pays freight and insurance to destination port', 'Sea/Inland Waterway', 'Freight + insurance to destination port', 'Import clearance', 'On board vessel at origin');

-- ============================================================================
-- SEED DATA: GCC Tax Rules
-- ============================================================================

INSERT INTO public.sales_tax_determination_rules (rule_name, country_code, tax_type, tax_code, tax_rate, priority, is_active) VALUES
('Saudi Arabia Standard VAT', 'SA', 'VAT', 'VAT15', 15.0, 100, true),
('Saudi Arabia Zero-Rated', 'SA', 'VAT', 'VAT0', 0.0, 90, true),
('Saudi Arabia Exempt', 'SA', 'VAT', 'EXEMPT', 0.0, 80, true),
('UAE Standard VAT', 'AE', 'VAT', 'VAT5', 5.0, 100, true),
('Bahrain Standard VAT', 'BH', 'VAT', 'VAT10', 10.0, 100, true),
('Oman Standard VAT', 'OM', 'VAT', 'VAT5', 5.0, 100, true),
('Qatar (No VAT)', 'QA', 'VAT', 'NONE', 0.0, 100, true),
('Kuwait (No VAT)', 'KW', 'VAT', 'NONE', 0.0, 100, true);
