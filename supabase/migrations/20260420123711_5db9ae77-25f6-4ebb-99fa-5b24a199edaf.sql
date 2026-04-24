
-- =========================================================
-- CORRESPONDENCE MANAGEMENT MODULE — Enterprise Edition
-- =========================================================

-- ENUMS
DO $$ BEGIN CREATE TYPE public.corr_direction AS ENUM ('incoming','outgoing','internal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.corr_status AS ENUM ('draft','registered','in_review','assigned','in_progress','pending_approval','approved','returned','rejected','dispatched','delivered','closed','archived','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.corr_priority AS ENUM ('low','normal','high','urgent','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.corr_channel AS ENUM ('email','courier','hand_delivery','portal','system_integration','fax','print','whatsapp','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.corr_confidentiality AS ENUM ('public','internal','confidential','restricted','top_secret'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.corr_sync_status AS ENUM ('pending','synced','failed','retry_required','not_required'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.corr_party_type AS ENUM ('customer','supplier','employee','government','consultant','contractor','bank','partner','public','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ TYPES & CATEGORIES ============
CREATE TABLE IF NOT EXISTS public.corr_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  direction public.corr_direction NOT NULL,
  default_sla_hours int DEFAULT 72,
  default_workflow_key text,
  numbering_prefix text,
  requires_approval boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS public.corr_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  parent_id uuid REFERENCES public.corr_categories(id) ON DELETE SET NULL,
  retention_years int DEFAULT 7,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============ MAIN CORRESPONDENCE ============
CREATE TABLE IF NOT EXISTS public.corr_correspondence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id),
  reference_no text,                                       -- internal generated number
  external_reference text,                                 -- sender's reference for incoming
  direction public.corr_direction NOT NULL,
  type_id uuid REFERENCES public.corr_types(id),
  category_id uuid REFERENCES public.corr_categories(id),
  status public.corr_status NOT NULL DEFAULT 'draft',
  priority public.corr_priority NOT NULL DEFAULT 'normal',
  confidentiality public.corr_confidentiality NOT NULL DEFAULT 'internal',
  channel public.corr_channel,
  language text DEFAULT 'en',
  subject text NOT NULL,
  summary text,
  body_html text,
  -- Parties
  sender_party_type public.corr_party_type,
  sender_name text,
  sender_org text,
  sender_email text,
  sender_phone text,
  sender_business_partner_id uuid,
  recipient_party_type public.corr_party_type,
  recipient_name text,
  recipient_org text,
  recipient_email text,
  recipient_phone text,
  recipient_business_partner_id uuid,
  -- Dates
  correspondence_date date,
  received_date date,
  due_date date,
  sla_hours int,
  dispatch_date timestamptz,
  closed_at timestamptz,
  closed_by uuid,
  -- Assignment
  current_department text,
  current_assignee uuid,
  owner_user_id uuid,
  -- Linkages
  related_project_id uuid REFERENCES public.projects(id),
  related_contract_id uuid,
  related_incoming_id uuid REFERENCES public.corr_correspondence(id),  -- for outgoing replies
  parent_correspondence_id uuid REFERENCES public.corr_correspondence(id),
  -- Workflow
  workflow_definition_id uuid,
  workflow_instance_id uuid,
  workflow_step_no int DEFAULT 0,
  -- ECM
  ecm_folder_path text,
  ecm_sync_status public.corr_sync_status DEFAULT 'pending',
  ecm_last_synced_at timestamptz,
  ecm_error text,
  -- Tags / metadata
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}'::jsonb,
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason text
);

CREATE INDEX IF NOT EXISTS idx_corr_company ON public.corr_correspondence(company_id);
CREATE INDEX IF NOT EXISTS idx_corr_status ON public.corr_correspondence(status);
CREATE INDEX IF NOT EXISTS idx_corr_direction ON public.corr_correspondence(direction);
CREATE INDEX IF NOT EXISTS idx_corr_assignee ON public.corr_correspondence(current_assignee);
CREATE INDEX IF NOT EXISTS idx_corr_due ON public.corr_correspondence(due_date);
CREATE INDEX IF NOT EXISTS idx_corr_ref ON public.corr_correspondence(reference_no);
CREATE INDEX IF NOT EXISTS idx_corr_subject_trgm ON public.corr_correspondence USING GIN (subject gin_trgm_ops);

-- ============ ATTACHMENTS ============
CREATE TABLE IF NOT EXISTS public.corr_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondence_id uuid NOT NULL REFERENCES public.corr_correspondence(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  mime_type text,
  kind text DEFAULT 'attachment',  -- original, signed, draft, annexure, proof_of_dispatch
  version int DEFAULT 1,
  ecm_sync_status public.corr_sync_status DEFAULT 'pending',
  ecm_document_id text,
  uploaded_by uuid,
  uploaded_by_name text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_corr_att_corr ON public.corr_attachments(correspondence_id);

-- ============ ROUTING / ASSIGNMENTS ============
CREATE TABLE IF NOT EXISTS public.corr_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondence_id uuid NOT NULL REFERENCES public.corr_correspondence(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL,
  assigned_to_name text,
  department text,
  role_required text,
  action_required text,           -- review, action, approve, info, sign
  due_date timestamptz,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, completed, returned, declined, reassigned
  notes text,
  completed_at timestamptz,
  reassigned_to uuid,
  assigned_by uuid,
  assigned_by_name text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_corr_asgn_user ON public.corr_assignments(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_corr_asgn_corr ON public.corr_assignments(correspondence_id);

-- ============ COMMENTS / NOTES ============
CREATE TABLE IF NOT EXISTS public.corr_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondence_id uuid NOT NULL REFERENCES public.corr_correspondence(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.corr_comments(id),
  user_id uuid NOT NULL,
  user_name text,
  comment_text text NOT NULL,
  is_internal boolean DEFAULT true,
  is_pinned boolean DEFAULT false,
  workflow_step_no int,
  mentions uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ RELATED ENTITY LINKS (polymorphic) ============
CREATE TABLE IF NOT EXISTS public.corr_related_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondence_id uuid NOT NULL REFERENCES public.corr_correspondence(id) ON DELETE CASCADE,
  entity_type text NOT NULL,    -- project, contract, sales_order, purchase_order, employee, business_partner, ar_invoice ...
  entity_id uuid NOT NULL,
  entity_label text,
  link_role text,                -- 'response_to','reference','attachment_to','about'
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE (correspondence_id, entity_type, entity_id, link_role)
);

-- ============ DISPATCH (outgoing only) ============
CREATE TABLE IF NOT EXISTS public.corr_dispatch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondence_id uuid NOT NULL REFERENCES public.corr_correspondence(id) ON DELETE CASCADE,
  channel public.corr_channel NOT NULL,
  dispatched_at timestamptz DEFAULT now(),
  dispatched_by uuid,
  dispatched_by_name text,
  recipient_address text,
  tracking_number text,
  carrier text,
  proof_url text,
  delivered_at timestamptz,
  delivery_proof_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============ AUDIT LOG ============
CREATE TABLE IF NOT EXISTS public.corr_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondence_id uuid NOT NULL REFERENCES public.corr_correspondence(id) ON DELETE CASCADE,
  action text NOT NULL,                   -- created, updated, status_changed, assigned, commented, attached, dispatched, closed, ecm_synced, ecm_failed
  actor_id uuid,
  actor_name text,
  from_status public.corr_status,
  to_status public.corr_status,
  changed_fields text[],
  old_values jsonb,
  new_values jsonb,
  notes text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_corr_audit_corr ON public.corr_audit_log(correspondence_id, created_at DESC);

-- ============ ECM SYNC LOG ============
CREATE TABLE IF NOT EXISTS public.corr_ecm_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondence_id uuid NOT NULL REFERENCES public.corr_correspondence(id) ON DELETE CASCADE,
  attachment_id uuid REFERENCES public.corr_attachments(id) ON DELETE CASCADE,
  operation text NOT NULL,        -- create_folder, upload_file, update_metadata, delete
  status public.corr_sync_status NOT NULL,
  attempt int DEFAULT 1,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  ecm_external_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_corr_ecm_status ON public.corr_ecm_sync_log(status, created_at DESC);

-- ============ WORKFLOW DEFINITIONS ============
CREATE TABLE IF NOT EXISTS public.corr_workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  workflow_key text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  direction public.corr_direction NOT NULL,
  category text,                                   -- standard, confidential, reply, dispatch
  is_active boolean DEFAULT true,
  version int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (company_id, workflow_key, version)
);

CREATE TABLE IF NOT EXISTS public.corr_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.corr_workflow_definitions(id) ON DELETE CASCADE,
  step_no int NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  step_type text NOT NULL DEFAULT 'approval', -- review, approval, action, notify, archive
  required_role text,                          -- app_role text
  required_department text,
  is_parallel boolean DEFAULT false,
  sla_hours int DEFAULT 24,
  on_reject_step int,                          -- step to return to on reject
  conditions jsonb DEFAULT '{}'::jsonb,
  notify_user_ids uuid[] DEFAULT '{}',
  UNIQUE (definition_id, step_no)
);

-- ============ NUMBERING SEQUENCE ============
-- Helper to allocate next correspondence number per company/branch/type/year
CREATE TABLE IF NOT EXISTS public.corr_numbering_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id),
  type_code text NOT NULL,
  fiscal_year int NOT NULL,
  last_seq int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (company_id, branch_id, type_code, fiscal_year)
);

CREATE OR REPLACE FUNCTION public.corr_next_reference(
  _company_id uuid,
  _branch_id uuid,
  _type_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE);
  v_type_code text;
  v_prefix text;
  v_branch_code text;
  v_company_code text;
  v_seq int;
  v_ref text;
BEGIN
  SELECT COALESCE(numbering_prefix, code), code INTO v_prefix, v_type_code
    FROM public.corr_types WHERE id = _type_id;
  IF v_type_code IS NULL THEN
    v_type_code := 'CORR'; v_prefix := 'CORR';
  END IF;

  SELECT COALESCE(code, 'HQ') INTO v_branch_code FROM public.branches WHERE id = _branch_id;
  SELECT COALESCE(code, 'CO')  INTO v_company_code FROM public.sap_companies WHERE id = _company_id;

  INSERT INTO public.corr_numbering_state (company_id, branch_id, type_code, fiscal_year, last_seq)
    VALUES (_company_id, _branch_id, v_type_code, v_year, 1)
  ON CONFLICT (company_id, branch_id, type_code, fiscal_year)
    DO UPDATE SET last_seq = public.corr_numbering_state.last_seq + 1, updated_at = now()
  RETURNING last_seq INTO v_seq;

  v_ref := COALESCE(v_company_code,'CO') || '-' ||
           COALESCE(v_branch_code,'HQ')  || '-' ||
           v_prefix || '-' ||
           to_char(v_year,'FM0000') || '-' ||
           to_char(v_seq,'FM00000');
  RETURN v_ref;
END $$;

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.corr_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_corr_corr_uat ON public.corr_correspondence;
CREATE TRIGGER trg_corr_corr_uat BEFORE UPDATE ON public.corr_correspondence
  FOR EACH ROW EXECUTE FUNCTION public.corr_set_updated_at();

DROP TRIGGER IF EXISTS trg_corr_types_uat ON public.corr_types;
CREATE TRIGGER trg_corr_types_uat BEFORE UPDATE ON public.corr_types
  FOR EACH ROW EXECUTE FUNCTION public.corr_set_updated_at();

-- Auto-generate reference + audit on insert/update
CREATE OR REPLACE FUNCTION public.corr_correspondence_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.reference_no IS NULL AND NEW.status <> 'draft' THEN
      NEW.reference_no := public.corr_next_reference(NEW.company_id, NEW.branch_id, NEW.type_id);
    END IF;
    INSERT INTO public.corr_audit_log(correspondence_id, action, actor_id, to_status, new_values)
      VALUES (NEW.id, 'created', v_actor, NEW.status, to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.reference_no IS NULL AND NEW.status <> 'draft' THEN
      NEW.reference_no := public.corr_next_reference(NEW.company_id, NEW.branch_id, NEW.type_id);
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.corr_audit_log(correspondence_id, action, actor_id, from_status, to_status)
        VALUES (NEW.id, 'status_changed', v_actor, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_corr_audit ON public.corr_correspondence;
CREATE TRIGGER trg_corr_audit BEFORE INSERT OR UPDATE ON public.corr_correspondence
  FOR EACH ROW EXECUTE FUNCTION public.corr_correspondence_audit();

-- ============ RLS ============
ALTER TABLE public.corr_correspondence       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_types                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_attachments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_comments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_related_links        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_dispatch             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_ecm_sync_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_workflow_steps       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corr_numbering_state      ENABLE ROW LEVEL SECURITY;

-- Helper: visible correspondence
CREATE OR REPLACE FUNCTION public.can_access_correspondence(_user uuid, _row public.corr_correspondence)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_any_role(_user, ARRAY['admin'::app_role,'manager'::app_role]) THEN RETURN true; END IF;
  IF _row.confidentiality IN ('confidential','restricted','top_secret') THEN
    RETURN _row.created_by = _user
        OR _row.owner_user_id = _user
        OR _row.current_assignee = _user
        OR EXISTS (SELECT 1 FROM corr_assignments a WHERE a.correspondence_id = _row.id AND a.assigned_to = _user);
  END IF;
  RETURN true; -- non-confidential visible to authenticated users (tenant scoped via company_id in queries)
END $$;

-- Correspondence policies
CREATE POLICY "corr_select" ON public.corr_correspondence FOR SELECT TO authenticated
  USING (public.can_access_correspondence(auth.uid(), corr_correspondence));
CREATE POLICY "corr_insert" ON public.corr_correspondence FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "corr_update" ON public.corr_correspondence FOR UPDATE TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])
    OR created_by = auth.uid()
    OR owner_user_id = auth.uid()
    OR current_assignee = auth.uid()
  );
