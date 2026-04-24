-- ============================================================
-- Unified Portal Layer (PR1)
-- ============================================================

-- 1) Portal users: unified identity for client/supplier/subcontractor/saas_admin
CREATE TABLE IF NOT EXISTS public.portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  portal_type text NOT NULL CHECK (portal_type IN ('client','supplier','subcontractor','saas_admin')),
  external_party_id uuid, -- references client/supplier/subcontractor record where applicable
  auth_user_id uuid,      -- maps to auth.users when linked
  email text NOT NULL,
  full_name text,
  role_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','invited','revoked')),
  last_login_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, portal_type, email)
);
CREATE INDEX IF NOT EXISTS idx_portal_users_lookup ON public.portal_users(company_id, portal_type, status);

-- 2) Portal invitations
CREATE TABLE IF NOT EXISTS public.portal_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  portal_type text NOT NULL CHECK (portal_type IN ('client','supplier','subcontractor','saas_admin')),
  external_party_id uuid,
  email text NOT NULL,
  full_name text,
  role_id uuid,
  invitation_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portal_invitations_token ON public.portal_invitations(invitation_token);

-- 3) Portal roles (named permission bundles)
CREATE TABLE IF NOT EXISTS public.portal_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  portal_type text NOT NULL CHECK (portal_type IN ('client','supplier','subcontractor','saas_admin')),
  role_name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, portal_type, role_name)
);

-- 4) Portal document exchanges
CREATE TABLE IF NOT EXISTS public.portal_document_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  portal_type text NOT NULL,
  portal_user_id uuid REFERENCES public.portal_users(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  document_name text NOT NULL,
  document_type text,
  file_url text,
  related_entity_type text,
  related_entity_id uuid,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','accepted','rejected','requested_changes')),
  reviewer_id uuid,
  reviewer_notes text,
  shared_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_portal_doc_exchanges_company ON public.portal_document_exchanges(company_id, portal_type, status);

-- 5) Portal RFQ responses
CREATE TABLE IF NOT EXISTS public.portal_rfq_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  rfq_id uuid,
  rfq_number text,
  portal_user_id uuid REFERENCES public.portal_users(id) ON DELETE SET NULL,
  responder_party_id uuid,
  total_quoted numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  lead_time_days integer,
  validity_days integer DEFAULT 30,
  payment_terms text,
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  line_items jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft','submitted','shortlisted','awarded','rejected','withdrawn')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decision_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_portal_rfq_responses_company ON public.portal_rfq_responses(company_id, status);

-- 6) Portal approval tasks (cross-portal sign-offs)
CREATE TABLE IF NOT EXISTS public.portal_approval_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  portal_type text NOT NULL,
  portal_user_id uuid REFERENCES public.portal_users(id) ON DELETE SET NULL,
  task_title text NOT NULL,
  task_description text,
  related_entity_type text,
  related_entity_id uuid,
  due_date date,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','escalated','cancelled')),
  decision_notes text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portal_approvals_company ON public.portal_approval_tasks(company_id, status);

-- 7) SaaS seat assignments
CREATE TABLE IF NOT EXISTS public.saas_seat_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_subscription_id uuid,
  company_id uuid,
  seat_label text,
  assigned_user_id uuid,        -- auth.users id
  assigned_email text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','pending')),
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_subscription ON public.saas_seat_assignments(tenant_subscription_id, status);

-- 8) Portal branding profiles (white-label per company)
CREATE TABLE IF NOT EXISTS public.portal_branding_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  portal_type text NOT NULL CHECK (portal_type IN ('client','supplier','subcontractor','saas_admin','all')),
  brand_name text,
  logo_url text,
  primary_color text DEFAULT '#0F172A',
  accent_color text DEFAULT '#3B82F6',
  background_color text DEFAULT '#FFFFFF',
  footer_text text,
  custom_domain text,
  email_from_name text,
  email_signature text,
  white_label boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, portal_type)
);

