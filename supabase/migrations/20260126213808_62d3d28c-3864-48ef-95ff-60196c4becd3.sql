-- Create visits table for GPS tracking
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id UUID REFERENCES auth.users(id) NOT NULL,
  business_partner_id UUID REFERENCES public.business_partners(id),
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  visit_type TEXT DEFAULT 'routine' CHECK (visit_type IN ('routine', 'follow_up', 'sales', 'support', 'collection')),
  notes TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visit_images table
CREATE TABLE public.visit_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for visits
CREATE POLICY "Sales reps can view their own visits"
  ON public.visits FOR SELECT
  TO authenticated
  USING (
    sales_rep_id = auth.uid() OR
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
  );

CREATE POLICY "Sales reps can create their own visits"
  ON public.visits FOR INSERT
  TO authenticated
  WITH CHECK (
    sales_rep_id = auth.uid() AND
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'sales_rep']::app_role[])
  );

CREATE POLICY "Sales reps can update their own visits"
  ON public.visits FOR UPDATE
  TO authenticated
  USING (
    sales_rep_id = auth.uid() OR
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
  );

CREATE POLICY "Admins can delete visits"
  ON public.visits FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for visit_images
CREATE POLICY "Users can view images for accessible visits"
  ON public.visit_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_id
      AND (
        v.sales_rep_id = auth.uid() OR
        public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
      )
    )
  );

CREATE POLICY "Users can add images to their visits"
  ON public.visit_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_id
      AND v.sales_rep_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their visit images"
  ON public.visit_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_id
      AND (
        v.sales_rep_id = auth.uid() OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

-- Create storage bucket for visit images
INSERT INTO storage.buckets (id, name, public) VALUES ('visit-images', 'visit-images', true);

-- Storage policies for visit images
CREATE POLICY "Authenticated users can upload visit images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'visit-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view visit images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'visit-images');

CREATE POLICY "Users can delete their own visit images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'visit-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update triggers
CREATE TRIGGER update_visits_updated_at
  BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_visits_sales_rep_id ON public.visits(sales_rep_id);
CREATE INDEX idx_visits_business_partner_id ON public.visits(business_partner_id);
CREATE INDEX idx_visits_visit_date ON public.visits(visit_date);
CREATE INDEX idx_visit_images_visit_id ON public.visit_images(visit_id);