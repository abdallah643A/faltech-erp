
ALTER TABLE public.cpms_projects
  ADD COLUMN IF NOT EXISTS project_number text,
  ADD COLUMN IF NOT EXISTS site_address text,
  ADD COLUMN IF NOT EXISTS site_state text,
  ADD COLUMN IF NOT EXISTS site_zip text,
  ADD COLUMN IF NOT EXISTS budgeted_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_completion_date date,
  ADD COLUMN IF NOT EXISTS project_manager_name text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Auto-generate project_number for existing rows
UPDATE public.cpms_projects 
SET project_number = 'PROJ-' || LPAD(ROW_NUMBER::text, 4, '0')
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) FROM public.cpms_projects WHERE project_number IS NULL) sub
WHERE cpms_projects.id = sub.id;

-- Create sequence for project numbers
CREATE SEQUENCE IF NOT EXISTS cpms_project_number_seq START 1;

-- Set sequence to current max
SELECT setval('cpms_project_number_seq', COALESCE((SELECT COUNT(*) FROM cpms_projects), 0) + 1, false);

-- Create function to auto-generate project_number on insert
CREATE OR REPLACE FUNCTION public.generate_cpms_project_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number := 'PROJ-' || LPAD(nextval('cpms_project_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cpms_project_number ON public.cpms_projects;
CREATE TRIGGER trg_cpms_project_number
  BEFORE INSERT ON public.cpms_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_cpms_project_number();
