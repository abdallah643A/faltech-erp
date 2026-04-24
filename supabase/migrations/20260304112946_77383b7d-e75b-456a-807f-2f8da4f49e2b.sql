
CREATE TABLE public.payment_means_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acct_code TEXT NOT NULL UNIQUE,
  acct_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sap_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_means_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payment means accounts"
  ON public.payment_means_accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage payment means accounts"
  ON public.payment_means_accounts FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
