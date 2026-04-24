
-- Supplier Sites Mapping (which suppliers serve which projects/sites)
CREATE TABLE public.supplier_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  vendor_code TEXT,
  vendor_id UUID REFERENCES public.business_partners(id),
  project_id UUID REFERENCES public.projects(id),
  company_id UUID REFERENCES public.sap_companies(id),
  coverage_area TEXT,
  delivery_zone TEXT,
  site_contact_person TEXT,
  site_contact_phone TEXT,
  site_specific_terms TEXT,
  capacity_notes TEXT,
  availability_status TEXT DEFAULT 'available', -- available, limited, unavailable
  category TEXT, -- materials, equipment, subcontractor, services
  rating NUMERIC DEFAULT 0,
  is_preferred BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier Delivery Verifications (mobile on-site verification)
CREATE TABLE public.supplier_delivery_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  supplier_site_id UUID REFERENCES public.supplier_sites(id),
  project_id UUID REFERENCES public.projects(id),
  company_id UUID REFERENCES public.sap_companies(id),
  vendor_name TEXT NOT NULL,
  vendor_code TEXT,
  po_number TEXT,
  verification_date TIMESTAMPTZ DEFAULT now(),
  verified_by UUID,
  verified_by_name TEXT,
  delivery_status TEXT DEFAULT 'pending', -- pending, verified, partial, rejected
  items_expected INTEGER DEFAULT 0,
  items_received INTEGER DEFAULT 0,
  items_damaged INTEGER DEFAULT 0,
  items_missing INTEGER DEFAULT 0,
  overall_condition TEXT DEFAULT 'good', -- good, acceptable, poor, rejected
  delivery_on_time BOOLEAN DEFAULT true,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  discrepancy_notes TEXT,
  photo_urls TEXT[], -- array of photo URLs
  supplier_rating INTEGER, -- 1-5 stars
  rating_comments TEXT,
  signature_url TEXT,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  synced_to_scorecard BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier Site Issues (quality issues, delays, etc.)
CREATE TABLE public.supplier_site_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_site_id UUID REFERENCES public.supplier_sites(id),
  project_id UUID REFERENCES public.projects(id),
  company_id UUID REFERENCES public.sap_companies(id),
  vendor_name TEXT NOT NULL,
  vendor_code TEXT,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  delivery_verification_id UUID REFERENCES public.supplier_delivery_verifications(id),
  issue_number TEXT NOT NULL,
  issue_type TEXT NOT NULL, -- quality, delay, wrong_items, quantity_mismatch, documentation, safety
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  title TEXT NOT NULL,
  description TEXT,
  photo_urls TEXT[],
  reported_by UUID,
  reported_by_name TEXT,
  reported_date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'open', -- open, investigating, escalated, resolved, closed
  assigned_to TEXT,
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_by_name TEXT,
  resolved_date TIMESTAMPTZ,
  resolution_time_hours NUMERIC,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier Site Ratings (per-site performance ratings)
CREATE TABLE public.supplier_site_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_site_id UUID REFERENCES public.supplier_sites(id),
  project_id UUID REFERENCES public.projects(id),
  company_id UUID REFERENCES public.sap_companies(id),
  vendor_name TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  delivery_score NUMERIC DEFAULT 0, -- 0-100
  quality_score NUMERIC DEFAULT 0,
  cost_score NUMERIC DEFAULT 0,
  compliance_score NUMERIC DEFAULT 0,
  overall_score NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  quality_issues_count INTEGER DEFAULT 0,
  total_issues_count INTEGER DEFAULT 0,
  total_spend NUMERIC DEFAULT 0,
  rating_grade TEXT, -- A+, A, B, C, D
  notes TEXT,
  calculated_by UUID,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_supplier_sites_project ON public.supplier_sites(project_id);
CREATE INDEX idx_supplier_sites_vendor ON public.supplier_sites(vendor_name);
CREATE INDEX idx_supplier_sites_company ON public.supplier_sites(company_id);
CREATE INDEX idx_delivery_verifications_project ON public.supplier_delivery_verifications(project_id);
CREATE INDEX idx_delivery_verifications_po ON public.supplier_delivery_verifications(purchase_order_id);
CREATE INDEX idx_supplier_issues_project ON public.supplier_site_issues(project_id);
CREATE INDEX idx_supplier_issues_vendor ON public.supplier_site_issues(vendor_name);
CREATE INDEX idx_supplier_ratings_project ON public.supplier_site_ratings(project_id);

-- Issue number sequence
CREATE SEQUENCE IF NOT EXISTS supplier_issue_number_seq START 1;

-- RLS
ALTER TABLE public.supplier_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_delivery_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_site_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_site_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON public.supplier_sites FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.supplier_delivery_verifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.supplier_site_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.supplier_site_ratings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for supplier issue photos
INSERT INTO storage.buckets (id, name, public) VALUES ('supplier-photos', 'supplier-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload supplier photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'supplier-photos');
CREATE POLICY "Anyone can view supplier photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'supplier-photos');
CREATE POLICY "Authenticated users can delete supplier photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'supplier-photos');
