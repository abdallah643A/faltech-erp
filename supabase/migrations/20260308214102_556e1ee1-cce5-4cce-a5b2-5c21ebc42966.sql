
-- Bank POS Terminal configurations
CREATE TABLE public.bank_pos_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id text NOT NULL UNIQUE,
  terminal_name text NOT NULL,
  merchant_id text,
  provider text NOT NULL DEFAULT 'geidea',
  location text,
  branch_id uuid REFERENCES public.branches(id),
  is_active boolean DEFAULT true,
  is_mock boolean DEFAULT true,
  api_endpoint text,
  last_heartbeat_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_at timestamptz DEFAULT now()
);

-- Bank POS payment requests
CREATE TABLE public.bank_pos_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_ref text NOT NULL UNIQUE,
  terminal_id uuid REFERENCES public.bank_pos_terminals(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'pending',
  card_type text,
  card_last_four text,
  auth_code text,
  rrn text,
  response_code text,
  response_message text,
  receipt_number text,
  merchant_reference text,
  source_module text NOT NULL,
  source_document_id text,
  source_document_number text,
  customer_name text,
  initiated_by uuid,
  initiated_by_name text,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  refund_amount numeric,
  raw_response jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bank POS settings
CREATE TABLE public.bank_pos_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Default settings
INSERT INTO public.bank_pos_settings (setting_key, setting_value, description) VALUES
  ('geidea_mode', 'mock', 'API mode: mock or live'),
  ('geidea_merchant_id', '', 'Geidea Merchant ID'),
  ('geidea_api_key', '', 'Geidea API Key'),
  ('geidea_api_password', '', 'Geidea API Password'),
  ('geidea_base_url', 'https://api.merchant.geidea.net', 'Geidea API base URL'),
  ('default_terminal_id', '', 'Default terminal for payments'),
  ('auto_print_receipt', 'true', 'Auto-print receipt after successful payment'),
  ('payment_timeout_seconds', '120', 'Timeout for POS payment in seconds');

-- Default mock terminals
INSERT INTO public.bank_pos_terminals (terminal_id, terminal_name, provider, location, is_mock) VALUES
  ('GD-MOCK-001', 'Geidea Mock Terminal 1', 'geidea', 'Main Office', true),
  ('GD-MOCK-002', 'Geidea Mock Terminal 2', 'geidea', 'Branch Office', true);

-- Enable RLS
ALTER TABLE public.bank_pos_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_pos_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_pos_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_terminals" ON public.bank_pos_terminals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_terminals" ON public.bank_pos_terminals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_payments" ON public.bank_pos_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_payments" ON public.bank_pos_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_payments" ON public.bank_pos_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_settings" ON public.bank_pos_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_settings" ON public.bank_pos_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for payment status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_pos_payments;
