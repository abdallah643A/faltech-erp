-- ============ LEADS ============
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  lead_code TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  job_title TEXT,
  country_code TEXT,
  city TEXT,
  channel TEXT NOT NULL DEFAULT 'manual', -- web_form|email|whatsapp|manual|meta_lead_ad|linkedin_lead_gen|api
  source TEXT,
  campaign TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_term TEXT, utm_content TEXT,
  language TEXT DEFAULT 'en',
  consent_email BOOLEAN DEFAULT false,
  consent_sms BOOLEAN DEFAULT false,
  consent_whatsapp BOOLEAN DEFAULT false,
  consent_call BOOLEAN DEFAULT false,
  territory_id UUID REFERENCES public.crm_territories(id),
  pipeline_id UUID REFERENCES public.crm_regional_pipelines(id),
  status TEXT NOT NULL DEFAULT 'new', -- new|assigned|working|qualified|disqualified|converted
  qualification_reason TEXT,
  score INT NOT NULL DEFAULT 0,
  rule_score INT NOT NULL DEFAULT 0,
  ai_score INT NOT NULL DEFAULT 0,
  ai_score_explanation TEXT,
  grade TEXT, -- A|B|C|D
  assigned_to UUID,
  assigned_to_name TEXT,
  assigned_at TIMESTAMPTZ,
  sla_first_response_due TIMESTAMPTZ,
  first_responded_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  converted_opportunity_id UUID REFERENCES public.opportunities(id),
  converted_business_partner_id UUID REFERENCES public.business_partners(id),
  converted_at TIMESTAMPTZ,
  raw_payload JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_to ON public.crm_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_leads_channel ON public.crm_leads(channel);
CREATE INDEX IF NOT EXISTS idx_crm_leads_company ON public.crm_leads(company_id);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_leads read" ON public.crm_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_leads insert" ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_leads update" ON public.crm_leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_leads delete" ON public.crm_leads FOR DELETE TO authenticated USING (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')
);

-- ============ LEAD ACTIVITIES ============
CREATE TABLE IF NOT EXISTS public.crm_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- email_in|email_out|call|whatsapp|note|status_change|assignment|score_change|sla
  direction TEXT, -- in|out
  subject TEXT,
  body TEXT,
  metadata JSONB,
  performed_by UUID,
  performed_by_name TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_lead ON public.crm_lead_activities(lead_id, occurred_at DESC);
ALTER TABLE public.crm_lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_lead_activities all" ON public.crm_lead_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ SCORING SIGNALS ============
CREATE TABLE IF NOT EXISTS public.crm_lead_scoring_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- rule|ai
  rule_id UUID,
  signal_name TEXT NOT NULL,
  weight INT NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_lead_scoring_signals_lead ON public.crm_lead_scoring_signals(lead_id);
ALTER TABLE public.crm_lead_scoring_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_lead_scoring_signals all" ON public.crm_lead_scoring_signals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ SLA / ASSIGNMENT RULES ============
CREATE TABLE IF NOT EXISTS public.crm_sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 100,
  -- conditions
  channel TEXT,           -- null = any
  source TEXT,
  territory_id UUID REFERENCES public.crm_territories(id),
  min_score INT,
  -- routing
  routing_strategy TEXT NOT NULL DEFAULT 'round_robin', -- round_robin|load_balanced|owner_of_territory|specific_user
  specific_user_id UUID,
  eligible_user_ids UUID[],
  -- SLA
  first_response_minutes INT NOT NULL DEFAULT 60,
  qualification_hours INT NOT NULL DEFAULT 48,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_sla_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_sla_rules read" ON public.crm_sla_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_sla_rules manage" ON public.crm_sla_rules FOR ALL TO authenticated USING (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')
) WITH CHECK (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')
);

-- ============ ASSIGNMENT QUEUE ============
CREATE TABLE IF NOT EXISTS public.crm_assignment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|processed|failed
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  matched_rule_id UUID REFERENCES public.crm_sla_rules(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_assignment_queue_status ON public.crm_assignment_queue(status);
ALTER TABLE public.crm_assignment_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_assignment_queue all" ON public.crm_assignment_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ PARTNER REFERRALS ============
CREATE TABLE IF NOT EXISTS public.crm_partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_business_partner_id UUID REFERENCES public.business_partners(id),
  partner_name TEXT NOT NULL,
  partner_contact_email TEXT,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  referral_code TEXT,
  commission_pct NUMERIC(5,2) DEFAULT 0,
  commission_amount NUMERIC(18,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted|accepted|rejected|paid
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_partner_referrals_partner ON public.crm_partner_referrals(partner_business_partner_id);
ALTER TABLE public.crm_partner_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_partner_referrals read" ON public.crm_partner_referrals FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_partner_referrals manage" ON public.crm_partner_referrals FOR ALL TO authenticated USING (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') OR has_role(auth.uid(),'sales_rep')
) WITH CHECK (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') OR has_role(auth.uid(),'sales_rep')
);

-- ============ NEXT BEST ACTIONS ============
CREATE TABLE IF NOT EXISTS public.crm_next_best_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- lead|opportunity|account
  entity_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- call|email|whatsapp|meeting|send_quote|nurture|escalate
  title TEXT NOT NULL,
  rationale TEXT,
  priority TEXT NOT NULL DEFAULT 'medium', -- low|medium|high|urgent
  confidence NUMERIC(3,2) DEFAULT 0.5,
  due_at TIMESTAMPTZ,
  assigned_to UUID,
  assigned_to_name TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open|done|dismissed|snoozed
  source TEXT NOT NULL DEFAULT 'ai', -- ai|rule|manual
  generated_by_run_id UUID,
  metadata JSONB,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_nba_entity ON public.crm_next_best_actions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_nba_status ON public.crm_next_best_actions(status);
ALTER TABLE public.crm_next_best_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_nba all" ON public.crm_next_best_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ Extend opportunities ============
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.crm_leads(id),
  ADD COLUMN IF NOT EXISTS partner_referral_id UUID REFERENCES public.crm_partner_referrals(id),
  ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'prospect'; -- prospect|active|champion|at_risk|lost|reengage

-- updated_at triggers
CREATE TRIGGER trg_crm_leads_updated BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_sla_rules_updated BEFORE UPDATE ON public.crm_sla_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_partner_referrals_updated BEFORE UPDATE ON public.crm_partner_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_nba_updated BEFORE UPDATE ON public.crm_next_best_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();