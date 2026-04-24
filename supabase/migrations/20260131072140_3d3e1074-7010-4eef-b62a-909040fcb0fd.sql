-- Create table for WhatsApp configuration
CREATE TABLE public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text NOT NULL,
  phone_number_id text NOT NULL,
  business_account_id text,
  webhook_url text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create table for message templates
CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  message_text text NOT NULL,
  is_default boolean DEFAULT false,
  document_type text NOT NULL CHECK (document_type IN ('ar_invoice', 'sales_order', 'quote')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create table for WhatsApp message logs
CREATE TABLE public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  document_id uuid NOT NULL,
  document_number text,
  recipient_phone text NOT NULL,
  recipient_name text,
  message_text text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  error_message text,
  whatsapp_message_id text,
  sent_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_config (admin only)
CREATE POLICY "Admins can manage WhatsApp config"
  ON public.whatsapp_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view WhatsApp config"
  ON public.whatsapp_config FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- RLS policies for whatsapp_templates
CREATE POLICY "All authenticated users can view templates"
  ON public.whatsapp_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage templates"
  ON public.whatsapp_templates FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- RLS policies for whatsapp_logs
CREATE POLICY "Users can view their own logs or all if manager/admin"
  ON public.whatsapp_logs FOR SELECT
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Authenticated users can create logs"
  ON public.whatsapp_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();