-- 9) Portal timeline events (collaboration audit trail)
CREATE TABLE IF NOT EXISTS public.portal_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  portal_type text,
  portal_user_id uuid REFERENCES public.portal_users(id) ON DELETE SET NULL,
  related_entity_type text NOT NULL,
  related_entity_id uuid NOT NULL,
  event_type text NOT NULL,    -- e.g. uploaded, commented, approved, rejected, viewed
  event_label text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portal_timeline_entity ON public.portal_timeline_events(related_entity_type, related_entity_id, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.portal_users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_invitations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_roles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_document_exchanges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_rfq_responses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_approval_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_seat_assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_branding_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_timeline_events     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth_all_portal_users"        ON public.portal_users              FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_portal_invitations"  ON public.portal_invitations        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_portal_roles"        ON public.portal_roles              FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_portal_doc_ex"       ON public.portal_document_exchanges FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_portal_rfq"          ON public.portal_rfq_responses      FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_portal_approvals"    ON public.portal_approval_tasks     FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_saas_seats"          ON public.saas_seat_assignments     FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_portal_branding"     ON public.portal_branding_profiles  FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_portal_timeline"     ON public.portal_timeline_events    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public token-based read of branding (so login pages can render)
DO $$ BEGIN
  CREATE POLICY "public_read_branding" ON public.portal_branding_profiles FOR SELECT TO anon USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- RPCs
-- ============================================================

-- Issue invitation
CREATE OR REPLACE FUNCTION public.portal_create_invitation(
  p_company_id uuid,
  p_portal_type text,
  p_email text,
  p_full_name text DEFAULT NULL,
  p_external_party_id uuid DEFAULT NULL,
  p_role_id uuid DEFAULT NULL,
  p_expires_in_days integer DEFAULT 14
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_id uuid;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF p_portal_type NOT IN ('client','supplier','subcontractor','saas_admin') THEN
    RAISE EXCEPTION 'Invalid portal_type: %', p_portal_type;
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO portal_invitations(
    company_id, portal_type, email, full_name, external_party_id, role_id,
    invitation_token, expires_at, invited_by
  ) VALUES (
    p_company_id, p_portal_type, lower(trim(p_email)), p_full_name, p_external_party_id, p_role_id,
    v_token, now() + (p_expires_in_days || ' days')::interval, auth.uid()
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('invitation_id', v_id, 'token', v_token);
END;
$$;

-- Accept invitation -> provisions a portal_user
CREATE OR REPLACE FUNCTION public.portal_accept_invitation(
  p_token text,
  p_auth_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_user_id uuid;
BEGIN
  SELECT * INTO v_inv FROM portal_invitations WHERE invitation_token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is %', v_inv.status;
  END IF;
  IF v_inv.expires_at < now() THEN
    UPDATE portal_invitations SET status = 'expired' WHERE id = v_inv.id;
    RAISE EXCEPTION 'Invitation expired';
  END IF;

  INSERT INTO portal_users(
    company_id, portal_type, external_party_id, auth_user_id, email, full_name, role_id, status
  ) VALUES (
    v_inv.company_id, v_inv.portal_type, v_inv.external_party_id,
    COALESCE(p_auth_user_id, auth.uid()), v_inv.email, v_inv.full_name, v_inv.role_id, 'active'
  )
  ON CONFLICT (company_id, portal_type, email)
    DO UPDATE SET status = 'active', auth_user_id = EXCLUDED.auth_user_id, role_id = EXCLUDED.role_id, updated_at = now()
  RETURNING id INTO v_user_id;

  UPDATE portal_invitations
     SET status = 'accepted', accepted_at = now()
   WHERE id = v_inv.id;

  RETURN jsonb_build_object('portal_user_id', v_user_id, 'portal_type', v_inv.portal_type);
END;
$$;

-- Log timeline event helper
CREATE OR REPLACE FUNCTION public.portal_log_timeline(
  p_company_id uuid,
  p_portal_type text,
  p_portal_user_id uuid,
  p_related_entity_type text,
  p_related_entity_id uuid,
  p_event_type text,
  p_event_label text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO portal_timeline_events(
    company_id, portal_type, portal_user_id, related_entity_type, related_entity_id,
    event_type, event_label, payload
  ) VALUES (
    p_company_id, p_portal_type, p_portal_user_id, p_related_entity_type, p_related_entity_id,
    p_event_type, p_event_label, p_payload
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_portal_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS portal_users_updated_at ON public.portal_users;
CREATE TRIGGER portal_users_updated_at BEFORE UPDATE ON public.portal_users
  FOR EACH ROW EXECUTE FUNCTION public.tg_portal_set_updated_at();
DROP TRIGGER IF EXISTS portal_roles_updated_at ON public.portal_roles;
CREATE TRIGGER portal_roles_updated_at BEFORE UPDATE ON public.portal_roles
  FOR EACH ROW EXECUTE FUNCTION public.tg_portal_set_updated_at();
DROP TRIGGER IF EXISTS portal_branding_updated_at ON public.portal_branding_profiles;
CREATE TRIGGER portal_branding_updated_at BEFORE UPDATE ON public.portal_branding_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_portal_set_updated_at();