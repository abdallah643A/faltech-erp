
-- AI insights cache for next-best-action and churn risk
CREATE TABLE IF NOT EXISTS public.crm_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner_id UUID NOT NULL REFERENCES public.business_partners(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('next_best_action', 'churn_risk')),
  recommendation TEXT,
  rationale TEXT,
  confidence NUMERIC(5,2),
  risk_score NUMERIC(5,2),
  risk_band TEXT CHECK (risk_band IN ('low', 'medium', 'high', 'critical')),
  model_used TEXT,
  inputs_snapshot JSONB,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_ai_insights_partner ON public.crm_ai_insights(business_partner_id, insight_type, generated_at DESC);

ALTER TABLE public.crm_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view AI insights"
  ON public.crm_ai_insights FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create AI insights"
  ON public.crm_ai_insights FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete AI insights"
  ON public.crm_ai_insights FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