CREATE POLICY "corr_delete" ON public.corr_correspondence FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- Generic permissive read + owner write for child tables (scoped by parent)
CREATE POLICY "corr_types_read"  ON public.corr_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "corr_types_admin" ON public.corr_types FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

CREATE POLICY "corr_cat_read"  ON public.corr_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "corr_cat_admin" ON public.corr_categories FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

CREATE POLICY "corr_att_all" ON public.corr_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM corr_correspondence c WHERE c.id = correspondence_id AND public.can_access_correspondence(auth.uid(), c)))
  WITH CHECK (true);

CREATE POLICY "corr_asgn_all" ON public.corr_assignments FOR ALL TO authenticated
  USING (
    assigned_to = auth.uid() OR assigned_by = auth.uid()
    OR has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])
    OR EXISTS (SELECT 1 FROM corr_correspondence c WHERE c.id = correspondence_id AND public.can_access_correspondence(auth.uid(), c))
  )
  WITH CHECK (true);

CREATE POLICY "corr_cmt_all" ON public.corr_comments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM corr_correspondence c WHERE c.id = correspondence_id AND public.can_access_correspondence(auth.uid(), c)))
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "corr_rel_all" ON public.corr_related_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM corr_correspondence c WHERE c.id = correspondence_id AND public.can_access_correspondence(auth.uid(), c)))
  WITH CHECK (true);

