
ALTER TABLE public.departments
ADD COLUMN region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
