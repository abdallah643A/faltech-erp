
-- POS Profiles (terminal configuration by branch)
CREATE TABLE IF NOT EXISTS public.pos_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  profile_name TEXT NOT NULL,
  default_warehouse_code TEXT,
  default_price_list TEXT,
  default_tax_code TEXT,
  default_customer_code TEXT DEFAULT 'WALK-IN',
  receipt_series_prefix TEXT DEFAULT 'POS',
  allow_credit_sales BOOLEAN DEFAULT false,
  allow_negative_stock BOOLEAN DEFAULT false,
  allow_manual_price BOOLEAN DEFAULT false,
  max_discount_percent NUMERIC(5,2) DEFAULT 10,
  shift_policy TEXT DEFAULT 'mandatory',
  auto_print_receipt BOOLEAN DEFAULT true,
  currency TEXT DEFAULT 'SAR',
  tax_inclusive_pricing BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- POS Hold Carts (suspended transactions)
CREATE TABLE IF NOT EXISTS public.pos_hold_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  terminal_id TEXT,
  cashier_id UUID,
  cashier_name TEXT,
  customer_code TEXT,
  customer_name TEXT DEFAULT 'Walk-in Customer',
  cart_items JSONB NOT NULL DEFAULT '[]',
  cart_total NUMERIC(18,2) DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'held',
  held_at TIMESTAMPTZ DEFAULT now(),
  resumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- POS Returns
CREATE TABLE IF NOT EXISTS public.pos_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  return_number TEXT NOT NULL,
  original_transaction_id UUID REFERENCES public.pos_transactions(id),
  original_receipt_number TEXT,
  customer_code TEXT,
  customer_name TEXT,
  return_type TEXT DEFAULT 'return',
  reason TEXT,
  subtotal NUMERIC(18,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  total NUMERIC(18,2) DEFAULT 0,
  refund_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  cashier_id UUID,
  cashier_name TEXT,
  shift_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS pos_return_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_pos_return_num()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := 'RET-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('pos_return_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_pos_return_num ON public.pos_returns;
CREATE TRIGGER trg_pos_return_num BEFORE INSERT ON public.pos_returns
FOR EACH ROW EXECUTE FUNCTION generate_pos_return_num();

-- POS Return Lines
CREATE TABLE IF NOT EXISTS public.pos_return_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES public.pos_returns(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT,
  quantity NUMERIC(18,4) DEFAULT 1,
  unit_price NUMERIC(18,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(18,2) DEFAULT 0,
  reason TEXT,
  condition TEXT DEFAULT 'good',
  restock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- POS Loyalty Accounts
CREATE TABLE IF NOT EXISTS public.pos_loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  customer_code TEXT NOT NULL,
  customer_name TEXT,
  phone TEXT,
  email TEXT,
  points_balance NUMERIC(18,2) DEFAULT 0,
  lifetime_points NUMERIC(18,2) DEFAULT 0,
  lifetime_spent NUMERIC(18,2) DEFAULT 0,
  tier TEXT DEFAULT 'standard',
  visit_count INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- POS Loyalty Ledger
CREATE TABLE IF NOT EXISTS public.pos_loyalty_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id UUID REFERENCES public.pos_loyalty_accounts(id) ON DELETE CASCADE,
  transaction_id UUID,
  entry_type TEXT NOT NULL,
  points NUMERIC(18,2) NOT NULL,
  balance_after NUMERIC(18,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- POS Approvals
CREATE TABLE IF NOT EXISTS public.pos_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  approval_type TEXT NOT NULL,
  reference_id UUID,
  reference_number TEXT,
  requested_by UUID,
  requested_by_name TEXT,
  requested_value NUMERIC(18,2),
  original_value NUMERIC(18,2),
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- POS Cash Counts (shift denomination counts)
CREATE TABLE IF NOT EXISTS public.pos_cash_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID,
  count_type TEXT DEFAULT 'closing',
  denomination NUMERIC(18,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  total NUMERIC(18,2) GENERATED ALWAYS AS (denomination * quantity) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.pos_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_hold_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_return_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_loyalty_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_cash_counts ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "auth_select_pos_profiles" ON public.pos_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_pos_profiles" ON public.pos_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select_pos_hold_carts" ON public.pos_hold_carts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_pos_hold_carts" ON public.pos_hold_carts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select_pos_returns" ON public.pos_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_pos_returns" ON public.pos_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select_pos_return_lines" ON public.pos_return_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_pos_return_lines" ON public.pos_return_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select_pos_loyalty_accounts" ON public.pos_loyalty_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_pos_loyalty_accounts" ON public.pos_loyalty_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select_pos_loyalty_ledger" ON public.pos_loyalty_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_pos_loyalty_ledger" ON public.pos_loyalty_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select_pos_approvals" ON public.pos_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_pos_approvals" ON public.pos_approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select_pos_cash_counts" ON public.pos_cash_counts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_pos_cash_counts" ON public.pos_cash_counts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_profiles_company ON public.pos_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_profiles_branch ON public.pos_profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_hold_carts_company ON public.pos_hold_carts(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_hold_carts_status ON public.pos_hold_carts(status);
CREATE INDEX IF NOT EXISTS idx_pos_returns_company ON public.pos_returns(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_returns_original ON public.pos_returns(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_pos_loyalty_customer ON public.pos_loyalty_accounts(customer_code);
CREATE INDEX IF NOT EXISTS idx_pos_approvals_status ON public.pos_approvals(status);
CREATE INDEX IF NOT EXISTS idx_pos_cash_counts_shift ON public.pos_cash_counts(shift_id);

-- Updated_at triggers
CREATE TRIGGER update_pos_profiles_updated_at BEFORE UPDATE ON public.pos_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pos_returns_updated_at BEFORE UPDATE ON public.pos_returns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pos_loyalty_accounts_updated_at BEFORE UPDATE ON public.pos_loyalty_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
