-- Controlled AI and advanced analytics foundation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'controlled_ai_module') THEN
    CREATE TYPE public.controlled_ai_module AS ENUM ('finance', 'crm', 'procurement', 'cpms', 'inventory', 'hr');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'controlled_ai_capability') THEN
    CREATE TYPE public.controlled_ai_capability AS ENUM ('anomaly', 'forecast', 'narrative', 'next_best_action', 'decision_support');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'controlled_ai_status') THEN
    CREATE TYPE public.controlled_ai_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'executed', 'superseded');
  END IF;
END $$;

ALTER TABLE public.ai_copilot_suggestions
  ADD COLUMN IF NOT EXISTS draft_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS draft_entity_type text,
  ADD COLUMN IF NOT EXISTS draft_entity_id uuid,
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approved_for_execution boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS permission_scope text[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE TABLE IF NOT EXISTS public.ai_analytics_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  module public.controlled_ai_module NOT NULL,
  capability public.controlled_ai_capability NOT NULL,
  model_key text NOT NULL DEFAULT 'controlled-ai-default',
  model_version text NOT NULL DEFAULT '1.0',
  input_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  explainability_policy jsonb NOT NULL DEFAULT '{"required": true, "evidence_required": true}'::jsonb,
  permission_scope text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, module, capability, model_key, model_version)
);

CREATE TABLE IF NOT EXISTS public.ai_forecast_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  module public.controlled_ai_module NOT NULL,
  forecast_name text NOT NULL,
  horizon_start date,
  horizon_end date,
  granularity text NOT NULL DEFAULT 'monthly',
  input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  forecast_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  explanation text,
  status public.controlled_ai_status NOT NULL DEFAULT 'pending_review',
  requested_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_narrative_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  module public.controlled_ai_module NOT NULL,
  report_name text NOT NULL,
  period_start date,
  period_end date,
  narrative text NOT NULL,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  status public.controlled_ai_status NOT NULL DEFAULT 'pending_review',
  requested_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_decision_support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  module public.controlled_ai_module NOT NULL,
  case_title text NOT NULL,
  case_type text NOT NULL,
  business_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_level text NOT NULL DEFAULT 'medium',
  confidence numeric,
  draft_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.controlled_ai_status NOT NULL DEFAULT 'pending_review',
  requested_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_models_module_capability ON public.ai_analytics_models(module, capability, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_forecast_runs_company_module ON public.ai_forecast_runs(company_id, module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_narrative_reports_company_module ON public.ai_narrative_reports(company_id, module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decision_cases_company_module ON public.ai_decision_support_cases(company_id, module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_review ON public.ai_copilot_suggestions(company_id, module, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.controlled_ai_mark_approved()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    NEW.approved_for_execution = true;
  ELSIF NEW.status IN ('pending', 'rejected', 'expired') THEN
    NEW.approved_for_execution = false;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_controlled_ai_suggestion_review ON public.ai_copilot_suggestions;
CREATE TRIGGER trg_controlled_ai_suggestion_review
BEFORE UPDATE ON public.ai_copilot_suggestions
FOR EACH ROW EXECUTE FUNCTION public.controlled_ai_mark_approved();

CREATE OR REPLACE FUNCTION public.set_controlled_ai_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_models_updated ON public.ai_analytics_models;
CREATE TRIGGER trg_ai_models_updated BEFORE UPDATE ON public.ai_analytics_models FOR EACH ROW EXECUTE FUNCTION public.set_controlled_ai_updated_at();
DROP TRIGGER IF EXISTS trg_ai_forecasts_updated ON public.ai_forecast_runs;
CREATE TRIGGER trg_ai_forecasts_updated BEFORE UPDATE ON public.ai_forecast_runs FOR EACH ROW EXECUTE FUNCTION public.set_controlled_ai_updated_at();
DROP TRIGGER IF EXISTS trg_ai_narratives_updated ON public.ai_narrative_reports;
CREATE TRIGGER trg_ai_narratives_updated BEFORE UPDATE ON public.ai_narrative_reports FOR EACH ROW EXECUTE FUNCTION public.set_controlled_ai_updated_at();
DROP TRIGGER IF EXISTS trg_ai_decisions_updated ON public.ai_decision_support_cases;
CREATE TRIGGER trg_ai_decisions_updated BEFORE UPDATE ON public.ai_decision_support_cases FOR EACH ROW EXECUTE FUNCTION public.set_controlled_ai_updated_at();

ALTER TABLE public.ai_analytics_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_forecast_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_narrative_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decision_support_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view AI analytics models" ON public.ai_analytics_models;
CREATE POLICY "Authenticated users can view AI analytics models" ON public.ai_analytics_models FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage AI analytics models" ON public.ai_analytics_models;
CREATE POLICY "Authenticated users can manage AI analytics models" ON public.ai_analytics_models FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view AI forecast runs" ON public.ai_forecast_runs;
CREATE POLICY "Authenticated users can view AI forecast runs" ON public.ai_forecast_runs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage AI forecast runs" ON public.ai_forecast_runs;
CREATE POLICY "Authenticated users can manage AI forecast runs" ON public.ai_forecast_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view AI narrative reports" ON public.ai_narrative_reports;
CREATE POLICY "Authenticated users can view AI narrative reports" ON public.ai_narrative_reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage AI narrative reports" ON public.ai_narrative_reports;
CREATE POLICY "Authenticated users can manage AI narrative reports" ON public.ai_narrative_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view AI decision cases" ON public.ai_decision_support_cases;
CREATE POLICY "Authenticated users can view AI decision cases" ON public.ai_decision_support_cases FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage AI decision cases" ON public.ai_decision_support_cases;
CREATE POLICY "Authenticated users can manage AI decision cases" ON public.ai_decision_support_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);