CREATE POLICY "corr_disp_all" ON public.corr_dispatch FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM corr_correspondence c WHERE c.id = correspondence_id AND public.can_access_correspondence(auth.uid(), c)))
  WITH CHECK (true);

CREATE POLICY "corr_audit_read" ON public.corr_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM corr_correspondence c WHERE c.id = correspondence_id AND public.can_access_correspondence(auth.uid(), c)));
CREATE POLICY "corr_audit_insert" ON public.corr_audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "corr_ecm_read" ON public.corr_ecm_sync_log FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])
    OR EXISTS (SELECT 1 FROM corr_correspondence c WHERE c.id = correspondence_id AND public.can_access_correspondence(auth.uid(), c)));
CREATE POLICY "corr_ecm_write" ON public.corr_ecm_sync_log FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])) WITH CHECK (true);

CREATE POLICY "corr_wf_def_read"  ON public.corr_workflow_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "corr_wf_def_admin" ON public.corr_workflow_definitions FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

CREATE POLICY "corr_wf_step_read"  ON public.corr_workflow_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "corr_wf_step_admin" ON public.corr_workflow_steps FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

CREATE POLICY "corr_numstate_admin" ON public.corr_numbering_state FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============ STORAGE BUCKET (reuse 'attachments', create dedicated 'correspondence') ============
INSERT INTO storage.buckets (id, name, public)
  VALUES ('correspondence', 'correspondence', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "corr_storage_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'correspondence');
CREATE POLICY "corr_storage_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'correspondence');
CREATE POLICY "corr_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'correspondence');
CREATE POLICY "corr_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'correspondence' AND has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

-- ============ SEED DEFAULTS ============
INSERT INTO public.corr_types (code, name_en, name_ar, direction, default_sla_hours, numbering_prefix, requires_approval) VALUES
  ('IN-LTR', 'Incoming Letter', 'خطاب وارد', 'incoming', 72, 'IN', false),
  ('IN-EML', 'Incoming Email',  'بريد وارد', 'incoming', 48, 'EM', false),
  ('IN-GOV', 'Government Notice', 'إشعار حكومي', 'incoming', 24, 'GOV', true),
  ('OUT-LTR', 'Outgoing Letter','خطاب صادر', 'outgoing', 72, 'OUT', true),
  ('OUT-RPL', 'Outgoing Reply', 'رد صادر', 'outgoing', 48, 'RPL', true),
  ('OUT-MEM', 'Memo',           'مذكرة',    'outgoing', 24, 'MEM', false)
ON CONFLICT DO NOTHING;

INSERT INTO public.corr_categories (code, name_en, name_ar, retention_years) VALUES
  ('GEN','General','عام',5),
  ('LEG','Legal','قانوني',15),
  ('FIN','Financial','مالي',10),
  ('HR','Human Resources','الموارد البشرية',10),
  ('PRJ','Project','مشروع',10),
  ('PRC','Procurement','مشتريات',7),
  ('GOV','Government','حكومي',15)
ON CONFLICT DO NOTHING;

-- Default standard incoming workflow
DO $$
DECLARE v_def uuid;
BEGIN
  INSERT INTO public.corr_workflow_definitions (workflow_key, name_en, name_ar, direction, category)
  VALUES ('incoming_standard','Incoming Standard','الوارد القياسي','incoming','standard')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_def;

  IF v_def IS NULL THEN
    SELECT id INTO v_def FROM public.corr_workflow_definitions WHERE workflow_key='incoming_standard' LIMIT 1;
  END IF;

  INSERT INTO public.corr_workflow_steps (definition_id, step_no, name_en, name_ar, step_type, required_role, sla_hours) VALUES
    (v_def, 1, 'Register',     'تسجيل',    'review',   'user',    24),
    (v_def, 2, 'Route',        'توجيه',    'review',   'manager', 24),
    (v_def, 3, 'Action',       'إجراء',    'action',   'user',    72),
    (v_def, 4, 'Manager Close','إغلاق',    'approval', 'manager', 24),
    (v_def, 5, 'Archive',      'أرشفة',    'archive',  'admin',   24)
  ON CONFLICT DO NOTHING;
END $$;

-- Default outgoing standard
DO $$
DECLARE v_def uuid;
BEGIN
  INSERT INTO public.corr_workflow_definitions (workflow_key, name_en, name_ar, direction, category)
  VALUES ('outgoing_standard','Outgoing Standard','الصادر القياسي','outgoing','standard')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_def;
  IF v_def IS NULL THEN
    SELECT id INTO v_def FROM public.corr_workflow_definitions WHERE workflow_key='outgoing_standard' LIMIT 1;
  END IF;
  INSERT INTO public.corr_workflow_steps (definition_id, step_no, name_en, name_ar, step_type, required_role, sla_hours) VALUES
    (v_def, 1, 'Draft',        'مسودة',     'action',   'user',    48),
    (v_def, 2, 'Review',       'مراجعة',    'review',   'manager', 24),
    (v_def, 3, 'Approve',      'اعتماد',    'approval', 'manager', 24),
    (v_def, 4, 'Dispatch',     'إرسال',     'action',   'user',    24),
    (v_def, 5, 'Archive',      'أرشفة',     'archive',  'admin',   24)
  ON CONFLICT DO NOTHING;
END $$;
