
-- 1. ENGINEERING CHANGE ORDERS
CREATE TABLE IF NOT EXISTS public.mfg_eco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  eco_number TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  change_type TEXT NOT NULL DEFAULT 'design', -- design, process, material, supplier
  priority TEXT NOT NULL DEFAULT 'medium',
  reason_code TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, review, approved, rejected, implemented
  effective_date DATE,
  requested_by UUID,
  requested_by_name TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,
  estimated_cost_impact NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mfg_eco_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eco_id UUID NOT NULL REFERENCES public.mfg_eco(id) ON DELETE CASCADE,
  affected_type TEXT NOT NULL, -- bom, routing, item, drawing
  affected_code TEXT NOT NULL,
  affected_description TEXT,
  change_action TEXT NOT NULL DEFAULT 'modify', -- add, modify, delete, replace
  before_value JSONB,
  after_value JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SUBCONTRACT MANUFACTURING
CREATE TABLE IF NOT EXISTS public.mfg_subcontract_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  sco_number TEXT NOT NULL,
  vendor_code TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  finished_item_code TEXT NOT NULL,
  finished_item_description TEXT,
  ordered_qty NUMERIC NOT NULL DEFAULT 0,
  received_qty NUMERIC NOT NULL DEFAULT 0,
  uom TEXT DEFAULT 'EA',
  service_cost_per_unit NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  promised_date DATE,
  received_date DATE,
  status TEXT DEFAULT 'open', -- open, materials_issued, in_progress, received, closed
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mfg_subcontract_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sco_id UUID NOT NULL REFERENCES public.mfg_subcontract_orders(id) ON DELETE CASCADE,
  component_code TEXT NOT NULL,
  component_description TEXT,
  required_qty NUMERIC NOT NULL DEFAULT 0,
  issued_qty NUMERIC NOT NULL DEFAULT 0,
  uom TEXT DEFAULT 'EA',
  unit_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. COST ROLL-UP
CREATE TABLE IF NOT EXISTS public.mfg_cost_rollup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bom_id UUID,
  bom_version TEXT,
  product_code TEXT NOT NULL,
  product_name TEXT,
  plant_code TEXT,
  rollup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  material_cost NUMERIC NOT NULL DEFAULT 0,
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  overhead_cost NUMERIC NOT NULL DEFAULT 0,
  subcontract_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  level_breakdown JSONB,
  rolled_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. MATERIAL ISSUE / RETURN
CREATE TABLE IF NOT EXISTS public.mfg_material_issue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  issue_number TEXT NOT NULL,
  wo_id UUID,
  wo_number TEXT,
  item_code TEXT NOT NULL,
  item_description TEXT,
  required_qty NUMERIC NOT NULL DEFAULT 0,
  issued_qty NUMERIC NOT NULL DEFAULT 0,
  uom TEXT DEFAULT 'EA',
  warehouse_code TEXT,
  bin_code TEXT,
  batch_number TEXT,
  serial_number TEXT,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by UUID,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.mfg_material_return (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  return_number TEXT NOT NULL,
  wo_id UUID,
  wo_number TEXT,
  item_code TEXT NOT NULL,
  return_qty NUMERIC NOT NULL DEFAULT 0,
  uom TEXT DEFAULT 'EA',
  warehouse_code TEXT,
  bin_code TEXT,
  reason TEXT,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  returned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_by UUID,
  notes TEXT
);

-- 5. SCRAP & REWORK
CREATE TABLE IF NOT EXISTS public.mfg_scrap_rework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  event_number TEXT NOT NULL,
  wo_id UUID,
  wo_number TEXT,
  event_type TEXT NOT NULL DEFAULT 'scrap', -- scrap, rework
  item_code TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  uom TEXT DEFAULT 'EA',
  reason_code TEXT,
  reason_description TEXT,
  reason_description_ar TEXT,
  disposition TEXT, -- scrap_out, rework_inline, return_to_vendor, hold
  cost_impact NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  reported_by UUID,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- 6. QUALITY CHECKPOINTS
CREATE TABLE IF NOT EXISTS public.mfg_quality_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  routing_id UUID,
  operation_seq INTEGER,
  checkpoint_code TEXT NOT NULL,
  checkpoint_name TEXT NOT NULL,
  checkpoint_name_ar TEXT,
  inspection_type TEXT NOT NULL DEFAULT 'in_process', -- incoming, in_process, final
  measurement_type TEXT NOT NULL DEFAULT 'attribute', -- attribute, variable
  spec_min NUMERIC,
  spec_max NUMERIC,
  spec_target NUMERIC,
  uom TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  sample_size INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mfg_quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  checkpoint_id UUID REFERENCES public.mfg_quality_checkpoints(id),
  wo_id UUID,
  wo_number TEXT,
  measured_value NUMERIC,
  attribute_result TEXT, -- pass, fail
  inspector_id UUID,
  inspector_name TEXT,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pass_fail TEXT, -- pass, fail, conditional
  defect_code TEXT,
  notes TEXT
);

-- 7. LOT GENEALOGY
CREATE TABLE IF NOT EXISTS public.mfg_lot_genealogy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  parent_lot TEXT NOT NULL,
  parent_item_code TEXT NOT NULL,
  child_lot TEXT NOT NULL,
  child_item_code TEXT NOT NULL,
  wo_id UUID,
  wo_number TEXT,
  consumed_qty NUMERIC,
  produced_qty NUMERIC,
  uom TEXT,
  link_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- 8. CAPACITY PLAN
CREATE TABLE IF NOT EXISTS public.mfg_capacity_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  work_center_code TEXT NOT NULL,
  plan_date DATE NOT NULL,
  available_hours NUMERIC NOT NULL DEFAULT 0,
  loaded_hours NUMERIC NOT NULL DEFAULT 0,
  utilization_pct NUMERIC GENERATED ALWAYS AS (CASE WHEN available_hours > 0 THEN (loaded_hours / available_hours) * 100 ELSE 0 END) STORED,
  shift_pattern TEXT DEFAULT 'single',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, work_center_code, plan_date)
);

-- ENABLE RLS + POLICIES
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'mfg_eco','mfg_eco_lines','mfg_subcontract_orders','mfg_subcontract_components',
    'mfg_cost_rollup','mfg_material_issue','mfg_material_return','mfg_scrap_rework',
    'mfg_quality_checkpoints','mfg_quality_inspections','mfg_lot_genealogy','mfg_capacity_plan'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth read %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth read %I" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth write %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth write %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.mfg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$
DECLARE t TEXT;
DECLARE tables TEXT[] := ARRAY['mfg_eco','mfg_subcontract_orders','mfg_quality_checkpoints','mfg_capacity_plan'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.mfg_set_updated_at()', t, t);
  END LOOP;
END $$;
