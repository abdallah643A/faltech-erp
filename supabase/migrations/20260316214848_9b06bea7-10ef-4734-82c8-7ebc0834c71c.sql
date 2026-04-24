
-- Depreciation runs tracking
CREATE TABLE public.asset_depreciation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
  depreciation_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  accumulated_depreciation NUMERIC(18,2) NOT NULL DEFAULT 0,
  book_value_before NUMERIC(18,2) NOT NULL DEFAULT 0,
  book_value_after NUMERIC(18,2) NOT NULL DEFAULT 0,
  useful_life_years NUMERIC(5,2),
  salvage_value NUMERIC(18,2) DEFAULT 0,
  units_produced NUMERIC(12,2),
  total_estimated_units NUMERIC(12,2),
  je_id UUID,
  status TEXT DEFAULT 'posted',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.asset_depreciation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read depreciation runs"
  ON public.asset_depreciation_runs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can insert depreciation runs"
  ON public.asset_depreciation_runs FOR INSERT TO authenticated WITH CHECK (true);

-- Asset cost allocations
CREATE TABLE public.asset_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  cost_center_id UUID,
  distribution_rule_id UUID,
  allocation_percentage NUMERIC(5,2) NOT NULL DEFAULT 100,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.asset_cost_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage cost allocations"
  ON public.asset_cost_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Asset ROI tracking (periodic snapshots)
CREATE TABLE public.asset_roi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  revenue_generated NUMERIC(18,2) DEFAULT 0,
  cost_of_ownership NUMERIC(18,2) DEFAULT 0,
  maintenance_cost NUMERIC(18,2) DEFAULT 0,
  depreciation_cost NUMERIC(18,2) DEFAULT 0,
  roi_percentage NUMERIC(8,2) DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.asset_roi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage ROI snapshots"
  ON public.asset_roi_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
