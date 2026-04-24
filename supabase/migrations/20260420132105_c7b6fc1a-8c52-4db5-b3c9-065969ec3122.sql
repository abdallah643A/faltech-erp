-- Extend existing approval_templates
ALTER TABLE public.approval_templates
  ADD COLUMN IF NOT EXISTS template_name_ar TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS trigger_conditions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_sla_hours INTEGER DEFAULT 48,
  ADD COLUMN IF NOT EXISTS escalation_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS allow_delegation BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_comment_on_reject BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS public.approval_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.approval_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  approver_type TEXT NOT NULL DEFAULT 'user',
  approver_value TEXT,
  approval_mode TEXT NOT NULL DEFAULT 'any',
  sla_hours INTEGER,
  escalation_user_id UUID,
  conditions JSONB DEFAULT '{}'::jsonb,
  is_optional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_task_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  assigned_to UUID NOT NULL,
  assigned_to_name TEXT,
  delegated_from UUID,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_reference TEXT,
  workflow_run_id UUID,
  step_id UUID,
  template_id UUID REFERENCES public.approval_templates(id),
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  due_at TIMESTAMPTZ,
  sla_hours INTEGER,
  sla_breached BOOLEAN DEFAULT false,
  escalated_at TIMESTAMPTZ,
  escalated_to UUID,
  delegated_at TIMESTAMPTZ,
  delegated_to UUID,
  completed_at TIMESTAMPTZ,
  completion_action TEXT,
  completion_comment TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inbox_assigned ON public.workflow_task_inbox(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_inbox_due ON public.workflow_task_inbox(due_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_inbox_entity ON public.workflow_task_inbox(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.workflow_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  delegator_id UUID NOT NULL,
  delegator_name TEXT,
  delegate_id UUID NOT NULL,
  delegate_name TEXT,
  delegation_type TEXT NOT NULL DEFAULT 'temporary',
  scope TEXT NOT NULL DEFAULT 'all',
  scope_value TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_accept BOOLEAN DEFAULT true,
  notify_delegator BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delegations_active ON public.workflow_delegations(delegator_id, is_active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS public.workflow_escalation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.workflow_task_inbox(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL DEFAULT 1,
  escalated_from UUID,
  escalated_to UUID,
  escalation_reason TEXT,
  triggered_by TEXT DEFAULT 'sla_breach',
  notified_via TEXT[] DEFAULT ARRAY['email','in_app'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecm_retention_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  rule_name TEXT NOT NULL,
  rule_name_ar TEXT,
  document_type TEXT,
  category TEXT,
  retention_period_years INTEGER NOT NULL DEFAULT 7,
  retention_period_months INTEGER DEFAULT 0,
  action_on_expiry TEXT NOT NULL DEFAULT 'archive',
  legal_basis TEXT,
  applies_to_query JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecm_retention_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  hold_reason TEXT NOT NULL,
  hold_type TEXT NOT NULL DEFAULT 'legal',
  placed_by UUID,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_by UUID,
  released_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.ecm_ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  document_id UUID,
  file_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  ocr_text TEXT,
  extracted_fields JSONB DEFAULT '{}'::jsonb,
  language_detected TEXT,
  confidence_score NUMERIC(5,2),
  page_count INTEGER,
  processing_time_ms INTEGER,
  model_used TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ocr_status ON public.ecm_ocr_jobs(status, priority, created_at) WHERE status IN ('queued','processing');

CREATE TABLE IF NOT EXISTS public.ecm_external_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  document_id UUID,
  entity_type TEXT,
  entity_id UUID,
  share_token TEXT NOT NULL UNIQUE,
  recipient_email TEXT,
  recipient_name TEXT,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  max_views INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_allowed BOOLEAN DEFAULT true,
  watermark_enabled BOOLEAN DEFAULT true,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  notes TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shares_token ON public.ecm_external_shares(share_token) WHERE is_revoked = false;

CREATE TABLE IF NOT EXISTS public.ecm_external_share_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES public.ecm_external_shares(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  action TEXT DEFAULT 'view',
  success BOOLEAN DEFAULT true,
  details JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.ecm_signature_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  envelope_name TEXT NOT NULL,
  document_id UUID,
  entity_type TEXT,
  entity_id UUID,
  status TEXT NOT NULL DEFAULT 'draft',
  signing_order TEXT NOT NULL DEFAULT 'parallel',
  message_to_signers TEXT,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  certificate_hash TEXT,
  audit_trail_url TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecm_signature_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID NOT NULL REFERENCES public.ecm_signature_envelopes(id) ON DELETE CASCADE,
  recipient_order INTEGER NOT NULL DEFAULT 1,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT DEFAULT 'signer',
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  otp_code TEXT,
  otp_sent_at TIMESTAMPTZ,
  otp_verified_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_image_url TEXT,
  certificate_subject TEXT,
  ip_address TEXT,
  user_agent TEXT,
  decline_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecm_signature_envelope_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID REFERENCES public.ecm_signature_envelopes(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.ecm_signature_recipients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  actor_id UUID,
  actor_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_designer_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  workflow_key TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  version_label TEXT,
  definition JSONB NOT NULL,
  change_summary TEXT,
  changed_fields TEXT[],
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  published_by UUID,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_key, version_number)
);

CREATE TABLE IF NOT EXISTS public.compliance_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  module TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_reference TEXT,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  actor_role TEXT,
  ip_address TEXT,
  user_agent TEXT,
  before_state JSONB,
  after_state JSONB,
  changed_fields TEXT[],
  reason TEXT,
  risk_level TEXT DEFAULT 'low',
  compliance_tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_module ON public.compliance_audit_trail(module, entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_entity ON public.compliance_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_actor ON public.compliance_audit_trail(actor_id, created_at DESC);

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_inbox_updated ON public.workflow_task_inbox;
CREATE TRIGGER trg_inbox_updated BEFORE UPDATE ON public.workflow_task_inbox FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_delegations_updated ON public.workflow_delegations;
CREATE TRIGGER trg_delegations_updated BEFORE UPDATE ON public.workflow_delegations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_retention_rules_updated ON public.ecm_retention_rules;
CREATE TRIGGER trg_retention_rules_updated BEFORE UPDATE ON public.ecm_retention_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_ocr_jobs_updated ON public.ecm_ocr_jobs;
CREATE TRIGGER trg_ocr_jobs_updated BEFORE UPDATE ON public.ecm_ocr_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_shares_updated ON public.ecm_external_shares;
CREATE TRIGGER trg_shares_updated BEFORE UPDATE ON public.ecm_external_shares FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_envelopes_updated ON public.ecm_signature_envelopes;
CREATE TRIGGER trg_envelopes_updated BEFORE UPDATE ON public.ecm_signature_envelopes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_recipients_updated ON public.ecm_signature_recipients;
CREATE TRIGGER trg_recipients_updated BEFORE UPDATE ON public.ecm_signature_recipients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.approval_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_task_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_escalation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecm_retention_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecm_retention_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecm_ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecm_external_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecm_external_share_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecm_signature_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecm_signature_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecm_signature_envelope_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_designer_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_approval_steps" ON public.approval_template_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_inbox" ON public.workflow_task_inbox FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_delegations" ON public.workflow_delegations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_escalations" ON public.workflow_escalation_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_retention_rules" ON public.ecm_retention_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_retention_holds" ON public.ecm_retention_holds FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_ocr_jobs" ON public.ecm_ocr_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_shares" ON public.ecm_external_shares FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_share_log" ON public.ecm_external_share_access_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_envelopes" ON public.ecm_signature_envelopes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_recipients" ON public.ecm_signature_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_envelope_audit" ON public.ecm_signature_envelope_audit FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_designer_versions" ON public.workflow_designer_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_compliance_audit" ON public.compliance_audit_trail FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "public_read_active_shares" ON public.ecm_external_shares FOR SELECT TO anon USING (is_revoked = false);
CREATE POLICY "public_insert_share_log" ON public.ecm_external_share_access_log FOR INSERT TO anon WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.mark_sla_breaches()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.workflow_task_inbox
     SET sla_breached = true, updated_at = now()
   WHERE status = 'pending' AND sla_breached = false
     AND due_at IS NOT NULL AND due_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;