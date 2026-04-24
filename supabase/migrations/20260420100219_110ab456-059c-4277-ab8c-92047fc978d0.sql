
-- =====================================================
-- ASSET MANAGEMENT ENHANCEMENT
-- =====================================================

-- 1) Depreciation Books (multi-book: IFRS, Tax, Mgmt)
CREATE TABLE IF NOT EXISTS public.asset_depreciation_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  book_code TEXT NOT NULL,
  book_name TEXT NOT NULL,
  book_name_ar TEXT,
  book_type TEXT NOT NULL DEFAULT 'ifrs', -- ifrs, tax, management, statutory, group
  base_currency TEXT NOT NULL DEFAULT 'SAR',
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, book_code)
);

-- 2) Per-Asset Depreciation Schedule per Book
CREATE TABLE IF NOT EXISTS public.asset_depreciation_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID,
  equipment_id UUID,
  book_id UUID REFERENCES public.asset_depreciation_books(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'straight_line',
  acquisition_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  salvage_value NUMERIC(18,2) DEFAULT 0,
  useful_life_months INTEGER NOT NULL DEFAULT 60,
  start_date DATE NOT NULL,
  end_date DATE,
  units_of_production_total NUMERIC(18,2),
  declining_factor NUMERIC(8,4),
  accumulated_depreciation NUMERIC(18,2) DEFAULT 0,
  net_book_value NUMERIC(18,2),
  last_run_period TEXT,
  schedule_json JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dep_sched_asset ON public.asset_depreciation_schedule(asset_id, equipment_id);

-- 3) Lease/Rental Scenarios
CREATE TABLE IF NOT EXISTS public.asset_lease_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID,
  equipment_id UUID,
  scenario_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL DEFAULT 'buy', -- buy, lease_finance, lease_operating, rent_short, rent_long
  term_months INTEGER NOT NULL DEFAULT 36,
  upfront_cost NUMERIC(18,2) DEFAULT 0,
  monthly_cost NUMERIC(18,2) DEFAULT 0,
  residual_value NUMERIC(18,2) DEFAULT 0,
  interest_rate NUMERIC(8,4),
  total_cost NUMERIC(18,2) GENERATED ALWAYS AS (upfront_cost + (monthly_cost * term_months) - COALESCE(residual_value, 0)) STORED,
  npv NUMERIC(18,2),
  payback_months INTEGER,
  expected_utilization_pct NUMERIC(5,2),
  recommended BOOLEAN DEFAULT false,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 4) Maintenance Plans
CREATE TABLE IF NOT EXISTS public.asset_maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID,
  equipment_id UUID,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'time_based', -- time_based, meter_based, condition_based, predictive
  frequency_value INTEGER,
  frequency_unit TEXT, -- days, weeks, months, hours, kilometers, cycles
  meter_threshold NUMERIC(18,2),
  next_due_date DATE,
  next_due_meter NUMERIC(18,2),
  last_executed_at DATE,
  is_active BOOLEAN DEFAULT true,
  priority TEXT DEFAULT 'medium',
  estimated_duration_hours NUMERIC(6,2),
  estimated_cost NUMERIC(18,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Maintenance Plan Tasks
CREATE TABLE IF NOT EXISTS public.asset_maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.asset_maintenance_plans(id) ON DELETE CASCADE,
  task_order INTEGER NOT NULL DEFAULT 1,
  task_name TEXT NOT NULL,
  task_name_ar TEXT,
  task_description TEXT,
  required_skill TEXT,
  estimated_minutes INTEGER,
  required_parts JSONB DEFAULT '[]'::jsonb,
  required_tools JSONB DEFAULT '[]'::jsonb,
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) Inspection Templates
CREATE TABLE IF NOT EXISTS public.asset_inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  template_code TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_name_ar TEXT,
  category TEXT NOT NULL DEFAULT 'safety', -- safety, regulatory, calibration, condition, daily, periodic
  applicable_asset_types TEXT[],
  frequency TEXT, -- daily, weekly, monthly, quarterly, annual, on_demand
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, template_code)
);

