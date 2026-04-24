
-- Interview Evaluations
CREATE TABLE public.interview_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  candidate_id UUID,
  requisition_id UUID REFERENCES public.job_requisitions(id),
  job_posting_id UUID REFERENCES public.job_postings(id),
  candidate_name TEXT NOT NULL,
  interviewer_name TEXT NOT NULL,
  interviewer_id UUID,
  interview_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interview_type TEXT DEFAULT 'in_person' CHECK (interview_type IN ('phone','video','in_person','panel','technical','hr')),
  round_number INTEGER DEFAULT 1,
  technical_score INTEGER DEFAULT 0,
  communication_score INTEGER DEFAULT 0,
  cultural_fit_score INTEGER DEFAULT 0,
  leadership_score INTEGER DEFAULT 0,
  problem_solving_score INTEGER DEFAULT 0,
  overall_rating NUMERIC DEFAULT 0,
  recommendation TEXT DEFAULT 'pending' CHECK (recommendation IN ('strong_hire','hire','hold','reject','strong_reject','pending')),
  strengths TEXT,
  weaknesses TEXT,
  notes TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('scheduled','in_progress','completed','cancelled','no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.interview_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage interview_evaluations" ON public.interview_evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_interview_evaluations_updated_at BEFORE UPDATE ON public.interview_evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Offer Letters
CREATE TABLE public.offer_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  candidate_id UUID,
  requisition_id UUID REFERENCES public.job_requisitions(id),
  job_posting_id UUID REFERENCES public.job_postings(id),
  candidate_name TEXT NOT NULL,
  candidate_email TEXT,
  position_title TEXT NOT NULL,
  department TEXT,
  offered_salary NUMERIC DEFAULT 0,
  salary_currency TEXT DEFAULT 'SAR',
  joining_date DATE,
  probation_months INTEGER DEFAULT 3,
  contract_type TEXT DEFAULT 'permanent' CHECK (contract_type IN ('permanent','contract','temporary','part_time')),
  benefits TEXT,
  terms_conditions TEXT,
  offer_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','sent','accepted','rejected','expired','withdrawn')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  response_date DATE,
  rejection_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage offer_letters" ON public.offer_letters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_offer_letters_updated_at BEFORE UPDATE ON public.offer_letters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Onboarding Checklists (per new hire)
CREATE TABLE public.recruitment_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  offer_id UUID REFERENCES public.offer_letters(id),
  candidate_name TEXT NOT NULL,
  employee_id UUID REFERENCES public.employees(id),
  position_title TEXT,
  department TEXT,
  joining_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','documents_pending','documents_received','it_setup','orientation','completed','cancelled')),
  -- Document collection
  id_copy_received BOOLEAN DEFAULT false,
  passport_received BOOLEAN DEFAULT false,
  visa_received BOOLEAN DEFAULT false,
  education_certs_received BOOLEAN DEFAULT false,
  medical_report_received BOOLEAN DEFAULT false,
  bank_details_received BOOLEAN DEFAULT false,
  photo_received BOOLEAN DEFAULT false,
  contract_signed BOOLEAN DEFAULT false,
  -- Pre-joining
  workstation_ready BOOLEAN DEFAULT false,
  email_created BOOLEAN DEFAULT false,
  access_card_issued BOOLEAN DEFAULT false,
  uniform_issued BOOLEAN DEFAULT false,
  safety_induction BOOLEAN DEFAULT false,
  it_equipment_issued BOOLEAN DEFAULT false,
  -- Joining
  joining_confirmed BOOLEAN DEFAULT false,
  mentor_assigned TEXT,
  orientation_completed BOOLEAN DEFAULT false,
  employee_created BOOLEAN DEFAULT false,
  completion_percentage NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recruitment_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage recruitment_onboarding" ON public.recruitment_onboarding FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_recruitment_onboarding_updated_at BEFORE UPDATE ON public.recruitment_onboarding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_interview_eval_candidate ON public.interview_evaluations(candidate_name);
CREATE INDEX idx_offer_letters_status ON public.offer_letters(status);
CREATE INDEX idx_recruitment_onboarding_status ON public.recruitment_onboarding(status);
