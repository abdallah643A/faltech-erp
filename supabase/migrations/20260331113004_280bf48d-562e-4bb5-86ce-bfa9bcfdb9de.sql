
-- Time entries table for clock in/out
CREATE TABLE IF NOT EXISTS public.cpms_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.cpms_projects(id),
  cost_code TEXT,
  task_description TEXT,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0,
  total_hours NUMERIC,
  gps_lat_in NUMERIC,
  gps_lng_in NUMERIC,
  gps_lat_out NUMERIC,
  gps_lng_out NUMERIC,
  status TEXT DEFAULT 'active',
  productivity_rating INTEGER,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cpms_time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage time entries" ON public.cpms_time_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Site photos table
CREATE TABLE IF NOT EXISTS public.cpms_site_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.cpms_projects(id),
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  category TEXT DEFAULT 'progress',
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  compass_direction NUMERIC,
  tags TEXT[],
  taken_at TIMESTAMPTZ DEFAULT now(),
  synced BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cpms_site_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage site photos" ON public.cpms_site_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Offline sync queue
CREATE TABLE IF NOT EXISTS public.cpms_sync_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ
);

ALTER TABLE public.cpms_sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage sync queue" ON public.cpms_sync_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for site photos
INSERT INTO storage.buckets (id, name, public) VALUES ('site-photos', 'site-photos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can upload site photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-photos');
CREATE POLICY "Anyone can view site photos" ON storage.objects FOR SELECT USING (bucket_id = 'site-photos');
CREATE POLICY "Auth users can delete site photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-photos');
