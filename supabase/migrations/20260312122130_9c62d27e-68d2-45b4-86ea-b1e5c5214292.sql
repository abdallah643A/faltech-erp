
-- CPMS Tenders
CREATE TABLE public.cpms_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_number TEXT NOT NULL,
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','won','lost','cancelled')),
  submission_deadline TIMESTAMPTZ,
  opening_date TIMESTAMPTZ,
  estimated_value NUMERIC DEFAULT 0,
  submitted_value NUMERIC DEFAULT 0,
  bond_required BOOLEAN DEFAULT false,
  bond_amount NUMERIC DEFAULT 0,
  documents JSONB DEFAULT '[]',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CPMS Clients
CREATE TABLE public.cpms_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  type TEXT DEFAULT 'private' CHECK (type IN ('government','private','commercial','semi_government')),
  cr_number TEXT,
  vat_number TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add client FK to tenders
ALTER TABLE public.cpms_tenders ADD CONSTRAINT cpms_tenders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.cpms_clients(id) ON DELETE SET NULL;

-- CPMS Resources
CREATE TABLE public.cpms_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('labor','equipment','material')),
  category TEXT,
  unit TEXT,
  unit_cost NUMERIC DEFAULT 0,
  quantity_available NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','in_use','maintenance','retired')),
  specifications JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CPMS Resource Allocations
CREATE TABLE public.cpms_resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.cpms_resources(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  wbs_id UUID REFERENCES public.cpms_wbs_nodes(id) ON DELETE SET NULL,
  quantity_allocated NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  actual_usage NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CPMS Milestones
CREATE TABLE public.cpms_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','delayed')),
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  progress_percentage NUMERIC DEFAULT 0,
  sequence_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CPMS Tasks
CREATE TABLE public.cpms_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.cpms_milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','completed')),
  assigned_to UUID,
  assigned_to_name TEXT,
  due_date DATE,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CPMS BOQ Items (Bill of Quantities)
CREATE TABLE public.cpms_boq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  category TEXT,
  item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_amount NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  actual_quantity NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CPMS Invoices (Progress/Retention/Final)
CREATE TABLE public.cpms_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  type TEXT DEFAULT 'progress' CHECK (type IN ('progress','retention','final','variation')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','paid','rejected')),
  amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  retention_amount NUMERIC DEFAULT 0,
  period_from DATE,
  period_to DATE,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  remarks TEXT,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CPMS Documents (enhanced)
CREATE TABLE public.cpms_document_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES public.cpms_tenders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size BIGINT DEFAULT 0,
  version INT DEFAULT 1,
  category TEXT DEFAULT 'other' CHECK (category IN ('drawing','specification','report','contract','permit','submittal','rfi','other')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','under_review','approved','superseded')),
  uploaded_by UUID,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CPMS Activity Log
CREATE TABLE public.cpms_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add client_id FK to cpms_projects
ALTER TABLE public.cpms_projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.cpms_clients(id) ON DELETE SET NULL;
ALTER TABLE public.cpms_projects ADD COLUMN IF NOT EXISTS project_manager_id UUID;
ALTER TABLE public.cpms_projects ADD COLUMN IF NOT EXISTS total_budget NUMERIC DEFAULT 0;
ALTER TABLE public.cpms_projects ADD COLUMN IF NOT EXISTS actual_cost NUMERIC DEFAULT 0;
ALTER TABLE public.cpms_projects ADD COLUMN IF NOT EXISTS progress NUMERIC DEFAULT 0;

-- Enable RLS
ALTER TABLE public.cpms_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_document_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can access
CREATE POLICY "auth_access" ON public.cpms_tenders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_access" ON public.cpms_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_access" ON public.cpms_resources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_access" ON public.cpms_resource_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_access" ON public.cpms_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_access" ON public.cpms_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_access" ON public.cpms_boq_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_access" ON public.cpms_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_access" ON public.cpms_document_files FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_access" ON public.cpms_activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
