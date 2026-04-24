-- PR1: ECM versioning hardening + approval SLA/escalation/delegation + e-signature audit

-- 1) Workflow tasks: ensure dependencies + SLA columns exist
ALTER TABLE public.workflow_tasks
  ADD COLUMN IF NOT EXISTS depends_on_task_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breached boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_to_user_id uuid;

-- 2) Approval delegations (out-of-office / explicit delegation)
CREATE TABLE IF NOT EXISTS public.approval_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_user_id uuid NOT NULL,
  delegate_user_id uuid NOT NULL,
  scope text NOT NULL DEFAULT 'all',
  document_type text,
  template_id uuid,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  reason text,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (delegator_user_id <> delegate_user_id),
  CHECK (ends_at > starts_at)
);
ALTER TABLE public.approval_delegations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_approval_delegations_active
  ON public.approval_delegations(delegator_user_id, is_active, starts_at, ends_at);

DROP POLICY IF EXISTS "Authenticated can view delegations" ON public.approval_delegations;
CREATE POLICY "Authenticated can view delegations" ON public.approval_delegations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage own delegations" ON public.approval_delegations;
CREATE POLICY "Users manage own delegations" ON public.approval_delegations
  FOR ALL TO authenticated
  USING (auth.uid() = delegator_user_id)
  WITH CHECK (auth.uid() = delegator_user_id);

-- 3) Approval requests: add SLA fields
ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breached boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- 4) Approval actions: support delegated actions
ALTER TABLE public.approval_actions
  ADD COLUMN IF NOT EXISTS delegated_from_user_id uuid,
  ADD COLUMN IF NOT EXISTS delegation_id uuid;

-- 5) Digital signatures: cert hash + signed PDF + audit
ALTER TABLE public.pos_digital_signatures
  ADD COLUMN IF NOT EXISTS certificate_hash text,
  ADD COLUMN IF NOT EXISTS certificate_subject text,
  ADD COLUMN IF NOT EXISTS signed_pdf_path text,
  ADD COLUMN IF NOT EXISTS signature_algorithm text DEFAULT 'OTP-SHA256',
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip_address text;

CREATE TABLE IF NOT EXISTS public.signature_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id uuid NOT NULL REFERENCES public.pos_digital_signatures(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  actor_name text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signature_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_signature_audit_signature_id
  ON public.signature_audit_log(signature_id, created_at DESC);

DROP POLICY IF EXISTS "Authenticated read signature audit" ON public.signature_audit_log;
CREATE POLICY "Authenticated read signature audit" ON public.signature_audit_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert signature audit" ON public.signature_audit_log;
CREATE POLICY "Authenticated insert signature audit" ON public.signature_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- 6) Helper: resolve effective approver (honors active delegation)
CREATE OR REPLACE FUNCTION public.resolve_effective_approver(_original_user uuid, _document_type text DEFAULT NULL, _template_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT delegate_user_id
       FROM public.approval_delegations
       WHERE delegator_user_id = _original_user
         AND is_active = true
         AND now() BETWEEN starts_at AND ends_at
         AND (scope = 'all'
              OR (scope = 'document_type' AND document_type = _document_type)
              OR (scope = 'template' AND template_id = _template_id))
       ORDER BY (CASE scope WHEN 'template' THEN 1 WHEN 'document_type' THEN 2 ELSE 3 END), created_at DESC
       LIMIT 1),
    _original_user
  );
$$;

-- 7) ECM document retention policy
CREATE TABLE IF NOT EXISTS public.ecm_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name text NOT NULL,
  document_type text,
  folder_id uuid,
  retention_years integer NOT NULL DEFAULT 7,
  action_on_expiry text NOT NULL DEFAULT 'flag',
  legal_hold_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_retention_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage retention policies" ON public.ecm_retention_policies;
CREATE POLICY "Authenticated manage retention policies" ON public.ecm_retention_policies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.ecm_documents
  ADD COLUMN IF NOT EXISTS retention_policy_id uuid,
  ADD COLUMN IF NOT EXISTS retention_until date,
  ADD COLUMN IF NOT EXISTS legal_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_hold_reason text;

-- 8) Updated-at trigger reused
DROP TRIGGER IF EXISTS trg_approval_delegations_updated ON public.approval_delegations;
CREATE TRIGGER trg_approval_delegations_updated
  BEFORE UPDATE ON public.approval_delegations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ecm_retention_updated ON public.ecm_retention_policies;
CREATE TRIGGER trg_ecm_retention_updated
  BEFORE UPDATE ON public.ecm_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();