
-- WMS Tasks
CREATE TABLE public.wms_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  task_type TEXT NOT NULL CHECK (task_type IN ('receive','putaway','pick','pack','load','count','transfer','return')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_progress','completed','cancelled','exception')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent','high','normal','low')),
  reference_number TEXT,
  reference_type TEXT,
  reference_id UUID,
  warehouse_code TEXT,
  source_bin TEXT,
  target_bin TEXT,
  item_code TEXT,
  item_description TEXT,
  lot_number TEXT,
  serial_number TEXT,
  expected_qty NUMERIC DEFAULT 0,
  actual_qty NUMERIC DEFAULT 0,
  uom TEXT,
  assigned_to UUID,
  assigned_to_name TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  exception_reason TEXT,
  exception_notes TEXT,
  wave_id UUID,
  suggested_next_task_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wms_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage wms_tasks" ON public.wms_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_wms_tasks_status ON public.wms_tasks(status);
CREATE INDEX idx_wms_tasks_type ON public.wms_tasks(task_type);
CREATE INDEX idx_wms_tasks_assigned ON public.wms_tasks(assigned_to);
CREATE INDEX idx_wms_tasks_wave ON public.wms_tasks(wave_id);

CREATE TRIGGER update_wms_tasks_updated_at BEFORE UPDATE ON public.wms_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WMS Scans
CREATE TABLE public.wms_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  task_id UUID REFERENCES public.wms_tasks(id),
  scan_type TEXT NOT NULL CHECK (scan_type IN ('barcode','rfid','manual')),
  scan_value TEXT NOT NULL,
  scan_result TEXT NOT NULL DEFAULT 'success' CHECK (scan_result IN ('success','mismatch','unknown','error')),
  expected_value TEXT,
  item_code TEXT,
  item_description TEXT,
  lot_number TEXT,
  serial_number TEXT,
  quantity NUMERIC DEFAULT 1,
  location TEXT,
  bin_code TEXT,
  scanned_by UUID,
  scanned_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wms_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage wms_scans" ON public.wms_scans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_wms_scans_task ON public.wms_scans(task_id);
CREATE INDEX idx_wms_scans_item ON public.wms_scans(item_code);

-- WMS Waves
CREATE TABLE public.wms_waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  wave_number TEXT NOT NULL,
  wave_type TEXT DEFAULT 'batch' CHECK (wave_type IN ('batch','wave','single')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','released','in_progress','completed','cancelled')),
  priority TEXT DEFAULT 'normal',
  total_lines INT DEFAULT 0,
  completed_lines INT DEFAULT 0,
  warehouse_code TEXT,
  notes TEXT,
  created_by UUID,
  released_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wms_waves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage wms_waves" ON public.wms_waves FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_wms_waves_updated_at BEFORE UPDATE ON public.wms_waves FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WMS Wave Lines
CREATE TABLE public.wms_wave_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id UUID REFERENCES public.wms_waves(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.wms_tasks(id),
  order_reference TEXT,
  item_code TEXT,
  item_description TEXT,
  quantity NUMERIC DEFAULT 0,
  picked_qty NUMERIC DEFAULT 0,
  bin_code TEXT,
  status TEXT DEFAULT 'pending',
  line_num INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wms_wave_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage wms_wave_lines" ON public.wms_wave_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Packing Stations
CREATE TABLE public.wms_packing_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  station_code TEXT NOT NULL,
  station_name TEXT,
  warehouse_code TEXT,
  is_active BOOLEAN DEFAULT true,
  current_order TEXT,
  current_operator UUID,
  current_operator_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wms_packing_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage wms_packing_stations" ON public.wms_packing_stations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Pack Sessions
CREATE TABLE public.wms_pack_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  station_id UUID REFERENCES public.wms_packing_stations(id),
  order_reference TEXT,
  status TEXT DEFAULT 'packing' CHECK (status IN ('packing','packed','verified','shipped')),
  total_items INT DEFAULT 0,
  packed_items INT DEFAULT 0,
  box_count INT DEFAULT 0,
  total_weight NUMERIC DEFAULT 0,
  packer_id UUID,
  packer_name TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  label_printed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wms_pack_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage wms_pack_sessions" ON public.wms_pack_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cycle Counts
CREATE TABLE public.wms_cycle_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  count_number TEXT NOT NULL,
  warehouse_code TEXT,
  zone TEXT,
  method TEXT DEFAULT 'full' CHECK (method IN ('full','abc','random','zone')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','in_progress','review','approved','cancelled')),
  total_items INT DEFAULT 0,
  counted_items INT DEFAULT 0,
  variance_items INT DEFAULT 0,
  variance_value NUMERIC DEFAULT 0,
  counter_id UUID,
  counter_name TEXT,
  reviewer_id UUID,
  reviewer_name TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wms_cycle_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage wms_cycle_counts" ON public.wms_cycle_counts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_wms_cycle_counts_updated_at BEFORE UPDATE ON public.wms_cycle_counts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cycle Count Lines
CREATE TABLE public.wms_cycle_count_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_count_id UUID REFERENCES public.wms_cycle_counts(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_description TEXT,
  bin_code TEXT,
  lot_number TEXT,
  serial_number TEXT,
  system_qty NUMERIC DEFAULT 0,
  counted_qty NUMERIC,
  variance_qty NUMERIC GENERATED ALWAYS AS (COALESCE(counted_qty, 0) - system_qty) STORED,
  unit_cost NUMERIC DEFAULT 0,
  variance_value NUMERIC GENERATED ALWAYS AS ((COALESCE(counted_qty, 0) - system_qty) * COALESCE(unit_cost, 0)) STORED,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','counted','verified','adjusted')),
  counted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wms_cycle_count_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage wms_cycle_count_lines" ON public.wms_cycle_count_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WMS Exceptions
CREATE TABLE public.wms_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  task_id UUID REFERENCES public.wms_tasks(id),
  exception_type TEXT NOT NULL CHECK (exception_type IN ('shortage','damage','mismatch','split_pick','wrong_item','wrong_location','system_error','other')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','escalated')),
  title TEXT NOT NULL,
  description TEXT,
  item_code TEXT,
  expected_value TEXT,
  actual_value TEXT,
  warehouse_code TEXT,
  bin_code TEXT,
  resolution TEXT,
  resolved_by UUID,
  resolved_by_name TEXT,
  resolved_at TIMESTAMPTZ,
  reported_by UUID,
  reported_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wms_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage wms_exceptions" ON public.wms_exceptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_wms_exceptions_updated_at BEFORE UPDATE ON public.wms_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live dashboards
ALTER PUBLICATION supabase_realtime ADD TABLE public.wms_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wms_scans;
