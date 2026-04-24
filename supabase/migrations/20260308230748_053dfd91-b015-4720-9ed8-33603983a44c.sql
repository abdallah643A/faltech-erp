
-- ITSM Enhancement: SLA Configuration, Change Management, Problem Management, CMDB, Incident Templates

-- SLA Configurations
CREATE TABLE IF NOT EXISTS public.it_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium',
  response_time_hours NUMERIC NOT NULL DEFAULT 4,
  resolution_time_hours NUMERIC NOT NULL DEFAULT 24,
  escalation_after_hours NUMERIC DEFAULT 8,
  escalation_to TEXT DEFAULT NULL,
  business_hours_only BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Change Management
CREATE TABLE IF NOT EXISTS public.it_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  change_type TEXT NOT NULL DEFAULT 'Standard',
  risk_level TEXT NOT NULL DEFAULT 'Low',
  impact TEXT NOT NULL DEFAULT 'Low',
  urgency TEXT NOT NULL DEFAULT 'Low',
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Draft',
  requester_id UUID DEFAULT NULL,
  requester_name TEXT,
  assigned_to_id UUID DEFAULT NULL,
  assigned_to_name TEXT,
  category TEXT DEFAULT 'General',
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  rollback_plan TEXT,
  test_plan TEXT,
  cab_required BOOLEAN DEFAULT false,
  cab_approval_status TEXT DEFAULT 'pending',
  cab_approved_by TEXT,
  cab_approved_at TIMESTAMPTZ,
  cab_notes TEXT,
  implementation_notes TEXT,
  post_implementation_review TEXT,
  related_tickets TEXT[],
  affected_services TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Problem Management
CREATE TABLE IF NOT EXISTS public.it_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  impact TEXT DEFAULT 'Low',
  assigned_to_id UUID DEFAULT NULL,
  assigned_to_name TEXT,
  root_cause TEXT,
  workaround TEXT,
  known_error BOOLEAN DEFAULT false,
  known_error_id TEXT,
  resolution TEXT,
  related_tickets TEXT[],
  affected_cis TEXT[],
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CMDB / Configuration Items
CREATE TABLE IF NOT EXISTS public.it_cmdb (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ci_type TEXT NOT NULL DEFAULT 'Server',
  ci_class TEXT DEFAULT 'Hardware',
  status TEXT NOT NULL DEFAULT 'Active',
  environment TEXT DEFAULT 'Production',
  owner_name TEXT,
  department TEXT,
  location TEXT,
  ip_address TEXT,
  os TEXT,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  warranty_end DATE,
  criticality TEXT DEFAULT 'Medium',
  dependencies TEXT[],
  related_services TEXT[],
  notes TEXT,
  last_audit_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Incident Templates
CREATE TABLE IF NOT EXISTS public.it_incident_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  priority TEXT DEFAULT 'Medium',
  title_template TEXT NOT NULL,
  description_template TEXT,
  assigned_group TEXT,
  sla_config_id UUID REFERENCES public.it_sla_configs(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add SLA tracking columns to tickets
ALTER TABLE public.it_tickets
  ADD COLUMN IF NOT EXISTS impact TEXT DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS sla_config_id UUID REFERENCES public.it_sla_configs(id),
  ADD COLUMN IF NOT EXISTS sla_response_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_resolution_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_response_breached BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_resolution_breached BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_to TEXT,
  ADD COLUMN IF NOT EXISTS related_change_id UUID REFERENCES public.it_changes(id),
  ADD COLUMN IF NOT EXISTS related_problem_id UUID REFERENCES public.it_problems(id),
  ADD COLUMN IF NOT EXISTS related_ci_id UUID REFERENCES public.it_cmdb(id),
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'portal',
  ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER,
  ADD COLUMN IF NOT EXISTS satisfaction_comment TEXT;

-- Enable RLS
ALTER TABLE public.it_sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_cmdb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_incident_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users can CRUD)
CREATE POLICY "Authenticated users can manage SLA configs" ON public.it_sla_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage changes" ON public.it_changes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage problems" ON public.it_problems FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage CMDB" ON public.it_cmdb FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage templates" ON public.it_incident_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
