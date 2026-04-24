
-- Enhance bank_pos_terminals with additional fields
ALTER TABLE public.bank_pos_terminals
  ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id),
  ADD COLUMN IF NOT EXISTS cashier_station TEXT,
  ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terminal_health TEXT DEFAULT 'healthy';

-- Enhance bank_pos_payments with reconciliation and traceability fields  
ALTER TABLE public.bank_pos_payments
  ADD COLUMN IF NOT EXISTS provider_transaction_ref TEXT,
  ADD COLUMN IF NOT EXISTS card_scheme TEXT,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS cashier_id UUID,
  ADD COLUMN IF NOT EXISTS cashier_name TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT DEFAULT 'unreconciled',
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID,
  ADD COLUMN IF NOT EXISTS settlement_ref TEXT,
  ADD COLUMN IF NOT EXISTS pos_transaction_id UUID REFERENCES public.pos_transactions(id),
  ADD COLUMN IF NOT EXISTS incoming_payment_id UUID,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'geidea';

-- Split payments table
CREATE TABLE IF NOT EXISTS public.pos_split_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_transaction_id UUID REFERENCES public.pos_transactions(id) ON DELETE CASCADE NOT NULL,
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  bank_pos_payment_id UUID REFERENCES public.bank_pos_payments(id),
  reference TEXT,
  status TEXT DEFAULT 'pending',
  card_last_four TEXT,
  auth_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pos_split_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pos_split_payments' AND policyname = 'auth_split_payments') THEN
    CREATE POLICY "auth_split_payments" ON public.pos_split_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Payment audit log
CREATE TABLE IF NOT EXISTS public.pos_payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.bank_pos_payments(id),
  pos_transaction_id UUID REFERENCES public.pos_transactions(id),
  action TEXT NOT NULL,
  action_type TEXT DEFAULT 'info',
  details JSONB DEFAULT '{}',
  performed_by UUID,
  performed_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pos_payment_audit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pos_payment_audit_log' AND policyname = 'auth_payment_audit') THEN
    CREATE POLICY "auth_payment_audit" ON public.pos_payment_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Card refunds table
CREATE TABLE IF NOT EXISTS public.pos_card_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number TEXT NOT NULL DEFAULT '',
  original_payment_id UUID REFERENCES public.bank_pos_payments(id) NOT NULL,
  pos_transaction_id UUID REFERENCES public.pos_transactions(id),
  terminal_id UUID REFERENCES public.bank_pos_terminals(id),
  provider TEXT DEFAULT 'geidea',
  refund_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'SAR',
  provider_refund_ref TEXT,
  auth_code TEXT,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  response_code TEXT,
  response_message TEXT,
  initiated_by UUID,
  initiated_by_name TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS pos_refund_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_pos_refund_number() RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.refund_number IS NULL OR NEW.refund_number = '' THEN
    NEW.refund_number := 'RFD-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('pos_refund_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_refund_number ON public.pos_card_refunds;
CREATE TRIGGER trg_refund_number BEFORE INSERT ON public.pos_card_refunds FOR EACH ROW EXECUTE FUNCTION public.generate_pos_refund_number();

ALTER TABLE public.pos_card_refunds ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pos_card_refunds' AND policyname = 'auth_card_refunds') THEN
    CREATE POLICY "auth_card_refunds" ON public.pos_card_refunds FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
