
-- Document Checklist Templates
CREATE TABLE public.document_checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  document_type TEXT NOT NULL, -- sales_order, purchase_order, quotation, project, leave_request, etc.
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]', -- [{key, label, description, is_mandatory}]
  is_mandatory BOOLEAN DEFAULT false, -- block status change if incomplete
  block_status_from TEXT, -- e.g. 'draft'
  block_status_to TEXT, -- e.g. 'approved' - can't move unless checklist complete
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklist templates"
  ON public.document_checklist_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage checklist templates"
  ON public.document_checklist_templates FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Document Checklist Instances (per document)
CREATE TABLE public.document_checklist_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.document_checklist_templates(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  items_progress JSONB NOT NULL DEFAULT '[]', -- [{key, label, completed, completed_by, completed_at, notes}]
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, document_id)
);

ALTER TABLE public.document_checklist_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklist instances"
  ON public.document_checklist_instances FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage checklist instances"
  ON public.document_checklist_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_checklist_instances_doc ON public.document_checklist_instances(document_type, document_id);
CREATE INDEX idx_checklist_templates_type ON public.document_checklist_templates(document_type, is_active);
