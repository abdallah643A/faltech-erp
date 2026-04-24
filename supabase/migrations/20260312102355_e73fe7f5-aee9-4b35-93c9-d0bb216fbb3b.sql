
-- Cadence templates
CREATE TABLE public.follow_up_cadences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL DEFAULT 'lead' CHECK (target_type IN ('lead', 'opportunity')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Steps within a cadence
CREATE TABLE public.cadence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id UUID NOT NULL REFERENCES public.follow_up_cadences(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  delay_days INT NOT NULL DEFAULT 1,
  action_type TEXT NOT NULL DEFAULT 'call' CHECK (action_type IN ('call', 'email', 'meeting', 'task', 'note')),
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cadence_id, step_order)
);

-- Enrollments (lead/opp enrolled in a cadence)
CREATE TABLE public.cadence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id UUID NOT NULL REFERENCES public.follow_up_cadences(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.business_partners(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  current_step INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enrolled_by UUID REFERENCES auth.users(id),
  next_action_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Execution log
CREATE TABLE public.cadence_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.cadence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.cadence_steps(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'skipped', 'failed'))
);

-- RLS
ALTER TABLE public.follow_up_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadence_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage cadences" ON public.follow_up_cadences FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage steps" ON public.cadence_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage enrollments" ON public.cadence_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view execution logs" ON public.cadence_execution_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_cadence_enrollments_status ON public.cadence_enrollments(status);
CREATE INDEX idx_cadence_enrollments_next_action ON public.cadence_enrollments(next_action_at) WHERE status = 'active';
CREATE INDEX idx_cadence_steps_cadence ON public.cadence_steps(cadence_id, step_order);
