
-- ============================================
-- 1. DYNAMIC FORM BUILDER
-- ============================================
CREATE TABLE public.custom_form_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  module TEXT NOT NULL,
  document_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.custom_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_definition_id UUID REFERENCES public.custom_form_definitions(id) ON DELETE CASCADE NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  section TEXT DEFAULT 'General',
  sort_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  placeholder TEXT,
  options JSONB,
  validation_rules JSONB,
  conditional_logic JSONB,
  visibility_rules JSONB,
  help_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_definition_id UUID REFERENCES public.custom_form_definitions(id) NOT NULL,
  field_id UUID REFERENCES public.custom_form_fields(id) ON DELETE CASCADE NOT NULL,
  record_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  value TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(field_id, record_id, record_type)
);

ALTER TABLE public.custom_form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_form_defs" ON public.custom_form_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_form_defs" ON public.custom_form_definitions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_update_form_defs" ON public.custom_form_definitions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_form_defs" ON public.custom_form_definitions FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "auth_select_form_fields" ON public.custom_form_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_form_fields" ON public.custom_form_fields FOR ALL TO authenticated USING (true);

CREATE POLICY "auth_select_field_vals" ON public.custom_field_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_field_vals" ON public.custom_field_values FOR ALL TO authenticated USING (true);

-- ============================================
-- 2. ROW-LEVEL PERMISSION RULES
-- ============================================
CREATE TABLE public.row_level_permission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  module TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT,
  match_type TEXT NOT NULL DEFAULT 'branch',
  match_field TEXT NOT NULL,
  match_values TEXT[],
  target_role TEXT,
  target_user_id UUID,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.row_level_permission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_rlp" ON public.row_level_permission_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_rlp" ON public.row_level_permission_rules FOR ALL TO authenticated USING (true);

-- ============================================
-- 3. MASTER DATA STEWARDSHIP
-- ============================================
CREATE TABLE public.master_data_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  change_type TEXT NOT NULL DEFAULT 'update',
  status TEXT NOT NULL DEFAULT 'pending',
  justification TEXT,
  submitted_by UUID,
  submitted_by_name TEXT,
  reviewed_by UUID,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.master_data_change_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID REFERENCES public.master_data_change_requests(id) ON DELETE CASCADE NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.master_data_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_data_change_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_mdcr" ON public.master_data_change_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_mdcr" ON public.master_data_change_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "auth_update_mdcr" ON public.master_data_change_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_mdcr" ON public.master_data_change_requests FOR DELETE TO authenticated USING (auth.uid() = submitted_by);

CREATE POLICY "auth_select_mdcf" ON public.master_data_change_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_mdcf" ON public.master_data_change_fields FOR ALL TO authenticated USING (true);

-- ============================================
-- 4. SERVICE & MAINTENANCE MODULE
-- ============================================
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  request_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  request_type TEXT DEFAULT 'corrective',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  equipment_id TEXT,
  equipment_name TEXT,
  asset_id UUID,
  location TEXT,
  reported_by TEXT,
  reported_date TIMESTAMPTZ DEFAULT now(),
  assigned_technician_id UUID,
  assigned_technician_name TEXT,
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  resolution TEXT,
  warranty_covered BOOLEAN DEFAULT false,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.preventive_maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  plan_name TEXT NOT NULL,
  description TEXT,
  equipment_id TEXT,
  equipment_name TEXT,
  asset_id UUID,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  frequency_value INT DEFAULT 1,
  last_performed TIMESTAMPTZ,
  next_due TIMESTAMPTZ,
  assigned_technician_id UUID,
  assigned_technician_name TEXT,
  checklist JSONB,
  estimated_duration_hours NUMERIC DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.service_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES public.service_requests(id),
  pm_plan_id UUID REFERENCES public.preventive_maintenance_plans(id),
  technician_id UUID,
  technician_name TEXT,
  visit_date TIMESTAMPTZ DEFAULT now(),
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  work_performed TEXT,
  parts_used JSONB,
  status TEXT DEFAULT 'scheduled',
  customer_signature BOOLEAN DEFAULT false,
  notes TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.service_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES public.service_requests(id),
  visit_id UUID REFERENCES public.service_visits(id),
  report_number TEXT NOT NULL,
  summary TEXT,
  findings TEXT,
  recommendations TEXT,
  parts_replaced JSONB,
  labor_hours NUMERIC DEFAULT 0,
  material_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  billable BOOLEAN DEFAULT true,
  invoice_generated BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventive_maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_service_requests" ON public.service_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_pm_plans" ON public.preventive_maintenance_plans FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_service_visits" ON public.service_visits FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_service_reports" ON public.service_reports FOR ALL TO authenticated USING (true);

