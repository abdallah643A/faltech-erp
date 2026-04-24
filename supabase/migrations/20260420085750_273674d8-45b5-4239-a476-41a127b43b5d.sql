
-- ============================================================
-- INVENTORY & WMS ENHANCEMENT
-- ============================================================

-- 1. STOCK LEDGER (append-only)
CREATE TABLE IF NOT EXISTS public.wms_stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  txn_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  item_code TEXT NOT NULL,
  warehouse_code TEXT NOT NULL,
  bin_code TEXT,
  batch_number TEXT,
  serial_number TEXT,
  movement_type TEXT NOT NULL, -- receipt, issue, transfer_in, transfer_out, adjustment, count, reservation, release
  reference_doc_type TEXT,
  reference_doc_id UUID,
  reference_doc_num TEXT,
  quantity NUMERIC NOT NULL,
  uom TEXT,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  running_balance NUMERIC,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON public.wms_stock_ledger(item_code, warehouse_code, txn_date);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_company ON public.wms_stock_ledger(company_id);

-- 2. UOM CONVERSIONS
CREATE TABLE IF NOT EXISTS public.wms_uom_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  item_code TEXT,
  from_uom TEXT NOT NULL,
  to_uom TEXT NOT NULL,
  factor NUMERIC NOT NULL CHECK (factor > 0),
  is_global BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CARTON / PALLET HIERARCHY
CREATE TABLE IF NOT EXISTS public.wms_carton_pallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  sscc TEXT UNIQUE,
  parent_id UUID REFERENCES public.wms_carton_pallet(id) ON DELETE SET NULL,
  level TEXT NOT NULL, -- pallet, carton, inner_pack, unit
  warehouse_code TEXT,
  bin_code TEXT,
  item_code TEXT,
  batch_number TEXT,
  quantity NUMERIC,
  uom TEXT,
  weight_kg NUMERIC,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. REPLENISHMENT SUGGESTIONS
CREATE TABLE IF NOT EXISTS public.wms_replenishment_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  item_code TEXT NOT NULL,
  warehouse_code TEXT NOT NULL,
  current_qty NUMERIC NOT NULL DEFAULT 0,
  min_qty NUMERIC NOT NULL DEFAULT 0,
  max_qty NUMERIC NOT NULL DEFAULT 0,
  suggested_qty NUMERIC NOT NULL DEFAULT 0,
  source_type TEXT, -- transfer, purchase
  source_warehouse TEXT,
  preferred_vendor TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, fulfilled
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

-- 5. CYCLE COUNT PLANS
CREATE TABLE IF NOT EXISTS public.wms_cycle_count_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  plan_code TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  warehouse_code TEXT NOT NULL,
  count_method TEXT DEFAULT 'abc', -- abc, random, full, location
  scheduled_date DATE,
  variance_tolerance_pct NUMERIC DEFAULT 2.0,
  status TEXT DEFAULT 'draft', -- draft, in_progress, pending_approval, approved, posted
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_cycle_count_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.wms_cycle_count_plans(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  bin_code TEXT,
  batch_number TEXT,
  system_qty NUMERIC NOT NULL DEFAULT 0,
  counted_qty NUMERIC,
  variance_qty NUMERIC,
  variance_pct NUMERIC,
  status TEXT DEFAULT 'pending', -- pending, counted, recounted, approved
  counted_by UUID,
  counted_at TIMESTAMPTZ,
  notes TEXT
);

-- 6. MOBILE SCAN LOG
CREATE TABLE IF NOT EXISTS public.wms_mobile_scan_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  device_id TEXT,
  scan_type TEXT NOT NULL, -- pick, putaway, count, receive, ship, transfer
  barcode TEXT NOT NULL,
  item_code TEXT,
  warehouse_code TEXT,
  bin_code TEXT,
  quantity NUMERIC,
  reference_doc TEXT,
  status TEXT DEFAULT 'success',
  error_msg TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. WAREHOUSE KPIs
CREATE TABLE IF NOT EXISTS public.wms_warehouse_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  warehouse_code TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fill_rate_pct NUMERIC DEFAULT 0,
  inventory_accuracy_pct NUMERIC DEFAULT 0,
  on_time_ship_pct NUMERIC DEFAULT 0,
  avg_dwell_hours NUMERIC DEFAULT 0,
  picks_per_hour NUMERIC DEFAULT 0,
  open_exceptions INTEGER DEFAULT 0,
  utilization_pct NUMERIC DEFAULT 0,
  total_skus INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, warehouse_code, snapshot_date)
);

