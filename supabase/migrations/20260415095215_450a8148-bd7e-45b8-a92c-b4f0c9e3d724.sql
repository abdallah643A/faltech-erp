
-- Cost Center Dimensions table
CREATE TABLE public.cost_center_dimensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  company_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(code)
);

ALTER TABLE public.cost_center_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dimensions" ON public.cost_center_dimensions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert dimensions" ON public.cost_center_dimensions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update dimensions" ON public.cost_center_dimensions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete dimensions" ON public.cost_center_dimensions FOR DELETE TO authenticated USING (true);

-- Cost Center Nodes table (hierarchical)
CREATE TABLE public.cost_center_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dimension_id UUID NOT NULL REFERENCES public.cost_center_dimensions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.cost_center_nodes(id),
  hierarchy_path TEXT,
  level_no INTEGER NOT NULL DEFAULT 0,
  is_leaf BOOLEAN NOT NULL DEFAULT true,
  is_posting_allowed BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sap_external_code TEXT,
  sync_status TEXT DEFAULT 'not_synced',
  manager_id UUID,
  budget_control_flag BOOLEAN NOT NULL DEFAULT false,
  effective_from DATE,
  effective_to DATE,
  description TEXT,
  reporting_label TEXT,
  notes TEXT,
  company_id TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dimension_id, code)
);

ALTER TABLE public.cost_center_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view nodes" ON public.cost_center_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert nodes" ON public.cost_center_nodes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update nodes" ON public.cost_center_nodes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete nodes" ON public.cost_center_nodes FOR DELETE TO authenticated USING (true);

-- Index for hierarchy queries
CREATE INDEX idx_cost_center_nodes_parent ON public.cost_center_nodes(parent_id);
CREATE INDEX idx_cost_center_nodes_dimension ON public.cost_center_nodes(dimension_id);
CREATE INDEX idx_cost_center_nodes_leaf ON public.cost_center_nodes(is_leaf, is_posting_allowed);
CREATE INDEX idx_cost_center_nodes_sap ON public.cost_center_nodes(sap_external_code) WHERE sap_external_code IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_cost_center_dimensions_updated_at BEFORE UPDATE ON public.cost_center_dimensions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cost_center_nodes_updated_at BEFORE UPDATE ON public.cost_center_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
