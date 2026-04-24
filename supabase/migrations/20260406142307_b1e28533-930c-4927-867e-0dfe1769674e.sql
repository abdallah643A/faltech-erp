
-- Branch Performance Benchmarking
CREATE TABLE public.pos_branch_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  period_type TEXT NOT NULL DEFAULT 'daily' CHECK (period_type IN ('daily','weekly','monthly','quarterly','yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sales NUMERIC DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  total_items_sold INTEGER DEFAULT 0,
  avg_basket_size NUMERIC DEFAULT 0,
  avg_transaction_value NUMERIC DEFAULT 0,
  gross_margin NUMERIC DEFAULT 0,
  gross_margin_pct NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  refund_count INTEGER DEFAULT 0,
  refund_amount NUMERIC DEFAULT 0,
  refund_rate NUMERIC DEFAULT 0,
  discount_count INTEGER DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  discount_rate NUMERIC DEFAULT 0,
  void_count INTEGER DEFAULT 0,
  idle_minutes NUMERIC DEFAULT 0,
  active_cashier_count INTEGER DEFAULT 0,
  sales_per_cashier NUMERIC DEFAULT 0,
  peak_hour INTEGER,
  peak_hour_sales NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_item_mix_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT,
  category TEXT,
  quantity_sold INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  margin NUMERIC DEFAULT 0,
  pct_of_total_revenue NUMERIC DEFAULT 0,
  pct_of_total_qty NUMERIC DEFAULT 0,
  avg_selling_price NUMERIC DEFAULT 0,
  return_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_branch_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  snapshot_date DATE NOT NULL,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gift Cards & Store Credit
CREATE TABLE public.pos_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  card_number TEXT NOT NULL UNIQUE,
  card_type TEXT DEFAULT 'physical' CHECK (card_type IN ('physical','digital','promotional')),
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','expired','depleted','lost','blocked')),
  issued_to_name TEXT,
  issued_to_phone TEXT,
  issued_to_email TEXT,
  issued_at_branch_id UUID REFERENCES public.branches(id),
  expiry_date DATE,
  pin_hash TEXT,
  branch_acceptance TEXT DEFAULT 'all' CHECK (branch_acceptance IN ('all','issuing_branch','region','selected')),
  accepted_branch_ids UUID[],
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  gift_card_id UUID REFERENCES public.pos_gift_cards(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('issue','recharge','redeem','expire','adjust','block','unblock')),
  amount NUMERIC NOT NULL DEFAULT 0,
  balance_before NUMERIC DEFAULT 0,
  balance_after NUMERIC DEFAULT 0,
  branch_id UUID REFERENCES public.branches(id),
  reference_doc_type TEXT,
  reference_doc_id TEXT,
  performed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_store_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  credit_amount NUMERIC NOT NULL DEFAULT 0,
  used_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC GENERATED ALWAYS AS (credit_amount - used_amount) STORED,
  currency TEXT DEFAULT 'SAR',
  reason TEXT,
  source_type TEXT CHECK (source_type IN ('return','compensation','promotion','manual','exchange')),
  source_doc_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','used','expired','cancelled')),
  expiry_date DATE,
  branch_id UUID REFERENCES public.branches(id),
  issued_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kitchen/Preparation Display
CREATE TABLE public.pos_preparation_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  station_name TEXT NOT NULL,
  station_type TEXT DEFAULT 'kitchen' CHECK (station_type IN ('kitchen','bar','assembly','packing','custom')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  avg_prep_minutes INTEGER DEFAULT 10,
  max_concurrent_orders INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_preparation_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  station_id UUID REFERENCES public.pos_preparation_stations(id),
  order_number TEXT,
  source_type TEXT DEFAULT 'pos' CHECK (source_type IN ('pos','online','phone','kiosk')),
  source_doc_id TEXT,
  customer_name TEXT,
  items JSONB DEFAULT '[]',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent','vip')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','preparing','ready','picked_up','cancelled','delayed')),
  estimated_ready_at TIMESTAMPTZ,
  actual_ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delay_reason TEXT,
  delay_minutes INTEGER DEFAULT 0,
  special_instructions TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Delivery Dispatch
CREATE TABLE public.pos_delivery_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  driver_name TEXT NOT NULL,
  phone TEXT,
  vehicle_type TEXT,
  vehicle_number TEXT,
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  max_deliveries_per_shift INTEGER DEFAULT 10,
  current_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  delivery_number TEXT,
  source_doc_type TEXT,
  source_doc_id TEXT,
  source_order_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  delivery_area TEXT,
  delivery_notes TEXT,
  driver_id UUID REFERENCES public.pos_delivery_drivers(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','assigned','picked_up','in_transit','delivered','failed','returned','cancelled')),
  delivery_charge NUMERIC DEFAULT 0,
  collection_amount NUMERIC DEFAULT 0,
  collection_status TEXT DEFAULT 'not_required' CHECK (collection_status IN ('not_required','pending','collected','failed')),
  payment_method TEXT,
  estimated_delivery_at TIMESTAMPTZ,
  actual_delivery_at TIMESTAMPTZ,
  proof_of_delivery_url TEXT,
  pod_signature_url TEXT,
  pod_photo_url TEXT,
  failure_reason TEXT,
  attempts INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS pos_delivery_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_pos_delivery_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.delivery_number IS NULL OR NEW.delivery_number = '' THEN
    NEW.delivery_number := 'DLV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('pos_delivery_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_generate_delivery_number BEFORE INSERT ON public.pos_delivery_orders FOR EACH ROW EXECUTE FUNCTION public.generate_pos_delivery_number();

-- Cross-sell / Upsell Rules
CREATE TABLE public.pos_crosssell_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  rule_name TEXT NOT NULL,
  rule_type TEXT DEFAULT 'related' CHECK (rule_type IN ('related','accessory','upgrade','bundle','service_plan','frequently_bought')),
  trigger_item_code TEXT,
  trigger_category TEXT,
  trigger_min_basket NUMERIC,
  recommended_item_code TEXT,
  recommended_item_name TEXT,
  recommended_category TEXT,
  discount_percent NUMERIC DEFAULT 0,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_to DATE,
  branch_ids UUID[],
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_crosssell_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  rule_id UUID REFERENCES public.pos_crosssell_rules(id),
  source TEXT DEFAULT 'rule' CHECK (source IN ('rule','ai','both')),
  trigger_item_code TEXT,
  recommended_item_code TEXT,
  recommended_item_name TEXT,
  was_accepted BOOLEAN DEFAULT false,
  sale_amount NUMERIC,
  cashier_id TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.pos_branch_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_item_mix_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_branch_metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_gift_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_store_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_preparation_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_preparation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_crosssell_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_crosssell_log ENABLE ROW LEVEL SECURITY;

-- Policies for all tables
CREATE POLICY "auth_select" ON public.pos_branch_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_branch_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select" ON public.pos_item_mix_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_item_mix_analysis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select" ON public.pos_branch_metric_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_branch_metric_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select" ON public.pos_gift_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_gift_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select" ON public.pos_gift_card_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_gift_card_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select" ON public.pos_store_credits FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_store_credits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select" ON public.pos_preparation_stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_preparation_stations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select" ON public.pos_preparation_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_preparation_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select" ON public.pos_delivery_drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_delivery_drivers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select" ON public.pos_delivery_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_delivery_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select" ON public.pos_crosssell_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_crosssell_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select" ON public.pos_crosssell_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_crosssell_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime for kitchen display
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_preparation_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_delivery_orders;
