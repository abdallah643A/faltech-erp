
-- ============== STORAGE BUCKETS ==============
INSERT INTO storage.buckets (id, name, public) VALUES ('subcontractor-photos', 'subcontractor-photos', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('subcontractor-docs', 'subcontractor-docs', false) ON CONFLICT (id) DO NOTHING;

-- ============== TABLES ==============
CREATE TABLE IF NOT EXISTS public.subcontractor_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  subcontractor_id UUID,
  package_code TEXT NOT NULL,
  package_name TEXT NOT NULL,
  package_name_ar TEXT,
  scope_description TEXT,
  contract_value NUMERIC(18,2) DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  retention_pct NUMERIC(5,2) DEFAULT 5,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  awarded_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subcontractor_progress_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.subcontractor_packages(id) ON DELETE CASCADE,
  wbs_code TEXT NOT NULL,
  wbs_description TEXT,
  previous_pct NUMERIC(5,2) DEFAULT 0,
  current_pct NUMERIC(5,2) NOT NULL,
  cumulative_pct NUMERIC(5,2) NOT NULL,
  quantity_completed NUMERIC(18,3),
  unit TEXT,
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  foreman_name TEXT,
  foreman_signature_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  ipc_id UUID,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scprog_pkg ON public.subcontractor_progress_submissions(package_id);

CREATE TABLE IF NOT EXISTS public.subcontractor_progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.subcontractor_progress_submissions(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  exif_lat NUMERIC(10,7),
  exif_lng NUMERIC(10,7),
  taken_at TIMESTAMPTZ,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subcontractor_variation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.subcontractor_packages(id) ON DELETE CASCADE,
  vr_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  cause TEXT,
  cost_impact NUMERIC(18,2) DEFAULT 0,
  time_impact_days INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT DEFAULT 'medium',
  pcn_id UUID,
  change_order_id UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  decision_notes TEXT,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subcontractor_vr_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vr_id UUID NOT NULL REFERENCES public.subcontractor_variation_requests(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_name TEXT,
  sender_role TEXT,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subcontractor_qa_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.subcontractor_packages(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL,
  checklist_data JSONB DEFAULT '{}'::jsonb,
  location TEXT,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  inspector_name TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  result TEXT,
  notes TEXT,
  inspection_request_id UUID,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subcontractor_hse_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.subcontractor_packages(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL,
  severity TEXT,
  title TEXT NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ,
  location TEXT,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  attendees_count INTEGER,
  photos JSONB DEFAULT '[]'::jsonb,
  corrective_actions TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subcontractor_ipc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.subcontractor_packages(id) ON DELETE CASCADE,
  ipc_number TEXT,
  period_start DATE,
  period_end DATE,
  gross_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  previous_certified NUMERIC(18,2) DEFAULT 0,
  current_certified NUMERIC(18,2) NOT NULL DEFAULT 0,
  retention_amount NUMERIC(18,2) DEFAULT 0,
  retention_pct NUMERIC(5,2) DEFAULT 5,
  net_payable NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'draft',
  invoice_id UUID,
  invoice_status TEXT,
  paid_amount NUMERIC(18,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  certified_by UUID,
  certified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subcontractor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.subcontractor_packages(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_size BIGINT,
  revision TEXT,
  direction TEXT NOT NULL DEFAULT 'subcontractor_to_main',
  status TEXT NOT NULL DEFAULT 'submitted',
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subcontractor_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.subcontractor_packages(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  related_record_type TEXT,
  related_record_id UUID,
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  closed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subcontractor_task_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.subcontractor_tasks(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_name TEXT,
  sender_role TEXT,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== TRIGGERS ==============
CREATE OR REPLACE FUNCTION public.trg_subcontractor_progress_cumulative()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prev NUMERIC(5,2);
BEGIN
  SELECT COALESCE(MAX(cumulative_pct),0) INTO prev
  FROM public.subcontractor_progress_submissions
  WHERE package_id = NEW.package_id AND wbs_code = NEW.wbs_code AND status IN ('submitted','approved');
  NEW.previous_pct := prev;
  NEW.cumulative_pct := LEAST(100, prev + NEW.current_pct);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_subcon_progress_cum ON public.subcontractor_progress_submissions;
CREATE TRIGGER trg_subcon_progress_cum
BEFORE INSERT ON public.subcontractor_progress_submissions
FOR EACH ROW EXECUTE FUNCTION public.trg_subcontractor_progress_cumulative();

CREATE OR REPLACE FUNCTION public.trg_subcontractor_ipc_calc()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  NEW.retention_amount := ROUND(NEW.current_certified * COALESCE(NEW.retention_pct,5)/100, 2);
  NEW.net_payable := NEW.current_certified - NEW.retention_amount;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_subcon_ipc_calc ON public.subcontractor_ipc;
CREATE TRIGGER trg_subcon_ipc_calc
BEFORE INSERT OR UPDATE ON public.subcontractor_ipc
FOR EACH ROW EXECUTE FUNCTION public.trg_subcontractor_ipc_calc();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS upd_subcon_pkg ON public.subcontractor_packages;
CREATE TRIGGER upd_subcon_pkg BEFORE UPDATE ON public.subcontractor_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS upd_subcon_vr ON public.subcontractor_variation_requests;
CREATE TRIGGER upd_subcon_vr BEFORE UPDATE ON public.subcontractor_variation_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS upd_subcon_ipc ON public.subcontractor_ipc;
CREATE TRIGGER upd_subcon_ipc BEFORE UPDATE ON public.subcontractor_ipc FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS upd_subcon_task ON public.subcontractor_tasks;
CREATE TRIGGER upd_subcon_task BEFORE UPDATE ON public.subcontractor_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== RLS ==============
ALTER TABLE public.subcontractor_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_progress_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_variation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_vr_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_qa_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_hse_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_ipc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_task_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read scpkg" ON public.subcontractor_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write scpkg" ON public.subcontractor_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read scprog" ON public.subcontractor_progress_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write scprog" ON public.subcontractor_progress_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read scphoto" ON public.subcontractor_progress_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write scphoto" ON public.subcontractor_progress_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read scvr" ON public.subcontractor_variation_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write scvr" ON public.subcontractor_variation_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read scvrmsg" ON public.subcontractor_vr_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write scvrmsg" ON public.subcontractor_vr_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read scqa" ON public.subcontractor_qa_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write scqa" ON public.subcontractor_qa_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read schse" ON public.subcontractor_hse_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write schse" ON public.subcontractor_hse_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read scipc" ON public.subcontractor_ipc FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write scipc" ON public.subcontractor_ipc FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read scdoc" ON public.subcontractor_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write scdoc" ON public.subcontractor_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read sctask" ON public.subcontractor_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sctask" ON public.subcontractor_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read sctaskmsg" ON public.subcontractor_task_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sctaskmsg" ON public.subcontractor_task_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============== STORAGE POLICIES ==============
CREATE POLICY "auth read subcon photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'subcontractor-photos');
CREATE POLICY "auth upload subcon photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'subcontractor-photos');
CREATE POLICY "auth read subcon docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'subcontractor-docs');
CREATE POLICY "auth upload subcon docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'subcontractor-docs');
