
-- Notification preferences per user
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'lead_assigned', 'meeting_reminder', 'daily_digest', 'follow_up_reminder', 'deal_assigned', 'activity_assigned'
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DND schedule
CREATE TABLE public.notification_dnd_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  dnd_enabled BOOLEAN NOT NULL DEFAULT false,
  dnd_start_time TIME NOT NULL DEFAULT '22:00',
  dnd_end_time TIME NOT NULL DEFAULT '07:00',
  dnd_days TEXT[] NOT NULL DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_dnd_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own DND" ON public.notification_dnd_schedule
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Email automation rules
CREATE TABLE public.email_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'lead_created', 'lead_inactive', 'deal_stage_change', 'activity_due', 'custom_schedule'
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. { "days_inactive": 3 } or { "stage": "qualified" }
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage automation rules" ON public.email_automation_rules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Email automation execution log
CREATE TABLE public.email_automation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.email_automation_rules(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'skipped'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view automation logs" ON public.email_automation_log
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert automation logs" ON public.email_automation_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Email signatures
CREATE TABLE public.email_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  signature_html TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own signatures" ON public.email_signatures
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Email sequences for lead nurturing
CREATE TABLE public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage sequences" ON public.email_sequences
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Sequence steps
CREATE TABLE public.email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  step_order INT NOT NULL DEFAULT 1,
  delay_days INT NOT NULL DEFAULT 1,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  subject_override TEXT,
  body_override TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage sequence steps" ON public.email_sequence_steps
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Sequence enrollments
CREATE TABLE public.email_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  lead_id UUID,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  current_step INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
  next_send_at TIMESTAMPTZ,
  enrolled_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage enrollments" ON public.email_sequence_enrollments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add categories to email_templates if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_templates' AND column_name = 'category') THEN
    ALTER TABLE public.email_templates ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
END$$;

-- Update trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_dnd_updated_at BEFORE UPDATE ON public.notification_dnd_schedule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_automation_rules_updated_at BEFORE UPDATE ON public.email_automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_signatures_updated_at BEFORE UPDATE ON public.email_signatures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_sequences_updated_at BEFORE UPDATE ON public.email_sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_enrollments_updated_at BEFORE UPDATE ON public.email_sequence_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
