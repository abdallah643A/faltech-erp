
-- IMAP config for email capture
CREATE TABLE IF NOT EXISTS public.ecm_email_imap_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  config_name text NOT NULL,
  imap_host text NOT NULL,
  imap_port integer NOT NULL DEFAULT 993,
  imap_username text NOT NULL,
  imap_password_secret_name text NOT NULL DEFAULT 'IMAP_PASSWORD',
  use_ssl boolean NOT NULL DEFAULT true,
  folder text NOT NULL DEFAULT 'INBOX',
  is_enabled boolean NOT NULL DEFAULT false,
  last_polled_at timestamptz,
  last_uid integer DEFAULT 0,
  poll_interval_minutes integer NOT NULL DEFAULT 15,
  default_document_type text DEFAULT 'ap_invoice',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ecm_email_imap_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage imap config"
  ON public.ecm_email_imap_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_imap_config_updated
  BEFORE UPDATE ON public.ecm_email_imap_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('ecm-documents', 'ecm-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ocr-uploads', 'ocr-uploads', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Authenticated read ecm-documents"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'ecm-documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated upload ecm-documents"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'ecm-documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update ecm-documents"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'ecm-documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read ocr-uploads"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'ocr-uploads');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated upload ocr-uploads"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'ocr-uploads');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-compute retention_until based on retention policy
CREATE OR REPLACE FUNCTION public.apply_retention_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_years integer;
  v_legal boolean;
BEGIN
  IF NEW.retention_policy_id IS NOT NULL THEN
    SELECT retention_years, legal_hold_default
      INTO v_years, v_legal
    FROM public.ecm_retention_policies
    WHERE id = NEW.retention_policy_id;

    IF v_years IS NOT NULL THEN
      NEW.retention_until := (COALESCE(NEW.created_at, now())::date + (v_years || ' years')::interval)::date;
    END IF;
    IF v_legal IS TRUE AND NEW.legal_hold IS NOT TRUE THEN
      NEW.legal_hold := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ecm_apply_retention ON public.ecm_documents;
CREATE TRIGGER trg_ecm_apply_retention
  BEFORE INSERT OR UPDATE OF retention_policy_id ON public.ecm_documents
  FOR EACH ROW EXECUTE FUNCTION public.apply_retention_policy();

-- View: documents eligible for retention action
CREATE OR REPLACE VIEW public.v_ecm_retention_eligible AS
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
