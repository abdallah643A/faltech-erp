
-- 1. Workflow Rule Versions
CREATE TABLE public.workflow_rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.approval_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  rules_config JSONB,
  conditions_config JSONB,
  published_by UUID,
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_rule_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_wf_versions" ON public.workflow_rule_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_wf_versions_ts BEFORE UPDATE ON public.workflow_rule_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Workflow Status Rules
CREATE TABLE public.workflow_status_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  conditions JSONB DEFAULT '{}',
  required_fields TEXT[] DEFAULT '{}',
  action_visibility JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_status_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_status_rules" ON public.workflow_status_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Customer Credit Control
CREATE TABLE public.customer_credit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.business_partners(id) ON DELETE CASCADE,
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  warning_threshold_pct NUMERIC DEFAULT 80,
  block_threshold_pct NUMERIC DEFAULT 100,
  risk_rating TEXT DEFAULT 'medium' CHECK (risk_rating IN ('low','medium','high','critical')),
  auto_block_on_overdue BOOLEAN DEFAULT false,
  overdue_days_threshold INTEGER DEFAULT 90,
  override_approved_by UUID,
  override_expires_at TIMESTAMPTZ,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_credit_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_credit_settings" ON public.customer_credit_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_credit_settings_ts BEFORE UPDATE ON public.customer_credit_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.credit_override_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.business_partners(id),
  requested_by UUID,
  requested_by_name TEXT,
  reason TEXT NOT NULL,
  current_limit NUMERIC,
  requested_limit NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_override_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_credit_overrides" ON public.credit_override_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Exception Management Center
CREATE TABLE public.erp_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  exception_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
  title TEXT NOT NULL,
  description TEXT,
  source_document_type TEXT,
  source_document_id UUID,
  source_document_number TEXT,
  root_cause_category TEXT,
  owner_id UUID,
  owner_name TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','ignored')),
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_exceptions" ON public.erp_exceptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_exceptions_ts BEFORE UPDATE ON public.erp_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_exceptions_status ON public.erp_exceptions(status);
CREATE INDEX idx_exceptions_module ON public.erp_exceptions(module);
CREATE INDEX idx_exceptions_company ON public.erp_exceptions(company_id);

-- 4. Margin Protection
CREATE TABLE public.margin_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL DEFAULT 'quotes',
  min_margin_pct NUMERIC NOT NULL DEFAULT 15,
  warning_margin_pct NUMERIC NOT NULL DEFAULT 20,
  requires_approval_below NUMERIC,
  approval_role TEXT,
  block_below NUMERIC,
  competitor_price_required BOOLEAN DEFAULT false,
  discount_reason_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.margin_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_margin_rules" ON public.margin_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.margin_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  document_id UUID,
  document_number TEXT,
  requested_margin NUMERIC,
  min_allowed_margin NUMERIC,
  discount_pct NUMERIC,
  reason TEXT,
  competitor_price NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.margin_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_margin_exceptions" ON public.margin_exceptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. SLA Engine
CREATE TABLE public.sla_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  target_response_hours NUMERIC NOT NULL DEFAULT 24,
  target_completion_hours NUMERIC NOT NULL DEFAULT 72,
  escalation_hours NUMERIC,
  escalation_to_role TEXT,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sla_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_sla_defs" ON public.sla_definitions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.sla_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_definition_id UUID REFERENCES public.sla_definitions(id),
  module TEXT NOT NULL,
  record_id UUID,
  record_number TEXT,
  priority TEXT DEFAULT 'medium',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  response_status TEXT DEFAULT 'pending' CHECK (response_status IN ('pending','met','breached')),
  completion_status TEXT DEFAULT 'pending' CHECK (completion_status IN ('pending','met','breached')),
  escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sla_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_sla_tracking" ON public.sla_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_sla_tracking_module ON public.sla_tracking(module);
CREATE INDEX idx_sla_tracking_status ON public.sla_tracking(completion_status);

-- 6. Contract Management
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('customer','vendor')),
  partner_id UUID REFERENCES public.business_partners(id),
  partner_name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','expired','terminated','renewed')),
  retention_pct NUMERIC DEFAULT 0,
  penalty_clause TEXT,
  renewal_type TEXT DEFAULT 'manual' CHECK (renewal_type IN ('auto','manual','none')),
  renewal_reminder_days INTEGER DEFAULT 30,
  linked_sales_order_id UUID,
  linked_project_id UUID,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_contracts" ON public.contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_contracts_ts BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.contract_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','overdue')),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_milestones" ON public.contract_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Budget vs Actual Control
CREATE TABLE public.budget_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  category TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  variance_amount NUMERIC GENERATED ALWAYS AS (budget_amount - actual_amount) STORED,
  variance_pct NUMERIC GENERATED ALWAYS AS (CASE WHEN budget_amount > 0 THEN ((budget_amount - actual_amount) / budget_amount * 100) ELSE 0 END) STORED,
  branch_id UUID REFERENCES public.branches(id),
  department_id UUID,
  project_id UUID,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_actuals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_budget_actuals" ON public.budget_actuals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_budget_actuals_ts BEFORE UPDATE ON public.budget_actuals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Boardroom Reporting
CREATE TABLE public.boardroom_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_label TEXT NOT NULL,
  revenue NUMERIC DEFAULT 0,
  gross_profit NUMERIC DEFAULT 0,
  procurement_savings NUMERIC DEFAULT 0,
  overdue_receivables NUMERIC DEFAULT 0,
  cash_position NUMERIC DEFAULT 0,
  project_margin_avg NUMERIC DEFAULT 0,
  production_efficiency NUMERIC DEFAULT 0,
  headcount INTEGER DEFAULT 0,
  compliance_score NUMERIC DEFAULT 0,
  data JSONB DEFAULT '{}',
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.boardroom_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_boardroom" ON public.boardroom_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
