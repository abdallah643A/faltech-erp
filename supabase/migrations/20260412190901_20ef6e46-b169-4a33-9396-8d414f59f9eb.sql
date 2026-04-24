
-- Budget Masters
CREATE TABLE public.budget_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_code TEXT NOT NULL,
  budget_name TEXT NOT NULL,
  budget_type TEXT NOT NULL DEFAULT 'annual',
  fiscal_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_multi_year BOOLEAN DEFAULT false,
  start_year INTEGER,
  end_year INTEGER,
  budget_basis TEXT DEFAULT 'top_down',
  currency TEXT DEFAULT 'SAR',
  exchange_rate NUMERIC(12,6) DEFAULT 1,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  department_id UUID REFERENCES public.departments(id),
  project_id UUID REFERENCES public.projects(id),
  cost_center_code TEXT,
  budget_owner_id UUID,
  budget_owner_name TEXT,
  budget_controller_id UUID,
  budget_controller_name TEXT,
  current_version INTEGER DEFAULT 1,
  approval_status TEXT DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.budget_masters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_masters_select" ON public.budget_masters FOR SELECT TO authenticated USING (true);
CREATE POLICY "budget_masters_insert" ON public.budget_masters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "budget_masters_update" ON public.budget_masters FOR UPDATE TO authenticated USING (true);
CREATE POLICY "budget_masters_delete" ON public.budget_masters FOR DELETE TO authenticated USING (true);

-- Budget Versions
CREATE TABLE public.budget_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budget_masters(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  revision_reason TEXT,
  parent_version_id UUID REFERENCES public.budget_versions(id),
  total_original NUMERIC(18,2) DEFAULT 0,
  total_revised NUMERIC(18,2) DEFAULT 0,
  total_committed NUMERIC(18,2) DEFAULT 0,
  total_actual NUMERIC(18,2) DEFAULT 0,
  total_forecast NUMERIC(18,2) DEFAULT 0,
  total_available NUMERIC(18,2) DEFAULT 0,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  activated_by UUID,
  activated_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(budget_id, version_number)
);
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_versions_select" ON public.budget_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "budget_versions_insert" ON public.budget_versions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "budget_versions_update" ON public.budget_versions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "budget_versions_delete" ON public.budget_versions FOR DELETE TO authenticated USING (true);

-- Budget Version Lines (new table, not conflicting with existing budget_lines)
CREATE TABLE public.budget_version_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.budget_versions(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL DEFAULT 1,
  budget_category TEXT,
  account_code TEXT,
  account_name TEXT,
  cost_element TEXT,
  cost_center_code TEXT,
  department TEXT,
  branch TEXT,
  project_code TEXT,
  phase TEXT,
  work_package TEXT,
  activity TEXT,
  vendor_name TEXT,
  item_description TEXT,
  description TEXT,
  uom TEXT,
  quantity NUMERIC(18,4) DEFAULT 0,
  unit_rate NUMERIC(18,4) DEFAULT 0,
  original_amount NUMERIC(18,2) DEFAULT 0,
  revised_amount NUMERIC(18,2) DEFAULT 0,
  committed_amount NUMERIC(18,2) DEFAULT 0,
  actual_amount NUMERIC(18,2) DEFAULT 0,
  forecast_amount NUMERIC(18,2) DEFAULT 0,
  available_amount NUMERIC(18,2) DEFAULT 0,
  variance_amount NUMERIC(18,2) DEFAULT 0,
  variance_percent NUMERIC(8,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  allocation_method TEXT DEFAULT 'even',
  line_status TEXT DEFAULT 'active',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.budget_version_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_version_lines_select" ON public.budget_version_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "budget_version_lines_insert" ON public.budget_version_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "budget_version_lines_update" ON public.budget_version_lines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "budget_version_lines_delete" ON public.budget_version_lines FOR DELETE TO authenticated USING (true);

-- Budget Period Allocations
CREATE TABLE public.budget_period_allocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.budget_version_lines(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  budget_amount NUMERIC(18,2) DEFAULT 0,
  committed_amount NUMERIC(18,2) DEFAULT 0,
  actual_amount NUMERIC(18,2) DEFAULT 0,
  available_amount NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(line_id, period_year, period_month)
);
ALTER TABLE public.budget_period_allocs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_period_allocs_select" ON public.budget_period_allocs FOR SELECT TO authenticated USING (true);
CREATE POLICY "budget_period_allocs_insert" ON public.budget_period_allocs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "budget_period_allocs_update" ON public.budget_period_allocs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "budget_period_allocs_delete" ON public.budget_period_allocs FOR DELETE TO authenticated USING (true);

-- Budget Approval History
CREATE TABLE public.budget_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.budget_versions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  acted_by UUID,
  acted_by_name TEXT,
  role TEXT,
  comments TEXT,
  acted_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.budget_approval_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_approval_history_select" ON public.budget_approval_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "budget_approval_history_insert" ON public.budget_approval_history FOR INSERT TO authenticated WITH CHECK (true);

-- Budget Control Rules
CREATE TABLE public.budget_control_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  rule_name TEXT NOT NULL,
  control_level TEXT NOT NULL DEFAULT 'warning',
  check_against TEXT DEFAULT 'available',
  control_timing TEXT[] DEFAULT ARRAY['purchase_order'],
  tolerance_percent NUMERIC(8,2) DEFAULT 0,
  tolerance_amount NUMERIC(18,2) DEFAULT 0,
  override_allowed BOOLEAN DEFAULT false,
  control_by TEXT[] DEFAULT ARRAY['account'],
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.budget_control_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_control_rules_all" ON public.budget_control_rules FOR ALL TO authenticated USING (true);

-- Budget Attachments
CREATE TABLE public.budget_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budget_masters(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.budget_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_attachments_all" ON public.budget_attachments FOR ALL TO authenticated USING (true);

-- Triggers
CREATE TRIGGER update_budget_masters_ts BEFORE UPDATE ON public.budget_masters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_versions_ts BEFORE UPDATE ON public.budget_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_version_lines_ts BEFORE UPDATE ON public.budget_version_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_control_rules_ts BEFORE UPDATE ON public.budget_control_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_bm_company ON public.budget_masters(company_id);
CREATE INDEX idx_bm_type ON public.budget_masters(budget_type);
CREATE INDEX idx_bm_year ON public.budget_masters(fiscal_year);
CREATE INDEX idx_bv_budget ON public.budget_versions(budget_id);
CREATE INDEX idx_bv_status ON public.budget_versions(status);
CREATE INDEX idx_bvl_version ON public.budget_version_lines(version_id);
CREATE INDEX idx_bpa_line ON public.budget_period_allocs(line_id);
CREATE INDEX idx_bah_version ON public.budget_approval_history(version_id);
