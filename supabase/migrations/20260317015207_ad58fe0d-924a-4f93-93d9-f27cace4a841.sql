
-- CPMS Project Comparison snapshots
CREATE TABLE IF NOT EXISTS public.cpms_project_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_ids UUID[] NOT NULL DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES sap_companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_project_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage comparisons" ON public.cpms_project_comparisons FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CPMS Report Templates
CREATE TABLE IF NOT EXISTS public.cpms_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'daily',
  sections JSONB DEFAULT '[]',
  header_config JSONB DEFAULT '{}',
  footer_config JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  company_id UUID REFERENCES sap_companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage report templates" ON public.cpms_report_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CPMS Generated Reports
CREATE TABLE IF NOT EXISTS public.cpms_generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES cpms_report_templates(id) ON DELETE SET NULL,
  project_id UUID REFERENCES cpms_projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage generated reports" ON public.cpms_generated_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CPMS Notifications
CREATE TABLE IF NOT EXISTS public.cpms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES cpms_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.cpms_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Auth users create notifications" ON public.cpms_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON public.cpms_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- CPMS Dashboard Widgets
CREATE TABLE IF NOT EXISTS public.cpms_dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  title TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  position_x INT DEFAULT 0,
  position_y INT DEFAULT 0,
  width INT DEFAULT 1,
  height INT DEFAULT 1,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_dashboard_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own widgets" ON public.cpms_dashboard_widgets FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Sustainability logs
CREATE TABLE IF NOT EXISTS public.cpms_sustainability_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES cpms_projects(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  subcategory TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  source TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_sustainability_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage sustainability" ON public.cpms_sustainability_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ESG Targets
CREATE TABLE IF NOT EXISTS public.cpms_esg_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES cpms_projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  target_value NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  period TEXT,
  status TEXT DEFAULT 'on_track',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_esg_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage esg targets" ON public.cpms_esg_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Weather logs
CREATE TABLE IF NOT EXISTS public.cpms_weather_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES cpms_projects(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  temperature_high NUMERIC,
  temperature_low NUMERIC,
  humidity_pct NUMERIC,
  wind_speed NUMERIC,
  conditions TEXT,
  rain_mm NUMERIC DEFAULT 0,
  impact_assessment TEXT,
  work_impact TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_weather_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage weather" ON public.cpms_weather_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- IoT Sensor readings
CREATE TABLE IF NOT EXISTS public.cpms_iot_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES cpms_projects(id) ON DELETE CASCADE,
  sensor_id TEXT NOT NULL,
  sensor_type TEXT NOT NULL,
  sensor_name TEXT,
  location TEXT,
  value NUMERIC NOT NULL,
  unit TEXT,
  status TEXT DEFAULT 'normal',
  threshold_min NUMERIC,
  threshold_max NUMERIC,
  reading_time TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cpms_iot_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage iot" ON public.cpms_iot_readings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.cpms_notifications;
