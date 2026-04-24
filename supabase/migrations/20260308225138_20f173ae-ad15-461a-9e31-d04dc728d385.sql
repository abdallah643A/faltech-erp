
-- Service Module Tables

-- Equipment / Installed Base
CREATE TABLE public.service_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  serial_number TEXT,
  model TEXT,
  manufacturer TEXT,
  category TEXT,
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  functional_location TEXT,
  installation_date DATE,
  warranty_start DATE,
  warranty_end DATE,
  status TEXT NOT NULL DEFAULT 'active',
  condition TEXT DEFAULT 'good',
  last_service_date DATE,
  next_pm_date DATE,
  operating_hours NUMERIC DEFAULT 0,
  purchase_price NUMERIC,
  asset_value NUMERIC,
  parent_equipment_id UUID REFERENCES public.service_equipment(id),
  notes TEXT,
  sap_equipment_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service Contracts
CREATE TABLE public.service_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  contract_type TEXT NOT NULL DEFAULT 'full_maintenance',
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  contract_value NUMERIC DEFAULT 0,
  billing_frequency TEXT DEFAULT 'monthly',
  response_time_hours INTEGER DEFAULT 4,
  resolution_time_hours INTEGER DEFAULT 24,
  uptime_guarantee NUMERIC DEFAULT 95,
  pm_frequency TEXT DEFAULT 'quarterly',
  coverage_scope TEXT DEFAULT 'parts_labor_travel',
  auto_renew BOOLEAN DEFAULT false,
  renewal_terms TEXT,
  sla_penalty_rate NUMERIC DEFAULT 0,
  notes TEXT,
  sap_contract_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service Contract Lines (equipment covered)
CREATE TABLE public.service_contract_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.service_contracts(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES public.service_equipment(id),
  equipment_number TEXT,
  equipment_name TEXT,
  coverage_type TEXT DEFAULT 'full',
  line_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service Orders
CREATE TABLE public.service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  order_type TEXT NOT NULL DEFAULT 'corrective',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT NOT NULL,
  equipment_id UUID REFERENCES public.service_equipment(id),
  equipment_number TEXT,
  contract_id UUID REFERENCES public.service_contracts(id),
  reported_by TEXT,
  reported_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  problem_description TEXT,
  cause_code TEXT,
  damage_code TEXT,
  resolution_description TEXT,
  assigned_technician_id UUID REFERENCES auth.users(id),
  assigned_technician_name TEXT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  response_time_minutes INTEGER,
  resolution_time_minutes INTEGER,
  sla_met BOOLEAN,
  warranty_claim BOOLEAN DEFAULT false,
  billing_type TEXT DEFAULT 'time_material',
  labor_cost NUMERIC DEFAULT 0,
  parts_cost NUMERIC DEFAULT 0,
  travel_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  billed_amount NUMERIC DEFAULT 0,
  customer_signature_url TEXT,
  customer_rating INTEGER,
  customer_feedback TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  sap_order_id TEXT,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service Order Activities (labor/parts/travel lines)
CREATE TABLE public.service_order_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE NOT NULL,
  line_type TEXT NOT NULL DEFAULT 'labor',
  description TEXT NOT NULL,
  item_code TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'HR',
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  billable BOOLEAN DEFAULT true,
  technician_name TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Preventive Maintenance Plans
CREATE TABLE public.pm_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  equipment_id UUID REFERENCES public.service_equipment(id),
  contract_id UUID REFERENCES public.service_contracts(id),
  cycle_type TEXT NOT NULL DEFAULT 'time',
  cycle_value INTEGER NOT NULL DEFAULT 90,
  cycle_unit TEXT DEFAULT 'days',
  task_list JSONB,
  last_execution_date DATE,
  next_execution_date DATE,
  call_horizon_days INTEGER DEFAULT 14,
  is_active BOOLEAN DEFAULT true,
  auto_create_order BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Warranty Claims
CREATE TABLE public.warranty_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_number TEXT NOT NULL UNIQUE,
  equipment_id UUID REFERENCES public.service_equipment(id),
  service_order_id UUID REFERENCES public.service_orders(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  claim_type TEXT DEFAULT 'standard',
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  failure_description TEXT,
  parts_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  total_claim NUMERIC DEFAULT 0,
  supplier_name TEXT,
  supplier_recovery NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service KPI Snapshots (for dashboard)
CREATE TABLE public.service_kpi_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  first_time_fix_rate NUMERIC,
  mean_time_to_respond NUMERIC,
  mean_time_to_repair NUMERIC,
  sla_compliance_rate NUMERIC,
  technician_utilization NUMERIC,
  pm_completion_rate NUMERIC,
  repeat_repair_rate NUMERIC,
  total_service_orders INTEGER,
  open_orders INTEGER,
  closed_orders INTEGER,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  service_margin NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_contract_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_kpi_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Auth users manage service_equipment" ON public.service_equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage service_contracts" ON public.service_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage service_contract_lines" ON public.service_contract_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage service_orders" ON public.service_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage service_order_lines" ON public.service_order_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage pm_plans" ON public.pm_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage warranty_claims" ON public.warranty_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage service_kpi_snapshots" ON public.service_kpi_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
