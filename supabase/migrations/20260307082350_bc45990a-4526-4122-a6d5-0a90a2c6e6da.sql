
-- Email Templates table
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email Logs (sent/tracked emails)
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.email_templates(id),
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT,
  status TEXT DEFAULT 'sent',
  sent_by UUID REFERENCES auth.users(id),
  business_partner_id UUID REFERENCES public.business_partners(id),
  lead_id UUID,
  opportunity_id UUID,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Document Management
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  entity_type TEXT NOT NULL DEFAULT 'business_partner',
  entity_id UUID NOT NULL,
  version INT DEFAULT 1,
  parent_document_id UUID REFERENCES public.documents(id),
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage email templates" ON public.email_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage email logs" ON public.email_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage documents" ON public.documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
