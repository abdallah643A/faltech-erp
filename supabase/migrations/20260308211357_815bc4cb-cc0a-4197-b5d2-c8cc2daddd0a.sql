
-- =====================================================
-- CPMS – Construction Project Management System
-- Full Database Schema (40+ tables)
-- =====================================================

-- ==========================================
-- GROUP A: Project & Contract Entities
-- ==========================================

CREATE TABLE public.cpms_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_ar text,
  type text DEFAULT 'building', -- building, civil, mep, infrastructure, mixed
  classification text, -- residential, commercial, industrial, government
  status text DEFAULT 'planning', -- planning, active, on_hold, completed, cancelled
  start_date date,
  end_date date,
  actual_start_date date,
  actual_end_date date,
  client_id uuid,
  client_name text,
  contract_value numeric DEFAULT 0,
  revised_contract_value numeric DEFAULT 0,
  currency text DEFAULT 'SAR',
  location text,
  city text,
  country text DEFAULT 'Saudi Arabia',
  latitude numeric,
  longitude numeric,
  description text,
  sap_project_code text,
  sap_cost_center text,
  branch_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  contract_no text NOT NULL,
  type text DEFAULT 'main', -- main, sub, variation
  client_id uuid,
  client_name text,
  value numeric DEFAULT 0,
  retention_pct numeric DEFAULT 10,
  variation_value numeric DEFAULT 0,
  advance_payment_pct numeric DEFAULT 0,
  performance_bond_pct numeric DEFAULT 0,
  defect_liability_months int DEFAULT 12,
  start_date date,
  end_date date,
  status text DEFAULT 'draft', -- draft, active, completed, terminated
  signed_date date,
  sap_bp_code text,
  remarks text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_wbs_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text,
  level int DEFAULT 1,
  type text DEFAULT 'package', -- phase, package, activity
  sort_order int DEFAULT 0,
  start_date date,
  end_date date,
  budget_amount numeric DEFAULT 0,
  progress_pct numeric DEFAULT 0,
  status text DEFAULT 'pending', -- pending, in_progress, completed
  sap_wbs_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.cpms_contracts(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  number text NOT NULL,
  title text NOT NULL,
  description text,
  value numeric DEFAULT 0,
  status text DEFAULT 'pending', -- pending, submitted, approved, rejected
  submitted_date date,
  approved_date date,
  approved_by uuid,
  rejection_reason text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_payment_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.cpms_contracts(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric DEFAULT 0,
  percentage numeric,
  due_date date,
  status text DEFAULT 'pending', -- pending, invoiced, paid
  invoice_id uuid,
  paid_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_project_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  user_name text,
  role text NOT NULL, -- project_manager, site_engineer, cost_engineer, safety_officer, etc
  start_date date,
  end_date date,
  allocation_pct numeric DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- GROUP B: Schedule Entities
-- ==========================================

CREATE TABLE public.cpms_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  version int DEFAULT 1,
  type text DEFAULT 'current', -- baseline, current, recovery
  status text DEFAULT 'draft', -- draft, approved, superseded
  approved_by uuid,
  approved_date date,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_schedule_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.cpms_schedules(id) ON DELETE CASCADE NOT NULL,
  wbs_id uuid REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  start_date date,
  end_date date,
  actual_start date,
  actual_end date,
  duration int DEFAULT 0, -- days
  predecessors jsonb DEFAULT '[]',
  type text DEFAULT 'task', -- task, milestone, summary, hammock
  progress_pct numeric DEFAULT 0,
  float_days int DEFAULT 0,
  is_critical boolean DEFAULT false,
  resource_names text,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_schedule_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  schedule_id uuid REFERENCES public.cpms_schedules(id) ON DELETE CASCADE,
  name text NOT NULL,
  frozen_at timestamptz DEFAULT now(),
  data_snapshot jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_activity_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES public.cpms_schedule_activities(id) ON DELETE CASCADE NOT NULL,
  resource_type text NOT NULL, -- labor, material, equipment, subcontractor
  resource_name text,
  resource_id uuid,
  quantity numeric DEFAULT 0,
  unit text,
  rate numeric DEFAULT 0,
  planned_cost numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_lookahead_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  week_end date,
  status text DEFAULT 'draft',
  activities jsonb DEFAULT '[]',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_s_curve_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  schedule_id uuid REFERENCES public.cpms_schedules(id) ON DELETE SET NULL,
  period date NOT NULL,
  planned_value numeric DEFAULT 0,
  earned_value numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- GROUP C: Cost Management Entities
-- ==========================================

CREATE TABLE public.cpms_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  version int DEFAULT 1,
  name text DEFAULT 'Original Budget',
  total_value numeric DEFAULT 0,
  contingency_pct numeric DEFAULT 5,
  contingency_amount numeric DEFAULT 0,
  status text DEFAULT 'draft', -- draft, submitted, approved, revised
  approved_by uuid,
  approved_date date,
  sap_budget_id text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid REFERENCES public.cpms_budgets(id) ON DELETE CASCADE NOT NULL,
  wbs_id uuid REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  cost_code text,
  description text NOT NULL,
  quantity numeric DEFAULT 0,
  unit text,
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  revision_no int DEFAULT 0,
  sap_gl_account text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  wbs_id uuid REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  type text NOT NULL, -- po, subcontract
  ref_id uuid,
  ref_number text,
  vendor_id uuid,
  vendor_name text,
  description text,
  committed_amount numeric DEFAULT 0,
  invoiced_amount numeric DEFAULT 0,
  remaining_amount numeric DEFAULT 0,
  status text DEFAULT 'open', -- open, partially_invoiced, closed, cancelled
  sap_po_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_actual_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  wbs_id uuid REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  cost_code text,
  vendor_id uuid,
  vendor_name text,
  invoice_id uuid,
  invoice_number text,
  amount numeric DEFAULT 0,
  posting_date date,
  description text,
  source text DEFAULT 'manual', -- manual, sap_sync
  sap_entry_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_cost_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  wbs_id uuid REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  period date,
  bac numeric DEFAULT 0,
  eac numeric DEFAULT 0,
  etc numeric DEFAULT 0,
  variance numeric DEFAULT 0,
  cpi numeric DEFAULT 0,
  spi numeric DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_evm_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  snapshot_date date NOT NULL,
  bcws numeric DEFAULT 0,
  bcwp numeric DEFAULT 0,
  acwp numeric DEFAULT 0,
  spi numeric DEFAULT 0,
  cpi numeric DEFAULT 0,
  vac numeric DEFAULT 0,
  eac numeric DEFAULT 0,
  bac numeric DEFAULT 0,
  etc numeric DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- GROUP D: Procurement Entities (Construction-specific)
-- ==========================================

CREATE TABLE public.cpms_rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  mr_id uuid,
  rfq_no text NOT NULL,
  title text NOT NULL,
  description text,
  issue_date date DEFAULT CURRENT_DATE,
  close_date date,
  status text DEFAULT 'open', -- open, closed, awarded, cancelled
  items jsonb DEFAULT '[]',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_rfq_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid REFERENCES public.cpms_rfqs(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid,
  vendor_name text NOT NULL,
  total_price numeric DEFAULT 0,
  validity_date date,
  delivery_days int,
  payment_terms text,
  notes text,
  items jsonb DEFAULT '[]',
  is_selected boolean DEFAULT false,
  evaluated_score numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_subcontracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  wbs_id uuid REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  sc_number text NOT NULL,
  vendor_id uuid,
  vendor_name text NOT NULL,
  scope_of_work text,
  value numeric DEFAULT 0,
  retention_pct numeric DEFAULT 10,
  advance_pct numeric DEFAULT 0,
  start_date date,
  end_date date,
  status text DEFAULT 'draft', -- draft, active, completed, terminated
  sap_po_id text,
  sor_items jsonb DEFAULT '[]', -- schedule of rates
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_sc_payment_certs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontract_id uuid REFERENCES public.cpms_subcontracts(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  cert_no text NOT NULL,
  period_from date,
  period_to date,
  gross_amount numeric DEFAULT 0,
  retention_amount numeric DEFAULT 0,
  advance_deduction numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  status text DEFAULT 'draft', -- draft, submitted, certified, paid
  certified_by uuid,
  certified_date date,
  sap_invoice_id text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_grns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  po_id uuid,
  grn_no text NOT NULL,
  vendor_name text,
  receipt_date date DEFAULT CURRENT_DATE,
  received_by uuid,
  received_by_name text,
  status text DEFAULT 'pending', -- pending, confirmed, rejected
  items jsonb DEFAULT '[]',
  notes text,
  sap_grn_id text,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- GROUP E: Progress & Field Reporting
-- ==========================================

CREATE TABLE public.cpms_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  report_date date NOT NULL,
  report_number text,
  site_engineer_id uuid,
  site_engineer_name text,
  weather text, -- sunny, cloudy, rainy, windy, sandstorm
  temperature_high numeric,
  temperature_low numeric,
  manpower_count int DEFAULT 0,
  equipment_count int DEFAULT 0,
  work_summary text,
  delays_notes text,
  safety_observations text,
  incidents_count int DEFAULT 0,
  visitor_log text,
  status text DEFAULT 'draft', -- draft, submitted, approved
  approved_by uuid,
  approved_date date,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_daily_manpower (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid REFERENCES public.cpms_daily_reports(id) ON DELETE CASCADE NOT NULL,
  trade text NOT NULL, -- carpenter, mason, electrician, plumber, laborer, etc
  headcount int DEFAULT 0,
  contractor text,
  hours_worked numeric DEFAULT 8,
  overtime_hours numeric DEFAULT 0,
  remarks text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_daily_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid REFERENCES public.cpms_daily_reports(id) ON DELETE CASCADE NOT NULL,
  equipment_type text NOT NULL,
  equipment_id text,
  hours_worked numeric DEFAULT 0,
  idle_hours numeric DEFAULT 0,
  fuel_consumed numeric,
  operator_name text,
  status text DEFAULT 'working', -- working, idle, breakdown
  remarks text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_quantity_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  activity_id uuid REFERENCES public.cpms_schedule_activities(id) ON DELETE SET NULL,
  wbs_id uuid REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  item_code text,
  description text NOT NULL,
  unit text,
  planned_qty numeric DEFAULT 0,
  previous_qty numeric DEFAULT 0,
  this_period_qty numeric DEFAULT 0,
  cumulative_qty numeric DEFAULT 0,
  progress_pct numeric DEFAULT 0,
  report_date date DEFAULT CURRENT_DATE,
  reported_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_site_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  daily_report_id uuid REFERENCES public.cpms_daily_reports(id) ON DELETE SET NULL,
  activity_id uuid REFERENCES public.cpms_schedule_activities(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  caption text,
  taken_by uuid,
  taken_by_name text,
  taken_at timestamptz DEFAULT now(),
  location text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_hse_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  incident_date date NOT NULL,
  incident_time time,
  type text NOT NULL, -- near_miss, first_aid, medical_treatment, lost_time, fatality, property_damage, environmental
  severity text DEFAULT 'low', -- low, medium, high, critical
  location text,
  description text NOT NULL,
  injured_person text,
  injured_company text,
  root_cause text,
  corrective_action text,
  preventive_action text,
  status text DEFAULT 'open', -- open, investigating, corrective_action, closed
  investigated_by uuid,
  closed_date date,
  report_number text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- GROUP F: Document Control Entities
-- ==========================================

CREATE TABLE public.cpms_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- drawing, specification, report, correspondence, method_statement, itp
  doc_no text NOT NULL,
  title text NOT NULL,
  discipline text, -- architectural, structural, mep, civil, landscape
  current_revision text DEFAULT 'A',
  status text DEFAULT 'draft', -- draft, for_review, approved, superseded
  file_path text,
  uploaded_by uuid,
  upload_date timestamptz DEFAULT now(),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_doc_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.cpms_documents(id) ON DELETE CASCADE NOT NULL,
  revision text NOT NULL,
  file_path text,
  description text,
  revised_by uuid,
  revised_by_name text,
  revised_at timestamptz DEFAULT now(),
  status text DEFAULT 'current' -- current, superseded
);

CREATE TABLE public.cpms_rfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  rfi_number text NOT NULL,
  subject text NOT NULL,
  description text,
  discipline text,
  priority text DEFAULT 'normal', -- low, normal, high, urgent
  raised_by uuid,
  raised_by_name text,
  raised_date date DEFAULT CURRENT_DATE,
  assigned_to text, -- consultant, client
  due_date date,
  response text,
  responded_by text,
  responded_date date,
  status text DEFAULT 'open', -- open, submitted, responded, closed
  impact_cost boolean DEFAULT false,
  impact_schedule boolean DEFAULT false,
  related_drawing text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_submittals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  submittal_number text NOT NULL,
  title text NOT NULL,
  type text DEFAULT 'material', -- material, shop_drawing, method_statement, sample
  discipline text,
  submitted_by uuid,
  submitted_date date DEFAULT CURRENT_DATE,
  reviewer text,
  review_status text DEFAULT 'pending', -- pending, approved, approved_with_comments, rejected, resubmit
  review_date date,
  review_comments text,
  revision int DEFAULT 0,
  file_path text,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_ncrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  ncr_number text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  location text,
  discipline text,
  raised_by uuid,
  raised_by_name text,
  raised_date date DEFAULT CURRENT_DATE,
  responsible_party text, -- contractor, subcontractor, supplier
  root_cause text,
  corrective_action text,
  corrective_action_date date,
  verification_result text,
  verified_by uuid,
  verified_date date,
  cost_impact numeric DEFAULT 0,
  schedule_impact_days int DEFAULT 0,
  severity text DEFAULT 'minor', -- minor, major, critical
  status text DEFAULT 'open', -- open, action_required, corrected, closed
  photos jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_transmittals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  transmittal_no text NOT NULL,
  to_party text NOT NULL,
  from_party text,
  subject text NOT NULL,
  purpose text DEFAULT 'for_review', -- for_review, for_approval, for_information, for_construction, as_built
  document_ids jsonb DEFAULT '[]',
  sent_date date DEFAULT CURRENT_DATE,
  sent_by uuid,
  acknowledged boolean DEFAULT false,
  acknowledged_date date,
  remarks text,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- GROUP G: Billing & Revenue Entities
-- ==========================================

CREATE TABLE public.cpms_ipas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  contract_id uuid REFERENCES public.cpms_contracts(id) ON DELETE SET NULL,
  ipa_no text NOT NULL,
  period_from date,
  period_to date,
  submitted_date date,
  gross_amount numeric DEFAULT 0,
  previous_amount numeric DEFAULT 0,
  this_period_amount numeric DEFAULT 0,
  retention_amount numeric DEFAULT 0,
  advance_deduction numeric DEFAULT 0,
  other_deductions numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  certified_amount numeric,
  certified_by text,
  certified_date date,
  status text DEFAULT 'draft', -- draft, submitted, under_review, certified, paid, disputed
  sap_invoice_id text,
  remarks text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_ipa_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipa_id uuid REFERENCES public.cpms_ipas(id) ON DELETE CASCADE NOT NULL,
  wbs_id uuid REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  boq_item text,
  description text NOT NULL,
  unit text,
  contract_qty numeric DEFAULT 0,
  contract_rate numeric DEFAULT 0,
  contract_amount numeric DEFAULT 0,
  previous_qty numeric DEFAULT 0,
  previous_amount numeric DEFAULT 0,
  this_period_qty numeric DEFAULT 0,
  this_period_amount numeric DEFAULT 0,
  cumulative_qty numeric DEFAULT 0,
  cumulative_amount numeric DEFAULT 0,
  cumulative_pct numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_retention_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL, -- retained, released
  amount numeric DEFAULT 0,
  ipa_id uuid REFERENCES public.cpms_ipas(id) ON DELETE SET NULL,
  description text,
  release_date date,
  released_by uuid,
  sap_entry_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cpms_revenue_recognition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  period date NOT NULL,
  method text DEFAULT 'percentage_completion', -- percentage_completion, milestone
  completion_pct numeric DEFAULT 0,
  recognized_revenue numeric DEFAULT 0,
  deferred_revenue numeric DEFAULT 0,
  cumulative_revenue numeric DEFAULT 0,
  sap_entry_id text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- RLS Policies for all CPMS tables
-- ==========================================

ALTER TABLE public.cpms_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_wbs_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_schedule_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_schedule_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_activity_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_lookahead_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_s_curve_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_actual_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_cost_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_evm_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_rfq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_subcontracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_sc_payment_certs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_grns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_daily_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_daily_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_quantity_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_site_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_hse_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_doc_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_submittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_ncrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_transmittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_ipas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_ipa_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_retention_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_revenue_recognition ENABLE ROW LEVEL SECURITY;

-- SELECT policies for authenticated users
CREATE POLICY "auth_select" ON public.cpms_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_wbs_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_variations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_payment_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_project_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_schedule_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_schedule_baselines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_activity_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_lookahead_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_s_curve_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_budget_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_commitments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_actual_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_cost_forecasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_evm_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_rfqs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_rfq_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_subcontracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_sc_payment_certs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_grns FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_daily_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_daily_manpower FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_daily_equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_quantity_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_site_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_hse_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_doc_revisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_rfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_submittals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_ncrs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_transmittals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_ipas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_ipa_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_retention_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select" ON public.cpms_revenue_recognition FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE policies for authenticated users
CREATE POLICY "auth_all" ON public.cpms_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_wbs_nodes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_variations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_payment_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_project_teams FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_schedule_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_schedule_baselines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_activity_resources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_lookahead_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_s_curve_data FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_budget_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_commitments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_actual_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_cost_forecasts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_evm_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_rfqs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_rfq_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_subcontracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_sc_payment_certs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_grns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_daily_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_daily_manpower FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_daily_equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_quantity_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_site_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_hse_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_doc_revisions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_rfis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_submittals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_ncrs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_transmittals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_ipas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_ipa_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_retention_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.cpms_revenue_recognition FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Key indexes
CREATE INDEX idx_cpms_wbs_project ON public.cpms_wbs_nodes(project_id);
CREATE INDEX idx_cpms_wbs_parent ON public.cpms_wbs_nodes(parent_id);
CREATE INDEX idx_cpms_activities_schedule ON public.cpms_schedule_activities(schedule_id);
CREATE INDEX idx_cpms_activities_project ON public.cpms_schedule_activities(project_id);
CREATE INDEX idx_cpms_budget_lines_budget ON public.cpms_budget_lines(budget_id);
CREATE INDEX idx_cpms_commitments_project ON public.cpms_commitments(project_id);
CREATE INDEX idx_cpms_actual_costs_project ON public.cpms_actual_costs(project_id);
CREATE INDEX idx_cpms_daily_reports_project ON public.cpms_daily_reports(project_id, report_date);
CREATE INDEX idx_cpms_rfis_project ON public.cpms_rfis(project_id);
CREATE INDEX idx_cpms_ipas_project ON public.cpms_ipas(project_id);
CREATE INDEX idx_cpms_documents_project ON public.cpms_documents(project_id);
CREATE INDEX idx_cpms_hse_project ON public.cpms_hse_incidents(project_id);
