
-- =============================================
-- CONSTRUCTION MODULE TABLES
-- =============================================

-- Variation Orders (enhanced if exists)
CREATE TABLE IF NOT EXISTS public.cpms_variation_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  variation_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  variation_type TEXT DEFAULT 'scope_change',
  requested_by TEXT,
  request_date DATE DEFAULT CURRENT_DATE,
  original_value NUMERIC DEFAULT 0,
  revised_value NUMERIC DEFAULT 0,
  cost_impact NUMERIC DEFAULT 0,
  time_impact_days INTEGER DEFAULT 0,
  boq_item_id UUID,
  status TEXT DEFAULT 'draft',
  approval_status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  linked_documents JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cpms_variation_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_vo" ON public.cpms_variation_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_vo" ON public.cpms_variation_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_vo" ON public.cpms_variation_orders FOR UPDATE TO authenticated USING (true);

-- Contract Retentions
CREATE TABLE IF NOT EXISTS public.contract_retentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  sales_order_id UUID,
  contract_value NUMERIC DEFAULT 0,
  retention_percentage NUMERIC DEFAULT 10,
  total_retention NUMERIC DEFAULT 0,
  released_amount NUMERIC DEFAULT 0,
  pending_amount NUMERIC DEFAULT 0,
  release_milestone TEXT,
  release_date DATE,
  release_status TEXT DEFAULT 'held',
  invoice_id UUID,
  accounting_status TEXT DEFAULT 'pending',
  notes TEXT,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contract_retentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_cr" ON public.contract_retentions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_cr" ON public.contract_retentions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_cr" ON public.contract_retentions FOR UPDATE TO authenticated USING (true);

-- Site Inspections
CREATE TABLE IF NOT EXISTS public.site_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  inspection_number TEXT NOT NULL,
  inspection_type TEXT DEFAULT 'general',
  inspector_name TEXT,
  inspector_id UUID,
  inspection_date DATE DEFAULT CURRENT_DATE,
  location TEXT,
  weather_conditions TEXT,
  overall_status TEXT DEFAULT 'pending',
  total_items INTEGER DEFAULT 0,
  passed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  snag_count INTEGER DEFAULT 0,
  summary TEXT,
  photos JSONB DEFAULT '[]',
  sign_off_by TEXT,
  sign_off_date DATE,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.site_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_si" ON public.site_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_si" ON public.site_inspections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_si" ON public.site_inspections FOR UPDATE TO authenticated USING (true);

-- Site Inspection Items
CREATE TABLE IF NOT EXISTS public.site_inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.site_inspections(id) ON DELETE CASCADE,
  item_number INTEGER DEFAULT 1,
  category TEXT,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  severity TEXT DEFAULT 'minor',
  responsible_party TEXT,
  due_date DATE,
  resolution_date DATE,
  resolution_notes TEXT,
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.site_inspection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_sii" ON public.site_inspection_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sii" ON public.site_inspection_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sii" ON public.site_inspection_items FOR UPDATE TO authenticated USING (true);

-- Interim Payment Certificates
CREATE TABLE IF NOT EXISTS public.interim_payment_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  certificate_number TEXT NOT NULL,
  period_from DATE,
  period_to DATE,
  work_done_to_date NUMERIC DEFAULT 0,
  previous_certified NUMERIC DEFAULT 0,
  this_period_amount NUMERIC DEFAULT 0,
  retention_held NUMERIC DEFAULT 0,
  retention_released NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  deduction_details JSONB DEFAULT '[]',
  net_certified NUMERIC DEFAULT 0,
  engineer_name TEXT,
  engineer_approved BOOLEAN DEFAULT false,
  engineer_approved_at TIMESTAMPTZ,
  client_approved BOOLEAN DEFAULT false,
  client_approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  linked_invoice_id UUID,
  notes TEXT,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interim_payment_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_ipc" ON public.interim_payment_certificates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_ipc" ON public.interim_payment_certificates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_ipc" ON public.interim_payment_certificates FOR UPDATE TO authenticated USING (true);

