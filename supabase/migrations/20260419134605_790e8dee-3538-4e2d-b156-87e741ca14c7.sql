DROP VIEW IF EXISTS public.v_ecm_retention_eligible;

CREATE VIEW public.v_ecm_retention_eligible
WITH (security_invoker = true) AS
SELECT
  d.id,
  d.title,
  d.file_name,
  d.document_type,
  d.folder_id,
  d.company_id,
  d.created_at,
  d.retention_until,
  d.legal_hold,
  d.legal_hold_reason,
  d.status,
  p.policy_name,
  p.action_on_expiry,
  p.retention_years,
  (CURRENT_DATE - d.retention_until)::integer AS days_overdue
FROM public.ecm_documents d
LEFT JOIN public.ecm_retention_policies p ON p.id = d.retention_policy_id
WHERE d.retention_until IS NOT NULL
  AND d.retention_until <= CURRENT_DATE
  AND d.legal_hold = false
  AND d.status <> 'archived';

ALTER FUNCTION public.apply_retention_policy() SET search_path = public;