
-- QA/QC Plan-Based Ticketing Schema

-- Sequences
CREATE SEQUENCE IF NOT EXISTS qa_ticket_seq START 1;
CREATE SEQUENCE IF NOT EXISTS qa_plan_seq START 1;

-- QA Projects (links to existing projects)
CREATE TABLE public.qa_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES public.projects(id),
  company_id UUID REFERENCES public.sap_companies(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plans / Drawings
CREATE TABLE public.qa_project_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qa_project_id UUID NOT NULL REFERENCES public.qa_projects(id) ON DELETE CASCADE,
  plan_title TEXT NOT NULL,
  drawing_number TEXT,
  plan_type TEXT NOT NULL DEFAULT 'floor_plan',
  building TEXT,
  floor TEXT,
  zone TEXT,
  area TEXT,
  discipline TEXT,
  scale TEXT,
  author TEXT,
  issue_date DATE,
  notes TEXT,
  active_revision_id UUID,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plan Revisions
CREATE TABLE public.qa_plan_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.qa_project_plans(id) ON DELETE CASCADE,
  revision_code TEXT NOT NULL DEFAULT 'Rev A',
  file_url TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  width_px INT,
  height_px INT,
  revision_notes TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK for active revision
ALTER TABLE public.qa_project_plans 
  ADD CONSTRAINT fk_active_revision 
  FOREIGN KEY (active_revision_id) REFERENCES public.qa_plan_revisions(id);

-- Ticket Templates
CREATE TABLE public.qa_ticket_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  discipline TEXT,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template Sections
CREATE TABLE public.qa_template_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.qa_ticket_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false
);

-- Template Fields
CREATE TABLE public.qa_template_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.qa_template_sections(id) ON DELETE CASCADE,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  is_required BOOLEAN NOT NULL DEFAULT false,
  default_value TEXT,
  placeholder TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  condition_field_id UUID REFERENCES public.qa_template_fields(id),
  condition_value TEXT
);

-- Tickets
CREATE TABLE public.qa_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE DEFAULT ('QA-' || LPAD(nextval('qa_ticket_seq')::TEXT, 5, '0')),
  qa_project_id UUID NOT NULL REFERENCES public.qa_projects(id),
  plan_id UUID REFERENCES public.qa_project_plans(id),
  plan_revision_id UUID REFERENCES public.qa_plan_revisions(id),
  template_id UUID REFERENCES public.qa_ticket_templates(id),
  title TEXT NOT NULL,
  description TEXT,
  ticket_type TEXT NOT NULL DEFAULT 'defect',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  severity TEXT NOT NULL DEFAULT 'minor',
  pin_x NUMERIC,
  pin_y NUMERIC,
  building TEXT,
  floor TEXT,
  zone TEXT,
  area TEXT,
  room TEXT,
  trade TEXT,
  progress INT NOT NULL DEFAULT 0,
  assignee_id UUID,
  assignee_name TEXT,
  due_date DATE,
  subcontractor_id UUID REFERENCES public.business_partners(id),
  subcontractor_name TEXT,
  root_cause TEXT,
  resolution_notes TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket Answers (form responses)
CREATE TABLE public.qa_ticket_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.qa_tickets(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.qa_template_fields(id),
  value TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket Media
CREATE TABLE public.qa_ticket_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.qa_tickets(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  media_type TEXT NOT NULL DEFAULT 'photo',
  caption TEXT,
  is_before BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket Comments / Chat
CREATE TABLE public.qa_ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.qa_tickets(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  user_id UUID,
  user_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket Activity Log
CREATE TABLE public.qa_ticket_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.qa_tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  user_id UUID,
  user_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket Watchers
CREATE TABLE public.qa_ticket_watchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.qa_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

-- Indexes
CREATE INDEX idx_qa_tickets_project ON public.qa_tickets(qa_project_id);
CREATE INDEX idx_qa_tickets_plan ON public.qa_tickets(plan_id);
CREATE INDEX idx_qa_tickets_status ON public.qa_tickets(status);
CREATE INDEX idx_qa_tickets_assignee ON public.qa_tickets(assignee_id);
CREATE INDEX idx_qa_ticket_comments_ticket ON public.qa_ticket_comments(ticket_id);
CREATE INDEX idx_qa_ticket_media_ticket ON public.qa_ticket_media(ticket_id);
CREATE INDEX idx_qa_plan_revisions_plan ON public.qa_plan_revisions(plan_id);

-- Enable RLS on all tables
ALTER TABLE public.qa_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_project_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_plan_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ticket_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ticket_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ticket_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ticket_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ticket_watchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies - authenticated users can access all
CREATE POLICY "Authenticated users can manage qa_projects" ON public.qa_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage qa_project_plans" ON public.qa_project_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage qa_plan_revisions" ON public.qa_plan_revisions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage qa_ticket_templates" ON public.qa_ticket_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage qa_template_sections" ON public.qa_template_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage qa_template_fields" ON public.qa_template_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage qa_tickets" ON public.qa_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage qa_ticket_answers" ON public.qa_ticket_answers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage qa_ticket_media" ON public.qa_ticket_media FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage qa_ticket_comments" ON public.qa_ticket_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage qa_ticket_activity_log" ON public.qa_ticket_activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage qa_ticket_watchers" ON public.qa_ticket_watchers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_qa_projects_updated_at BEFORE UPDATE ON public.qa_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_qa_project_plans_updated_at BEFORE UPDATE ON public.qa_project_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_qa_ticket_templates_updated_at BEFORE UPDATE ON public.qa_ticket_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_qa_tickets_updated_at BEFORE UPDATE ON public.qa_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tickets and comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_ticket_comments;

-- Storage bucket for QA/QC media
INSERT INTO storage.buckets (id, name, public) VALUES ('qa-media', 'qa-media', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view qa-media" ON storage.objects FOR SELECT USING (bucket_id = 'qa-media');
CREATE POLICY "Authenticated users can upload qa-media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'qa-media');
CREATE POLICY "Authenticated users can update qa-media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'qa-media');
CREATE POLICY "Authenticated users can delete qa-media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'qa-media');
