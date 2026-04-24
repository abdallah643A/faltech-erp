
-- Document Attachments table
CREATE TABLE public.document_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT,
  category TEXT DEFAULT 'General',
  uploaded_by UUID,
  uploaded_by_name TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view attachments"
  ON public.document_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage attachments"
  ON public.document_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own attachments"
  ON public.document_attachments FOR DELETE TO authenticated USING (auth.uid() = uploaded_by OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE INDEX idx_doc_attachments_doc ON public.document_attachments(document_type, document_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('document-attachments', 'document-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view document attachments"
  ON storage.objects FOR SELECT USING (bucket_id = 'document-attachments');

CREATE POLICY "Authenticated users can upload document attachments"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'document-attachments');

CREATE POLICY "Authenticated users can delete document attachments"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'document-attachments');
