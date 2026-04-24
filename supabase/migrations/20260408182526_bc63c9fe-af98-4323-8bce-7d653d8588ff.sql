
CREATE TABLE public.dimension_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE NOT NULL,
  dimension_number INTEGER NOT NULL CHECK (dimension_number BETWEEN 1 AND 5),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_id, dimension_number)
);

ALTER TABLE public.dimension_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dimension levels"
  ON public.dimension_levels FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert dimension levels"
  ON public.dimension_levels FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update dimension levels"
  ON public.dimension_levels FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete dimension levels"
  ON public.dimension_levels FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_dimension_levels_updated_at
  BEFORE UPDATE ON public.dimension_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
