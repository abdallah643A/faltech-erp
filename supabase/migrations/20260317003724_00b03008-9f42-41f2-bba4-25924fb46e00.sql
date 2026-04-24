
-- Change Orders
CREATE TABLE public.cpms_change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  co_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted, under_review, approved, rejected, implemented
  priority TEXT DEFAULT 'medium',
  requested_by TEXT,
  requested_date DATE DEFAULT CURRENT_DATE,
  approved_by TEXT,
  approved_date DATE,
  implemented_date DATE,
  -- Impact assessment
  cost_impact NUMERIC DEFAULT 0,
  schedule_impact_days INTEGER DEFAULT 0,
  original_budget NUMERIC DEFAULT 0,
  revised_budget NUMERIC DEFAULT 0,
  original_end_date DATE,
  revised_end_date DATE,
  -- Affected areas
  affected_wbs_ids UUID[] DEFAULT '{}',
  affected_cost_codes TEXT[] DEFAULT '{}',
  -- Approval workflow
  approval_level TEXT DEFAULT 'pm', -- pm, pm_manager, client
  current_approver TEXT,
  rejection_reason TEXT,
  -- Attachments
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Defect Log
CREATE TABLE public.cpms_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  defect_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'minor', -- critical, major, minor
  category TEXT DEFAULT 'workmanship', -- workmanship, material, design, safety
  location TEXT,
  area TEXT,
  phase TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open, assigned, in_progress, resolved, verified, closed
  assigned_to TEXT,
  assigned_to_id UUID,
  reported_by TEXT,
  reported_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  resolved_date DATE,
  verified_date DATE,
  verified_by TEXT,
  resolution_notes TEXT,
  photos JSONB DEFAULT '[]',
  linked_ncr_id UUID REFERENCES public.cpms_ncrs(id),
  linked_daily_report_id UUID,
  cost_to_fix NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Punch Lists
CREATE TABLE public.cpms_punch_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  punch_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  area TEXT,
  discipline TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, completed, verified
  priority TEXT DEFAULT 'medium',
  assigned_to TEXT,
  assigned_to_id UUID,
  due_date DATE,
  completed_date DATE,
  verified_by TEXT,
  verified_date DATE,
  photos JSONB DEFAULT '[]',
  notes TEXT,
  inspection_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inspection Checklists
CREATE TABLE public.cpms_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  inspection_number TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'quality', -- quality, safety, environmental, regulatory
  template_name TEXT,
  area TEXT,
  discipline TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, failed
  inspector_name TEXT,
  inspector_id UUID,
  scheduled_date DATE,
  completed_date DATE,
  overall_result TEXT, -- pass, fail, conditional
  score NUMERIC,
  checklist_items JSONB DEFAULT '[]', -- [{item, status, notes, photo_url}]
  defects_found INTEGER DEFAULT 0,
  punch_items_created INTEGER DEFAULT 0,
  photos JSONB DEFAULT '[]',
  notes TEXT,
  sign_off_by TEXT,
  sign_off_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project Health Snapshots (for trend tracking)
CREATE TABLE public.cpms_project_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  schedule_variance_pct NUMERIC DEFAULT 0,
  budget_variance_pct NUMERIC DEFAULT 0,
  quality_score NUMERIC DEFAULT 100,
  risk_level TEXT DEFAULT 'low', -- low, medium, high, critical
  risk_count INTEGER DEFAULT 0,
  defect_count INTEGER DEFAULT 0,
  open_ncrs INTEGER DEFAULT 0,
  open_rfis INTEGER DEFAULT 0,
  spi NUMERIC,
  cpi NUMERIC,
  overall_health TEXT DEFAULT 'green', -- green, yellow, red
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, snapshot_date)
);

-- Change Order Baselines (version control)
CREATE TABLE public.cpms_change_order_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID REFERENCES public.cpms_change_orders(id) ON DELETE CASCADE NOT NULL,
  version INTEGER DEFAULT 1,
  baseline_data JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cpms_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_punch_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_project_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_change_order_baselines ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users can CRUD)
CREATE POLICY "Authenticated users can manage change orders" ON public.cpms_change_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage defects" ON public.cpms_defects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage punch lists" ON public.cpms_punch_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inspections" ON public.cpms_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage project health" ON public.cpms_project_health FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage co baselines" ON public.cpms_change_order_baselines FOR ALL TO authenticated USING (true) WITH CHECK (true);
