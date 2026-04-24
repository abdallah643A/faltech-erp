
-- HR Policies table
CREATE TABLE public.hr_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  content TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  effective_date DATE,
  review_date DATE,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view policies" ON public.hr_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage policies" ON public.hr_policies FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Policy version history
CREATE TABLE public.hr_policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.hr_policies(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  change_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_policy_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view policy versions" ON public.hr_policy_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage policy versions" ON public.hr_policy_versions FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Compliance checklists for new hires
CREATE TABLE public.compliance_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  checklist_type TEXT NOT NULL DEFAULT 'onboarding',
  is_active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view checklists" ON public.compliance_checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage checklists" ON public.compliance_checklists FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Checklist items
CREATE TABLE public.compliance_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.compliance_checklists(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view checklist items" ON public.compliance_checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage checklist items" ON public.compliance_checklist_items FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Employee checklist progress
CREATE TABLE public.employee_checklist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  checklist_id UUID REFERENCES public.compliance_checklists(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.compliance_checklist_items(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, item_id)
);

ALTER TABLE public.employee_checklist_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view progress" ON public.employee_checklist_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage progress" ON public.employee_checklist_progress FOR ALL TO authenticated USING (true);

-- Employee Handbook articles
CREATE TABLE public.handbook_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  summary TEXT,
  tags TEXT[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.handbook_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view published articles" ON public.handbook_articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage articles" ON public.handbook_articles FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
