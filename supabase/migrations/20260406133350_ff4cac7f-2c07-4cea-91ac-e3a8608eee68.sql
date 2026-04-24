
-- =============================================
-- CUSTOMER LOYALTY WALLET TABLES
-- =============================================

-- Loyalty Programs
CREATE TABLE public.loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  description TEXT,
  points_per_currency NUMERIC NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'SAR',
  earning_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  cashback_enabled BOOLEAN DEFAULT false,
  cashback_percent NUMERIC DEFAULT 0,
  points_expiry_days INTEGER DEFAULT 365,
  min_transaction_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  branch_ids UUID[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_programs_all" ON public.loyalty_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_loyalty_programs_updated_at BEFORE UPDATE ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Loyalty Tiers
CREATE TABLE public.loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier_order INTEGER NOT NULL DEFAULT 0,
  min_points INTEGER NOT NULL DEFAULT 0,
  earning_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  cashback_multiplier NUMERIC DEFAULT 1.0,
  benefits JSONB DEFAULT '[]',
  color TEXT DEFAULT '#6B7280',
  icon TEXT DEFAULT 'Star',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_tiers_all" ON public.loyalty_tiers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customer Loyalty Wallets
CREATE TABLE public.customer_loyalty_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.business_partners(id),
  customer_code TEXT,
  customer_name TEXT NOT NULL,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  total_redeemed INTEGER NOT NULL DEFAULT 0,
  cashback_balance NUMERIC NOT NULL DEFAULT 0,
  current_tier_id UUID REFERENCES public.loyalty_tiers(id),
  total_purchases NUMERIC NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  last_redemption_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, customer_code)
);

ALTER TABLE public.customer_loyalty_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_loyalty_wallets_all" ON public.customer_loyalty_wallets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_customer_loyalty_wallets_updated_at BEFORE UPDATE ON public.customer_loyalty_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Loyalty Transactions
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  wallet_id UUID NOT NULL REFERENCES public.customer_loyalty_wallets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'expire', 'adjust', 'cashback', 'tier_bonus')),
  points INTEGER NOT NULL DEFAULT 0,
  cashback_amount NUMERIC DEFAULT 0,
  balance_after INTEGER NOT NULL DEFAULT 0,
  source_module TEXT,
  source_document_id TEXT,
  source_document_number TEXT,
  description TEXT,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_transactions_all" ON public.loyalty_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Loyalty Redemption Rules
CREATE TABLE public.loyalty_redemption_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 100,
  points_to_currency_rate NUMERIC NOT NULL DEFAULT 0.01,
  max_discount_percent NUMERIC DEFAULT 100,
  max_discount_amount NUMERIC,
  applicable_items TEXT[] DEFAULT '{}',
  applicable_categories TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_redemption_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_redemption_rules_all" ON public.loyalty_redemption_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- POS PROMOTION ENGINE TABLES
-- =============================================

-- POS Promotions
CREATE TABLE public.pos_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  description TEXT,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('bogo', 'bundle', 'category_discount', 'item_discount', 'time_based', 'customer_segment', 'min_basket', 'cashback')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'paused', 'expired', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 10,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_combinable BOOLEAN DEFAULT false,
  max_uses_total INTEGER,
  max_uses_per_customer INTEGER,
  current_uses INTEGER DEFAULT 0,
  branch_ids UUID[] DEFAULT '{}',
  customer_segment TEXT,
  min_basket_value NUMERIC DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos_promotions_all" ON public.pos_promotions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_pos_promotions_updated_at BEFORE UPDATE ON public.pos_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- POS Promotion Rules
CREATE TABLE public.pos_promotion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.pos_promotions(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('buy_x_get_y', 'percent_off', 'fixed_off', 'fixed_price', 'bundle_price')),
  buy_item_code TEXT,
  buy_item_group TEXT,
  buy_quantity INTEGER DEFAULT 1,
  get_item_code TEXT,
  get_item_group TEXT,
  get_quantity INTEGER DEFAULT 1,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  fixed_price NUMERIC,
  bundle_items JSONB DEFAULT '[]',
  bundle_price NUMERIC,
  apply_to TEXT DEFAULT 'item' CHECK (apply_to IN ('item', 'category', 'all')),
  target_item_codes TEXT[] DEFAULT '{}',
  target_categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_promotion_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos_promotion_rules_all" ON public.pos_promotion_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POS Promotion Time Conditions
CREATE TABLE public.pos_promotion_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.pos_promotions(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('time_window', 'day_of_week', 'customer_segment', 'payment_method', 'min_quantity', 'min_amount')),
  time_start TIME,
  time_end TIME,
  days_of_week INTEGER[] DEFAULT '{}',
  segment_value TEXT,
  min_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_promotion_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos_promotion_conditions_all" ON public.pos_promotion_conditions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POS Promotion Usage Tracking
CREATE TABLE public.pos_promotion_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.pos_promotions(id) ON DELETE CASCADE,
  customer_code TEXT,
  customer_name TEXT,
  invoice_id TEXT,
  invoice_number TEXT,
  discount_applied NUMERIC NOT NULL DEFAULT 0,
  items_affected JSONB DEFAULT '[]',
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_by UUID,
  branch_id UUID REFERENCES public.branches(id)
);

ALTER TABLE public.pos_promotion_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos_promotion_usage_all" ON public.pos_promotion_usage FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_loyalty_wallets_customer ON public.customer_loyalty_wallets(customer_code, program_id);
CREATE INDEX idx_loyalty_wallets_company ON public.customer_loyalty_wallets(company_id);
CREATE INDEX idx_loyalty_transactions_wallet ON public.loyalty_transactions(wallet_id);
CREATE INDEX idx_loyalty_transactions_type ON public.loyalty_transactions(transaction_type);
CREATE INDEX idx_pos_promotions_company ON public.pos_promotions(company_id);
CREATE INDEX idx_pos_promotions_status ON public.pos_promotions(status);
CREATE INDEX idx_pos_promotions_dates ON public.pos_promotions(start_date, end_date);
CREATE INDEX idx_pos_promotion_usage_promo ON public.pos_promotion_usage(promotion_id);
CREATE INDEX idx_pos_promotion_usage_customer ON public.pos_promotion_usage(customer_code);
