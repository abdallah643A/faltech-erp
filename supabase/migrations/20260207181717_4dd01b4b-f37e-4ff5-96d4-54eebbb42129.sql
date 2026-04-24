
-- ============================================
-- DESIGN & COSTING MODULE
-- ============================================

-- Bill of Materials (BOM) table
CREATE TABLE public.design_bom (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  bom_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  revision_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  total_material_cost NUMERIC DEFAULT 0,
  total_labor_cost NUMERIC DEFAULT 0,
  total_overhead_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  prepared_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BOM Line Items
CREATE TABLE public.design_bom_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bom_id UUID REFERENCES public.design_bom(id) ON DELETE CASCADE NOT NULL,
  line_number INTEGER NOT NULL,
  item_code TEXT,
  item_description TEXT NOT NULL,
  category TEXT DEFAULT 'material',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'EA',
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT,
  lead_time_days INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cost Variance Records
CREATE TABLE public.cost_variances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  bom_id UUID REFERENCES public.design_bom(id),
  original_estimated_cost NUMERIC NOT NULL DEFAULT 0,
  revised_cost NUMERIC NOT NULL DEFAULT 0,
  variance_amount NUMERIC NOT NULL DEFAULT 0,
  variance_percentage NUMERIC NOT NULL DEFAULT 0,
  variance_reason TEXT,
  category TEXT DEFAULT 'material',
  status TEXT NOT NULL DEFAULT 'pending',
  requires_additional_payment BOOLEAN DEFAULT false,
  additional_amount NUMERIC DEFAULT 0,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- MANUFACTURING MODULE
-- ============================================

-- Production Orders
CREATE TABLE public.production_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  bom_id UUID REFERENCES public.design_bom(id),
  priority TEXT DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'planned',
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  quantity_planned NUMERIC DEFAULT 1,
  quantity_completed NUMERIC DEFAULT 0,
  quantity_rejected NUMERIC DEFAULT 0,
  assigned_to UUID,
  production_line TEXT,
  shift TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Work Orders (sub-tasks under production orders)
CREATE TABLE public.work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_order_id UUID REFERENCES public.production_orders(id) ON DELETE CASCADE NOT NULL,
  work_order_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  work_type TEXT DEFAULT 'fabrication',
  sequence_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  assigned_to UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quality Control Checkpoints
CREATE TABLE public.qc_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_order_id UUID REFERENCES public.production_orders(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id),
  checkpoint_name TEXT NOT NULL,
  checkpoint_type TEXT DEFAULT 'inspection',
  description TEXT,
  acceptance_criteria TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  inspector_id UUID,
  inspected_at TIMESTAMPTZ,
  pass_fail BOOLEAN,
  defect_description TEXT,
  corrective_action TEXT,
  photos_urls TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- DELIVERY & INSTALLATION MODULE
-- ============================================

-- Delivery Orders
CREATE TABLE public.delivery_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  delivery_number TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  delivery_type TEXT DEFAULT 'standard',
  scheduled_date DATE,
  actual_delivery_date DATE,
  origin_address TEXT,
  destination_address TEXT,
  transport_method TEXT,
  transport_company TEXT,
  tracking_number TEXT,
  estimated_weight NUMERIC,
  estimated_dimensions TEXT,
  special_handling_notes TEXT,
  delivery_contact_name TEXT,
  delivery_contact_phone TEXT,
  received_by_name TEXT,
  received_at TIMESTAMPTZ,
  delivery_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Installation Tasks
CREATE TABLE public.installation_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  delivery_order_id UUID REFERENCES public.delivery_orders(id),
  task_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'installation',
  sequence_number INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_team TEXT,
  assigned_to UUID,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  scheduled_start DATE,
  scheduled_end DATE,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  safety_requirements TEXT,
  tools_required TEXT,
  completion_photos TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Sign-offs
CREATE TABLE public.project_signoffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  signoff_type TEXT NOT NULL DEFAULT 'final_acceptance',
  title TEXT NOT NULL,
  description TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_name TEXT,
  customer_title TEXT,
  customer_signature_url TEXT,
  customer_signed_at TIMESTAMPTZ,
  internal_approved_by UUID,
  internal_approved_at TIMESTAMPTZ,
  punch_list_items JSONB DEFAULT '[]'::jsonb,
  warranty_start_date DATE,
  warranty_end_date DATE,
  warranty_terms TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Design BOM
ALTER TABLE public.design_bom ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can manage BOMs" ON public.design_bom FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Authenticated users can view BOMs" ON public.design_bom FOR SELECT USING (auth.uid() IS NOT NULL);

-- BOM Items
ALTER TABLE public.design_bom_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can manage BOM items" ON public.design_bom_items FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Authenticated users can view BOM items" ON public.design_bom_items FOR SELECT USING (auth.uid() IS NOT NULL);

-- Cost Variances
ALTER TABLE public.cost_variances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can manage cost variances" ON public.cost_variances FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Authenticated users can view cost variances" ON public.cost_variances FOR SELECT USING (auth.uid() IS NOT NULL);

-- Production Orders
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can manage production orders" ON public.production_orders FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Authenticated users can view production orders" ON public.production_orders FOR SELECT USING (auth.uid() IS NOT NULL);

-- Work Orders
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can manage work orders" ON public.work_orders FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Authenticated users can view work orders" ON public.work_orders FOR SELECT USING (auth.uid() IS NOT NULL);

-- QC Checkpoints
ALTER TABLE public.qc_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can manage QC checkpoints" ON public.qc_checkpoints FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Authenticated users can view QC checkpoints" ON public.qc_checkpoints FOR SELECT USING (auth.uid() IS NOT NULL);

-- Delivery Orders
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can manage deliveries" ON public.delivery_orders FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Authenticated users can view deliveries" ON public.delivery_orders FOR SELECT USING (auth.uid() IS NOT NULL);

-- Installation Tasks
ALTER TABLE public.installation_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can manage installations" ON public.installation_tasks FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Authenticated users can view installations" ON public.installation_tasks FOR SELECT USING (auth.uid() IS NOT NULL);

-- Project Signoffs
ALTER TABLE public.project_signoffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can manage signoffs" ON public.project_signoffs FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "Authenticated users can view signoffs" ON public.project_signoffs FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE TRIGGER update_design_bom_updated_at BEFORE UPDATE ON public.design_bom FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cost_variances_updated_at BEFORE UPDATE ON public.cost_variances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_production_orders_updated_at BEFORE UPDATE ON public.production_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_qc_checkpoints_updated_at BEFORE UPDATE ON public.qc_checkpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_delivery_orders_updated_at BEFORE UPDATE ON public.delivery_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_installation_tasks_updated_at BEFORE UPDATE ON public.installation_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_signoffs_updated_at BEFORE UPDATE ON public.project_signoffs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
