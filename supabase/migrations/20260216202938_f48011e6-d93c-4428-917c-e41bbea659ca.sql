
-- Asset Categories lookup table
CREATE TABLE public.asset_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default categories
INSERT INTO public.asset_categories (name, name_ar) VALUES
  ('Laptop', 'حاسب محمول'),
  ('Desktop', 'حاسب مكتبي'),
  ('Server', 'خادم'),
  ('Printer', 'طابعة'),
  ('Network Equipment', 'معدات شبكات'),
  ('Monitor', 'شاشة'),
  ('Phone', 'هاتف'),
  ('Vehicle', 'مركبة'),
  ('Furniture', 'أثاث'),
  ('Equipment', 'معدات'),
  ('Software License', 'ترخيص برنامج'),
  ('Other', 'أخرى');

-- Main Assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.asset_categories(id),
  serial_number TEXT,
  barcode TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('requested','purchased','available','assigned','in_transfer','under_maintenance','returned','disposed')),
  condition TEXT DEFAULT 'good' CHECK (condition IN ('new','good','fair','poor','damaged','non_functional')),
  purchase_date DATE,
  vendor TEXT,
  purchase_value NUMERIC(12,2) DEFAULT 0,
  current_value NUMERIC(12,2) DEFAULT 0,
  depreciation_method TEXT DEFAULT 'straight_line',
  depreciation_rate NUMERIC(5,2) DEFAULT 20,
  warranty_start DATE,
  warranty_end DATE,
  location TEXT,
  department TEXT,
  assigned_to_employee_id UUID REFERENCES public.employees(id),
  assigned_to_user_id UUID,
  assigned_to_project_id UUID REFERENCES public.projects(id),
  branch_id UUID REFERENCES public.branches(id),
  purchase_request_id UUID,
  notes TEXT,
  image_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asset code sequence
CREATE SEQUENCE IF NOT EXISTS asset_code_seq START WITH 1;

-- Asset Purchase Requests
CREATE TABLE public.asset_purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  requester_id UUID,
  requester_name TEXT,
  department TEXT,
  category_id UUID REFERENCES public.asset_categories(id),
  quantity INTEGER DEFAULT 1,
  estimated_cost NUMERIC(12,2) DEFAULT 0,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'pending_manager' CHECK (status IN ('draft','pending_manager','pending_head_manager','pending_it_manager','pending_finance_manager','approved','rejected','converted')),
  -- Approval chain
  manager_id UUID,
  manager_name TEXT,
  manager_status TEXT DEFAULT 'pending',
  manager_date TIMESTAMPTZ,
  manager_notes TEXT,
  head_manager_id UUID,
  head_manager_name TEXT,
  head_manager_status TEXT DEFAULT 'pending',
  head_manager_date TIMESTAMPTZ,
  head_manager_notes TEXT,
  it_manager_id UUID,
  it_manager_name TEXT,
  it_manager_status TEXT DEFAULT 'pending',
  it_manager_date TIMESTAMPTZ,
  it_manager_notes TEXT,
  finance_manager_id UUID,
  finance_manager_name TEXT,
  finance_manager_status TEXT DEFAULT 'pending',
  finance_manager_date TIMESTAMPTZ,
  finance_manager_notes TEXT,
  -- Linked PO
  purchase_order_id UUID,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS apr_code_seq START WITH 1;

-- Asset Assignments
CREATE TABLE public.asset_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  assigned_to_employee_id UUID REFERENCES public.employees(id),
  assigned_to_user_id UUID,
  assigned_to_user_name TEXT,
  assigned_to_department TEXT,
  assigned_to_project_id UUID REFERENCES public.projects(id),
  assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  condition_at_assignment TEXT DEFAULT 'good',
  condition_at_return TEXT,
  handover_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','returned','transferred')),
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asset Transfers
CREATE TABLE public.asset_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_code TEXT NOT NULL UNIQUE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  from_employee_id UUID REFERENCES public.employees(id),
  from_user_name TEXT,
  from_department TEXT,
  from_location TEXT,
  to_employee_id UUID REFERENCES public.employees(id),
  to_user_name TEXT,
  to_department TEXT,
  to_location TEXT,
  reason TEXT,
  condition_before TEXT DEFAULT 'good',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','completed','rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  transfer_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS transfer_code_seq START WITH 1;

-- Asset Maintenance
CREATE TABLE public.asset_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_code TEXT NOT NULL UNIQUE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL DEFAULT 'corrective' CHECK (maintenance_type IN ('preventive','corrective','calibration','upgrade')),
  issue_description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  vendor_service_provider TEXT,
  cost NUMERIC(12,2) DEFAULT 0,
  service_date DATE,
  completion_date DATE,
  downtime_hours NUMERIC(8,2) DEFAULT 0,
  warranty_covered BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  reported_by UUID,
  reported_by_name TEXT,
  assigned_to TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS maint_code_seq START WITH 1;