-- Subcontract Agreements
CREATE TABLE IF NOT EXISTS public.subcontract_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  subcontractor_id UUID,
  subcontractor_name TEXT NOT NULL,
  agreement_number TEXT NOT NULL,
  trade TEXT,
  scope_description TEXT,
  contract_value NUMERIC DEFAULT 0,
  retention_percentage NUMERIC DEFAULT 10,
  start_date DATE,
  end_date DATE,
  payment_terms TEXT,
  status TEXT DEFAULT 'draft',
  total_claimed NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  total_retention NUMERIC DEFAULT 0,
  performance_rating NUMERIC,
  documents JSONB DEFAULT '[]',
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subcontract_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_sa" ON public.subcontract_agreements FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sa" ON public.subcontract_agreements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sa" ON public.subcontract_agreements FOR UPDATE TO authenticated USING (true);

-- Subcontract Claims
CREATE TABLE IF NOT EXISTS public.subcontract_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID REFERENCES public.subcontract_agreements(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  period TEXT,
  work_done NUMERIC DEFAULT 0,
  previous_claims NUMERIC DEFAULT 0,
  this_claim NUMERIC DEFAULT 0,
  retention_deducted NUMERIC DEFAULT 0,
  net_payable NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'submitted',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  payment_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subcontract_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_sc" ON public.subcontract_claims FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sc" ON public.subcontract_claims FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sc" ON public.subcontract_claims FOR UPDATE TO authenticated USING (true);

-- Equipment Allocations
CREATE TABLE IF NOT EXISTS public.equipment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  equipment_name TEXT NOT NULL,
  equipment_code TEXT,
  equipment_type TEXT,
  operator_name TEXT,
  operator_id UUID,
  start_date DATE,
  end_date DATE,
  planned_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  idle_hours NUMERIC DEFAULT 0,
  downtime_hours NUMERIC DEFAULT 0,
  hourly_rate NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  maintenance_due_date DATE,
  maintenance_status TEXT DEFAULT 'ok',
  status TEXT DEFAULT 'allocated',
  notes TEXT,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.equipment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_ea" ON public.equipment_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_ea" ON public.equipment_allocations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_ea" ON public.equipment_allocations FOR UPDATE TO authenticated USING (true);

-- Material Consumptions
CREATE TABLE IF NOT EXISTS public.material_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  item_code TEXT,
  item_description TEXT NOT NULL,
  boq_quantity NUMERIC DEFAULT 0,
  issued_quantity NUMERIC DEFAULT 0,
  used_quantity NUMERIC DEFAULT 0,
  wastage_quantity NUMERIC DEFAULT 0,
  returned_quantity NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  variance_percentage NUMERIC DEFAULT 0,
  unit TEXT,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  store_location TEXT,
  recorded_by TEXT,
  record_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.material_consumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_mc" ON public.material_consumptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_mc" ON public.material_consumptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_mc" ON public.material_consumptions FOR UPDATE TO authenticated USING (true);

-- Project Claims & Disputes
CREATE TABLE IF NOT EXISTS public.project_claims_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  claim_number TEXT NOT NULL,
  claim_type TEXT DEFAULT 'extension_of_time',
  title TEXT NOT NULL,
  description TEXT,
  claimant TEXT,
  counterparty TEXT,
  amount_claimed NUMERIC DEFAULT 0,
  amount_awarded NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  submission_date DATE DEFAULT CURRENT_DATE,
  response_due_date DATE,
  resolution_date DATE,
  resolution_method TEXT,
  negotiation_notes TEXT,
  financial_impact NUMERIC DEFAULT 0,
  documents JSONB DEFAULT '[]',
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_claims_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_pcd" ON public.project_claims_disputes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_pcd" ON public.project_claims_disputes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_pcd" ON public.project_claims_disputes FOR UPDATE TO authenticated USING (true);

-- =============================================
-- HR MODULE TABLES
-- =============================================

-- Job Requisitions
CREATE TABLE IF NOT EXISTS public.job_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_number TEXT NOT NULL,
  job_title TEXT NOT NULL,
  department TEXT,
  branch_id UUID,
  positions_count INTEGER DEFAULT 1,
  job_type TEXT DEFAULT 'full_time',
  salary_range_min NUMERIC,
  salary_range_max NUMERIC,
  description TEXT,
  requirements TEXT,
  justification TEXT,
  requested_by UUID,
  requested_by_name TEXT,
  approval_status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  posting_status TEXT DEFAULT 'draft',
  target_hire_date DATE,
  status TEXT DEFAULT 'open',
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.job_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_jr" ON public.job_requisitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_jr" ON public.job_requisitions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_jr" ON public.job_requisitions FOR UPDATE TO authenticated USING (true);

-- Job Candidates
CREATE TABLE IF NOT EXISTS public.job_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID REFERENCES public.job_requisitions(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  nationality TEXT,
  current_employer TEXT,
  current_title TEXT,
  years_experience NUMERIC,
  resume_url TEXT,
  source TEXT DEFAULT 'direct',
  pipeline_stage TEXT DEFAULT 'applied',
  interview_date TIMESTAMPTZ,
  interview_notes TEXT,
  evaluation_score NUMERIC,
  evaluator TEXT,
  offer_amount NUMERIC,
  offer_status TEXT,
  offer_date DATE,
  hire_date DATE,
  rejection_reason TEXT,
  status TEXT DEFAULT 'active',
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.job_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_jc" ON public.job_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_jc" ON public.job_candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_jc" ON public.job_candidates FOR UPDATE TO authenticated USING (true);

-- Employee Loans
CREATE TABLE IF NOT EXISTS public.employee_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  loan_type TEXT DEFAULT 'salary_advance',
  loan_number TEXT,
  request_date DATE DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  approved_amount NUMERIC,
  installment_amount NUMERIC,
  installments_count INTEGER,
  paid_installments INTEGER DEFAULT 0,
  outstanding_balance NUMERIC,
  interest_rate NUMERIC DEFAULT 0,
  start_deduction_date DATE,
  end_deduction_date DATE,
  purpose TEXT,
  status TEXT DEFAULT 'pending',
  approval_status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_el" ON public.employee_loans FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_el" ON public.employee_loans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_el" ON public.employee_loans FOR UPDATE TO authenticated USING (true);

-- Loan Repayments
CREATE TABLE IF NOT EXISTS public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.employee_loans(id) ON DELETE CASCADE,
  installment_number INTEGER,
  due_date DATE,
  amount NUMERIC,
  paid_amount NUMERIC DEFAULT 0,
  payment_date DATE,
  payment_method TEXT DEFAULT 'payroll_deduction',
  status TEXT DEFAULT 'pending',
  payroll_period TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_lr" ON public.loan_repayments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_lr" ON public.loan_repayments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_lr" ON public.loan_repayments FOR UPDATE TO authenticated USING (true);

-- Performance Appraisals
CREATE TABLE IF NOT EXISTS public.performance_appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  appraisal_cycle TEXT NOT NULL,
  cycle_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  reviewer_id UUID,
  reviewer_name TEXT,
  self_assessment_score NUMERIC,
  manager_score NUMERIC,
  final_rating NUMERIC,
  rating_label TEXT,
  strengths TEXT,
  improvements TEXT,
  manager_comments TEXT,
  employee_comments TEXT,
  calibration_status TEXT DEFAULT 'pending',
  calibrated_rating NUMERIC,
  promotion_recommended BOOLEAN DEFAULT false,
  training_recommended BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.performance_appraisals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_pa" ON public.performance_appraisals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_pa" ON public.performance_appraisals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_pa" ON public.performance_appraisals FOR UPDATE TO authenticated USING (true);

-- Appraisal Goals
CREATE TABLE IF NOT EXISTS public.appraisal_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_id UUID REFERENCES public.performance_appraisals(id) ON DELETE CASCADE,
  goal_title TEXT NOT NULL,
  description TEXT,
  weight NUMERIC DEFAULT 0,
  target_value TEXT,
  actual_value TEXT,
  self_score NUMERIC,
  manager_score NUMERIC,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.appraisal_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_ag" ON public.appraisal_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_ag" ON public.appraisal_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_ag" ON public.appraisal_goals FOR UPDATE TO authenticated USING (true);

-- Shift Templates
CREATE TABLE IF NOT EXISTS public.shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 60,
  working_hours NUMERIC,
  color TEXT DEFAULT '#3B82F6',
  is_night_shift BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_st" ON public.shift_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_st" ON public.shift_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_st" ON public.shift_templates FOR UPDATE TO authenticated USING (true);

-- Shift Assignments
CREATE TABLE IF NOT EXISTS public.shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT,
  shift_template_id UUID REFERENCES public.shift_templates(id),
  shift_date DATE NOT NULL,
  actual_start TIME,
  actual_end TIME,
  overtime_hours NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_sha" ON public.shift_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sha" ON public.shift_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sha" ON public.shift_assignments FOR UPDATE TO authenticated USING (true);

-- HR Grievances
CREATE TABLE IF NOT EXISTS public.hr_grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL,
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  category TEXT DEFAULT 'workplace',
  severity TEXT DEFAULT 'medium',
  subject TEXT NOT NULL,
  description TEXT,
  investigator_id UUID,
  investigator_name TEXT,
  evidence JSONB DEFAULT '[]',
  actions_taken TEXT,
  resolution TEXT,
  resolution_date DATE,
  status TEXT DEFAULT 'open',
  is_confidential BOOLEAN DEFAULT true,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_grievances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_hg" ON public.hr_grievances FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_hg" ON public.hr_grievances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_hg" ON public.hr_grievances FOR UPDATE TO authenticated USING (true);

-- HR Letter Requests
CREATE TABLE IF NOT EXISTS public.hr_letter_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  letter_type TEXT NOT NULL,
  purpose TEXT,
  additional_details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  generated_url TEXT,
  generated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_letter_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_hlr" ON public.hr_letter_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_hlr" ON public.hr_letter_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_hlr" ON public.hr_letter_requests FOR UPDATE TO authenticated USING (true);

-- Offboarding Checklists
CREATE TABLE IF NOT EXISTS public.offboarding_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  separation_type TEXT DEFAULT 'resignation',
  separation_reason TEXT,
  last_working_date DATE,
  notice_period_days INTEGER DEFAULT 30,
  exit_interview_done BOOLEAN DEFAULT false,
  exit_interview_notes TEXT,
  items JSONB DEFAULT '[]',
  asset_return_status TEXT DEFAULT 'pending',
  finance_clearance_status TEXT DEFAULT 'pending',
  it_clearance_status TEXT DEFAULT 'pending',
  final_settlement_amount NUMERIC,
  final_settlement_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'initiated',
  completed_at TIMESTAMPTZ,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.offboarding_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_oc" ON public.offboarding_checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_oc" ON public.offboarding_checklists FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_oc" ON public.offboarding_checklists FOR UPDATE TO authenticated USING (true);

-- =============================================
-- AI MODULE
-- =============================================

-- AI Anomaly Alerts
CREATE TABLE IF NOT EXISTS public.ai_anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  anomaly_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  record_type TEXT,
  record_id TEXT,
  record_reference TEXT,
  detected_value TEXT,
  expected_range TEXT,
  confidence_score NUMERIC,
  status TEXT DEFAULT 'new',
  investigated_by UUID,
  investigated_at TIMESTAMPTZ,
  investigation_notes TEXT,
  is_false_positive BOOLEAN DEFAULT false,
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_anomaly_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_aa" ON public.ai_anomaly_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_aa" ON public.ai_anomaly_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_aa" ON public.ai_anomaly_alerts FOR UPDATE TO authenticated USING (true);
