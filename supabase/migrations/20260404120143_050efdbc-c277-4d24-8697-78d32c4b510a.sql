
-- Smart Recommendations Engine
CREATE TABLE public.smart_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  user_id UUID,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  entity_type TEXT,
  entity_id TEXT,
  action_url TEXT,
  status TEXT DEFAULT 'pending',
  dismissed_at TIMESTAMPTZ,
  acted_at TIMESTAMPTZ,
  confidence_score NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.smart_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_smart_recommendations" ON public.smart_recommendations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_smart_rec_user ON public.smart_recommendations(user_id, status);

-- NL Assistant Conversations
CREATE TABLE public.nl_assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.nl_assistant_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_nl_conversations" ON public.nl_assistant_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.nl_assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.nl_assistant_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.nl_assistant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_nl_messages" ON public.nl_assistant_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-Reminder Rules & Logs
CREATE TABLE public.auto_reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  condition_config JSONB DEFAULT '{}',
  reminder_channels TEXT[] DEFAULT ARRAY['in_app'],
  frequency_hours INT DEFAULT 24,
  escalation_after_hours INT,
  escalation_to TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.auto_reminder_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_reminder_rules" ON public.auto_reminder_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.auto_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.auto_reminder_rules(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient_id UUID,
  recipient_info TEXT,
  message TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT now(),
  error_message TEXT
);
ALTER TABLE public.auto_reminder_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_reminder_logs" ON public.auto_reminder_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Strategic Goals
CREATE TABLE public.strategic_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  goal_name TEXT NOT NULL,
  category TEXT NOT NULL,
  period_type TEXT DEFAULT 'annual',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_value NUMERIC NOT NULL,
  actual_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'SAR',
  owner_id UUID,
  owner_name TEXT,
  status TEXT DEFAULT 'on_track',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.strategic_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_strategic_goals" ON public.strategic_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Predictive Collections Scoring
CREATE TABLE public.predictive_collection_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  invoice_id UUID,
  customer_id UUID,
  customer_name TEXT,
  invoice_number TEXT,
  invoice_amount NUMERIC,
  days_overdue INT DEFAULT 0,
  risk_score NUMERIC,
  risk_level TEXT DEFAULT 'low',
  predicted_pay_date DATE,
  delay_pattern_days INT,
  recommended_action TEXT,
  factors JSONB DEFAULT '{}',
  scored_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.predictive_collection_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_pred_collection" ON public.predictive_collection_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Predictive Project Risk Scoring
CREATE TABLE public.predictive_project_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID,
  project_name TEXT,
  overall_risk_score NUMERIC,
  risk_level TEXT DEFAULT 'low',
  schedule_risk NUMERIC DEFAULT 0,
  cost_risk NUMERIC DEFAULT 0,
  material_risk NUMERIC DEFAULT 0,
  manpower_risk NUMERIC DEFAULT 0,
  quality_risk NUMERIC DEFAULT 0,
  variation_risk NUMERIC DEFAULT 0,
  contributing_factors JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  scored_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.predictive_project_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_pred_project_risk" ON public.predictive_project_risk_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cross-Company Snapshots
CREATE TABLE public.cross_company_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  company_name TEXT,
  snapshot_date DATE NOT NULL,
  revenue NUMERIC DEFAULT 0,
  gross_profit NUMERIC DEFAULT 0,
  payroll_cost NUMERIC DEFAULT 0,
  overdue_ar NUMERIC DEFAULT 0,
  project_margin NUMERIC DEFAULT 0,
  procurement_spend NUMERIC DEFAULT 0,
  cash_position NUMERIC DEFAULT 0,
  headcount INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cross_company_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_cross_company" ON public.cross_company_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profitability Waterfall
CREATE TABLE public.profitability_waterfall_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  branch_id UUID,
  project_id UUID,
  revenue NUMERIC DEFAULT 0,
  discount_impact NUMERIC DEFAULT 0,
  cogs NUMERIC DEFAULT 0,
  procurement_variance NUMERIC DEFAULT 0,
  payroll_allocation NUMERIC DEFAULT 0,
  overhead NUMERIC DEFAULT 0,
  project_overruns NUMERIC DEFAULT 0,
  net_margin NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profitability_waterfall_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_waterfall" ON public.profitability_waterfall_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Meeting Summaries
CREATE TABLE public.meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  attendees TEXT[],
  raw_notes TEXT,
  ai_summary TEXT,
  key_decisions TEXT[],
  risks_identified TEXT[],
  linked_entity_type TEXT,
  linked_entity_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_meeting_summaries" ON public.meeting_summaries FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meeting_summaries(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  assignee_name TEXT,
  assignee_id UUID,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  linked_entity_type TEXT,
  linked_entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_meeting_actions" ON public.meeting_action_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document Classification
CREATE TABLE public.document_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  file_name TEXT NOT NULL,
  file_url TEXT,
  detected_type TEXT,
  confidence NUMERIC,
  suggested_workflow TEXT,
  routed_to TEXT,
  review_status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.document_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_doc_class" ON public.document_classifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enterprise Risk Register
CREATE TABLE public.enterprise_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  risk_title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  likelihood TEXT DEFAULT 'medium',
  impact_score NUMERIC,
  risk_score NUMERIC,
  mitigation_plan TEXT,
  owner_id UUID,
  owner_name TEXT,
  review_date DATE,
  status TEXT DEFAULT 'open',
  linked_module TEXT,
  linked_entity_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.enterprise_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_enterprise_risks" ON public.enterprise_risks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Management Decision Log
CREATE TABLE public.management_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  decision_title TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  description TEXT,
  rationale TEXT,
  decided_by UUID,
  decided_by_name TEXT,
  decision_date DATE NOT NULL,
  linked_document_type TEXT,
  linked_document_id TEXT,
  linked_document_number TEXT,
  impact_assessment TEXT,
  follow_up_actions JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  review_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.management_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_mgmt_decisions" ON public.management_decisions FOR ALL TO authenticated USING (true) WITH CHECK (true);
