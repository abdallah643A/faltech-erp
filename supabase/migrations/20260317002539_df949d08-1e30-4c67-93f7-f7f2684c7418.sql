
-- Supplier Feedback (mobile one-tap feedback from site teams)
CREATE TABLE public.supplier_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  vendor_code TEXT,
  vendor_id UUID REFERENCES public.business_partners(id),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  project_id UUID REFERENCES public.projects(id),
  company_id UUID REFERENCES public.sap_companies(id),
  po_number TEXT,
  site_name TEXT,
  feedback_date TIMESTAMPTZ DEFAULT now(),
  submitted_by UUID,
  submitted_by_name TEXT,
  
  -- Delivery performance (1-5 scale)
  delivery_on_time_score INTEGER DEFAULT 3,
  delivery_quantity_score INTEGER DEFAULT 3,
  delivery_condition_score INTEGER DEFAULT 3,
  delivery_notes TEXT,
  
  -- Quality metrics (1-5 scale)
  quality_spec_compliance_score INTEGER DEFAULT 3,
  quality_defect_score INTEGER DEFAULT 3,
  quality_packaging_score INTEGER DEFAULT 3,
  quality_notes TEXT,
  quality_issue_type TEXT, -- defects, wrong_spec, damaged, contaminated
  
  -- Professionalism (1-5 scale)
  prof_communication_score INTEGER DEFAULT 3,
  prof_behavior_score INTEGER DEFAULT 3,
  prof_responsiveness_score INTEGER DEFAULT 3,
  prof_notes TEXT,
  
  -- Computed overall
  overall_score NUMERIC DEFAULT 0,
  overall_grade TEXT, -- A+, A, B, C, D, F
  
  -- Photos
  photo_urls TEXT[],
  
  -- Flags
  is_critical BOOLEAN DEFAULT false,
  is_safety_related BOOLEAN DEFAULT false,
  requires_escalation BOOLEAN DEFAULT false,
  escalated_at TIMESTAMPTZ,
  escalated_to TEXT,
  escalation_status TEXT DEFAULT 'none', -- none, escalated, acknowledged, resolved
  
  -- Offline sync
  submitted_offline BOOLEAN DEFAULT false,
  offline_synced_at TIMESTAMPTZ,
  device_info TEXT,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier Feedback Responses (closed-loop: suppliers respond)
CREATE TABLE public.supplier_feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES public.supplier_feedback(id) ON DELETE CASCADE NOT NULL,
  vendor_name TEXT NOT NULL,
  response_type TEXT DEFAULT 'acknowledgment', -- acknowledgment, improvement_plan, dispute, resolution
  response_text TEXT NOT NULL,
  attachments TEXT[],
  responded_by TEXT,
  responded_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'submitted', -- submitted, reviewed, accepted, rejected
  reviewed_by UUID,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier Monthly Scorecards (auto-generated monthly aggregation)
CREATE TABLE public.supplier_monthly_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  vendor_code TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  period_month INTEGER NOT NULL, -- 1-12
  period_year INTEGER NOT NULL,
  
  -- Aggregated scores (0-100)
  delivery_score NUMERIC DEFAULT 0,
  quality_score NUMERIC DEFAULT 0,
  professionalism_score NUMERIC DEFAULT 0,
  overall_score NUMERIC DEFAULT 0,
  grade TEXT, -- A+, A, B, C, D, F
  
  -- Counts
  total_feedbacks INTEGER DEFAULT 0,
  critical_issues INTEGER DEFAULT 0,
  safety_issues INTEGER DEFAULT 0,
  escalations INTEGER DEFAULT 0,
  
  -- Trends
  score_change_from_prev NUMERIC DEFAULT 0, -- +/- from previous month
  trend TEXT DEFAULT 'stable', -- improving, stable, declining
  
  -- Improvement tracking
  improvement_actions TEXT[],
  improvement_status TEXT DEFAULT 'none', -- none, in_progress, completed
  
  -- Recognition
  is_top_performer BOOLEAN DEFAULT false,
  recognition_note TEXT,
  
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID,
  
  UNIQUE(vendor_name, project_id, period_month, period_year)
);

-- Supplier Escalation Log
CREATE TABLE public.supplier_escalation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES public.supplier_feedback(id),
  vendor_name TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  company_id UUID REFERENCES public.sap_companies(id),
  escalation_type TEXT NOT NULL, -- critical_issue, safety, repeated_failures, threshold_breach
  severity TEXT DEFAULT 'high', -- medium, high, critical
  title TEXT NOT NULL,
  description TEXT,
  escalated_by UUID,
  escalated_by_name TEXT,
  escalated_to TEXT, -- procurement_manager, site_manager, safety_officer
  status TEXT DEFAULT 'open', -- open, acknowledged, action_taken, resolved, closed
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_supplier_feedback_vendor ON public.supplier_feedback(vendor_name);
CREATE INDEX idx_supplier_feedback_project ON public.supplier_feedback(project_id);
CREATE INDEX idx_supplier_feedback_date ON public.supplier_feedback(feedback_date);
CREATE INDEX idx_supplier_feedback_company ON public.supplier_feedback(company_id);
CREATE INDEX idx_supplier_feedback_critical ON public.supplier_feedback(is_critical) WHERE is_critical = true;
CREATE INDEX idx_feedback_responses_feedback ON public.supplier_feedback_responses(feedback_id);
CREATE INDEX idx_monthly_scorecards_vendor ON public.supplier_monthly_scorecards(vendor_name, period_year, period_month);
CREATE INDEX idx_escalation_log_vendor ON public.supplier_escalation_log(vendor_name);
CREATE INDEX idx_escalation_log_status ON public.supplier_escalation_log(status);

-- RLS
ALTER TABLE public.supplier_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_monthly_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_escalation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON public.supplier_feedback FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.supplier_feedback_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.supplier_monthly_scorecards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.supplier_escalation_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
