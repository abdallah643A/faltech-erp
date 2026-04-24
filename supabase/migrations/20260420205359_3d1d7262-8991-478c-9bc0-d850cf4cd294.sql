
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.integration_api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_code TEXT NOT NULL,
  partner_type TEXT DEFAULT 'partner',
  auth_method TEXT NOT NULL DEFAULT 'api_key',
  api_key_hash TEXT,
  api_key_prefix TEXT,
  oauth_client_id TEXT,
  oauth_client_secret_hash TEXT,
  scopes TEXT[] DEFAULT '{}',
  ip_allowlist TEXT[] DEFAULT '{}',
  rate_limit_per_minute INTEGER DEFAULT 120,
  rate_limit_per_day INTEGER DEFAULT 10000,
  allowed_entities TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  owner_name TEXT,
  owner_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, client_code),
  UNIQUE (oauth_client_id)
);
ALTER TABLE public.integration_api_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_integration_api_clients" ON public.integration_api_clients;
CREATE POLICY "auth_crud_integration_api_clients" ON public.integration_api_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_integration_api_clients_company ON public.integration_api_clients(company_id, status);
CREATE INDEX IF NOT EXISTS idx_integration_api_clients_prefix ON public.integration_api_clients(api_key_prefix);

CREATE TABLE IF NOT EXISTS public.integration_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.integration_api_clients(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] DEFAULT '{}',
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.integration_oauth_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_integration_oauth_tokens" ON public.integration_oauth_tokens;
CREATE POLICY "auth_crud_integration_oauth_tokens" ON public.integration_oauth_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.integration_webhook_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  payload_schema JSONB DEFAULT '{}'::jsonb,
  sample_payload JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, topic)
);
ALTER TABLE public.integration_webhook_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_integration_webhook_topics" ON public.integration_webhook_topics;
CREATE POLICY "auth_crud_integration_webhook_topics" ON public.integration_webhook_topics FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.integration_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.integration_api_clients(id) ON DELETE SET NULL,
  subscription_name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  signing_secret_hash TEXT,
  signing_secret_prefix TEXT,
  headers JSONB DEFAULT '{}'::jsonb,
  retry_policy JSONB DEFAULT '{"max_attempts":5,"delays_seconds":[60,300,1800,7200,43200]}'::jsonb,
  status TEXT DEFAULT 'active',
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.integration_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_integration_webhook_subscriptions" ON public.integration_webhook_subscriptions;
CREATE POLICY "auth_crud_integration_webhook_subscriptions" ON public.integration_webhook_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_sub_topics ON public.integration_webhook_subscriptions USING GIN(topics);

CREATE TABLE IF NOT EXISTS public.integration_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.integration_webhook_subscriptions(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ DEFAULT now(),
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  is_dead_letter BOOLEAN DEFAULT false,
  replay_of UUID REFERENCES public.integration_webhook_deliveries(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.integration_webhook_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_integration_webhook_deliveries" ON public.integration_webhook_deliveries;
CREATE POLICY "auth_crud_integration_webhook_deliveries" ON public.integration_webhook_deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_deliveries_retry ON public.integration_webhook_deliveries(status, next_retry_at) WHERE status IN ('pending','retrying');
CREATE INDEX IF NOT EXISTS idx_integration_webhook_deliveries_company ON public.integration_webhook_deliveries(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.integration_import_export_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'import',
  entity_name TEXT NOT NULL,
  file_format TEXT DEFAULT 'csv',
  direction TEXT DEFAULT 'inbound',
  column_definitions JSONB DEFAULT '[]'::jsonb,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  sample_payload JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.integration_import_export_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_integration_import_export_templates" ON public.integration_import_export_templates;
CREATE POLICY "auth_crud_integration_import_export_templates" ON public.integration_import_export_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.integration_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  mapping_name TEXT NOT NULL,
  connector_code TEXT,
  source_system TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  mapping_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  transform_rules JSONB DEFAULT '{}'::jsonb,
  governance_status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  change_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  effective_from TIMESTAMPTZ DEFAULT now(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.integration_field_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_integration_field_mappings" ON public.integration_field_mappings;
CREATE POLICY "auth_crud_integration_field_mappings" ON public.integration_field_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.integration_connector_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  connector_code TEXT NOT NULL,
  connector_name TEXT NOT NULL,
  category TEXT NOT NULL,
  provider TEXT,
  description TEXT,
  auth_config JSONB DEFAULT '{}'::jsonb,
  endpoint_templates JSONB DEFAULT '[]'::jsonb,
  event_topics TEXT[] DEFAULT '{}',
  default_mappings JSONB DEFAULT '{}'::jsonb,
  setup_checklist JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'template',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, connector_code)
);
ALTER TABLE public.integration_connector_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_integration_connector_templates" ON public.integration_connector_templates;
CREATE POLICY "auth_crud_integration_connector_templates" ON public.integration_connector_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.integration_interface_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  doc_key TEXT NOT NULL,
  title TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1',
  interface_type TEXT DEFAULT 'openapi',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  changelog TEXT,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, doc_key, version)
);
ALTER TABLE public.integration_interface_docs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_integration_interface_docs" ON public.integration_interface_docs;
CREATE POLICY "auth_crud_integration_interface_docs" ON public.integration_interface_docs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.integration_master_data_sync_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  connector_code TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  sync_direction TEXT DEFAULT 'bidirectional',
  conflict_strategy TEXT DEFAULT 'erp_wins',
  schedule_cron TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  watermark JSONB DEFAULT '{}'::jsonb,
  filter_rules JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, connector_code, entity_name)
);
ALTER TABLE public.integration_master_data_sync_controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_integration_master_data_sync_controls" ON public.integration_master_data_sync_controls;
CREATE POLICY "auth_crud_integration_master_data_sync_controls" ON public.integration_master_data_sync_controls FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.integration_hash_secret(p_secret TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(p_secret::bytea, 'sha256'), 'hex')
$$;