-- 7) Inspection Checklist Items
CREATE TABLE IF NOT EXISTS public.asset_inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.asset_inspection_templates(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL DEFAULT 1,
  item_text TEXT NOT NULL,
  item_text_ar TEXT,
  response_type TEXT NOT NULL DEFAULT 'pass_fail', -- pass_fail, yes_no, numeric, text, photo, signature
  is_required BOOLEAN DEFAULT true,
  acceptable_min NUMERIC(18,4),
  acceptable_max NUMERIC(18,4),
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) Custody Chain
CREATE TABLE IF NOT EXISTS public.asset_custody_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID,
  equipment_id UUID,
  handover_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  from_holder_id UUID,
  from_holder_name TEXT,
  to_holder_id UUID,
  to_holder_name TEXT NOT NULL,
  to_department TEXT,
  to_location TEXT,
  condition_at_handover TEXT, -- excellent, good, fair, poor, damaged
  condition_notes TEXT,
  accessories_included TEXT[],
  acknowledged_by_recipient BOOLEAN DEFAULT false,
  recipient_signature_url TEXT,
  giver_signature_url TEXT,
  reason TEXT, -- assignment, transfer, return, repair, audit, disposal
  reference_doc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_custody_asset ON public.asset_custody_chain(asset_id, equipment_id, handover_date DESC);

-- 9) Asset Profitability
CREATE TABLE IF NOT EXISTS public.asset_profitability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID,
  equipment_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  revenue NUMERIC(18,2) DEFAULT 0,
  direct_cost NUMERIC(18,2) DEFAULT 0,
  maintenance_cost NUMERIC(18,2) DEFAULT 0,
  fuel_cost NUMERIC(18,2) DEFAULT 0,
  depreciation_cost NUMERIC(18,2) DEFAULT 0,
  insurance_cost NUMERIC(18,2) DEFAULT 0,
  other_cost NUMERIC(18,2) DEFAULT 0,
  total_cost NUMERIC(18,2) GENERATED ALWAYS AS (
    COALESCE(direct_cost, 0) + COALESCE(maintenance_cost, 0) + COALESCE(fuel_cost, 0)
    + COALESCE(depreciation_cost, 0) + COALESCE(insurance_cost, 0) + COALESCE(other_cost, 0)
  ) STORED,
  gross_margin NUMERIC(18,2),
  utilization_hours NUMERIC(10,2),
  available_hours NUMERIC(10,2),
  utilization_pct NUMERIC(5,2),
  roi_pct NUMERIC(8,4),
  payback_months NUMERIC(8,2),
  currency TEXT NOT NULL DEFAULT 'SAR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profit_period ON public.asset_profitability(period_start, period_end);

-- 10) Utilization Heatmap (daily x hour cells)
CREATE TABLE IF NOT EXISTS public.asset_utilization_heatmap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID,
  equipment_id UUID,
  day_date DATE NOT NULL,
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  utilization_pct NUMERIC(5,2) DEFAULT 0,
  active_minutes INTEGER DEFAULT 0,
  status TEXT, -- idle, active, maintenance, breakdown
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(asset_id, equipment_id, day_date, hour_of_day)
);
CREATE INDEX IF NOT EXISTS idx_heatmap_lookup ON public.asset_utilization_heatmap(day_date, hour_of_day);

-- =====================================================
-- RLS
-- =====================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'asset_depreciation_books','asset_depreciation_schedule','asset_lease_scenarios',
    'asset_maintenance_plans','asset_maintenance_tasks','asset_inspection_templates',
    'asset_inspection_checklist_items','asset_custody_chain','asset_profitability',
    'asset_utilization_heatmap'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "auth_select_%I" ON public.%I FOR SELECT TO authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%I" ON public.%I FOR INSERT TO authenticated WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%I" ON public.%I FOR UPDATE TO authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%I" ON public.%I FOR DELETE TO authenticated USING (true);', t, t);
  END LOOP;
