
-- Measurement Reports
CREATE TABLE public.cpms_measurement_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID,
  drawing_id UUID REFERENCES public.cpms_drawings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'summary',
  template_id UUID,
  format TEXT NOT NULL DEFAULT 'pdf',
  file_url TEXT,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'draft',
  filters JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Report Versions
CREATE TABLE public.cpms_report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.cpms_measurement_reports(id) ON DELETE CASCADE NOT NULL,
  version_number INT NOT NULL DEFAULT 1,
  changes_summary TEXT,
  snapshot_data JSONB,
  file_url TEXT,
  file_size BIGINT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Report Audit Logs
CREATE TABLE public.cpms_report_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  report_id UUID REFERENCES public.cpms_measurement_reports(id) ON DELETE SET NULL,
  report_type TEXT,
  export_format TEXT,
  file_size BIGINT,
  duration_ms INT,
  status TEXT NOT NULL DEFAULT 'success',
  ip_address TEXT,
  device_info TEXT,
  filters_used JSONB,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scheduled Reports
CREATE TABLE public.cpms_scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID,
  title TEXT NOT NULL,
  schedule_type TEXT NOT NULL DEFAULT 'weekly',
  frequency TEXT NOT NULL DEFAULT '0 8 * * 1',
  timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  template_id UUID,
  report_type TEXT NOT NULL DEFAULT 'summary',
  export_format TEXT NOT NULL DEFAULT 'pdf',
  filters JSONB DEFAULT '{}',
  recipients JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditional_only BOOLEAN NOT NULL DEFAULT false,
  next_run TIMESTAMPTZ,
  last_run TIMESTAMPTZ,
  last_status TEXT,
  run_count INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Measurement Report Templates
CREATE TABLE public.cpms_measurement_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'standard',
  layout_config JSONB DEFAULT '{}',
  branding_config JSONB DEFAULT '{"logo_url": null, "primary_color": "#1a56db", "font": "Inter"}',
  header_config JSONB DEFAULT '{}',
  footer_config JSONB DEFAULT '{}',
  sections JSONB DEFAULT '[]',
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compressed Files
CREATE TABLE public.cpms_compressed_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_report_id UUID REFERENCES public.cpms_measurement_reports(id) ON DELETE CASCADE,
  original_file_url TEXT,
  compressed_file_url TEXT,
  original_size BIGINT,
  compressed_size BIGINT,
  compression_ratio NUMERIC(5,2),
  compression_type TEXT NOT NULL DEFAULT 'gzip',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Schedule Execution History
CREATE TABLE public.cpms_schedule_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.cpms_scheduled_reports(id) ON DELETE CASCADE NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'success',
  report_id UUID REFERENCES public.cpms_measurement_reports(id) ON DELETE SET NULL,
  error_message TEXT,
  duration_ms INT,
  file_size BIGINT
);

-- Add foreign key for template references
ALTER TABLE public.cpms_measurement_reports
  ADD CONSTRAINT cpms_measurement_reports_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.cpms_measurement_report_templates(id) ON DELETE SET NULL;

ALTER TABLE public.cpms_scheduled_reports
  ADD CONSTRAINT cpms_scheduled_reports_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.cpms_measurement_report_templates(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.cpms_measurement_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_report_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_measurement_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_compressed_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_schedule_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can manage measurement reports" ON public.cpms_measurement_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage report versions" ON public.cpms_report_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage report audit logs" ON public.cpms_report_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage scheduled reports" ON public.cpms_scheduled_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage report templates" ON public.cpms_measurement_report_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage compressed files" ON public.cpms_compressed_files FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage schedule history" ON public.cpms_schedule_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_cpms_reports_company ON public.cpms_measurement_reports(company_id);
CREATE INDEX idx_cpms_reports_project ON public.cpms_measurement_reports(project_id);
CREATE INDEX idx_cpms_reports_created ON public.cpms_measurement_reports(created_at DESC);
CREATE INDEX idx_cpms_audit_logs_user ON public.cpms_report_audit_logs(user_id);
CREATE INDEX idx_cpms_audit_logs_created ON public.cpms_report_audit_logs(created_at DESC);
CREATE INDEX idx_cpms_audit_logs_action ON public.cpms_report_audit_logs(action);
CREATE INDEX idx_cpms_scheduled_next ON public.cpms_scheduled_reports(next_run);
CREATE INDEX idx_cpms_schedule_history ON public.cpms_schedule_history(schedule_id, executed_at DESC);
