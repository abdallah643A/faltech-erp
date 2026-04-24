
-- Drawings table
CREATE TABLE public.cpms_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image/png',
  file_name TEXT,
  scale_factor NUMERIC DEFAULT 1,
  scale_unit TEXT DEFAULT 'meters',
  scale_reference_px NUMERIC,
  scale_reference_real NUMERIC,
  status TEXT DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Drawing measurements table
CREATE TABLE public.cpms_drawing_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID REFERENCES public.cpms_drawings(id) ON DELETE CASCADE NOT NULL,
  measurement_type TEXT NOT NULL DEFAULT 'distance',
  label TEXT,
  color TEXT DEFAULT '#ef4444',
  points JSONB NOT NULL DEFAULT '[]',
  value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'meters',
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cpms_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_drawing_measurements ENABLE ROW LEVEL SECURITY;

-- RLS policies for drawings
CREATE POLICY "Authenticated users can view drawings" ON public.cpms_drawings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert drawings" ON public.cpms_drawings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update drawings" ON public.cpms_drawings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete drawings" ON public.cpms_drawings FOR DELETE TO authenticated USING (true);

-- RLS policies for measurements
CREATE POLICY "Authenticated users can view measurements" ON public.cpms_drawing_measurements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert measurements" ON public.cpms_drawing_measurements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update measurements" ON public.cpms_drawing_measurements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete measurements" ON public.cpms_drawing_measurements FOR DELETE TO authenticated USING (true);
