
-- ECM Folders (hierarchical)
CREATE TABLE public.ecm_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.ecm_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  color TEXT DEFAULT '#1A4F8A',
  icon TEXT DEFAULT 'folder',
  path TEXT NOT NULL DEFAULT '/',
  depth INT NOT NULL DEFAULT 0,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view folders" ON public.ecm_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage folders" ON public.ecm_folders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ECM Documents
CREATE TABLE public.ecm_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.ecm_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT,
  file_extension TEXT,
  document_number TEXT,
  reference_number TEXT,
  document_type TEXT DEFAULT 'general',
  department TEXT,
  author TEXT,
  client_name TEXT,
  project_name TEXT,
  tags TEXT[],
  confidentiality TEXT DEFAULT 'internal' CHECK (confidentiality IN ('public','internal','confidential','strictly_confidential')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expiring_soon','expired','archived','draft')),
  expiry_date DATE,
  ocr_text TEXT,
  barcode TEXT,
  qr_code TEXT,
  current_version_number TEXT DEFAULT '1.0',
  is_checked_out BOOLEAN DEFAULT false,
  checked_out_by UUID,
  checked_out_at TIMESTAMPTZ,
  is_signed BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  metadata_template_id UUID,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view documents" ON public.ecm_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage documents" ON public.ecm_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document auto-numbering sequence
CREATE SEQUENCE IF NOT EXISTS ecm_doc_number_seq START 1;

-- Document Versions
CREATE TABLE public.ecm_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.ecm_documents(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  version_type TEXT DEFAULT 'minor' CHECK (version_type IN ('major','minor')),
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  comment TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view versions" ON public.ecm_document_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage versions" ON public.ecm_document_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Metadata Templates
CREATE TABLE public.ecm_metadata_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document_type TEXT,
  department TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_metadata_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view templates" ON public.ecm_metadata_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage templates" ON public.ecm_metadata_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Metadata Fields
CREATE TABLE public.ecm_metadata_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.ecm_metadata_templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT DEFAULT 'text' CHECK (field_type IN ('text','number','date','dropdown','checkbox','textarea')),
  is_required BOOLEAN DEFAULT false,
  options TEXT[],
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_metadata_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view fields" ON public.ecm_metadata_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage fields" ON public.ecm_metadata_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document Metadata Values
CREATE TABLE public.ecm_document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.ecm_documents(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.ecm_metadata_fields(id) ON DELETE CASCADE,
  field_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_document_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view metadata" ON public.ecm_document_metadata FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage metadata" ON public.ecm_document_metadata FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document Annotations
CREATE TABLE public.ecm_document_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.ecm_documents(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('highlight','redaction','sticky_note','text_box','stamp','rectangle','arrow','freehand')),
  position_data JSONB NOT NULL DEFAULT '{}',
  content TEXT,
  color TEXT DEFAULT '#FFFF00',
  stamp_type TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_document_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view annotations" ON public.ecm_document_annotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage annotations" ON public.ecm_document_annotations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document Permissions
CREATE TABLE public.ecm_document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('folder','document')),
  target_id UUID NOT NULL,
  user_id UUID,
  role_key TEXT,
  permission_level TEXT DEFAULT 'viewer' CHECK (permission_level IN ('admin','editor','viewer','no_access')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_document_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view permissions" ON public.ecm_document_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage permissions" ON public.ecm_document_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document Audit Trail
CREATE TABLE public.ecm_document_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.ecm_documents(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES public.ecm_folders(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  user_id UUID,
  user_name TEXT,
  ip_address TEXT,
  device_info TEXT,
  result TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_document_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view audit" ON public.ecm_document_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert audit" ON public.ecm_document_audit FOR INSERT TO authenticated WITH CHECK (true);

-- Saved Searches
CREATE TABLE public.ecm_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  query_params JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own searches" ON public.ecm_saved_searches FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Correspondence
CREATE TABLE public.ecm_correspondences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT NOT NULL,
  correspondence_type TEXT NOT NULL CHECK (correspondence_type IN ('incoming','outgoing','internal_memo')),
  reference_number TEXT,
  subject TEXT NOT NULL,
  body TEXT,
  from_entity TEXT,
  to_entity TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent','high','normal','low')),
  status TEXT DEFAULT 'received' CHECK (status IN ('received','assigned','in_progress','replied','closed','draft','sent','pending_approval')),
  assigned_to UUID,
  assigned_department TEXT,
  due_date DATE,
  received_date DATE,
  sent_date DATE,
  delivery_method TEXT,
  parent_id UUID REFERENCES public.ecm_correspondences(id),
  related_document_id UUID REFERENCES public.ecm_documents(id),
  barcode TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_correspondences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view correspondence" ON public.ecm_correspondences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage correspondence" ON public.ecm_correspondences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Correspondence Referrals
CREATE TABLE public.ecm_correspondence_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondence_id UUID NOT NULL REFERENCES public.ecm_correspondences(id) ON DELETE CASCADE,
  from_user_id UUID,
  from_user_name TEXT,
  to_user_id UUID,
  to_user_name TEXT,
  to_department TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','completed','returned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.ecm_correspondence_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view referrals" ON public.ecm_correspondence_referrals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage referrals" ON public.ecm_correspondence_referrals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for ECM documents
INSERT INTO storage.buckets (id, name, public) VALUES ('ecm-documents', 'ecm-documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload ECM docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ecm-documents');
CREATE POLICY "Authenticated users can view ECM docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ecm-documents');
CREATE POLICY "Authenticated users can update ECM docs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'ecm-documents');
CREATE POLICY "Authenticated users can delete ECM docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ecm-documents');

-- Auto-generate correspondence tracking numbers
CREATE SEQUENCE IF NOT EXISTS ecm_correspondence_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_ecm_tracking_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
    NEW.tracking_number := CASE NEW.correspondence_type
      WHEN 'incoming' THEN 'IN-'
      WHEN 'outgoing' THEN 'OUT-'
      WHEN 'internal_memo' THEN 'MEM-'
      ELSE 'COR-'
    END || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('ecm_correspondence_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ecm_tracking_number
BEFORE INSERT ON public.ecm_correspondences
FOR EACH ROW EXECUTE FUNCTION public.generate_ecm_tracking_number();

-- Auto-generate document numbers
CREATE OR REPLACE FUNCTION public.generate_ecm_doc_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.document_number IS NULL OR NEW.document_number = '' THEN
    NEW.document_number := COALESCE(UPPER(LEFT(NEW.department, 3)), 'DOC') || '-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('ecm_doc_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ecm_doc_number
BEFORE INSERT ON public.ecm_documents
FOR EACH ROW EXECUTE FUNCTION public.generate_ecm_doc_number();

-- Updated_at triggers
CREATE TRIGGER update_ecm_folders_updated_at BEFORE UPDATE ON public.ecm_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ecm_documents_updated_at BEFORE UPDATE ON public.ecm_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ecm_correspondences_updated_at BEFORE UPDATE ON public.ecm_correspondences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
