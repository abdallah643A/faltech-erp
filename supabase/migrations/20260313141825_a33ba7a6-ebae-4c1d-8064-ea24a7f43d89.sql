
-- Project Control Thresholds (configurable alert thresholds per project)
CREATE TABLE public.project_control_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT false,
  cpi_warning NUMERIC DEFAULT 0.95,
  cpi_critical NUMERIC DEFAULT 0.85,
  spi_warning NUMERIC DEFAULT 0.95,
  spi_critical NUMERIC DEFAULT 0.85,
  budget_variance_warning NUMERIC DEFAULT 5,
  budget_variance_critical NUMERIC DEFAULT 10,
  schedule_variance_warning_days INTEGER DEFAULT 7,
  schedule_variance_critical_days INTEGER DEFAULT 14,
  auto_escalate BOOLEAN DEFAULT true,
  escalation_email_1 TEXT,
  escalation_email_2 TEXT,
  escalation_email_3 TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project Control Alerts (threshold breach alerts)
CREATE TABLE public.project_control_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL, -- 'cpi_warning', 'cpi_critical', 'spi_warning', 'spi_critical', 'budget_variance', 'milestone_at_risk'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'warning', 'critical'
  title TEXT NOT NULL,
  description TEXT,
  metric_name TEXT,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  escalation_level INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Budget Transfers (between cost codes with approval)
CREATE TABLE public.budget_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  transfer_number TEXT NOT NULL,
  from_cost_code TEXT NOT NULL,
  from_cost_name TEXT,
  to_cost_code TEXT NOT NULL,
  to_cost_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_by UUID,
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contingency Reserves (Management Reserve + Contingency Reserve)
CREATE TABLE public.contingency_reserves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  reserve_type TEXT NOT NULL, -- 'management_reserve', 'contingency_reserve'
  original_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  released_amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contingency Release Log
CREATE TABLE public.contingency_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserve_id UUID REFERENCES public.contingency_reserves(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  linked_risk_id UUID,
  linked_change_id UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Commitment Tracking (POs/contracts committed but not yet invoiced)
CREATE TABLE public.financial_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  commitment_type TEXT NOT NULL, -- 'purchase_order', 'contract', 'labor_booking'
  reference_number TEXT,
  reference_id UUID,
  vendor_name TEXT,
  description TEXT,
  committed_amount NUMERIC NOT NULL DEFAULT 0,
  invoiced_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC GENERATED ALWAYS AS (committed_amount - invoiced_amount) STORED,
  cost_code TEXT,
  expected_invoice_date DATE,
  status TEXT DEFAULT 'open', -- 'open', 'partially_invoiced', 'fully_invoiced', 'cancelled'
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Variance Explanations (mandatory for threshold breaches)
CREATE TABLE public.variance_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  alert_id UUID REFERENCES public.project_control_alerts(id),
  variance_type TEXT NOT NULL, -- 'cost', 'schedule', 'scope'
  period TEXT,
  variance_amount NUMERIC,
  variance_percent NUMERIC,
  explanation TEXT NOT NULL,
  corrective_action TEXT,
  expected_recovery_date DATE,
  submitted_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'submitted', -- 'submitted', 'reviewed', 'accepted'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Project Baselines (for baseline comparison)
CREATE TABLE public.project_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  baseline_number INTEGER NOT NULL DEFAULT 1,
  baseline_name TEXT NOT NULL,
  baseline_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_budget NUMERIC NOT NULL DEFAULT 0,
  planned_duration_days INTEGER,
  planned_end_date DATE,
  baseline_data JSONB, -- snapshot of milestones, tasks, budget breakdown
  reason_for_rebaseline TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Financial Scenarios for What-If Analysis
CREATE TABLE public.financial_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  scenario_name TEXT NOT NULL, -- 'optimistic', 'base', 'pessimistic', 'custom'
  scenario_type TEXT NOT NULL DEFAULT 'custom',
  eac_override NUMERIC,
  cost_adjustment_percent NUMERIC DEFAULT 0,
  schedule_adjustment_days INTEGER DEFAULT 0,
  risk_contingency_percent NUMERIC DEFAULT 0,
  assumptions JSONB,
  projected_end_date DATE,
  projected_total_cost NUMERIC,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.project_control_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_control_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contingency_reserves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contingency_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variance_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can manage project_control_thresholds" ON public.project_control_thresholds FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage project_control_alerts" ON public.project_control_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage budget_transfers" ON public.budget_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage contingency_reserves" ON public.contingency_reserves FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage contingency_releases" ON public.contingency_releases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage financial_commitments" ON public.financial_commitments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage variance_explanations" ON public.variance_explanations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage project_baselines" ON public.project_baselines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage financial_scenarios" ON public.financial_scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