END $$;

-- Timestamp triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'asset_depreciation_books','asset_depreciation_schedule','asset_lease_scenarios',
    'asset_maintenance_plans','asset_inspection_templates'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;

-- =====================================================
-- SEEDS
-- =====================================================
INSERT INTO public.asset_depreciation_books (book_code, book_name, book_name_ar, book_type, base_currency, is_primary, is_active, description) VALUES
  ('IFRS', 'IFRS Book', 'دفتر المعايير الدولية', 'ifrs', 'SAR', true, true, 'Primary IFRS-compliant depreciation book (SOCPA aligned)'),
  ('TAX',  'Saudi Tax Book', 'الدفتر الضريبي السعودي', 'tax', 'SAR', false, true, 'ZATCA tax-aligned depreciation rates'),
  ('MGMT', 'Management Book', 'دفتر الإدارة', 'management', 'SAR', false, true, 'Internal management reporting'),
  ('GROUP', 'Group Consolidation', 'دفتر التوحيد', 'group', 'SAR', false, true, 'Group-level consolidation book')
ON CONFLICT DO NOTHING;

INSERT INTO public.asset_inspection_templates (template_code, template_name, template_name_ar, category, frequency, applicable_asset_types, description) VALUES
  ('INS-FORK-SAFETY', 'Forklift Safety Inspection', 'فحص سلامة الرافعة الشوكية', 'safety', 'daily', ARRAY['forklift','material_handling'], 'OSHA-style daily forklift checklist'),
  ('INS-GEN-PRESTART', 'Generator Pre-Start Check', 'فحص ما قبل تشغيل المولد', 'safety', 'daily', ARRAY['generator','power'], 'Pre-start oil, fuel, coolant, alarms'),
  ('INS-CAL-ISO17025', 'Calibration ISO 17025', 'معايرة آيزو 17025', 'calibration', 'annual', ARRAY['instrument','meter','sensor'], 'ISO/IEC 17025 calibration template'),
  ('INS-VEH-DAILY', 'Vehicle Daily Walk-Around', 'فحص يومي للمركبة', 'daily', 'daily', ARRAY['vehicle','truck','car'], 'Driver pre-trip inspection'),
  ('INS-CRANE-MONTHLY', 'Crane Monthly Inspection', 'الفحص الشهري للرافعة', 'regulatory', 'monthly', ARRAY['crane','lifting'], 'Saudi HCIS aligned monthly crane check')
ON CONFLICT DO NOTHING;

-- Seed forklift checklist items
DO $$
DECLARE tpl_id UUID;
BEGIN
  SELECT id INTO tpl_id FROM public.asset_inspection_templates WHERE template_code = 'INS-FORK-SAFETY' LIMIT 1;
  IF tpl_id IS NOT NULL THEN
    INSERT INTO public.asset_inspection_checklist_items (template_id, item_order, item_text, item_text_ar, response_type, is_required) VALUES
      (tpl_id, 1, 'Tires inflated and undamaged', 'الإطارات منفوخة وسليمة', 'pass_fail', true),
      (tpl_id, 2, 'Forks straight, no cracks', 'الشوك مستقيمة وبدون شقوق', 'pass_fail', true),
      (tpl_id, 3, 'Hydraulic fluid level OK', 'مستوى السائل الهيدروليكي', 'pass_fail', true),
      (tpl_id, 4, 'Horn and lights operational', 'البوق والأضواء تعمل', 'pass_fail', true),
      (tpl_id, 5, 'Seatbelt functional', 'حزام الأمان يعمل', 'pass_fail', true),
      (tpl_id, 6, 'Hour meter reading', 'قراءة عداد الساعات', 'numeric', true),
      (tpl_id, 7, 'Operator signature', 'توقيع المشغل', 'signature', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
