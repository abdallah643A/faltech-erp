
-- Questionnaire module tables

CREATE TABLE public.survey_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID REFERENCES public.survey_questionnaires(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_text_ar TEXT,
  question_type TEXT NOT NULL DEFAULT 'rating',
  options JSONB DEFAULT '[]',
  sort_order INT NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID REFERENCES public.survey_questionnaires(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  respondent_name TEXT,
  respondent_email TEXT,
  respondent_phone TEXT,
  customer_code TEXT,
  sent_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES public.survey_responses(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.survey_questions(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT,
  answer_rating INT,
  answer_choice TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.survey_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage questionnaires
CREATE POLICY "Authenticated users can view questionnaires" ON public.survey_questionnaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert questionnaires" ON public.survey_questionnaires FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update questionnaires" ON public.survey_questionnaires FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete questionnaires" ON public.survey_questionnaires FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view questions" ON public.survey_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert questions" ON public.survey_questions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update questions" ON public.survey_questions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete questions" ON public.survey_questions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view responses" ON public.survey_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert responses" ON public.survey_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update responses" ON public.survey_responses FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view answers" ON public.survey_answers FOR SELECT TO authenticated USING (true);

-- Anonymous access for public questionnaire filling
CREATE POLICY "Anyone can view responses by token" ON public.survey_responses FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can update responses by token" ON public.survey_responses FOR UPDATE TO anon USING (true);
CREATE POLICY "Anyone can view questions" ON public.survey_questions FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can view questionnaires" ON public.survey_questionnaires FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert answers" ON public.survey_answers FOR INSERT TO anon WITH CHECK (true);
