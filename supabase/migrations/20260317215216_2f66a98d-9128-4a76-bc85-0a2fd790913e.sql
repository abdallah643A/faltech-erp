
-- Invoice automation send accounts (WhatsApp & Email)
CREATE TABLE public.invoice_automation_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type TEXT NOT NULL CHECK (account_type IN ('whatsapp', 'email')),
  account_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  daily_limit INT DEFAULT 100,
  current_day_usage INT DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  config JSONB DEFAULT '{}'::jsonb,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Invoice send queue for automation & retry
CREATE TABLE public.invoice_send_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  doc_num INT,
  customer_name TEXT,
  customer_code TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  preferred_channel TEXT DEFAULT 'whatsapp' CHECK (preferred_channel IN ('whatsapp', 'email', 'both')),
  channel TEXT CHECK (channel IN ('whatsapp', 'email')),
  account_id UUID REFERENCES public.invoice_automation_accounts(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sending', 'sent', 'delivered', 'failed', 'retry', 'exhausted')),
  send_attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  last_failure_reason TEXT,
  next_retry_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  amount NUMERIC,
  message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Automation execution log
CREATE TABLE public.invoice_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT DEFAULT 'scheduled' CHECK (run_type IN ('scheduled', 'manual')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_invoices INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  retry_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  summary JSONB DEFAULT '{}'::jsonb
);

-- Automation settings
CREATE TABLE public.invoice_automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT false,
  interval_minutes INT DEFAULT 15,
  start_time TIME DEFAULT '08:00',
  end_time TIME DEFAULT '22:00',
  max_retry_attempts INT DEFAULT 5,
  retry_intervals JSONB DEFAULT '[15, 30, 60, 180, 360]'::jsonb,
  invoice_date_filter TEXT DEFAULT 'today',
  default_channel TEXT DEFAULT 'whatsapp',
  timezone TEXT DEFAULT 'Asia/Riyadh',
  log_retention_days INT DEFAULT 30,
  alert_failure_threshold NUMERIC DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO public.invoice_automation_settings (is_enabled) VALUES (false);

-- Automation alerts
CREATE TABLE public.invoice_automation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_automation_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_send_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_automation_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can manage automation accounts" ON public.invoice_automation_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage send queue" ON public.invoice_send_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view automation runs" ON public.invoice_automation_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage automation settings" ON public.invoice_automation_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage automation alerts" ON public.invoice_automation_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