-- ============================================
-- 5. SANDBOX / TRAINING MODE
-- ============================================
CREATE TABLE public.sandbox_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_name TEXT NOT NULL,
  module TEXT,
  scenario_id UUID,
  status TEXT DEFAULT 'active',
  progress JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sandbox_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'beginner',
  steps JSONB,
  sample_data JSONB,
  expected_outcomes JSONB,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sandbox_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_sessions" ON public.sandbox_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "auth_select_scenarios" ON public.sandbox_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_scenarios" ON public.sandbox_scenarios FOR ALL TO authenticated USING (true);

-- ============================================
-- 6. EMAIL-TO-DOCUMENT CAPTURE
-- ============================================
CREATE TABLE public.email_capture_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  body_preview TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  attachments JSONB,
  suggested_document_type TEXT,
  suggested_vendor_id UUID,
  suggested_customer_id UUID,
  target_document_type TEXT,
  target_document_id TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  confidence_score NUMERIC DEFAULT 0,
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_capture_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_email_capture" ON public.email_capture_records FOR ALL TO authenticated USING (true);

-- ============================================
-- 7. OCR DOCUMENT CAPTURE
-- ============================================
CREATE TABLE public.ocr_capture_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  document_type TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  status TEXT DEFAULT 'processing',
  overall_confidence NUMERIC DEFAULT 0,
  target_record_type TEXT,
  target_record_id TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ocr_extracted_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id UUID REFERENCES public.ocr_capture_records(id) ON DELETE CASCADE NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT,
  extracted_value TEXT,
  corrected_value TEXT,
  confidence NUMERIC DEFAULT 0,
  needs_review BOOLEAN DEFAULT false,
  bounding_box JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ocr_capture_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_extracted_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_ocr_capture" ON public.ocr_capture_records FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_ocr_fields" ON public.ocr_extracted_fields FOR ALL TO authenticated USING (true);

-- ============================================
-- 8. PROCESS MINING DASHBOARD
-- ============================================
CREATE TABLE public.process_mining_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  process_name TEXT NOT NULL,
  case_id TEXT NOT NULL,
  activity TEXT NOT NULL,
  performer_id UUID,
  performer_name TEXT,
  event_time TIMESTAMPTZ DEFAULT now(),
  duration_minutes NUMERIC,
  document_type TEXT,
  document_id TEXT,
  module TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.process_mining_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  insight_type TEXT NOT NULL,
  process_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'info',
  affected_cases INT DEFAULT 0,
  avg_delay_minutes NUMERIC,
  recommendation TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.process_mining_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_mining_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_pm_events" ON public.process_mining_events FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_pm_insights" ON public.process_mining_insights FOR ALL TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_custom_field_values_record ON public.custom_field_values(record_type, record_id);
CREATE INDEX idx_mdcr_entity ON public.master_data_change_requests(entity_type, status);
CREATE INDEX idx_service_requests_status ON public.service_requests(status, company_id);
CREATE INDEX idx_pm_plans_next ON public.preventive_maintenance_plans(next_due, is_active);
CREATE INDEX idx_process_events_case ON public.process_mining_events(case_id, process_name);
CREATE INDEX idx_ocr_capture_status ON public.ocr_capture_records(status, company_id);
CREATE INDEX idx_email_capture_status ON public.email_capture_records(status, company_id);
