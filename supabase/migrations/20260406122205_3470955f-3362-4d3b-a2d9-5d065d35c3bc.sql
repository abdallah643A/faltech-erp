
ALTER TABLE public.gl_posting_log 
  ADD COLUMN IF NOT EXISTS config_snapshot JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS candidate_rules JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.gl_posting_log.config_snapshot IS 'Snapshot of account defaults and advanced rules at posting time for historical reproducibility';
COMMENT ON COLUMN public.gl_posting_log.candidate_rules IS 'All candidate rules evaluated with match status, score, and rejection reason';
