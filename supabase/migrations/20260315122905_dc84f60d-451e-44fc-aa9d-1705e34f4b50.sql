
-- =====================================================
-- PART 1: Cost Breakdown Structure (CBS) & Cost Control
-- =====================================================

-- CBS linked to WBS
CREATE TABLE public.cpms_cbs_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID NOT NULL,
  wbs_node_id UUID REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.cpms_cbs_items(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  cost_category TEXT NOT NULL DEFAULT 'direct', -- direct, indirect, overhead
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  committed_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  forecast_amount NUMERIC NOT NULL DEFAULT 0,
  variance_amount NUMERIC GENERATED ALWAYS AS (budget_amount - actual_amount) STORED,
  variance_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN budget_amount > 0 THEN ((budget_amount - actual_amount) / budget_amount) * 100 ELSE 0 END
  ) STORED,
  lock_threshold_pct NUMERIC DEFAULT 10, -- lock procurement if exceeded by this %
  is_locked BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cpms_cbs_project ON cpms_cbs_items(project_id);
CREATE INDEX idx_cpms_cbs_company ON cpms_cbs_items(company_id);
CREATE INDEX idx_cpms_cbs_wbs ON cpms_cbs_items(wbs_node_id);

ALTER TABLE cpms_cbs_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage CBS" ON cpms_cbs_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- IFRS 15 Revenue Recognition tracking
CREATE TABLE public.cpms_ifrs15_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID NOT NULL,
  period TEXT NOT NULL, -- e.g. '2026-03'
  total_expected_cost NUMERIC NOT NULL DEFAULT 0,
  costs_incurred_to_date NUMERIC NOT NULL DEFAULT 0,
  pct_complete NUMERIC GENERATED ALWAYS AS (
    CASE WHEN total_expected_cost > 0 THEN (costs_incurred_to_date / total_expected_cost) * 100 ELSE 0 END
  ) STORED,
  contract_revenue NUMERIC NOT NULL DEFAULT 0,
  revenue_recognized NUMERIC NOT NULL DEFAULT 0,
  revenue_this_period NUMERIC NOT NULL DEFAULT 0,
  unbilled_revenue NUMERIC GENERATED ALWAYS AS (revenue_recognized - COALESCE(0, 0)) STORED,
  journal_entry_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ifrs15_project ON cpms_ifrs15_entries(project_id);
ALTER TABLE cpms_ifrs15_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage IFRS15" ON cpms_ifrs15_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- PART 2: Site Material Management & Wastage
-- =====================================================

CREATE TABLE public.cpms_site_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID NOT NULL,
  wbs_node_id UUID REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  unit TEXT DEFAULT 'EA',
  boq_quantity NUMERIC NOT NULL DEFAULT 0,
  received_quantity NUMERIC NOT NULL DEFAULT 0,
  consumed_quantity NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC GENERATED ALWAYS AS (received_quantity - consumed_quantity) STORED,
  wastage_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN boq_quantity > 0 THEN ((consumed_quantity - boq_quantity) / boq_quantity) * 100 ELSE 0 END
  ) STORED,
  unit_cost NUMERIC DEFAULT 0,
  valuation_method TEXT DEFAULT 'WAC', -- FIFO, WAC
  site_location TEXT,
  last_receipt_date TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_site_inv_project ON cpms_site_inventory(project_id);
ALTER TABLE cpms_site_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage site inv" ON cpms_site_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Site material transactions (receipts, issues, returns)
CREATE TABLE public.cpms_site_material_txns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID NOT NULL,
  site_inventory_id UUID REFERENCES public.cpms_site_inventory(id) ON DELETE CASCADE,
  txn_type TEXT NOT NULL, -- receipt, issue, return, adjustment
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  reference_doc TEXT,
  txn_date TIMESTAMPTZ DEFAULT now(),
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_site_txn_project ON cpms_site_material_txns(project_id);
ALTER TABLE cpms_site_material_txns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage site txns" ON cpms_site_material_txns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- PART 3: Labor Productivity & Attendance
-- =====================================================

CREATE TABLE public.cpms_labor_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID NOT NULL,
  wbs_node_id UUID REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  employee_id UUID,
  employee_name TEXT NOT NULL,
  trade TEXT, -- electrician, carpenter, etc.
  work_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  regular_hours NUMERIC NOT NULL DEFAULT 0,
  overtime_hours NUMERIC NOT NULL DEFAULT 0,
  total_hours NUMERIC GENERATED ALWAYS AS (regular_hours + overtime_hours) STORED,
  hourly_rate NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS ((regular_hours + overtime_hours) * hourly_rate) STORED,
  units_completed NUMERIC DEFAULT 0,
  unit_of_measure TEXT,
  productivity_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN (regular_hours + overtime_hours) > 0 THEN units_completed / (regular_hours + overtime_hours) ELSE 0 END
  ) STORED,
  geo_lat NUMERIC,
  geo_lng NUMERIC,
  geo_accuracy NUMERIC,
  is_geo_verified BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_labor_project ON cpms_labor_hours(project_id);
CREATE INDEX idx_labor_date ON cpms_labor_hours(work_date);
ALTER TABLE cpms_labor_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage labor" ON cpms_labor_hours FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- PART 4: Subcontractor Management & Payments
-- =====================================================

