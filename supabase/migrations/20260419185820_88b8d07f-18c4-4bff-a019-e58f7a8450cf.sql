
-- ============================================================
-- Manufacturing core: PR1
-- ============================================================

-- 1) BOM Versions (versioning on top of bill_of_materials)
CREATE TABLE IF NOT EXISTS public.mfg_bom_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bom_id UUID REFERENCES public.bill_of_materials(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | approved | obsolete
  change_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  snapshot JSONB, -- frozen lines at approval
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfg_bom_versions_bom ON public.mfg_bom_versions(bom_id);
CREATE INDEX IF NOT EXISTS idx_mfg_bom_versions_company ON public.mfg_bom_versions(company_id);
ALTER TABLE public.mfg_bom_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mfg_bom_versions" ON public.mfg_bom_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mfg_bom_versions" ON public.mfg_bom_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2) Work Centers
CREATE TABLE IF NOT EXISTS public.mfg_work_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  capacity_per_day_hours NUMERIC NOT NULL DEFAULT 8,
  efficiency_pct NUMERIC NOT NULL DEFAULT 100,
  labor_rate NUMERIC NOT NULL DEFAULT 0,
  overhead_rate NUMERIC NOT NULL DEFAULT 0,
  setup_cost NUMERIC NOT NULL DEFAULT 0,
  cost_center TEXT,
  shift_calendar JSONB DEFAULT '{"mon":8,"tue":8,"wed":8,"thu":8,"fri":8,"sat":0,"sun":0}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
CREATE INDEX IF NOT EXISTS idx_mfg_wc_company ON public.mfg_work_centers(company_id);
ALTER TABLE public.mfg_work_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mfg_work_centers" ON public.mfg_work_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mfg_work_centers" ON public.mfg_work_centers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3) Routings (header) + operations (lines)
CREATE TABLE IF NOT EXISTS public.mfg_routings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  routing_code TEXT NOT NULL,
  description TEXT,
  product_code TEXT,
  bom_id UUID REFERENCES public.bill_of_materials(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, routing_code)
);
CREATE INDEX IF NOT EXISTS idx_mfg_routings_company ON public.mfg_routings(company_id);
ALTER TABLE public.mfg_routings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mfg_routings" ON public.mfg_routings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mfg_routings" ON public.mfg_routings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.mfg_routing_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routing_id UUID NOT NULL REFERENCES public.mfg_routings(id) ON DELETE CASCADE,
  op_seq INTEGER NOT NULL DEFAULT 10,
  op_code TEXT,
  description TEXT,
  work_center_id UUID REFERENCES public.mfg_work_centers(id) ON DELETE SET NULL,
  setup_time_minutes NUMERIC NOT NULL DEFAULT 0,
  run_time_minutes_per_unit NUMERIC NOT NULL DEFAULT 0,
  queue_time_minutes NUMERIC NOT NULL DEFAULT 0,
  labor_rate NUMERIC,
  overhead_rate NUMERIC,
  qc_required BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfg_rop_routing ON public.mfg_routing_operations(routing_id);
