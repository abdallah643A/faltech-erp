
CREATE TABLE public.mail_configuration (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_name TEXT NOT NULL DEFAULT 'AlrajhiCRM',
  from_email TEXT NOT NULL DEFAULT 'onboarding@resend.dev',
  reply_to_email TEXT,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_overdue_report_enabled BOOLEAN NOT NULL DEFAULT true,
  workflow_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  escalation_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  quote_email_enabled BOOLEAN NOT NULL DEFAULT true,
  footer_text TEXT DEFAULT 'This is an automated email from AlrajhiCRM.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mail_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view mail config"
  ON public.mail_configuration FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins can update mail config"
  ON public.mail_configuration FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins can insert mail config"
  ON public.mail_configuration FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Insert default config row
INSERT INTO public.mail_configuration (from_name, from_email, footer_text)
VALUES ('AlrajhiCRM', 'onboarding@resend.dev', 'This is an automated email from AlrajhiCRM.');