CREATE TABLE public.cpms_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  trade TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  insurance_expiry DATE,
  safety_cert_expiry DATE,
  license_expiry DATE,
  tax_registration TEXT,
  bank_details JSONB,
  default_retention_pct NUMERIC DEFAULT 5,
  reliability_score NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cpms_subcontractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage subcontractors" ON cpms_subcontractors FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.cpms_subcontract_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID NOT NULL,
  subcontractor_id UUID REFERENCES public.cpms_subcontractors(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL,
  scope_description TEXT,
  contract_value NUMERIC NOT NULL DEFAULT 0,
  retention_pct NUMERIC DEFAULT 5,
  retention_amount NUMERIC GENERATED ALWAYS AS (contract_value * retention_pct / 100) STORED,
  paid_amount NUMERIC DEFAULT 0,
  certified_amount NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft', -- draft, active, completed, terminated
  wbs_node_id UUID REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_suborder_project ON cpms_subcontract_orders(project_id);
ALTER TABLE cpms_subcontract_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage subcontract orders" ON cpms_subcontract_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.cpms_subcontract_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  subcontract_order_id UUID REFERENCES public.cpms_subcontract_orders(id) ON DELETE CASCADE,
  payment_number TEXT NOT NULL,
  application_date DATE NOT NULL,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  retention_held NUMERIC NOT NULL DEFAULT 0,
  previous_retention_released NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  net_amount NUMERIC GENERATED ALWAYS AS (gross_amount - retention_held + previous_retention_released - deductions) STORED,
  status TEXT DEFAULT 'draft', -- draft, submitted, certified, paid, rejected
  compliance_check_passed BOOLEAN DEFAULT false,
  compliance_notes TEXT,
  certified_by UUID,
  certified_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cpms_subcontract_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage sub payments" ON cpms_subcontract_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- PART 5: Progress Billing & SOV (Schedule of Values)
-- =====================================================

CREATE TABLE public.cpms_schedule_of_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID NOT NULL,
  wbs_node_id UUID REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  line_number INT NOT NULL,
  description TEXT NOT NULL,
  scheduled_value NUMERIC NOT NULL DEFAULT 0,
  previous_billed_pct NUMERIC DEFAULT 0,
  previous_billed_amount NUMERIC DEFAULT 0,
  current_billed_pct NUMERIC DEFAULT 0,
  current_billed_amount NUMERIC DEFAULT 0,
  cumulative_billed_pct NUMERIC GENERATED ALWAYS AS (previous_billed_pct + current_billed_pct) STORED,
  cumulative_billed_amount NUMERIC GENERATED ALWAYS AS (previous_billed_amount + current_billed_amount) STORED,
  balance_to_finish NUMERIC GENERATED ALWAYS AS (scheduled_value - previous_billed_amount - current_billed_amount) STORED,
  retainage_pct NUMERIC DEFAULT 10,
  retainage_amount NUMERIC GENERATED ALWAYS AS ((previous_billed_amount + current_billed_amount) * 10 / 100) STORED,
  materials_stored NUMERIC DEFAULT 0,
  sort_order INT DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sov_project ON cpms_schedule_of_values(project_id);
ALTER TABLE cpms_schedule_of_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage SOV" ON cpms_schedule_of_values FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Progress billing applications
CREATE TABLE public.cpms_progress_billings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID NOT NULL,
  billing_number TEXT NOT NULL,
  billing_date DATE NOT NULL,
  period_from DATE,
  period_to DATE,
  total_scheduled_value NUMERIC DEFAULT 0,
  total_previous_billed NUMERIC DEFAULT 0,
  total_current_billed NUMERIC DEFAULT 0,
  total_cumulative NUMERIC DEFAULT 0,
  total_retainage NUMERIC DEFAULT 0,
  total_materials_stored NUMERIC DEFAULT 0,
  net_payment_due NUMERIC DEFAULT 0,
  billing_method TEXT DEFAULT 'percentage', -- percentage, quantum_meruit, milestone
  status TEXT DEFAULT 'draft', -- draft, submitted, certified, invoiced
  unbilled_revenue_je_id UUID, -- link to journal entry
  certified_by UUID,
  certified_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_billing_project ON cpms_progress_billings(project_id);
ALTER TABLE cpms_progress_billings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage billings" ON cpms_progress_billings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- PART 6: Equipment Utilization
-- =====================================================

CREATE TABLE public.cpms_equipment_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  asset_id UUID, -- links to fixed_assets
  equipment_code TEXT NOT NULL,
  equipment_name TEXT NOT NULL,
  category TEXT, -- excavator, crane, loader, etc.
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  daily_rate NUMERIC NOT NULL DEFAULT 0,
  monthly_rate NUMERIC DEFAULT 0,
  fuel_cost_per_hour NUMERIC DEFAULT 0,
  operator_cost_per_hour NUMERIC DEFAULT 0,
  maintenance_interval_hours NUMERIC DEFAULT 250,
  current_engine_hours NUMERIC DEFAULT 0,
  next_maintenance_hours NUMERIC DEFAULT 250,
  status TEXT DEFAULT 'available', -- available, in_use, maintenance, retired
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cpms_equipment_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage equip rates" ON cpms_equipment_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.cpms_equipment_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID NOT NULL,
  equipment_rate_id UUID REFERENCES public.cpms_equipment_rates(id) ON DELETE RESTRICT,
  wbs_node_id UUID REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  usage_date DATE NOT NULL,
  hours_used NUMERIC NOT NULL DEFAULT 0,
  idle_hours NUMERIC DEFAULT 0,
  fuel_consumed NUMERIC DEFAULT 0,
  operator_name TEXT,
  charge_type TEXT DEFAULT 'hourly', -- hourly, daily
  charge_amount NUMERIC NOT NULL DEFAULT 0,
  cost_center TEXT,
  engine_hours_start NUMERIC,
  engine_hours_end NUMERIC,
  maintenance_triggered BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_equip_usage_project ON cpms_equipment_usage(project_id);
CREATE INDEX idx_equip_usage_date ON cpms_equipment_usage(usage_date);
ALTER TABLE cpms_equipment_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage equip usage" ON cpms_equipment_usage FOR ALL TO authenticated USING (true) WITH CHECK (true);
