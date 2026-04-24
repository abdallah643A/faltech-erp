
-- Labor Camps
CREATE TABLE public.labor_camps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  camp_name TEXT NOT NULL,
  camp_code TEXT,
  location_address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Saudi Arabia',
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  camp_type TEXT DEFAULT 'owned' CHECK (camp_type IN ('owned','rented','shared')),
  total_capacity INTEGER DEFAULT 0,
  current_occupancy INTEGER DEFAULT 0,
  landlord_name TEXT,
  rent_amount NUMERIC DEFAULT 0,
  lease_start_date DATE,
  lease_end_date DATE,
  transport_route TEXT,
  transport_provider TEXT,
  compliance_status TEXT DEFAULT 'compliant' CHECK (compliance_status IN ('compliant','non_compliant','pending_inspection','expired')),
  last_inspection_date DATE,
  next_inspection_date DATE,
  amenities TEXT[],
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','under_maintenance','closed')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.labor_camps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage labor_camps" ON public.labor_camps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_labor_camps_updated_at BEFORE UPDATE ON public.labor_camps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Camp Rooms
CREATE TABLE public.camp_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id UUID NOT NULL REFERENCES public.labor_camps(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor INTEGER DEFAULT 1,
  room_type TEXT DEFAULT 'dormitory' CHECK (room_type IN ('single','double','triple','dormitory','suite')),
  bed_count INTEGER DEFAULT 1,
  occupied_beds INTEGER DEFAULT 0,
  amenities TEXT[],
  has_ac BOOLEAN DEFAULT true,
  has_bathroom BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','full','maintenance','reserved','closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.camp_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage camp_rooms" ON public.camp_rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_camp_rooms_updated_at BEFORE UPDATE ON public.camp_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bed Assignments
CREATE TABLE public.camp_bed_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.camp_rooms(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES public.labor_camps(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  bed_number TEXT,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_out_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','checked_out','transferred','on_leave')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.camp_bed_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage camp_bed_assignments" ON public.camp_bed_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_camp_bed_assignments_updated_at BEFORE UPDATE ON public.camp_bed_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transfer History
CREATE TABLE public.camp_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  from_camp_id UUID REFERENCES public.labor_camps(id),
  from_room_id UUID REFERENCES public.camp_rooms(id),
  to_camp_id UUID REFERENCES public.labor_camps(id),
  to_room_id UUID REFERENCES public.camp_rooms(id),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  approved_by TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','approved','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.camp_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage camp_transfers" ON public.camp_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Maintenance Requests
CREATE TABLE public.camp_maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id UUID NOT NULL REFERENCES public.labor_camps(id),
  room_id UUID REFERENCES public.camp_rooms(id),
  request_number TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('plumbing','electrical','hvac','structural','cleaning','pest_control','general','furniture','appliance')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  description TEXT NOT NULL,
  reported_by TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','on_hold','completed','cancelled')),
  resolution_notes TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  reported_date DATE DEFAULT CURRENT_DATE,
  completed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.camp_maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage camp_maintenance_requests" ON public.camp_maintenance_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_camp_maintenance_updated_at BEFORE UPDATE ON public.camp_maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS camp_maint_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_camp_maint_number()
  RETURNS trigger AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := 'CM-' || LPAD(nextval('camp_maint_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_camp_maint_number BEFORE INSERT ON public.camp_maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.generate_camp_maint_number();

-- Compliance Inspections
CREATE TABLE public.camp_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id UUID NOT NULL REFERENCES public.labor_camps(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_name TEXT NOT NULL,
  inspector_org TEXT,
  inspection_type TEXT DEFAULT 'routine' CHECK (inspection_type IN ('routine','surprise','follow_up','annual','complaint')),
  overall_score NUMERIC,
  max_score NUMERIC DEFAULT 100,
  findings TEXT,
  corrective_actions TEXT,
  is_passed BOOLEAN DEFAULT true,
  next_inspection_date DATE,
  attachments TEXT[],
  status TEXT DEFAULT 'completed' CHECK (status IN ('scheduled','in_progress','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.camp_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage camp_inspections" ON public.camp_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_camp_rooms_camp ON public.camp_rooms(camp_id);
CREATE INDEX idx_bed_assignments_camp ON public.camp_bed_assignments(camp_id);
CREATE INDEX idx_bed_assignments_employee ON public.camp_bed_assignments(employee_id);
CREATE INDEX idx_camp_maint_camp ON public.camp_maintenance_requests(camp_id);
CREATE INDEX idx_camp_inspections_camp ON public.camp_inspections(camp_id);
