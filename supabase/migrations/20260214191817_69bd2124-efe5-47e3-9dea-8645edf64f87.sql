
-- Create junction table for company-region many-to-many
CREATE TABLE public.company_regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, region_id)
);

ALTER TABLE public.company_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view company_regions"
ON public.company_regions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage company_regions"
ON public.company_regions FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Migrate existing data from companies.region_id to junction table
INSERT INTO public.company_regions (company_id, region_id)
SELECT id, region_id FROM public.companies WHERE region_id IS NOT NULL;
