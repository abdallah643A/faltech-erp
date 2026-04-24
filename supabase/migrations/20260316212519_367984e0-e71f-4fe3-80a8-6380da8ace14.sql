
-- 360 Feedback table
CREATE TABLE public.performance_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  feedback_from_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'peer',
  rating NUMERIC,
  strengths TEXT,
  improvements TEXT,
  comments TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Competency assessments
CREATE TABLE public.competency_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'technical',
  description TEXT,
  max_level INT DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.competency_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES public.competency_definitions(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.performance_cycles(id),
  assessed_by UUID REFERENCES public.employees(id),
  level INT NOT NULL DEFAULT 1,
  notes TEXT,
  assessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.performance_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competency_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competency_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view feedback" ON public.performance_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert feedback" ON public.performance_feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update feedback" ON public.performance_feedback FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users can view competencies" ON public.competency_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can manage competencies" ON public.competency_definitions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users can view assessments" ON public.competency_assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert assessments" ON public.competency_assessments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update assessments" ON public.competency_assessments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
