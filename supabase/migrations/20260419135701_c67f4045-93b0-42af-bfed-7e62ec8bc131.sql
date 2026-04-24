
CREATE TABLE IF NOT EXISTS public.workflow_simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  workflow_key text NOT NULL,
  workflow_version int,
  scenario_name text,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_payload jsonb DEFAULT '{}'::jsonb,
  trace jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  duration_ms int,
  steps_executed int DEFAULT 0,
  steps_total int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_wsr_company ON public.workflow_simulation_runs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wsr_workflow ON public.workflow_simulation_runs(workflow_key, created_at DESC);

ALTER TABLE public.workflow_simulation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sim runs" ON public.workflow_simulation_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sim runs" ON public.workflow_simulation_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update own sim runs" ON public.workflow_simulation_runs FOR UPDATE TO authenticated USING (created_by = auth.uid() OR created_by IS NULL);

ALTER TABLE public.custom_form_definitions
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.report_definitions
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE TABLE IF NOT EXISTS public.lowcode_publish_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  artifact_type text NOT NULL,
  artifact_id uuid NOT NULL,
  artifact_name text,
  from_version int,
  to_version int,
  diff_summary jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid,
  requested_by_name text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid,
  decided_by_name text,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lpr_company ON public.lowcode_publish_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_lpr_artifact ON public.lowcode_publish_requests(artifact_type, artifact_id);

ALTER TABLE public.lowcode_publish_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read publish reqs" ON public.lowcode_publish_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert publish reqs" ON public.lowcode_publish_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update publish reqs" ON public.lowcode_publish_requests FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE VIEW public.v_unified_audit_search
WITH (security_invoker = true) AS
  SELECT 'ecm_document'::text AS source, d.id::text AS source_id, d.document_id::text AS entity_id,
         d.action AS action, d.user_name AS actor, d.created_at AS at, to_jsonb(d.*) AS payload
  FROM public.ecm_document_audit d
  UNION ALL
  SELECT 'signature', s.id::text, s.signature_id::text, s.event_type, s.actor_name, s.created_at, to_jsonb(s.*)
  FROM public.signature_audit_log s
  UNION ALL
  SELECT 'acct_rule', a.id::text, a.rule_id::text, a.action, a.changed_by_name, a.created_at, to_jsonb(a.*)
  FROM public.acct_rule_audit_log a
  UNION ALL
  SELECT 'lc', l.id::text, l.lc_document_id::text, l.action, l.changed_by_name, l.changed_at, to_jsonb(l.*)
  FROM public.lc_audit_logs l
  UNION ALL
  SELECT 'workflow_rule', w.id::text, w.template_id::text, w.status, NULL::text, w.created_at, to_jsonb(w.*)
  FROM public.workflow_rule_versions w;

GRANT SELECT ON public.v_unified_audit_search TO authenticated;
