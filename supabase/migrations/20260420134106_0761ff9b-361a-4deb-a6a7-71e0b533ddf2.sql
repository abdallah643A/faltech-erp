-- Enable trigram for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================================
-- 1. BP HIERARCHIES
-- =========================================
CREATE TABLE public.bp_hierarchies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  parent_bp_id UUID NOT NULL,
  child_bp_id UUID NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'subsidiary',
  ownership_pct NUMERIC(5,2),
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_bp_id, child_bp_id, relationship_type)
);

-- =========================================
-- 2. DEDUP RULES & CANDIDATES
-- =========================================
CREATE TABLE public.bp_dedup_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  rule_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'exact',
  similarity_threshold NUMERIC(3,2) DEFAULT 0.85,
  weight NUMERIC(3,2) DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bp_dedup_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bp_a_id UUID NOT NULL,
  bp_b_id UUID NOT NULL,
  match_score NUMERIC(4,3) NOT NULL,
  matched_fields JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  master_bp_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bp_a_id, bp_b_id)
);

-- =========================================
-- 3. VALIDATION POLICIES
-- =========================================
CREATE TABLE public.bp_validation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  policy_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  validation_type TEXT NOT NULL,
  validation_value TEXT,
  error_message TEXT,
  applies_to TEXT NOT NULL DEFAULT 'both',
  severity TEXT NOT NULL DEFAULT 'error',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- 4. CREDIT PROFILES
-- =========================================
CREATE TABLE public.bp_credit_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bp_id UUID NOT NULL UNIQUE,
  credit_limit NUMERIC(18,2) DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  payment_terms TEXT,
  credit_rating TEXT,
  risk_score INTEGER,
  current_exposure NUMERIC(18,2) DEFAULT 0,
  available_credit NUMERIC(18,2) DEFAULT 0,
  last_review_date DATE,
  next_review_date DATE,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- 5. TAX REGISTRATIONS
-- =========================================
CREATE TABLE public.bp_tax_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bp_id UUID NOT NULL,
  registration_type TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  country_code TEXT NOT NULL,
  issued_date DATE,
  expiry_date DATE,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  document_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bp_id, registration_type, country_code)
);

-- =========================================
-- 6. ADDRESS DICTIONARIES + NORMALIZED
-- =========================================
CREATE TABLE public.mdm_country_dictionary (
  code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  iso3 TEXT,
  phone_prefix TEXT,
  currency TEXT,
  is_gcc BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mdm_city_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.mdm_country_dictionary(code),
  name_en TEXT NOT NULL,
  name_ar TEXT,
  region TEXT,
  is_capital BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, name_en)
);

CREATE TABLE public.bp_addresses_normalized (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bp_id UUID NOT NULL,
  address_type TEXT NOT NULL DEFAULT 'billing',
  country_code TEXT REFERENCES public.mdm_country_dictionary(code),
  region TEXT,
  city TEXT,
  district TEXT,
  street TEXT,
  building_no TEXT,
  postal_code TEXT,
  po_box TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  is_primary BOOLEAN DEFAULT false,
  is_validated BOOLEAN DEFAULT false,
  raw_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- 7. CONTACT ROLES
-- =========================================
CREATE TABLE public.bp_contact_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bp_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL,
  department TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_decision_maker BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- 8. SEGMENTATION
-- =========================================
CREATE TABLE public.bp_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  segment_name TEXT NOT NULL,
  segment_type TEXT NOT NULL DEFAULT 'customer',
  dimension TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, segment_name)
);

CREATE TABLE public.bp_segment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bp_id UUID NOT NULL,
  segment_id UUID NOT NULL REFERENCES public.bp_segments(id) ON DELETE CASCADE,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bp_id, segment_id, effective_from)
);

-- =========================================
-- 9. STEWARDSHIP OWNERSHIP
-- =========================================
CREATE TABLE public.bp_stewardship_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bp_id UUID NOT NULL,
  steward_user_id UUID NOT NULL,
  steward_name TEXT,
  backup_user_id UUID,
  domain TEXT NOT NULL DEFAULT 'general',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bp_id, domain)
);