ALTER TABLE public.mfg_routing_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mfg_routing_operations" ON public.mfg_routing_operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mfg_routing_operations" ON public.mfg_routing_operations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4) Production Work Orders (manufacturing-specific; distinct from existing maintenance work_orders)
CREATE TABLE IF NOT EXISTS public.mfg_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  wo_number TEXT NOT NULL,
  product_code TEXT,
  product_name TEXT,
  bom_id UUID REFERENCES public.bill_of_materials(id) ON DELETE SET NULL,
  bom_version_id UUID REFERENCES public.mfg_bom_versions(id) ON DELETE SET NULL,
  routing_id UUID REFERENCES public.mfg_routings(id) ON DELETE SET NULL,
  project_id UUID,
  planned_qty NUMERIC NOT NULL DEFAULT 0,
  produced_qty NUMERIC NOT NULL DEFAULT 0,
  scrapped_qty NUMERIC NOT NULL DEFAULT 0,
  rework_qty NUMERIC NOT NULL DEFAULT 0,
  uom TEXT,
  warehouse_code TEXT,
  planned_start DATE,
  planned_end DATE,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  -- Standard cost rollup at release
  std_material_cost NUMERIC NOT NULL DEFAULT 0,
  std_labor_cost NUMERIC NOT NULL DEFAULT 0,
  std_overhead_cost NUMERIC NOT NULL DEFAULT 0,
  std_total_cost NUMERIC NOT NULL DEFAULT 0,
  -- Actual cost accumulated
  actual_material_cost NUMERIC NOT NULL DEFAULT 0,
  actual_labor_cost NUMERIC NOT NULL DEFAULT 0,
  actual_overhead_cost NUMERIC NOT NULL DEFAULT 0,
  actual_scrap_cost NUMERIC NOT NULL DEFAULT 0,
  actual_total_cost NUMERIC NOT NULL DEFAULT 0,
  -- Variance at close
  material_variance NUMERIC NOT NULL DEFAULT 0,
  labor_variance NUMERIC NOT NULL DEFAULT 0,
  overhead_variance NUMERIC NOT NULL DEFAULT 0,
  total_variance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | released | in_progress | completed | closed | cancelled
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, wo_number)
);
CREATE INDEX IF NOT EXISTS idx_mfg_wo_company ON public.mfg_work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_mfg_wo_status ON public.mfg_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_mfg_wo_project ON public.mfg_work_orders(project_id);
ALTER TABLE public.mfg_work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mfg_work_orders" ON public.mfg_work_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mfg_work_orders" ON public.mfg_work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5) WO Material lines (planned + issued + returned)
CREATE TABLE IF NOT EXISTS public.mfg_wo_material_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id UUID NOT NULL REFERENCES public.mfg_work_orders(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL DEFAULT 1,
  item_code TEXT,
  item_description TEXT,
  uom TEXT,
  warehouse_code TEXT,
  planned_qty NUMERIC NOT NULL DEFAULT 0,
  issued_qty NUMERIC NOT NULL DEFAULT 0,
  returned_qty NUMERIC NOT NULL DEFAULT 0,
  scrapped_qty NUMERIC NOT NULL DEFAULT 0,
  std_unit_cost NUMERIC NOT NULL DEFAULT 0,
  actual_unit_cost NUMERIC NOT NULL DEFAULT 0,
  std_cost NUMERIC NOT NULL DEFAULT 0,
  actual_cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfg_woml_wo ON public.mfg_wo_material_lines(wo_id);
ALTER TABLE public.mfg_wo_material_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mfg_wo_material_lines" ON public.mfg_wo_material_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mfg_wo_material_lines" ON public.mfg_wo_material_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6) WO Routing/Operation execution (labor/overhead actuals)
CREATE TABLE IF NOT EXISTS public.mfg_wo_routing_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id UUID NOT NULL REFERENCES public.mfg_work_orders(id) ON DELETE CASCADE,
  op_seq INTEGER NOT NULL DEFAULT 10,
  op_code TEXT,
  description TEXT,
  work_center_id UUID REFERENCES public.mfg_work_centers(id) ON DELETE SET NULL,
  planned_setup_minutes NUMERIC NOT NULL DEFAULT 0,
  planned_run_minutes NUMERIC NOT NULL DEFAULT 0,
  actual_setup_minutes NUMERIC NOT NULL DEFAULT 0,
  actual_run_minutes NUMERIC NOT NULL DEFAULT 0,
  labor_rate NUMERIC NOT NULL DEFAULT 0,
  overhead_rate NUMERIC NOT NULL DEFAULT 0,
  std_labor_cost NUMERIC NOT NULL DEFAULT 0,
  actual_labor_cost NUMERIC NOT NULL DEFAULT 0,
  std_overhead_cost NUMERIC NOT NULL DEFAULT 0,
  actual_overhead_cost NUMERIC NOT NULL DEFAULT 0,
  qc_required BOOLEAN NOT NULL DEFAULT false,
  qc_status TEXT, -- pass | fail | pending
  status TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | done
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfg_worl_wo ON public.mfg_wo_routing_lines(wo_id);
ALTER TABLE public.mfg_wo_routing_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mfg_wo_routing_lines" ON public.mfg_wo_routing_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mfg_wo_routing_lines" ON public.mfg_wo_routing_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7) QC Checkpoints tied to work orders
CREATE TABLE IF NOT EXISTS public.mfg_wo_qc_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  wo_id UUID NOT NULL REFERENCES public.mfg_work_orders(id) ON DELETE CASCADE,
  routing_line_id UUID REFERENCES public.mfg_wo_routing_lines(id) ON DELETE SET NULL,
  checkpoint_name TEXT NOT NULL,
  inspection_type TEXT, -- visual | dimensional | functional | other
  spec_min NUMERIC,
  spec_max NUMERIC,
  measured_value NUMERIC,
  result TEXT NOT NULL DEFAULT 'pending', -- pass | fail | pending
  inspector_id UUID,
  inspected_at TIMESTAMPTZ,
  defect_qty NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfg_qc_wo ON public.mfg_wo_qc_checks(wo_id);
ALTER TABLE public.mfg_wo_qc_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mfg_wo_qc_checks" ON public.mfg_wo_qc_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mfg_wo_qc_checks" ON public.mfg_wo_qc_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8) Scrap reporting
CREATE TABLE IF NOT EXISTS public.mfg_wo_scrap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  wo_id UUID NOT NULL REFERENCES public.mfg_work_orders(id) ON DELETE CASCADE,
  scrap_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_code TEXT,
  item_description TEXT,
  qty NUMERIC NOT NULL DEFAULT 0,
  uom TEXT,
  reason_code TEXT, -- defect | setup | material | machine | operator | other
  reason_notes TEXT,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  reported_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfg_scrap_wo ON public.mfg_wo_scrap(wo_id);
