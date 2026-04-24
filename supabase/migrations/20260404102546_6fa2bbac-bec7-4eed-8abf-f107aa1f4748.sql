
-- Collection notes for AR follow-up
CREATE TABLE IF NOT EXISTS public.collection_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.ar_invoices(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  note TEXT NOT NULL,
  contact_method TEXT DEFAULT 'phone',
  promised_payment_date DATE,
  is_disputed BOOLEAN DEFAULT false,
  dispute_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.collection_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage collection notes" ON public.collection_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Collection follow-up tasks
CREATE TABLE IF NOT EXISTS public.collection_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.ar_invoices(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  assigned_to UUID,
  assigned_to_name TEXT,
  task_type TEXT DEFAULT 'follow_up',
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.collection_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage collection tasks" ON public.collection_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Supplier performance scorecards
CREATE TABLE IF NOT EXISTS public.supplier_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.business_partners(id),
  vendor_code TEXT,
  vendor_name TEXT NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  period TEXT,
  price_score NUMERIC DEFAULT 0,
  delivery_score NUMERIC DEFAULT 0,
  quality_score NUMERIC DEFAULT 0,
  responsiveness_score NUMERIC DEFAULT 0,
  invoice_accuracy_score NUMERIC DEFAULT 0,
  overall_score NUMERIC DEFAULT 0,
  total_pos INTEGER DEFAULT 0,
  total_spend NUMERIC DEFAULT 0,
  on_time_count INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  quality_issues INTEGER DEFAULT 0,
  notes TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.supplier_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage supplier scorecards" ON public.supplier_scorecards FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Safety incidents
CREATE TABLE IF NOT EXISTS public.safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  branch_id UUID REFERENCES public.branches(id),
  incident_number TEXT,
  incident_type TEXT DEFAULT 'incident',
  severity TEXT DEFAULT 'low',
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  incident_date TIMESTAMPTZ DEFAULT now(),
  reported_by UUID,
  reported_by_name TEXT,
  involved_employee_id UUID REFERENCES public.employees(id),
  involved_employee_name TEXT,
  root_cause TEXT,
  corrective_actions TEXT,
  preventive_actions TEXT,
  status TEXT DEFAULT 'reported',
  investigation_notes TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage safety incidents" ON public.safety_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PPE compliance checks
CREATE TABLE IF NOT EXISTS public.ppe_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT,
  checked_by UUID,
  checked_by_name TEXT,
  check_date DATE DEFAULT CURRENT_DATE,
  items_json JSONB DEFAULT '[]',
  is_compliant BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ppe_compliance_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage PPE checks" ON public.ppe_compliance_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Maintenance plans
CREATE TABLE IF NOT EXISTS public.maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  asset_id UUID REFERENCES public.assets(id),
  plan_name TEXT NOT NULL,
  description TEXT,
  frequency TEXT DEFAULT 'monthly',
  frequency_days INTEGER DEFAULT 30,
  next_service_date DATE,
  last_service_date DATE,
  technician_id UUID REFERENCES public.employees(id),
  technician_name TEXT,
  spare_parts JSONB DEFAULT '[]',
  estimated_cost NUMERIC DEFAULT 0,
  estimated_downtime_hours NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  project_id UUID REFERENCES public.projects(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage maintenance plans" ON public.maintenance_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Maintenance work orders
CREATE TABLE IF NOT EXISTS public.maintenance_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  plan_id UUID REFERENCES public.maintenance_plans(id),
  asset_id UUID REFERENCES public.assets(id),
  work_order_number TEXT,
  status TEXT DEFAULT 'scheduled',
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  technician_id UUID REFERENCES public.employees(id),
  technician_name TEXT,
  technician_notes TEXT,
  downtime_hours NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  parts_used JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.maintenance_work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage maintenance work orders" ON public.maintenance_work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Scenario plans
CREATE TABLE IF NOT EXISTS public.scenario_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT DEFAULT 'custom',
  base_data JSONB DEFAULT '{}',
  assumptions JSONB DEFAULT '[]',
  results JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scenario_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage scenarios" ON public.scenario_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- KPI subscriptions
CREATE TABLE IF NOT EXISTS public.kpi_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  metric_name TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  threshold_value NUMERIC,
  operator TEXT DEFAULT 'greater_than',
  notify_in_app BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,
  notify_whatsapp BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.kpi_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own KPI subscriptions" ON public.kpi_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Import validation sessions
CREATE TABLE IF NOT EXISTS public.import_validation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  file_name TEXT NOT NULL,
  module TEXT NOT NULL,
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  warning_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  errors_json JSONB DEFAULT '[]',
  status TEXT DEFAULT 'validating',
  committed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.import_validation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage import sessions" ON public.import_validation_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
