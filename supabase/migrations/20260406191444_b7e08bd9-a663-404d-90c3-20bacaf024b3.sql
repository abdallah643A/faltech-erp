
-- Close Periods (month-end, quarter-end, year-end cycles)
CREATE TABLE public.close_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  period_type TEXT NOT NULL DEFAULT 'month_end' CHECK (period_type IN ('month_end', 'quarter_end', 'year_end')),
  fiscal_year INTEGER NOT NULL,
  period_number INTEGER NOT NULL,
  period_label TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'review', 'completed', 'reopened')),
  readiness_score NUMERIC DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  exception_count INTEGER DEFAULT 0,
  target_close_date DATE,
  actual_close_date DATE,
  started_by UUID,
  started_at TIMESTAMPTZ,
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, fiscal_year, period_number, period_type)
);

ALTER TABLE public.close_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view close_periods" ON public.close_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert close_periods" ON public.close_periods FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update close_periods" ON public.close_periods FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete close_periods" ON public.close_periods FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_close_periods_updated_at BEFORE UPDATE ON public.close_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Close Templates
CREATE TABLE public.close_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  template_name TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'month_end',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.close_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage close_templates" ON public.close_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Close Template Tasks
CREATE TABLE public.close_template_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.close_templates(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  function_area TEXT NOT NULL DEFAULT 'finance',
  owner_role TEXT,
  sla_hours INTEGER DEFAULT 24,
  is_recurring BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  depends_on_task_id UUID REFERENCES public.close_template_tasks(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.close_template_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage close_template_tasks" ON public.close_template_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Close Tasks (actual tasks for a period)
CREATE TABLE public.close_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  close_period_id UUID NOT NULL REFERENCES public.close_periods(id) ON DELETE CASCADE,
  template_task_id UUID REFERENCES public.close_template_tasks(id),
  company_id UUID REFERENCES public.sap_companies(id),
  task_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  function_area TEXT NOT NULL DEFAULT 'finance',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'blocked', 'review', 'completed', 'skipped')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  owner_id UUID,
  owner_name TEXT,
  sla_hours INTEGER DEFAULT 24,
  sla_deadline TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  blocker_reason TEXT,
  evidence_notes TEXT,
  evidence_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.close_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage close_tasks" ON public.close_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_close_tasks_updated_at BEFORE UPDATE ON public.close_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Close Task Dependencies
CREATE TABLE public.close_task_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.close_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.close_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id)
);

ALTER TABLE public.close_task_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage close_task_dependencies" ON public.close_task_dependencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Close Exceptions (auto-detected issues)
CREATE TABLE public.close_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  close_period_id UUID NOT NULL REFERENCES public.close_periods(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  exception_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  source_table TEXT,
  source_id TEXT,
  source_reference TEXT,
  auto_detected BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'waived')),
  assigned_to UUID,
  assigned_to_name TEXT,
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.close_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage close_exceptions" ON public.close_exceptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_close_exceptions_updated_at BEFORE UPDATE ON public.close_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Close Sign-offs
CREATE TABLE public.close_signoffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  close_period_id UUID NOT NULL REFERENCES public.close_periods(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.sap_companies(id),
  signoff_level INTEGER NOT NULL DEFAULT 1,
  signoff_role TEXT NOT NULL,
  signer_id UUID,
  signer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waived')),
  comments TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(close_period_id, company_id, signoff_level)
);

ALTER TABLE public.close_signoffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage close_signoffs" ON public.close_signoffs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_close_periods_company ON public.close_periods(company_id);
CREATE INDEX idx_close_tasks_period ON public.close_tasks(close_period_id);
CREATE INDEX idx_close_tasks_status ON public.close_tasks(status);
CREATE INDEX idx_close_exceptions_period ON public.close_exceptions(close_period_id);
CREATE INDEX idx_close_exceptions_status ON public.close_exceptions(status);
CREATE INDEX idx_close_signoffs_period ON public.close_signoffs(close_period_id);
