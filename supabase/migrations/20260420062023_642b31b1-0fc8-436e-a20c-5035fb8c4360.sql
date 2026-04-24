
-- Customer Lifecycle Segments
CREATE TABLE IF NOT EXISTS public.crm_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  segment_code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  criteria JSONB DEFAULT '{}'::jsonb,
  is_dynamic BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, segment_code)
);

CREATE TABLE IF NOT EXISTS public.crm_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES public.crm_segments(id) ON DELETE CASCADE,
  business_partner_id UUID,
  card_code TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID,
  match_score NUMERIC,
  UNIQUE(segment_id, business_partner_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_segment_members_bp ON public.crm_segment_members(business_partner_id);

-- Customer 360 Timeline
CREATE TABLE IF NOT EXISTS public.crm_customer_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  business_partner_id UUID,
  card_code TEXT,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  source_module TEXT NOT NULL,
  reference_id UUID,
  reference_doc TEXT,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC,
  currency TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  performed_by UUID,
  performed_by_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_timeline_bp_occurred ON public.crm_customer_timeline(business_partner_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_timeline_module ON public.crm_customer_timeline(source_module);

-- Multilingual Message Templates
CREATE TABLE IF NOT EXISTS public.crm_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  template_code TEXT NOT NULL,
  template_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp','sms','in_app')),
  category TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','ar','ur','hi')),
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  region TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, template_code, language)
);

-- Deal Risk Signals
CREATE TABLE IF NOT EXISTS public.crm_deal_risk_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID,
  signal_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  signal_label TEXT NOT NULL,
  signal_description TEXT,
  weight NUMERIC NOT NULL DEFAULT 10,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_crm_risk_signals_opp ON public.crm_deal_risk_signals(opportunity_id, is_active);

-- Enable RLS
ALTER TABLE public.crm_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customer_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_risk_signals ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated read, authenticated write (consistent with existing CRM tables)
CREATE POLICY "auth_read_crm_segments" ON public.crm_segments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_crm_segments" ON public.crm_segments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_read_crm_segment_members" ON public.crm_segment_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_crm_segment_members" ON public.crm_segment_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_read_crm_timeline" ON public.crm_customer_timeline FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_crm_timeline" ON public.crm_customer_timeline FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_read_crm_templates" ON public.crm_message_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_crm_templates" ON public.crm_message_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_read_crm_risk" ON public.crm_deal_risk_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_crm_risk" ON public.crm_deal_risk_signals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE TRIGGER trg_crm_segments_updated BEFORE UPDATE ON public.crm_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_templates_updated BEFORE UPDATE ON public.crm_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
