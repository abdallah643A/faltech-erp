
-- CPMS Equipment Inventory
CREATE TABLE public.cpms_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  company_id UUID,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  type TEXT DEFAULT 'owned',
  make TEXT,
  model TEXT,
  serial_number TEXT,
  year_manufactured INT,
  purchase_date DATE,
  purchase_cost NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  salvage_value NUMERIC DEFAULT 0,
  useful_life_years INT DEFAULT 10,
  depreciation_method TEXT DEFAULT 'straight_line',
  status TEXT DEFAULT 'available',
  condition TEXT DEFAULT 'good',
  location TEXT,
  assigned_project_id UUID,
  assigned_to TEXT,
  hourly_rate NUMERIC DEFAULT 0,
  daily_rate NUMERIC DEFAULT 0,
  monthly_rate NUMERIC DEFAULT 0,
  rental_vendor TEXT,
  rental_start_date DATE,
  rental_end_date DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_interval_hours NUMERIC,
  total_engine_hours NUMERIC DEFAULT 0,
  qr_code TEXT,
  photo_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_cpms_equipment" ON public.cpms_equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Equipment Utilization Logs
CREATE TABLE public.cpms_equipment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.cpms_equipment(id) ON DELETE CASCADE,
  project_id UUID,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_used NUMERIC DEFAULT 0,
  hours_idle NUMERIC DEFAULT 0,
  hours_maintenance NUMERIC DEFAULT 0,
  fuel_consumed NUMERIC,
  operator_name TEXT,
  work_description TEXT,
  location TEXT,
  status TEXT DEFAULT 'operational',
  notes TEXT,
  logged_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_equipment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_cpms_equip_logs" ON public.cpms_equipment_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Equipment Maintenance Records
CREATE TABLE public.cpms_equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.cpms_equipment(id) ON DELETE CASCADE,
  maintenance_type TEXT DEFAULT 'preventive',
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE,
  completed_date DATE,
  cost NUMERIC DEFAULT 0,
  vendor TEXT,
  parts_replaced TEXT,
  next_due_date DATE,
  next_due_hours NUMERIC,
  status TEXT DEFAULT 'scheduled',
  performed_by TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_equipment_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_cpms_equip_maint" ON public.cpms_equipment_maintenance FOR ALL TO authenticated USING (true) WITH CHECK (true);