-- =========================================
-- 10. CHANGE LOG (append-only)
-- =========================================
CREATE TABLE public.bp_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bp_id UUID NOT NULL,
  change_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  change_summary TEXT,
  source TEXT DEFAULT 'manual',
  approval_task_id UUID,
  changed_by UUID,
  changed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- TRIGGERS for updated_at
-- =========================================
CREATE TRIGGER trg_bp_hierarchies_updated BEFORE UPDATE ON public.bp_hierarchies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bp_dedup_rules_updated BEFORE UPDATE ON public.bp_dedup_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bp_dedup_candidates_updated BEFORE UPDATE ON public.bp_dedup_candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bp_validation_policies_updated BEFORE UPDATE ON public.bp_validation_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bp_credit_profiles_updated BEFORE UPDATE ON public.bp_credit_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bp_tax_registrations_updated BEFORE UPDATE ON public.bp_tax_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bp_addresses_normalized_updated BEFORE UPDATE ON public.bp_addresses_normalized FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bp_contact_roles_updated BEFORE UPDATE ON public.bp_contact_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bp_segments_updated BEFORE UPDATE ON public.bp_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bp_stewardship_owners_updated BEFORE UPDATE ON public.bp_stewardship_owners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- INDEXES
-- =========================================
CREATE INDEX idx_bp_hierarchies_parent ON public.bp_hierarchies(parent_bp_id);
CREATE INDEX idx_bp_hierarchies_child ON public.bp_hierarchies(child_bp_id);
CREATE INDEX idx_bp_dedup_candidates_status ON public.bp_dedup_candidates(status);
CREATE INDEX idx_bp_dedup_candidates_bp_a ON public.bp_dedup_candidates(bp_a_id);
CREATE INDEX idx_bp_credit_profiles_bp ON public.bp_credit_profiles(bp_id);
CREATE INDEX idx_bp_tax_registrations_bp ON public.bp_tax_registrations(bp_id);
CREATE INDEX idx_bp_addresses_bp ON public.bp_addresses_normalized(bp_id);
CREATE INDEX idx_bp_contact_roles_bp ON public.bp_contact_roles(bp_id);
CREATE INDEX idx_bp_segment_assignments_bp ON public.bp_segment_assignments(bp_id);
CREATE INDEX idx_bp_stewardship_bp ON public.bp_stewardship_owners(bp_id);
CREATE INDEX idx_bp_change_log_bp ON public.bp_change_log(bp_id);
CREATE INDEX idx_bp_change_log_created ON public.bp_change_log(created_at DESC);

-- =========================================
-- RLS
-- =========================================
ALTER TABLE public.bp_hierarchies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_dedup_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_dedup_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_validation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_tax_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_addresses_normalized ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_contact_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_segment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_stewardship_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdm_country_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdm_city_dictionary ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full read+write on operational tables
CREATE POLICY "auth_all_bp_hierarchies" ON public.bp_hierarchies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bp_dedup_rules" ON public.bp_dedup_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bp_dedup_candidates" ON public.bp_dedup_candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bp_validation_policies" ON public.bp_validation_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bp_credit_profiles" ON public.bp_credit_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bp_tax_registrations" ON public.bp_tax_registrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bp_addresses_normalized" ON public.bp_addresses_normalized FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bp_contact_roles" ON public.bp_contact_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bp_segments" ON public.bp_segments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bp_segment_assignments" ON public.bp_segment_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bp_stewardship_owners" ON public.bp_stewardship_owners FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Change log: append-only (insert + read; no update/delete)
CREATE POLICY "auth_read_bp_change_log" ON public.bp_change_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_bp_change_log" ON public.bp_change_log FOR INSERT TO authenticated WITH CHECK (true);

