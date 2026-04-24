
-- Add branch_id, company_id, region_id to employees
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.regions(id);

-- Create employee_documents table
CREATE TABLE public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  expiry_date date,
  is_verified boolean DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage employee documents" ON public.employee_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create training_programs table
CREATE TABLE public.training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text DEFAULT 'general',
  trainer text,
  start_date date,
  end_date date,
  location text,
  max_participants int,
  status text DEFAULT 'planned',
  cost numeric DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage training programs" ON public.training_programs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Training enrollments
CREATE TABLE public.training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status text DEFAULT 'enrolled',
  completion_date date,
  score numeric,
  certificate_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(training_id, employee_id)
);

ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage training enrollments" ON public.training_enrollments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Recruitment / Job postings
CREATE TABLE public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  position_id uuid REFERENCES public.positions(id),
  description text,
  requirements text,
  employment_type text DEFAULT 'full_time',
  location text,
  salary_range_min numeric,
  salary_range_max numeric,
  status text DEFAULT 'draft',
  posted_date date,
  closing_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage job postings" ON public.job_postings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Job applicants
CREATE TABLE public.job_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  resume_url text,
  cover_letter text,
  status text DEFAULT 'applied',
  interview_date timestamptz,
  interview_notes text,
  rating int,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applicants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage job applicants" ON public.job_applicants
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can upload employee docs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'employee-documents');

CREATE POLICY "Auth users can read employee docs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'employee-documents');

CREATE POLICY "Auth users can delete employee docs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'employee-documents');
