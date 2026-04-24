
-- Bin Locations (OBIN equivalent in SAP B1)
CREATE TABLE public.bin_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  warehouse_code TEXT NOT NULL,
  bin_code TEXT NOT NULL,
  bin_description TEXT,
  zone TEXT,
  aisle TEXT,
  shelf TEXT,
  level TEXT,
  sublevel TEXT,
  max_weight NUMERIC,
  max_volume NUMERIC,
  is_receiving_bin BOOLEAN DEFAULT false,
  is_shipping_bin BOOLEAN DEFAULT false,
  is_default_bin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  barcode TEXT,
  sap_abs_entry TEXT,
  sap_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(warehouse_code, bin_code)
);

-- Item Warehouse Info (OITW equivalent - per-warehouse item settings)
CREATE TABLE public.item_warehouse_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  warehouse_code TEXT NOT NULL,
  in_stock NUMERIC DEFAULT 0,
  committed NUMERIC DEFAULT 0,
  ordered NUMERIC DEFAULT 0,
  available NUMERIC GENERATED ALWAYS AS (in_stock - committed + ordered) STORED,
  min_stock NUMERIC DEFAULT 0,
  max_stock NUMERIC DEFAULT 0,
  reorder_point NUMERIC DEFAULT 0,
  reorder_quantity NUMERIC DEFAULT 0,
  default_bin_code TEXT,
  valuation_method TEXT DEFAULT 'moving_average',
  cost_price NUMERIC DEFAULT 0,
  avg_price NUMERIC DEFAULT 0,
  last_purchase_price NUMERIC DEFAULT 0,
  last_purchase_date DATE,
  last_count_date DATE,
  locked BOOLEAN DEFAULT false,
  sap_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_code, warehouse_code)
);

-- Batch/Serial Number Master (OBTN/OSRN equivalent)
CREATE TABLE public.batch_serial_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  tracking_type TEXT NOT NULL DEFAULT 'batch', -- 'batch' or 'serial'
  batch_serial_number TEXT NOT NULL,
  warehouse_code TEXT,
  bin_code TEXT,
  status TEXT DEFAULT 'available', -- available, committed, sold, expired, quarantine
  quantity NUMERIC DEFAULT 1,
  manufacturing_date DATE,
  expiry_date DATE,
  admission_date DATE DEFAULT CURRENT_DATE,
  supplier_code TEXT,
  supplier_batch TEXT,
  lot_number TEXT,
  notes TEXT,
  attributes JSONB DEFAULT '{}',
  sap_abs_entry TEXT,
  sap_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory Valuation Snapshot (for reporting)
CREATE TABLE public.inventory_valuation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_description TEXT,
  warehouse_code TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  total_value NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  valuation_method TEXT DEFAULT 'moving_average',
  currency TEXT DEFAULT 'SAR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bin_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_warehouse_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_valuation ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can read, write
CREATE POLICY "Authenticated users can read bin_locations" ON public.bin_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage bin_locations" ON public.bin_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read item_warehouse_info" ON public.item_warehouse_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage item_warehouse_info" ON public.item_warehouse_info FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read batch_serial_numbers" ON public.batch_serial_numbers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage batch_serial_numbers" ON public.batch_serial_numbers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read inventory_valuation" ON public.inventory_valuation FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage inventory_valuation" ON public.inventory_valuation FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_bin_locations_warehouse ON public.bin_locations(warehouse_code);
CREATE INDEX idx_item_warehouse_info_item ON public.item_warehouse_info(item_code);
CREATE INDEX idx_item_warehouse_info_warehouse ON public.item_warehouse_info(warehouse_code);
CREATE INDEX idx_batch_serial_item ON public.batch_serial_numbers(item_code);
CREATE INDEX idx_batch_serial_warehouse ON public.batch_serial_numbers(warehouse_code);
CREATE INDEX idx_batch_serial_expiry ON public.batch_serial_numbers(expiry_date);
CREATE INDEX idx_inventory_valuation_date ON public.inventory_valuation(snapshot_date);