ALTER TABLE public.mfg_wo_scrap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mfg_wo_scrap" ON public.mfg_wo_scrap FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mfg_wo_scrap" ON public.mfg_wo_scrap FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9) Rework orders
CREATE TABLE IF NOT EXISTS public.mfg_rework_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  rework_number TEXT NOT NULL,
  source_wo_id UUID REFERENCES public.mfg_work_orders(id) ON DELETE SET NULL,
  qc_check_id UUID REFERENCES public.mfg_wo_qc_checks(id) ON DELETE SET NULL,
  item_code TEXT,
  item_description TEXT,
  qty NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  rework_cost NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', -- open | in_progress | done | scrapped
  assigned_to UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, rework_number)
);
CREATE INDEX IF NOT EXISTS idx_mfg_rework_wo ON public.mfg_rework_orders(source_wo_id);
ALTER TABLE public.mfg_rework_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mfg_rework_orders" ON public.mfg_rework_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mfg_rework_orders" ON public.mfg_rework_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10) Material movement log (issue / return)
CREATE TABLE IF NOT EXISTS public.mfg_wo_material_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  wo_id UUID NOT NULL REFERENCES public.mfg_work_orders(id) ON DELETE CASCADE,
  material_line_id UUID REFERENCES public.mfg_wo_material_lines(id) ON DELETE SET NULL,
  move_type TEXT NOT NULL, -- issue | return | scrap
  move_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_code TEXT,
  qty NUMERIC NOT NULL DEFAULT 0,
  uom TEXT,
  warehouse_code TEXT,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfg_moves_wo ON public.mfg_wo_material_moves(wo_id);
ALTER TABLE public.mfg_wo_material_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mfg_wo_material_moves" ON public.mfg_wo_material_moves FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write mfg_wo_material_moves" ON public.mfg_wo_material_moves FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Function: recompute work order costs and variances
-- ============================================================
CREATE OR REPLACE FUNCTION public.mfg_recompute_wo_costs(p_wo_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_std_mat NUMERIC; v_act_mat NUMERIC;
  v_std_lab NUMERIC; v_act_lab NUMERIC;
  v_std_oh  NUMERIC; v_act_oh  NUMERIC;
  v_act_scrap NUMERIC;
BEGIN
  SELECT COALESCE(SUM(std_cost),0), COALESCE(SUM(actual_cost),0)
    INTO v_std_mat, v_act_mat
  FROM mfg_wo_material_lines WHERE wo_id = p_wo_id;

  SELECT COALESCE(SUM(std_labor_cost),0), COALESCE(SUM(actual_labor_cost),0),
         COALESCE(SUM(std_overhead_cost),0), COALESCE(SUM(actual_overhead_cost),0)
    INTO v_std_lab, v_act_lab, v_std_oh, v_act_oh
  FROM mfg_wo_routing_lines WHERE wo_id = p_wo_id;

  SELECT COALESCE(SUM(total_cost),0) INTO v_act_scrap
  FROM mfg_wo_scrap WHERE wo_id = p_wo_id;

  UPDATE mfg_work_orders SET
    std_material_cost = v_std_mat,
    std_labor_cost    = v_std_lab,
    std_overhead_cost = v_std_oh,
    std_total_cost    = v_std_mat + v_std_lab + v_std_oh,
    actual_material_cost = v_act_mat,
    actual_labor_cost    = v_act_lab,
    actual_overhead_cost = v_act_oh,
    actual_scrap_cost    = v_act_scrap,
    actual_total_cost    = v_act_mat + v_act_lab + v_act_oh + v_act_scrap,
    material_variance = v_act_mat - v_std_mat,
    labor_variance    = v_act_lab - v_std_lab,
    overhead_variance = v_act_oh - v_std_oh,
    total_variance    = (v_act_mat + v_act_lab + v_act_oh + v_act_scrap) - (v_std_mat + v_std_lab + v_std_oh),
    updated_at = now()
  WHERE id = p_wo_id;
END $$;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.mfg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_mfg_wo_touch ON public.mfg_work_orders;
CREATE TRIGGER trg_mfg_wo_touch BEFORE UPDATE ON public.mfg_work_orders
FOR EACH ROW EXECUTE FUNCTION public.mfg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_mfg_bv_touch ON public.mfg_bom_versions;
CREATE TRIGGER trg_mfg_bv_touch BEFORE UPDATE ON public.mfg_bom_versions
FOR EACH ROW EXECUTE FUNCTION public.mfg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_mfg_wc_touch ON public.mfg_work_centers;
CREATE TRIGGER trg_mfg_wc_touch BEFORE UPDATE ON public.mfg_work_centers
FOR EACH ROW EXECUTE FUNCTION public.mfg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_mfg_rt_touch ON public.mfg_routings;
CREATE TRIGGER trg_mfg_rt_touch BEFORE UPDATE ON public.mfg_routings
FOR EACH ROW EXECUTE FUNCTION public.mfg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_mfg_rwo_touch ON public.mfg_rework_orders;
CREATE TRIGGER trg_mfg_rwo_touch BEFORE UPDATE ON public.mfg_rework_orders
FOR EACH ROW EXECUTE FUNCTION public.mfg_touch_updated_at();