-- 8. EXCEPTIONS
CREATE TABLE IF NOT EXISTS public.wms_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  exception_type TEXT NOT NULL, -- short_pick, over_receipt, damage, mis_pick, missing, blocked
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  warehouse_code TEXT,
  bin_code TEXT,
  item_code TEXT,
  reference_doc_type TEXT,
  reference_doc_num TEXT,
  expected_qty NUMERIC,
  actual_qty NUMERIC,
  description TEXT,
  status TEXT DEFAULT 'open', -- open, investigating, resolved, escalated
  assigned_to UUID,
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. 3PL PROVIDERS
CREATE TABLE IF NOT EXISTS public.wms_3pl_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  provider_code TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_name_ar TEXT,
  service_types TEXT[], -- express, standard, bulk, cold_chain
  api_endpoint TEXT,
  api_key_secret_name TEXT,
  account_number TEXT,
  default_currency TEXT DEFAULT 'SAR',
  coverage_regions TEXT[],
  rate_card JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_3pl_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  provider_id UUID REFERENCES public.wms_3pl_providers(id),
  awb_number TEXT,
  reference_doc_type TEXT,
  reference_doc_num TEXT,
  warehouse_code TEXT,
  ship_to_name TEXT,
  ship_to_address TEXT,
  ship_to_city TEXT,
  ship_to_country TEXT DEFAULT 'SA',
  weight_kg NUMERIC,
  pieces INTEGER DEFAULT 1,
  declared_value NUMERIC,
  currency TEXT DEFAULT 'SAR',
  service_type TEXT,
  shipment_status TEXT DEFAULT 'pending', -- pending, picked_up, in_transit, delivered, exception
  tracking_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cost NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. FEFO/FIFO RULES
CREATE TABLE IF NOT EXISTS public.wms_fefo_fifo_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  warehouse_code TEXT,
  item_code TEXT,
  item_group TEXT,
  strategy TEXT NOT NULL DEFAULT 'fefo', -- fefo, fifo, lifo, manual
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. CROSS-WAREHOUSE RESERVATIONS
CREATE TABLE IF NOT EXISTS public.wms_cross_warehouse_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  reservation_number TEXT NOT NULL,
  reference_doc_type TEXT,
  reference_doc_id UUID,
  reference_doc_num TEXT,
  customer_code TEXT,
  customer_name TEXT,
  item_code TEXT NOT NULL,
  total_qty NUMERIC NOT NULL,
  reserved_qty NUMERIC DEFAULT 0,
  warehouse_allocations JSONB, -- [{warehouse, bin, batch, qty}]
  priority INTEGER DEFAULT 100,
  status TEXT DEFAULT 'active', -- active, partial, fulfilled, cancelled, expired
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ENABLE RLS + POLICIES
-- ============================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'wms_stock_ledger','wms_uom_conversions','wms_carton_pallet',
    'wms_replenishment_suggestions','wms_cycle_count_plans','wms_cycle_count_lines',
    'wms_mobile_scan_log','wms_warehouse_kpis','wms_exceptions',
    'wms_3pl_providers','wms_3pl_shipments','wms_fefo_fifo_rules',
    'wms_cross_warehouse_reservations'
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

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.wms_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$
DECLARE t TEXT;
DECLARE tables TEXT[] := ARRAY[
  'wms_uom_conversions','wms_carton_pallet','wms_cycle_count_plans',
  'wms_exceptions','wms_3pl_providers','wms_3pl_shipments',
  'wms_fefo_fifo_rules','wms_cross_warehouse_reservations'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.wms_set_updated_at()', t, t);
  END LOOP;
END $$;

-- ============================================================
-- SEED: Saudi/GCC 3PL Providers
-- ============================================================
INSERT INTO public.wms_3pl_providers (provider_code, provider_name, provider_name_ar, service_types, default_currency, coverage_regions, is_active)
VALUES
  ('ARAMEX', 'Aramex', 'أرامكس', ARRAY['express','standard','bulk'], 'SAR', ARRAY['SA','AE','KW','BH','OM','QA'], true),
  ('SMSA', 'SMSA Express', 'سمسا إكسبرس', ARRAY['express','standard'], 'SAR', ARRAY['SA'], true),
  ('NAQEL', 'Naqel Express', 'ناقل إكسبرس', ARRAY['express','standard','bulk'], 'SAR', ARRAY['SA','AE'], true),
  ('DHL', 'DHL Express', 'دي إتش إل', ARRAY['express','international'], 'SAR', ARRAY['GLOBAL'], true),
  ('FEDEX', 'FedEx', 'فيديكس', ARRAY['express','international'], 'SAR', ARRAY['GLOBAL'], true)
ON CONFLICT DO NOTHING;

-- Seed common UoM conversions
INSERT INTO public.wms_uom_conversions (from_uom, to_uom, factor, is_global, notes) VALUES
  ('CASE','EA',24,true,'Standard case = 24 units'),
  ('PALLET','CASE',40,true,'Standard pallet = 40 cases'),
  ('PALLET','EA',960,true,'Pallet to each'),
  ('KG','G',1000,true,'Kilogram to gram'),
  ('KG','LB',2.20462,true,'Kilogram to pound'),
  ('L','ML',1000,true,'Liter to milliliter'),
  ('M','CM',100,true,'Meter to centimeter'),
  ('BOX','EA',12,true,'Standard box = 12 units')
ON CONFLICT DO NOTHING;