-- Asset History (Audit Trail)
CREATE TABLE public.asset_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','updated','assigned','unassigned','transferred','maintenance_start','maintenance_end','condition_change','location_change','value_change','disposed','status_change')),
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  performed_by UUID,
  performed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asset Disposals
CREATE TABLE public.asset_disposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  disposal_type TEXT NOT NULL CHECK (disposal_type IN ('sold','damaged','lost','obsolete','donated','recycled')),
  disposal_reason TEXT,
  disposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  residual_value NUMERIC(12,2) DEFAULT 0,
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','completed','rejected')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_disposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Categories are viewable by all authenticated
CREATE POLICY "Anyone can view asset categories" ON public.asset_categories FOR SELECT TO authenticated USING (true);

-- Assets - viewable by authenticated, branch-scoped for managers
CREATE POLICY "Authenticated users can view assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update assets" ON public.assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete assets" ON public.assets FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Purchase Requests
CREATE POLICY "Authenticated users can view asset PRs" ON public.asset_purchase_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert asset PRs" ON public.asset_purchase_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update asset PRs" ON public.asset_purchase_requests FOR UPDATE TO authenticated USING (true);

-- Assignments
CREATE POLICY "Authenticated users can view assignments" ON public.asset_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert assignments" ON public.asset_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update assignments" ON public.asset_assignments FOR UPDATE TO authenticated USING (true);

-- Transfers
CREATE POLICY "Authenticated users can view transfers" ON public.asset_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transfers" ON public.asset_transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update transfers" ON public.asset_transfers FOR UPDATE TO authenticated USING (true);

-- Maintenance
CREATE POLICY "Authenticated users can view maintenance" ON public.asset_maintenance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert maintenance" ON public.asset_maintenance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update maintenance" ON public.asset_maintenance FOR UPDATE TO authenticated USING (true);

-- History - view only
CREATE POLICY "Authenticated users can view asset history" ON public.asset_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert asset history" ON public.asset_history FOR INSERT TO authenticated WITH CHECK (true);

-- Disposals
CREATE POLICY "Authenticated users can view disposals" ON public.asset_disposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert disposals" ON public.asset_disposals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update disposals" ON public.asset_disposals FOR UPDATE TO authenticated USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_asset_purchase_requests_updated_at BEFORE UPDATE ON public.asset_purchase_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_asset_maintenance_updated_at BEFORE UPDATE ON public.asset_maintenance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-log asset history on status change
CREATE OR REPLACE FUNCTION public.log_asset_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO asset_history (asset_id, event_type, description, new_value, performed_by)
    VALUES (NEW.id, 'created', 'Asset registered: ' || NEW.name, to_jsonb(NEW), NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO asset_history (asset_id, event_type, description, old_value, new_value, performed_by)
      VALUES (NEW.id, 'status_change', 'Status changed from ' || OLD.status || ' to ' || NEW.status,
        jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status), auth.uid());
    END IF;
    IF OLD.assigned_to_employee_id IS DISTINCT FROM NEW.assigned_to_employee_id THEN
      INSERT INTO asset_history (asset_id, event_type, description, old_value, new_value, performed_by)
      VALUES (NEW.id, 
        CASE WHEN NEW.assigned_to_employee_id IS NULL THEN 'unassigned' ELSE 'assigned' END,
        'Assignment changed',
        jsonb_build_object('employee_id', OLD.assigned_to_employee_id),
        jsonb_build_object('employee_id', NEW.assigned_to_employee_id),
        auth.uid());
    END IF;
    IF OLD.location IS DISTINCT FROM NEW.location THEN
      INSERT INTO asset_history (asset_id, event_type, description, old_value, new_value, performed_by)
      VALUES (NEW.id, 'location_change', 'Location changed',
        jsonb_build_object('location', OLD.location), jsonb_build_object('location', NEW.location), auth.uid());
    END IF;
    IF OLD.condition IS DISTINCT FROM NEW.condition THEN
      INSERT INTO asset_history (asset_id, event_type, description, old_value, new_value, performed_by)
      VALUES (NEW.id, 'condition_change', 'Condition changed from ' || COALESCE(OLD.condition,'unknown') || ' to ' || COALESCE(NEW.condition,'unknown'),
        jsonb_build_object('condition', OLD.condition), jsonb_build_object('condition', NEW.condition), auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_history_trigger
AFTER INSERT OR UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.log_asset_history();