-- Dictionaries: world-readable, authenticated-writable
CREATE POLICY "public_read_country_dict" ON public.mdm_country_dictionary FOR SELECT USING (true);
CREATE POLICY "auth_write_country_dict" ON public.mdm_country_dictionary FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_read_city_dict" ON public.mdm_city_dictionary FOR SELECT USING (true);
CREATE POLICY "auth_write_city_dict" ON public.mdm_city_dictionary FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================
-- SEED GCC DICTIONARIES
-- =========================================
INSERT INTO public.mdm_country_dictionary (code, name_en, name_ar, iso3, phone_prefix, currency, is_gcc) VALUES
  ('SA', 'Saudi Arabia', 'المملكة العربية السعودية', 'SAU', '+966', 'SAR', true),
  ('AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', 'ARE', '+971', 'AED', true),
  ('KW', 'Kuwait', 'الكويت', 'KWT', '+965', 'KWD', true),
  ('QA', 'Qatar', 'قطر', 'QAT', '+974', 'QAR', true),
  ('BH', 'Bahrain', 'البحرين', 'BHR', '+973', 'BHD', true),
  ('OM', 'Oman', 'عُمان', 'OMN', '+968', 'OMR', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.mdm_city_dictionary (country_code, name_en, name_ar, region, is_capital) VALUES
  ('SA','Riyadh','الرياض','Riyadh',true),
  ('SA','Jeddah','جدة','Makkah',false),
  ('SA','Dammam','الدمام','Eastern',false),
  ('SA','Mecca','مكة المكرمة','Makkah',false),
  ('SA','Medina','المدينة المنورة','Madinah',false),
  ('SA','Khobar','الخبر','Eastern',false),
  ('SA','Tabuk','تبوك','Tabuk',false),
  ('AE','Abu Dhabi','أبو ظبي','Abu Dhabi',true),
  ('AE','Dubai','دبي','Dubai',false),
  ('AE','Sharjah','الشارقة','Sharjah',false),
  ('AE','Ajman','عجمان','Ajman',false),
  ('AE','Al Ain','العين','Abu Dhabi',false),
  ('KW','Kuwait City','مدينة الكويت','Capital',true),
  ('KW','Hawalli','حولي','Hawalli',false),
  ('KW','Salmiya','السالمية','Hawalli',false),
  ('QA','Doha','الدوحة','Doha',true),
  ('QA','Al Rayyan','الريان','Al Rayyan',false),
  ('QA','Al Wakrah','الوكرة','Al Wakrah',false),
  ('BH','Manama','المنامة','Capital',true),
  ('BH','Riffa','الرفاع','Southern',false),
  ('BH','Muharraq','المحرق','Muharraq',false),
  ('OM','Muscat','مسقط','Muscat',true),
  ('OM','Salalah','صلالة','Dhofar',false),
  ('OM','Sohar','صحار','Al Batinah North',false)
ON CONFLICT (country_code, name_en) DO NOTHING;

-- =========================================
-- SEED DEFAULT DEDUP RULES & VALIDATION POLICIES
-- =========================================
INSERT INTO public.bp_dedup_rules (rule_name, field_name, match_type, similarity_threshold, weight, is_active) VALUES
  ('Tax ID exact', 'tax_id', 'exact', 1.0, 1.0, true),
  ('Email exact', 'email', 'exact', 1.0, 0.9, true),
  ('Phone exact', 'phone', 'exact', 1.0, 0.7, true),
  ('Name fuzzy', 'name', 'trigram', 0.85, 0.6, true);

INSERT INTO public.bp_validation_policies (policy_name, field_name, validation_type, validation_value, error_message, applies_to, severity, is_active) VALUES
  ('Name required', 'name', 'required', NULL, 'Business partner name is required', 'both', 'error', true),
  ('Tax ID format (SA VAT)', 'tax_id', 'regex', '^3[0-9]{14}$', 'Saudi VAT must be 15 digits starting with 3', 'both', 'warning', true),
  ('Email format', 'email', 'regex', '^[^@\s]+@[^@\s]+\.[^@\s]+$', 'Invalid email format', 'both', 'error', true),
  ('Phone min length', 'phone', 'min_length', '8', 'Phone must be at least 8 digits', 'both', 'warning', true);