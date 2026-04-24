
-- Enable trigram for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) DEDUPE
CREATE TABLE IF NOT EXISTS public.crm_dedupe_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  master_partner_id uuid NOT NULL,
  duplicate_partner_id uuid NOT NULL,
  score numeric(5,2) NOT NULL,
  match_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending|merged|dismissed|kept_both
  decided_by uuid,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (master_partner_id, duplicate_partner_id)
);
CREATE INDEX IF NOT EXISTS idx_dedupe_status ON public.crm_dedupe_candidates(status, created_at DESC);
ALTER TABLE public.crm_dedupe_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read dedupe" ON public.crm_dedupe_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write dedupe" ON public.crm_dedupe_candidates FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 2) SCORING
CREATE TABLE IF NOT EXISTS public.crm_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  rule_name text NOT NULL,
  description text,
  weight numeric(6,2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'fit', -- fit|behavior|engagement|recency
  condition_field text,                 -- e.g. business_partners.email_domain
  condition_operator text DEFAULT '=',  -- =, !=, in, contains, gt, lt, exists
  condition_value jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  requires_approval boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_scoring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read scoring" ON public.crm_scoring_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write scoring" ON public.crm_scoring_rules FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.crm_score_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  previous_score int,
  new_score int NOT NULL,
  delta int,
  reason text,
  triggered_by_rule_id uuid,
  triggered_by uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_score_log_partner ON public.crm_score_log(partner_id, created_at DESC);
ALTER TABLE public.crm_score_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read score log" ON public.crm_score_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert score log" ON public.crm_score_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.business_partners
  ADD COLUMN IF NOT EXISTS lead_score int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breached boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assignment_reason text,
  ADD COLUMN IF NOT EXISTS source_channel text,
  ADD COLUMN IF NOT EXISTS source_campaign text,
  ADD COLUMN IF NOT EXISTS merged_into_partner_id uuid;

CREATE INDEX IF NOT EXISTS idx_bp_lead_score ON public.business_partners(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_bp_sla_due ON public.business_partners(sla_due_at) WHERE sla_breached = false;
CREATE INDEX IF NOT EXISTS idx_bp_name_trgm ON public.business_partners USING gin (card_name gin_trgm_ops);

-- 3) SLA
CREATE TABLE IF NOT EXISTS public.crm_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  policy_name text NOT NULL,
  applies_to text NOT NULL DEFAULT 'lead', -- lead|opportunity|case
  source_channel text,                     -- nullable = any
  priority text,                           -- nullable = any
  first_response_minutes int NOT NULL DEFAULT 60,
  resolution_minutes int,
  escalate_after_minutes int,
  escalate_to_user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  priority_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sla" ON public.crm_sla_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sla" ON public.crm_sla_policies FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 4) CAPTURE SOURCES & LOG
CREATE TABLE IF NOT EXISTS public.crm_capture_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  source_name text NOT NULL,
  channel text NOT NULL,                -- web|email|whatsapp|meta_lead_ad|linkedin_lead_gen
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_secret text,
  is_active boolean NOT NULL DEFAULT true,
  last_received_at timestamptz,
  total_received int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_capture_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read capture sources" ON public.crm_capture_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write capture sources" ON public.crm_capture_sources FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.crm_capture_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.crm_capture_sources(id) ON DELETE SET NULL,
  channel text NOT NULL,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received', -- received|processed|duplicate|failed
  error_message text,
  resulting_partner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_capture_log_status ON public.crm_capture_log(status, created_at DESC);
ALTER TABLE public.crm_capture_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read capture log" ON public.crm_capture_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert capture log" ON public.crm_capture_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- 5) GEO-TAGGED VISIT EVIDENCE
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS accuracy_meters numeric,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS evidence_summary text,
  ADD COLUMN IF NOT EXISTS is_offline_synced boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS check_in_lat numeric,
  ADD COLUMN IF NOT EXISTS check_in_lng numeric,
  ADD COLUMN IF NOT EXISTS check_out_lat numeric,
  ADD COLUMN IF NOT EXISTS check_out_lng numeric;

CREATE TABLE IF NOT EXISTS public.visit_evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text,                       -- photo|document|audio|signature
  file_name text,
  mime_type text,
  size_bytes int,
  captured_lat numeric,
  captured_lng numeric,
  captured_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vef_visit ON public.visit_evidence_files(visit_id);
ALTER TABLE public.visit_evidence_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read visit evidence" ON public.visit_evidence_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write visit evidence" ON public.visit_evidence_files FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Storage bucket for visit evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('visit-evidence', 'visit-evidence', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read visit-evidence storage" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'visit-evidence');
CREATE POLICY "auth write visit-evidence storage" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'visit-evidence');
CREATE POLICY "auth update visit-evidence storage" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'visit-evidence');
