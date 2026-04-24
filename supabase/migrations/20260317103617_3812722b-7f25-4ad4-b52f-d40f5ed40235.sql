
-- PMO Alert Rules (configurable thresholds)
CREATE TABLE public.pmo_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  rule_name TEXT NOT NULL,
  alert_category TEXT NOT NULL DEFAULT 'general', -- budget, schedule, resource, risk, quality
  severity TEXT NOT NULL DEFAULT 'medium', -- critical, high, medium, low
  condition_type TEXT NOT NULL, -- budget_threshold, schedule_delay, resource_overalloc, risk_score, quality_gate
  threshold_value NUMERIC,
  threshold_operator TEXT DEFAULT 'gte', -- gt, gte, lt, lte, eq
  is_active BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'realtime', -- realtime, hourly, daily
  escalation_hours INTEGER DEFAULT 24,
  notification_channels TEXT[] DEFAULT ARRAY['in_app'],
  recipients JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PMO Alerts (generated alert instances)
CREATE TABLE public.pmo_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  rule_id UUID REFERENCES public.pmo_alert_rules(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  alert_category TEXT NOT NULL DEFAULT 'general',
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  metric_name TEXT,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'new', -- new, acknowledged, snoozed, resolved, dismissed, escalated
  snoozed_until TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  escalated_to UUID,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID,
  dismiss_reason TEXT,
  root_cause TEXT,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  related_entity_type TEXT,
  related_entity_id UUID,
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PMO Alert Actions (audit trail for alert responses)
CREATE TABLE public.pmo_alert_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.pmo_alerts(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL, -- acknowledge, dismiss, snooze, escalate, resolve, comment, create_task
  performed_by UUID,
  performed_by_name TEXT,
  comment TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PMO Alert Subscriptions (user preferences per alert type)
CREATE TABLE public.pmo_alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alert_category TEXT NOT NULL,
  severity_filter TEXT[] DEFAULT ARRAY['critical','high','medium','low'],
  in_app_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  email_frequency TEXT DEFAULT 'immediate', -- immediate, daily_digest, weekly_summary
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_days TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, alert_category)
);

-- Indexes
CREATE INDEX idx_pmo_alerts_company ON public.pmo_alerts(company_id);
CREATE INDEX idx_pmo_alerts_project ON public.pmo_alerts(project_id);
CREATE INDEX idx_pmo_alerts_status ON public.pmo_alerts(status);
CREATE INDEX idx_pmo_alerts_severity ON public.pmo_alerts(severity);
CREATE INDEX idx_pmo_alerts_category ON public.pmo_alerts(alert_category);
CREATE INDEX idx_pmo_alerts_created ON public.pmo_alerts(created_at DESC);
CREATE INDEX idx_pmo_alert_actions_alert ON public.pmo_alert_actions(alert_id);
CREATE INDEX idx_pmo_alert_rules_company ON public.pmo_alert_rules(company_id);

-- Enable RLS
ALTER TABLE public.pmo_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_alert_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read pmo_alert_rules" ON public.pmo_alert_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage pmo_alert_rules" ON public.pmo_alert_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read pmo_alerts" ON public.pmo_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pmo_alerts" ON public.pmo_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pmo_alerts" ON public.pmo_alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read pmo_alert_actions" ON public.pmo_alert_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pmo_alert_actions" ON public.pmo_alert_actions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users manage own subscriptions" ON public.pmo_alert_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can read all subscriptions" ON public.pmo_alert_subscriptions FOR SELECT TO authenticated USING (true);

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.pmo_alerts;
