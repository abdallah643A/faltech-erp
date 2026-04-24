
-- Prequalification Applications
CREATE TABLE public.vendor_prequalification_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  vendor_id UUID REFERENCES public.business_partners(id),
  subcontractor_id UUID REFERENCES public.cpms_subcontractors(id),
  applicant_type TEXT NOT NULL DEFAULT 'vendor' CHECK (applicant_type IN ('vendor', 'subcontractor')),
  company_name TEXT NOT NULL,
  trade_name TEXT,
  registration_number TEXT,
  tax_number TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  years_in_business INTEGER DEFAULT 0,
  annual_revenue NUMERIC DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  has_insurance BOOLEAN DEFAULT false,
  insurance_expiry DATE,
  has_safety_certification BOOLEAN DEFAULT false,
  safety_certification_details TEXT,
  has_iso_certification BOOLEAN DEFAULT false,
  iso_details TEXT,
  bank_name TEXT,
  bank_reference TEXT,
  reference_1_company TEXT,
  reference_1_contact TEXT,
  reference_1_phone TEXT,
  reference_2_company TEXT,
  reference_2_contact TEXT,
  reference_2_phone TEXT,
  reference_3_company TEXT,
  reference_3_contact TEXT,
  reference_3_phone TEXT,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft','submitted','under_review','scoring','approved','rejected','expired','suspended','blacklisted')),
  total_score NUMERIC DEFAULT 0,
  max_possible_score NUMERIC DEFAULT 0,
  score_percentage NUMERIC DEFAULT 0,
  pass_threshold NUMERIC DEFAULT 70,
  reviewer_id UUID,
  reviewer_name TEXT,
  reviewed_at TIMESTAMPTZ,
  review_comments TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  valid_from DATE,
  valid_until DATE,
  requalification_reminder_days INTEGER DEFAULT 90,
  last_requalification_date DATE,
  next_requalification_date DATE,
  rejection_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Required Documents
CREATE TABLE public.prequalification_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.vendor_prequalification_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  is_required BOOLEAN DEFAULT true,
  is_uploaded BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scoring Criteria Templates
CREATE TABLE public.prequalification_scoring_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  criteria_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  weight NUMERIC NOT NULL DEFAULT 1,
  max_score NUMERIC NOT NULL DEFAULT 10,
  pass_threshold NUMERIC DEFAULT 5,
  is_mandatory BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual Scores
CREATE TABLE public.prequalification_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.vendor_prequalification_applications(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.prequalification_scoring_criteria(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  weighted_score NUMERIC NOT NULL DEFAULT 0,
  reviewer_comments TEXT,
  scored_by UUID,
  scored_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(application_id, criteria_id)
);

-- Approved Categories
CREATE TABLE public.prequalification_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vendor-Category Assignments
CREATE TABLE public.vendor_approved_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.vendor_prequalification_applications(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.prequalification_categories(id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(application_id, category_id)
);

-- Blacklist/Suspension Records
CREATE TABLE public.prequalification_blacklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  vendor_id UUID REFERENCES public.business_partners(id),
  subcontractor_id UUID REFERENCES public.cpms_subcontractors(id),
  application_id UUID REFERENCES public.vendor_prequalification_applications(id),
  company_name TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'blacklist' CHECK (action_type IN ('blacklist', 'suspension')),
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_permanent BOOLEAN DEFAULT false,
  reinstated BOOLEAN DEFAULT false,
  reinstated_by UUID,
  reinstated_at TIMESTAMPTZ,
  reinstatement_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_prequalification_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prequalification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prequalification_scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prequalification_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prequalification_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_approved_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prequalification_blacklist ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "auth_manage_prequalification_applications" ON public.vendor_prequalification_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_manage_prequalification_documents" ON public.prequalification_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_manage_prequalification_scoring_criteria" ON public.prequalification_scoring_criteria FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_manage_prequalification_scores" ON public.prequalification_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_manage_prequalification_categories" ON public.prequalification_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_manage_vendor_approved_categories" ON public.vendor_approved_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_manage_prequalification_blacklist" ON public.prequalification_blacklist FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_prequalification_applications_updated_at BEFORE UPDATE ON public.vendor_prequalification_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prequalification_blacklist_updated_at BEFORE UPDATE ON public.prequalification_blacklist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default scoring criteria
INSERT INTO public.prequalification_scoring_criteria (criteria_name, category, description, weight, max_score, pass_threshold, is_mandatory, sort_order) VALUES
  ('Financial Stability', 'financial', 'Assessment of financial health, revenue, and creditworthiness', 2, 10, 6, true, 1),
  ('Technical Capability', 'technical', 'Equipment, technology, and technical expertise', 2, 10, 6, true, 2),
  ('Safety Record', 'safety', 'Safety certifications, incident history, HSE compliance', 1.5, 10, 7, true, 3),
  ('Quality Management', 'quality', 'ISO certifications, QA/QC processes, defect rates', 1.5, 10, 6, true, 4),
  ('Experience & References', 'experience', 'Years in business, project portfolio, client references', 1, 10, 5, false, 5),
  ('Insurance & Compliance', 'compliance', 'Insurance coverage, regulatory compliance, licenses', 1, 10, 7, true, 6),
  ('Workforce & Capacity', 'capacity', 'Employee count, available resources, capacity utilization', 1, 10, 5, false, 7);

-- Seed default categories
INSERT INTO public.prequalification_categories (category_code, category_name, description, sort_order) VALUES
  ('CIV', 'Civil Works', 'Earthworks, foundations, concrete structures', 1),
  ('STR', 'Structural Steel', 'Steel fabrication and erection', 2),
  ('MEP', 'MEP Services', 'Mechanical, electrical, and plumbing', 3),
  ('ELE', 'Electrical', 'Electrical installations and systems', 4),
  ('PLU', 'Plumbing', 'Plumbing and drainage systems', 5),
  ('HVA', 'HVAC', 'Heating, ventilation, and air conditioning', 6),
  ('FIN', 'Finishing Works', 'Plastering, painting, tiling, flooring', 7),
  ('LAN', 'Landscaping', 'Hard and soft landscaping', 8),
  ('FAB', 'Fabrication', 'Metal and specialty fabrication', 9),
  ('SUP', 'Material Supply', 'Bulk material and equipment supply', 10);
