
-- Subcontractor Portal Accounts (similar to portal_client_accounts)
CREATE TABLE public.subcontractor_portal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES cpms_subcontractors(id) ON DELETE CASCADE,
  company_id UUID REFERENCES sap_companies(id),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  contact_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.subcontractor_portal_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage sub portal accounts" ON public.subcontractor_portal_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Progress Claims
CREATE TABLE public.sub_progress_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES sap_companies(id),
  subcontractor_id UUID NOT NULL REFERENCES cpms_subcontractors(id),
  subcontract_order_id UUID NOT NULL REFERENCES cpms_subcontract_orders(id),
  project_id UUID REFERENCES projects(id),
  claim_number TEXT NOT NULL,
  claim_period_from DATE NOT NULL,
  claim_period_to DATE NOT NULL,
  description TEXT,
  claimed_amount NUMERIC NOT NULL DEFAULT 0,
  certified_amount NUMERIC DEFAULT 0,
  retention_held NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  cumulative_claimed NUMERIC DEFAULT 0,
  cumulative_certified NUMERIC DEFAULT 0,
  progress_percentage NUMERIC DEFAULT 0,
  supporting_docs_urls TEXT[],
  status TEXT DEFAULT 'draft', -- draft, submitted, under_review, certified, rejected, paid
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  certified_by UUID,
  certified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sub_progress_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage sub progress claims" ON public.sub_progress_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Manpower Logs
CREATE TABLE public.sub_manpower_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES sap_companies(id),
  subcontractor_id UUID NOT NULL REFERENCES cpms_subcontractors(id),
  subcontract_order_id UUID REFERENCES cpms_subcontract_orders(id),
  project_id UUID REFERENCES projects(id),
  log_date DATE NOT NULL,
  category TEXT NOT NULL, -- skilled, unskilled, supervisor, engineer, foreman
  trade TEXT,
  worker_count INTEGER NOT NULL DEFAULT 0,
  hours_worked NUMERIC NOT NULL DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  weather_condition TEXT, -- clear, cloudy, rain, hot, sandstorm
  work_description TEXT,
  safety_incidents INTEGER DEFAULT 0,
  incident_description TEXT,
  notes TEXT,
  status TEXT DEFAULT 'draft', -- draft, submitted, approved, rejected
  submitted_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sub_manpower_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage sub manpower logs" ON public.sub_manpower_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Work Progress Updates
CREATE TABLE public.sub_work_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES sap_companies(id),
  subcontractor_id UUID NOT NULL REFERENCES cpms_subcontractors(id),
  subcontract_order_id UUID REFERENCES cpms_subcontract_orders(id),
  project_id UUID REFERENCES projects(id),
  report_date DATE NOT NULL,
  report_type TEXT DEFAULT 'daily', -- daily, weekly
  activity_description TEXT NOT NULL,
  planned_progress NUMERIC DEFAULT 0,
  actual_progress NUMERIC DEFAULT 0,
  cumulative_progress NUMERIC DEFAULT 0,
  delay_reason TEXT,
  photo_urls TEXT[],
  weather TEXT,
  temperature NUMERIC,
  work_area TEXT,
  equipment_used TEXT[],
  materials_used TEXT,
  issues_encountered TEXT,
  next_day_plan TEXT,
  status TEXT DEFAULT 'draft', -- draft, submitted, acknowledged
  submitted_at TIMESTAMPTZ,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sub_work_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage sub work progress" ON public.sub_work_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Variation Instructions (issued by ERP, responded by subcontractor)
CREATE TABLE public.sub_variation_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES sap_companies(id),
  subcontractor_id UUID NOT NULL REFERENCES cpms_subcontractors(id),
  subcontract_order_id UUID REFERENCES cpms_subcontract_orders(id),
  project_id UUID REFERENCES projects(id),
  variation_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instruction_type TEXT DEFAULT 'addition', -- addition, omission, substitution
  cost_impact NUMERIC DEFAULT 0,
  time_impact_days INTEGER DEFAULT 0,
  issued_by UUID,
  issued_at TIMESTAMPTZ DEFAULT now(),
  attachment_urls TEXT[],
  sub_response TEXT, -- accepted, rejected, counter_proposed
  sub_response_notes TEXT,
  sub_counter_amount NUMERIC,
  sub_counter_days INTEGER,
  sub_responded_at TIMESTAMPTZ,
  status TEXT DEFAULT 'issued', -- issued, acknowledged, accepted, rejected, negotiating, approved, cancelled
  final_approved_amount NUMERIC,
  final_approved_days INTEGER,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sub_variation_instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage sub variations" ON public.sub_variation_instructions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Punch List Responses
CREATE TABLE public.sub_punch_list_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES sap_companies(id),
  subcontractor_id UUID NOT NULL REFERENCES cpms_subcontractors(id),
  project_id UUID REFERENCES projects(id),
  punch_list_item_id UUID, -- reference to snagging items if exists
  item_title TEXT NOT NULL,
  item_description TEXT,
  location TEXT,
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  original_due_date DATE,
  response_status TEXT DEFAULT 'pending', -- pending, acknowledged, in_progress, completed, disputed
  response_notes TEXT,
  before_photo_urls TEXT[],
  after_photo_urls TEXT[],
  completion_date DATE,
  completion_percentage NUMERIC DEFAULT 0,
  disputed_reason TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  verification_status TEXT, -- pending, accepted, rejected
  verification_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sub_punch_list_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage sub punch list" ON public.sub_punch_list_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_sub_portal_accounts_sub ON subcontractor_portal_accounts(subcontractor_id);
CREATE INDEX idx_sub_claims_sub ON sub_progress_claims(subcontractor_id);
CREATE INDEX idx_sub_claims_order ON sub_progress_claims(subcontract_order_id);
CREATE INDEX idx_sub_manpower_sub ON sub_manpower_logs(subcontractor_id);
CREATE INDEX idx_sub_manpower_date ON sub_manpower_logs(log_date);
CREATE INDEX idx_sub_progress_sub ON sub_work_progress(subcontractor_id);
CREATE INDEX idx_sub_progress_date ON sub_work_progress(report_date);
CREATE INDEX idx_sub_variations_sub ON sub_variation_instructions(subcontractor_id);
CREATE INDEX idx_sub_punch_sub ON sub_punch_list_responses(subcontractor_id);