CREATE OR REPLACE FUNCTION public.integration_enqueue_webhook_event(
  p_company_id UUID,
  p_topic TEXT,
  p_event_id TEXT,
  p_payload JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.integration_webhook_deliveries (
    company_id, subscription_id, topic, event_id, payload, status, max_attempts, next_retry_at
  )
  SELECT p_company_id, s.id, p_topic, p_event_id, p_payload, 'pending',
         COALESCE((s.retry_policy->>'max_attempts')::int, 5), now()
  FROM public.integration_webhook_subscriptions s
  WHERE s.company_id = p_company_id
    AND s.status = 'active'
    AND p_topic = ANY(s.topics);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_mark_delivery_result(
  p_delivery_id UUID,
  p_success BOOLEAN,
  p_response_status INTEGER DEFAULT NULL,
  p_response_body TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count INTEGER;
  v_max_attempts INTEGER;
  v_delays JSONB;
  v_next_delay INTEGER;
  v_subscription_id UUID;
BEGIN
  SELECT d.attempt_count + 1, d.max_attempts, COALESCE(s.retry_policy->'delays_seconds', '[60,300,1800,7200,43200]'::jsonb), d.subscription_id
  INTO v_attempt_count, v_max_attempts, v_delays, v_subscription_id
  FROM public.integration_webhook_deliveries d
  LEFT JOIN public.integration_webhook_subscriptions s ON s.id = d.subscription_id
  WHERE d.id = p_delivery_id;

  IF p_success THEN
    UPDATE public.integration_webhook_deliveries
    SET status = 'delivered', attempt_count = v_attempt_count, last_attempt_at = now(), delivered_at = now(),
        response_status = p_response_status, response_body = p_response_body, error_message = NULL
    WHERE id = p_delivery_id;
    UPDATE public.integration_webhook_subscriptions SET last_success_at = now() WHERE id = v_subscription_id;
  ELSE
    v_next_delay := COALESCE((v_delays->>(LEAST(v_attempt_count, jsonb_array_length(v_delays)) - 1))::int, 43200);
    UPDATE public.integration_webhook_deliveries
    SET status = CASE WHEN v_attempt_count >= v_max_attempts THEN 'dead_letter' ELSE 'retrying' END,
        is_dead_letter = (v_attempt_count >= v_max_attempts), attempt_count = v_attempt_count,
        last_attempt_at = now(), next_retry_at = CASE WHEN v_attempt_count >= v_max_attempts THEN NULL ELSE now() + make_interval(secs => v_next_delay) END,
        response_status = p_response_status, response_body = p_response_body, error_message = p_error_message
    WHERE id = p_delivery_id;
    UPDATE public.integration_webhook_subscriptions SET last_failure_at = now() WHERE id = v_subscription_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_replay_delivery(p_delivery_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO public.integration_webhook_deliveries (
    company_id, subscription_id, topic, event_id, payload, status, max_attempts, next_retry_at, replay_of
  )
  SELECT company_id, subscription_id, topic, event_id || ':replay:' || extract(epoch from now())::text,
         payload, 'pending', max_attempts, now(), id
  FROM public.integration_webhook_deliveries
  WHERE id = p_delivery_id
  RETURNING id INTO v_new_id;
  RETURN v_new_id;
END;
$$;

DROP TRIGGER IF EXISTS trg_integration_api_clients_updated ON public.integration_api_clients;
CREATE TRIGGER trg_integration_api_clients_updated BEFORE UPDATE ON public.integration_api_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_integration_webhook_topics_updated ON public.integration_webhook_topics;
CREATE TRIGGER trg_integration_webhook_topics_updated BEFORE UPDATE ON public.integration_webhook_topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_integration_webhook_subscriptions_updated ON public.integration_webhook_subscriptions;
CREATE TRIGGER trg_integration_webhook_subscriptions_updated BEFORE UPDATE ON public.integration_webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_integration_import_export_templates_updated ON public.integration_import_export_templates;
CREATE TRIGGER trg_integration_import_export_templates_updated BEFORE UPDATE ON public.integration_import_export_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_integration_field_mappings_updated ON public.integration_field_mappings;
CREATE TRIGGER trg_integration_field_mappings_updated BEFORE UPDATE ON public.integration_field_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_integration_connector_templates_updated ON public.integration_connector_templates;
CREATE TRIGGER trg_integration_connector_templates_updated BEFORE UPDATE ON public.integration_connector_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_integration_interface_docs_updated ON public.integration_interface_docs;
CREATE TRIGGER trg_integration_interface_docs_updated BEFORE UPDATE ON public.integration_interface_docs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_integration_master_data_sync_controls_updated ON public.integration_master_data_sync_controls;
CREATE TRIGGER trg_integration_master_data_sync_controls_updated BEFORE UPDATE ON public.integration_master_data_sync_controls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
