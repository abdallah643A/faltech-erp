
-- Single-row table for SAP B1 connection settings (admin-only)
CREATE TABLE public.sap_connection_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_layer_url TEXT NOT NULL DEFAULT '',
  company_db TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sap_connection_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view SAP settings"
ON public.sap_connection_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert SAP settings"
ON public.sap_connection_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update SAP settings"
ON public.sap_connection_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sap_settings_updated_at
BEFORE UPDATE ON public.sap_connection_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
