-- ============================================================
-- Administration & Setup: audit + jobs + implementation tasks
-- ============================================================

-- Helper: shared updated_at trigger (re-use if exists)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ---------- 1. setup_audit_log ----------
CREATE TABLE IF NOT EXISTS public.setup_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID,
  entity_type  TEXT NOT NULL,           -- e.g. 'branch','region','period','numbering','authorization','company'
  entity_id    UUID,
  entity_label TEXT,                    -- human label for display (e.g. branch name)
  action       TEXT NOT NULL CHECK (action IN ('create','update','delete','publish','rollback','import','export')),
  changed_fields TEXT[],
  old_values   JSONB,
  new_values   JSONB,
  reason       TEXT,
  performed_by UUID,
  performed_by_name TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_setup_audit_company ON public.setup_audit_log(company_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_setup_audit_entity ON public.setup_audit_log(entity_type, entity_id);

ALTER TABLE public.setup_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "setup_audit_select" ON public.setup_audit_log;
CREATE POLICY "setup_audit_select" ON public.setup_audit_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "setup_audit_insert" ON public.setup_audit_log;
CREATE POLICY "setup_audit_insert" ON public.setup_audit_log FOR INSERT TO authenticated WITH CHECK (true);
-- intentionally no UPDATE/DELETE policy → tamper-proof

-- ---------- 2. setup_import_jobs ----------
CREATE TABLE IF NOT EXISTS public.setup_import_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID,
  job_name      TEXT NOT NULL,
  target_entity TEXT NOT NULL,          -- e.g. 'business_partners','items','chart_of_accounts'
  source_type   TEXT NOT NULL DEFAULT 'excel' CHECK (source_type IN ('excel','csv','json','sap','api')),
  source_file   TEXT,                   -- storage path or URL
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','validating','running','completed','failed','rolled_back')),
  total_rows    INTEGER DEFAULT 0,
  success_rows  INTEGER DEFAULT 0,
  failed_rows   INTEGER DEFAULT 0,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  rollback_snapshot JSONB,              -- pre-import state for rollback
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_by    UUID,
  created_by_name TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_setup_import_company ON public.setup_import_jobs(company_id, created_at DESC);

ALTER TABLE public.setup_import_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "setup_import_all" ON public.setup_import_jobs;
CREATE POLICY "setup_import_all" ON public.setup_import_jobs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS tg_setup_import_updated ON public.setup_import_jobs;
CREATE TRIGGER tg_setup_import_updated BEFORE UPDATE ON public.setup_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- 3. setup_export_jobs ----------
CREATE TABLE IF NOT EXISTS public.setup_export_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID,
  job_name      TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  format        TEXT NOT NULL DEFAULT 'xlsx' CHECK (format IN ('xlsx','csv','json','pdf')),
  filters       JSONB DEFAULT '{}'::jsonb,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','running','completed','failed')),
  row_count     INTEGER DEFAULT 0,
  download_url  TEXT,
  expires_at    TIMESTAMPTZ,
  created_by    UUID,
  created_by_name TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_setup_export_company ON public.setup_export_jobs(company_id, created_at DESC);

ALTER TABLE public.setup_export_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "setup_export_all" ON public.setup_export_jobs;
CREATE POLICY "setup_export_all" ON public.setup_export_jobs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS tg_setup_export_updated ON public.setup_export_jobs;
CREATE TRIGGER tg_setup_export_updated BEFORE UPDATE ON public.setup_export_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- 4. setup_implementation_tasks ----------
CREATE TABLE IF NOT EXISTS public.setup_implementation_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID,
  category      TEXT NOT NULL,          -- 'company','financials','users','data','integrations','training','golive'
  title         TEXT NOT NULL,
  title_ar      TEXT,
  description   TEXT,
  description_ar TEXT,
  owner_id      UUID,
  owner_name    TEXT,
  due_date      DATE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','blocked','completed','skipped')),
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  blockers      TEXT,
  completion_notes TEXT,
  completed_at  TIMESTAMPTZ,
  completed_by  UUID,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_setup_impl_company ON public.setup_implementation_tasks(company_id, category, sort_order);

ALTER TABLE public.setup_implementation_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "setup_impl_all" ON public.setup_implementation_tasks;
CREATE POLICY "setup_impl_all" ON public.setup_implementation_tasks FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS tg_setup_impl_updated ON public.setup_implementation_tasks;
CREATE TRIGGER tg_setup_impl_updated BEFORE UPDATE ON public.setup_implementation_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();