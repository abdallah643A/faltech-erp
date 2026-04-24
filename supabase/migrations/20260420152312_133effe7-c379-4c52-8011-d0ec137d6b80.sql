
-- ============== Extend existing tables ==============
ALTER TABLE public.client_portals
  ADD COLUMN IF NOT EXISTS default_locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS supported_locales text[] NOT NULL DEFAULT ARRAY['en','ar'],
  ADD COLUMN IF NOT EXISTS magic_link_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_required boolean NOT NULL DEFAULT false;

ALTER TABLE public.saas_tenants
  ADD COLUMN IF NOT EXISTS default_locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS supported_locales text[] NOT NULL DEFAULT ARRAY['en','ar'];

-- ============== Security policies ==============
CREATE TABLE IF NOT EXISTS public.portal_security_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL UNIQUE REFERENCES public.client_portals(id) ON DELETE CASCADE,
  min_password_length int NOT NULL DEFAULT 10,
  require_uppercase boolean NOT NULL DEFAULT true,
  require_number boolean NOT NULL DEFAULT true,
  require_symbol boolean NOT NULL DEFAULT false,
  password_expiry_days int,
  max_failed_attempts int NOT NULL DEFAULT 5,
  lockout_minutes int NOT NULL DEFAULT 15,
  session_ttl_minutes int NOT NULL DEFAULT 720,
  allow_magic_link boolean NOT NULL DEFAULT false,
  allow_totp_mfa boolean NOT NULL DEFAULT false,
  require_mfa boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_security_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read security policies" ON public.portal_security_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage security policies" ON public.portal_security_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============== Login attempts (audit + heatmap) ==============
CREATE TABLE IF NOT EXISTS public.portal_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid REFERENCES public.client_portals(id) ON DELETE CASCADE,
  account_email text NOT NULL,
  success boolean NOT NULL,
  failure_reason text,
  ip_address text,
  user_agent text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portal_login_attempts_portal_time ON public.portal_login_attempts(portal_id, attempted_at DESC);
ALTER TABLE public.portal_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read login attempts" ON public.portal_login_attempts FOR SELECT TO authenticated USING (true);
CREATE POLICY "anon insert login attempts" ON public.portal_login_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============== Magic links ==============
CREATE TABLE IF NOT EXISTS public.portal_magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES public.client_portals(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.portal_client_accounts(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_magic_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage magic links" ON public.portal_magic_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon use magic links" ON public.portal_magic_links FOR SELECT TO anon USING (true);
CREATE POLICY "anon update magic links" ON public.portal_magic_links FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ============== TOTP MFA ==============
CREATE TABLE IF NOT EXISTS public.portal_mfa_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.portal_client_accounts(id) ON DELETE CASCADE,
  factor_type text NOT NULL DEFAULT 'totp',
  secret text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_mfa_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage mfa factors" ON public.portal_mfa_factors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============== Locales & translations ==============
CREATE TABLE IF NOT EXISTS public.portal_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES public.client_portals(id) ON DELETE CASCADE,
  locale text NOT NULL,
  translation_key text NOT NULL,
  translation_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portal_id, locale, translation_key)
);
ALTER TABLE public.portal_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read translations" ON public.portal_translations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auth manage translations" ON public.portal_translations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============== Service requests ==============
CREATE TABLE IF NOT EXISTS public.portal_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES public.client_portals(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.portal_client_accounts(id) ON DELETE SET NULL,
  request_number text NOT NULL DEFAULT ('SR-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  subject text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  severity text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_to uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read service requests" ON public.portal_service_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage service requests" ON public.portal_service_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon submit service requests" ON public.portal_service_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon read own service requests" ON public.portal_service_requests FOR SELECT TO anon USING (true);

-- ============== Subscription self-service requests ==============
CREATE TABLE IF NOT EXISTS public.portal_subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  portal_id uuid REFERENCES public.client_portals(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  current_plan_id uuid REFERENCES public.saas_subscription_plans(id),
  requested_plan_id uuid REFERENCES public.saas_subscription_plans(id),
  requested_seats int,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_subscription_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage subscription requests" ON public.portal_subscription_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============== Tenant SSO config ==============
CREATE TABLE IF NOT EXISTS public.tenant_sso_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  protocol text NOT NULL DEFAULT 'saml',
  metadata_url text,
  metadata_xml text,
  oidc_issuer text,
  oidc_client_id text,
  oidc_client_secret text,
  email_domains text[] NOT NULL DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_sso_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage tenant sso" ON public.tenant_sso_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============== RFQ clarifications + AI normalization ==============
CREATE TABLE IF NOT EXISTS public.portal_rfq_clarifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_response_id uuid REFERENCES public.portal_rfq_responses(id) ON DELETE CASCADE,
  rfq_id uuid,
  author_type text NOT NULL,
  author_name text,
  message text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_rfq_clarifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read rfq clarifications" ON public.portal_rfq_clarifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage rfq clarifications" ON public.portal_rfq_clarifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon submit rfq clarifications" ON public.portal_rfq_clarifications FOR INSERT TO anon WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.portal_rfq_ai_normalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL,
  normalized_at timestamptz NOT NULL DEFAULT now(),
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  scorecard jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid
);
ALTER TABLE public.portal_rfq_ai_normalizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage rfq normalizations" ON public.portal_rfq_ai_normalizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============== Bidirectional activity feed ==============
CREATE TABLE IF NOT EXISTS public.portal_activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid REFERENCES public.client_portals(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  account_id uuid,
  direction text NOT NULL DEFAULT 'inbound',
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portal_activity_feed_portal_time ON public.portal_activity_feed(portal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_activity_feed_tenant_time ON public.portal_activity_feed(tenant_id, created_at DESC);
ALTER TABLE public.portal_activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read activity feed" ON public.portal_activity_feed FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage activity feed" ON public.portal_activity_feed FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon insert activity feed" ON public.portal_activity_feed FOR INSERT TO anon WITH CHECK (true);

-- ============== Helper function ==============
CREATE OR REPLACE FUNCTION public.portal_log_activity(
  p_portal_id uuid,
  p_tenant_id uuid,
  p_direction text,
  p_event_type text,
  p_title text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.portal_activity_feed (portal_id, tenant_id, direction, event_type, title, entity_type, entity_id, description, metadata)
  VALUES (p_portal_id, p_tenant_id, COALESCE(p_direction,'inbound'), p_event_type, p_title, p_entity_type, p_entity_id, p_description, COALESCE(p_metadata,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- updated_at triggers (reuse existing function if present)
DO $$ BEGIN
  CREATE TRIGGER trg_portal_security_policies_updated BEFORE UPDATE ON public.portal_security_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_portal_translations_updated BEFORE UPDATE ON public.portal_translations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_portal_service_requests_updated BEFORE UPDATE ON public.portal_service_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_portal_subscription_requests_updated BEFORE UPDATE ON public.portal_subscription_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_tenant_sso_configs_updated BEFORE UPDATE ON public.tenant_sso_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
