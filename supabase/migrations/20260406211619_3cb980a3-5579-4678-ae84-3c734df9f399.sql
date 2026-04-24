
-- Board Pack Templates
CREATE TABLE IF NOT EXISTS public.board_pack_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  pack_type TEXT NOT NULL DEFAULT 'monthly',
  description TEXT,
  sections JSONB DEFAULT '[]'::jsonb,
  kpi_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.board_pack_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_board_pack_templates" ON public.board_pack_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Board Pack Instances
CREATE TABLE IF NOT EXISTS public.board_pack_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.board_pack_templates(id),
  company_id UUID REFERENCES public.sap_companies(id),
  title TEXT NOT NULL,
  reporting_period TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  narrative TEXT,
  executive_summary TEXT,
  strategic_notes TEXT,
  status TEXT DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  exported_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.board_pack_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_board_pack_instances" ON public.board_pack_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Process Mining Events
CREATE TABLE IF NOT EXISTS public.process_mining_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  process_name TEXT NOT NULL,
  process_instance_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  step_order INT DEFAULT 1,
  variant TEXT,
  actor TEXT,
  department TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_hours NUMERIC,
  is_rework BOOLEAN DEFAULT false,
  is_bottleneck BOOLEAN DEFAULT false,
  conformance_status TEXT DEFAULT 'conforming',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.process_mining_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_process_mining" ON public.process_mining_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document Retention Policies
CREATE TABLE IF NOT EXISTS public.document_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  document_type TEXT NOT NULL,
  category TEXT,
  retention_years INT NOT NULL DEFAULT 7,
  legal_requirement TEXT,
  destruction_method TEXT DEFAULT 'secure_delete',
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.document_retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_retention_policies" ON public.document_retention_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document Retention Records
CREATE TABLE IF NOT EXISTS public.document_retention_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.document_retention_policies(id),
  company_id UUID REFERENCES public.sap_companies(id),
  document_reference TEXT NOT NULL,
  document_title TEXT,
  document_date DATE,
  retention_expires_at DATE,
  lifecycle_status TEXT DEFAULT 'active',
  legal_hold BOOLEAN DEFAULT false,
  legal_hold_reason TEXT,
  legal_hold_by UUID,
  legal_hold_at TIMESTAMPTZ,
  destruction_requested_at TIMESTAMPTZ,
  destruction_requested_by UUID,
  destruction_approved_at TIMESTAMPTZ,
  destruction_approved_by UUID,
  destroyed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.document_retention_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_retention_records" ON public.document_retention_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Compliance Obligations
CREATE TABLE IF NOT EXISTS public.compliance_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  obligation_type TEXT NOT NULL,
  category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  due_date DATE,
  frequency TEXT DEFAULT 'annual',
  owner_name TEXT,
  owner_id UUID,
  status TEXT DEFAULT 'pending',
  severity TEXT DEFAULT 'medium',
  escalation_level INT DEFAULT 0,
  last_completed_at TIMESTAMPTZ,
  reminder_days INT DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.compliance_obligations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_compliance_obligations" ON public.compliance_obligations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Risk Approval Rules
CREATE TABLE IF NOT EXISTS public.risk_approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  rule_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  condition_field TEXT NOT NULL,
  condition_operator TEXT DEFAULT 'greater_than',
  condition_value TEXT,
  risk_score_min NUMERIC,
  risk_score_max NUMERIC,
  routing_type TEXT DEFAULT 'sequential',
  approver_roles TEXT[],
  delegation_allowed BOOLEAN DEFAULT false,
  delegation_max_days INT DEFAULT 5,
  escalation_hours INT DEFAULT 48,
  emergency_path BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 100,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.risk_approval_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_risk_approval_rules" ON public.risk_approval_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customer Portal Interactions
CREATE TABLE IF NOT EXISTS public.customer_portal_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  interaction_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  reference_number TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  assigned_name TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.customer_portal_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_customer_portal" ON public.customer_portal_interactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PMO Portfolio Items
CREATE TABLE IF NOT EXISTS public.pmo_portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  project_name TEXT NOT NULL,
  portfolio_category TEXT DEFAULT 'active',
  current_gate TEXT,
  gate_status TEXT DEFAULT 'on_track',
  priority_score INT DEFAULT 50,
  strategic_alignment TEXT,
  risk_level TEXT DEFAULT 'medium',
  milestone_health TEXT DEFAULT 'green',
  resource_pressure TEXT DEFAULT 'normal',
  budget_variance_pct NUMERIC DEFAULT 0,
  schedule_variance_pct NUMERIC DEFAULT 0,
  decision_required BOOLEAN DEFAULT false,
  decision_notes TEXT,
  next_review_date DATE,
  sponsor_name TEXT,
  pmo_owner TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pmo_portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_pmo_portfolio" ON public.pmo_portfolio_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PMO Decision Log
CREATE TABLE IF NOT EXISTS public.pmo_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  portfolio_item_id UUID REFERENCES public.pmo_portfolio_items(id),
  decision_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  decided_by TEXT,
  decided_at TIMESTAMPTZ DEFAULT now(),
  impact TEXT,
  status TEXT DEFAULT 'decided',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pmo_decision_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_pmo_decisions" ON public.pmo_decision_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Integration Monitor Events
CREATE TABLE IF NOT EXISTS public.integration_monitor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  integration_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  direction TEXT DEFAULT 'inbound',
  status TEXT DEFAULT 'success',
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  record_type TEXT,
  record_id TEXT,
  record_reference TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  root_cause TEXT,
  owner_name TEXT,
  sla_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.integration_monitor_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_integration_monitor" ON public.integration_monitor_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Release Readiness Checklists
CREATE TABLE IF NOT EXISTS public.release_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  release_version TEXT NOT NULL,
  release_date DATE,
  release_type TEXT DEFAULT 'minor',
  status TEXT DEFAULT 'planning',
  go_live_decision TEXT DEFAULT 'pending',
  go_live_decided_by TEXT,
  go_live_decided_at TIMESTAMPTZ,
  impacted_modules TEXT[],
  total_items INT DEFAULT 0,
  completed_items INT DEFAULT 0,
  blocked_items INT DEFAULT 0,
  post_release_issues INT DEFAULT 0,
  watchlist_end_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.release_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_release_checklists" ON public.release_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Release Checklist Items
CREATE TABLE IF NOT EXISTS public.release_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.release_checklists(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  item_title TEXT NOT NULL,
  item_type TEXT DEFAULT 'test',
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  owner_name TEXT,
  signed_off_by TEXT,
  signed_off_at TIMESTAMPTZ,
  notes TEXT,
  is_blocker BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.release_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_release_items" ON public.release_checklist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Release Post-Release Issues
CREATE TABLE IF NOT EXISTS public.release_post_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.release_checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  module TEXT,
  description TEXT,
  reported_by TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.release_post_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crud_release_post_issues" ON public.release_post_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);
