
-- BOQ Version Snapshots - frozen copies of BOQ at a point in time
CREATE TABLE public.boq_version_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  version_number INTEGER NOT NULL DEFAULT 1,
  version_label TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  sections_data JSONB NOT NULL DEFAULT '[]',
  items_data JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BOQ Comparison Reports
CREATE TABLE public.boq_comparison_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  version_a_id UUID REFERENCES public.boq_version_snapshots(id) ON DELETE SET NULL,
  version_b_id UUID REFERENCES public.boq_version_snapshots(id) ON DELETE SET NULL,
  version_a_label TEXT NOT NULL,
  version_b_label TEXT NOT NULL,
  comparison_data JSONB NOT NULL DEFAULT '{}',
  total_additions INTEGER NOT NULL DEFAULT 0,
  total_removals INTEGER NOT NULL DEFAULT 0,
  total_modifications INTEGER NOT NULL DEFAULT 0,
  total_unchanged INTEGER NOT NULL DEFAULT 0,
  cost_impact NUMERIC NOT NULL DEFAULT 0,
  cost_impact_percent NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.boq_version_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_comparison_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage boq_version_snapshots" ON public.boq_version_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage boq_comparison_reports" ON public.boq_comparison_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_boq_version_snapshots_updated_at BEFORE UPDATE ON public.boq_version_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boq_comparison_reports_updated_at BEFORE UPDATE ON public.boq_comparison_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
