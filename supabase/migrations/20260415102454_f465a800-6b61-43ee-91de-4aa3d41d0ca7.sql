
-- 1. Saved Filter Presets
CREATE TABLE public.app_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  filter_name TEXT NOT NULL,
  filter_config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_saved_filters_user ON public.app_saved_filters(user_id, entity_name);
ALTER TABLE public.app_saved_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_filters" ON public.app_saved_filters FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_shared = true)
  WITH CHECK (user_id = auth.uid());

-- 2. Recent Items
CREATE TABLE public.app_user_recent_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  record_title TEXT NOT NULL,
  record_subtitle TEXT,
  record_path TEXT,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  access_count INTEGER DEFAULT 1,
  UNIQUE(user_id, entity_type, record_id)
);
CREATE INDEX idx_recent_items_user ON public.app_user_recent_items(user_id, last_accessed_at DESC);
ALTER TABLE public.app_user_recent_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_recent" ON public.app_user_recent_items FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. Favorites / Bookmarks
CREATE TABLE public.app_user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  record_title TEXT NOT NULL,
  record_subtitle TEXT,
  record_path TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entity_type, record_id)
);
CREATE INDEX idx_favorites_user ON public.app_user_favorites(user_id, category);
ALTER TABLE public.app_user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_favorites" ON public.app_user_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. Background Jobs
CREATE TABLE public.app_background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  entity_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  skipped_items INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  error_details JSONB,
  result_summary JSONB,
  created_by UUID,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bg_jobs_status ON public.app_background_jobs(status, created_at DESC);
CREATE INDEX idx_bg_jobs_type ON public.app_background_jobs(job_type, created_at DESC);
ALTER TABLE public.app_background_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_view_jobs" ON public.app_background_jobs FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "system_manage_jobs" ON public.app_background_jobs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 5. Universal Documents / Attachments
CREATE TABLE public.app_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES public.app_documents(id),
  expires_at TIMESTAMPTZ,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_documents_entity ON public.app_documents(entity_type, record_id);
CREATE INDEX idx_documents_expiry ON public.app_documents(expires_at) WHERE expires_at IS NOT NULL;
ALTER TABLE public.app_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_view_docs" ON public.app_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_docs" ON public.app_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "owner_update_docs" ON public.app_documents FOR UPDATE TO authenticated USING (uploaded_by = auth.uid());
CREATE POLICY "owner_delete_docs" ON public.app_documents FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role]));

-- 6. Record Comments / Notes
CREATE TABLE public.app_record_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_internal BOOLEAN DEFAULT true,
  user_id UUID NOT NULL,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_comments_entity ON public.app_record_comments(entity_type, record_id);
ALTER TABLE public.app_record_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_view_comments" ON public.app_record_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_comments" ON public.app_record_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner_manage_comments" ON public.app_record_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_delete_comments" ON public.app_record_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role]));

-- Storage bucket for universal attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');
CREATE POLICY "public_view_attachments" ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');
CREATE POLICY "owner_delete_attachments" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attachments');
