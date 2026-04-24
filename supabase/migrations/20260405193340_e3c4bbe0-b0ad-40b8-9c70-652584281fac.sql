
-- Role-based notification rules
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL,
  category TEXT NOT NULL,
  source_module TEXT DEFAULT '__all__' NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_priority TEXT DEFAULT 'medium',
  delivery_channels TEXT[] DEFAULT ARRAY['in_app'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_key, category, source_module)
);

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notification rules"
  ON public.notification_rules FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage notification rules"
  ON public.notification_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
