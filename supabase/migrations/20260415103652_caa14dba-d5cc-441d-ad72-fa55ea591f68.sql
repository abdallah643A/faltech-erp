
-- Social Channels configuration
CREATE TABLE public.social_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  channel_type TEXT NOT NULL, -- whatsapp, telegram, sms, facebook, instagram, email, webhook
  channel_name TEXT NOT NULL,
  provider_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_inbound_enabled BOOLEAN DEFAULT true,
  is_outbound_enabled BOOLEAN DEFAULT true,
  webhook_url TEXT,
  default_sender TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Social Identities (customer channel handles)
CREATE TABLE public.social_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner_id UUID REFERENCES public.business_partners(id),
  contact_person_id UUID,
  lead_id UUID,
  channel_type TEXT NOT NULL,
  channel_identifier TEXT NOT NULL, -- phone number, handle, user id
  display_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  marketing_opt_in BOOLEAN DEFAULT false,
  transactional_opt_in BOOLEAN DEFAULT true,
  do_not_contact BOOLEAN DEFAULT false,
  language_preference TEXT DEFAULT 'en',
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_type, channel_identifier, company_id)
);

-- Social Conversations
CREATE TABLE public.social_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.social_channels(id),
  channel_type TEXT NOT NULL,
  external_conversation_id TEXT,
  social_identity_id UUID REFERENCES public.social_identities(id),
  business_partner_id UUID REFERENCES public.business_partners(id),
  contact_name TEXT,
  contact_identifier TEXT,
  status TEXT DEFAULT 'new', -- new, open, pending, resolved, closed, escalated
  assigned_to UUID,
  assigned_team TEXT,
  subject TEXT,
  tags TEXT[] DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INT DEFAULT 0,
  is_starred BOOLEAN DEFAULT false,
  internal_notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Social Messages
CREATE TABLE public.social_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.social_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- inbound, outbound
  sender_type TEXT NOT NULL, -- customer, agent, system
  sender_name TEXT,
  sender_user_id UUID,
  message_text TEXT,
  message_type TEXT DEFAULT 'text', -- text, image, document, audio, template, system
  attachments JSONB DEFAULT '[]'::jsonb,
  template_id UUID,
  template_variables JSONB,
  external_message_id TEXT,
  delivery_status TEXT DEFAULT 'sent', -- queued, sending, sent, delivered, read, failed
  failure_reason TEXT,
  is_internal_note BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  erp_document_type TEXT,
  erp_document_id TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Social Templates
CREATE TABLE public.social_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- sales, collections, service, marketing, logistics, reminders
  channel_type TEXT, -- null = all channels
  subject TEXT,
  body_text TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  approval_status TEXT DEFAULT 'draft', -- draft, pending_approval, approved, rejected
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Social Campaigns
CREATE TABLE public.social_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  campaign_type TEXT DEFAULT 'marketing', -- marketing, transactional
  channel_type TEXT NOT NULL,
  channel_id UUID REFERENCES public.social_channels(id),
  template_id UUID REFERENCES public.social_templates(id),
  custom_message TEXT,
  audience_criteria JSONB DEFAULT '{}'::jsonb,
  audience_count INT DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, scheduled, sending, paused, completed, cancelled
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  stats_targeted INT DEFAULT 0,
  stats_sent INT DEFAULT 0,
  stats_delivered INT DEFAULT 0,
  stats_failed INT DEFAULT 0,
  stats_replied INT DEFAULT 0,
  batch_size INT DEFAULT 50,
  throttle_per_minute INT DEFAULT 30,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign Messages (individual sends)
CREATE TABLE public.social_campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.social_campaigns(id) ON DELETE CASCADE,
  social_identity_id UUID REFERENCES public.social_identities(id),
  business_partner_id UUID,
  contact_name TEXT,
  contact_identifier TEXT,
  message_text TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed, skipped
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failure_reason TEXT,
  external_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Record Links
CREATE TABLE public.social_record_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.social_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.social_messages(id),
  record_type TEXT NOT NULL, -- business_partner, sales_order, ar_invoice, quotation, delivery, project, lead, opportunity, service_ticket
  record_id TEXT NOT NULL,
  record_label TEXT,
  is_primary BOOLEAN DEFAULT false,
  linked_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Opt-In/Out Audit
CREATE TABLE public.social_opt_in_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_identity_id UUID REFERENCES public.social_identities(id),
  channel_type TEXT NOT NULL,
  action TEXT NOT NULL, -- opt_in, opt_out
  consent_type TEXT DEFAULT 'marketing', -- marketing, transactional
  source TEXT, -- manual, api, customer_request, campaign_unsubscribe
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Message Audit Trail
CREATE TABLE public.social_message_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  user_id UUID,
  user_name TEXT,
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_record_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_opt_in_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_message_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated access)
CREATE POLICY "auth_select" ON public.social_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.social_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.social_identities FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.social_identities FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.social_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.social_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.social_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.social_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.social_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.social_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.social_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.social_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.social_campaign_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.social_campaign_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.social_record_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.social_record_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.social_opt_in_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.social_opt_in_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.social_message_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.social_message_audit FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_social_conversations_status ON public.social_conversations(status);
CREATE INDEX idx_social_conversations_channel ON public.social_conversations(channel_type);
CREATE INDEX idx_social_conversations_assigned ON public.social_conversations(assigned_to);
CREATE INDEX idx_social_conversations_bp ON public.social_conversations(business_partner_id);
CREATE INDEX idx_social_conversations_last_msg ON public.social_conversations(last_message_at DESC);
CREATE INDEX idx_social_messages_conversation ON public.social_messages(conversation_id, created_at);
CREATE INDEX idx_social_messages_direction ON public.social_messages(direction);
CREATE INDEX idx_social_identities_bp ON public.social_identities(business_partner_id);
CREATE INDEX idx_social_identities_channel ON public.social_identities(channel_type, channel_identifier);
CREATE INDEX idx_social_campaign_messages_campaign ON public.social_campaign_messages(campaign_id);
CREATE INDEX idx_social_record_links_conv ON public.social_record_links(conversation_id);
CREATE INDEX idx_social_record_links_record ON public.social_record_links(record_type, record_id);

-- Updated_at triggers
CREATE TRIGGER update_social_channels_updated_at BEFORE UPDATE ON public.social_channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_identities_updated_at BEFORE UPDATE ON public.social_identities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_conversations_updated_at BEFORE UPDATE ON public.social_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_templates_updated_at BEFORE UPDATE ON public.social_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_campaigns_updated_at BEFORE UPDATE ON public.social_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
