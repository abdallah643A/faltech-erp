
-- Progress Snapshots
CREATE TABLE IF NOT EXISTS public.cpms_progress_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  area TEXT,
  phase TEXT,
  progress_pct NUMERIC DEFAULT 0,
  planned_pct NUMERIC DEFAULT 0,
  notes TEXT,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, area, phase, snapshot_date)
);
ALTER TABLE public.cpms_progress_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_progress_snapshots" ON public.cpms_progress_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Daily Site Reports (enhanced)
CREATE TABLE IF NOT EXISTS public.cpms_site_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather TEXT,
  temperature_c NUMERIC,
  wind_conditions TEXT,
  manpower_count INT DEFAULT 0,
  equipment_on_site TEXT[] DEFAULT '{}',
  work_performed TEXT,
  issues_encountered TEXT,
  safety_observations TEXT,
  visitor_log TEXT,
  delay_hours NUMERIC DEFAULT 0,
  delay_reason TEXT,
  photos TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  submitted_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, report_date)
);
ALTER TABLE public.cpms_site_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_site_reports" ON public.cpms_site_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Predictive Analytics
CREATE TABLE IF NOT EXISTS public.cpms_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  predicted_completion DATE,
  confidence_80_early DATE,
  confidence_80_late DATE,
  confidence_95_early DATE,
  confidence_95_late DATE,
  predicted_final_cost NUMERIC,
  cost_overrun_probability NUMERIC,
  schedule_risk_score NUMERIC,
  burndown_data JSONB DEFAULT '[]',
  trend_data JSONB DEFAULT '[]',
  model_used TEXT DEFAULT 'linear_regression',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_predictions" ON public.cpms_predictions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for site photos
INSERT INTO storage.buckets (id, name, public) VALUES ('cpms-site-photos', 'cpms-site-photos', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "upload_site_photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cpms-site-photos');
CREATE POLICY "view_site_photos" ON storage.objects FOR SELECT USING (bucket_id = 'cpms-site-photos');
CREATE POLICY "delete_site_photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cpms-site-photos');
