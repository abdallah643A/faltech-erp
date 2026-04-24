
-- ZATCA Integration Tables

-- ZATCA Organization Settings
CREATE TABLE public.zatca_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  organization_name_ar text,
  vat_number text NOT NULL,
  cr_number text,
  street text,
  building_number text,
  city text,
  district text,
  postal_code text,
  country_code text DEFAULT 'SA',
  otp text,
  csr_private_key text,
  compliance_csid text,
  compliance_secret text,
  production_csid text,
  production_secret text,
  environment text DEFAULT 'sandbox', -- sandbox, simulation, production
  api_base_url text DEFAULT 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal',
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ZATCA Invoice Submissions
CREATE TABLE public.zatca_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL, -- invoice, credit_memo, return, pos_invoice
  document_id uuid NOT NULL,
  document_number text,
  invoice_type text NOT NULL, -- standard (388), simplified (381)
  invoice_sub_type text DEFAULT '0100000', -- B2B, B2C flags
  uuid text NOT NULL DEFAULT gen_random_uuid()::text,
  invoice_hash text,
  xml_content text,
  signed_xml text,
  qr_code text,
  submission_type text NOT NULL, -- clearance, reporting
  status text DEFAULT 'pending', -- pending, submitted, cleared, reported, warning, rejected, error
  zatca_request_id text,
  zatca_status text,
  zatca_clearing_status text,
  zatca_reporting_status text,
  validation_results jsonb,
  warning_messages jsonb,
  error_messages jsonb,
  submitted_at timestamptz,
  cleared_at timestamptz,
  retry_count int DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ZATCA Compliance Logs
CREATE TABLE public.zatca_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.zatca_submissions(id) ON DELETE SET NULL,
  action text NOT NULL, -- onboarding, compliance_check, clearance, reporting, csid_renewal
  request_url text,
  request_body text,
  response_status int,
  response_body text,
  error_message text,
  duration_ms int,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zatca_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zatca_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zatca_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - authenticated users
CREATE POLICY "Authenticated users can view zatca_settings" ON public.zatca_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage zatca_settings" ON public.zatca_settings FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Authenticated users can view zatca_submissions" ON public.zatca_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage zatca_submissions" ON public.zatca_submissions FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view zatca_logs" ON public.zatca_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert zatca_logs" ON public.zatca_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX idx_zatca_submissions_document ON public.zatca_submissions(document_type, document_id);
CREATE INDEX idx_zatca_submissions_status ON public.zatca_submissions(status);
CREATE INDEX idx_zatca_logs_submission ON public.zatca_logs(submission_id);
