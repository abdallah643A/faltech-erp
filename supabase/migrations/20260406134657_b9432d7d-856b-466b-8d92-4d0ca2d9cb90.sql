
-- =============================================
-- MODULE 1: Offline-First POS Sync
-- =============================================

CREATE TABLE public.pos_offline_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  cashier_id UUID,
  transaction_type TEXT NOT NULL DEFAULT 'sale' CHECK (transaction_type IN ('sale', 'return', 'void', 'refund', 'exchange')),
  transaction_payload JSONB NOT NULL,
  local_transaction_id TEXT NOT NULL,
  local_timestamp TIMESTAMPTZ NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'conflict')),
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  server_transaction_id UUID,
  conflict_details JSONB,
  conflict_resolution TEXT CHECK (conflict_resolution IN ('auto_resolved', 'manual_resolved', 'pending', 'discarded')),
  error_message TEXT,
  device_id TEXT,
  device_fingerprint TEXT,
  hash_checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, local_transaction_id)
);

CREATE INDEX idx_pos_offline_tx_sync ON pos_offline_transactions(sync_status, company_id);
CREATE INDEX idx_pos_offline_tx_branch ON pos_offline_transactions(branch_id, local_timestamp);

ALTER TABLE public.pos_offline_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage offline tx" ON public.pos_offline_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pos_product_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  barcode TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  tax_code TEXT,
  tax_percent NUMERIC DEFAULT 0,
  category TEXT,
  stock_quantity NUMERIC DEFAULT 0,
  unit TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  cache_version INTEGER DEFAULT 1,
  last_server_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_cache_branch ON pos_product_cache(branch_id, item_code);
CREATE INDEX idx_pos_cache_barcode ON pos_product_cache(barcode) WHERE barcode IS NOT NULL;

ALTER TABLE public.pos_product_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage product cache" ON public.pos_product_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pos_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('upload', 'download', 'reconciliation', 'full_sync')),
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
  total_records INTEGER DEFAULT 0,
  synced_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  conflict_records INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_details JSONB,
  device_id TEXT,
  initiated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view sync log" ON public.pos_sync_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- MODULE 2: Cashier Shift Reconciliation
-- =============================================

CREATE TABLE public.pos_cashier_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  cashier_id UUID NOT NULL,
  cashier_name TEXT NOT NULL,
  shift_number TEXT,
  terminal_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed', 'reconciled', 'disputed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_float NUMERIC NOT NULL DEFAULT 0,
  -- Expected totals (system-calculated)
  expected_cash NUMERIC DEFAULT 0,
  expected_card NUMERIC DEFAULT 0,
  expected_digital_wallet NUMERIC DEFAULT 0,
  expected_bank_transfer NUMERIC DEFAULT 0,
  expected_total NUMERIC DEFAULT 0,
  -- Actual counted totals
  actual_cash NUMERIC DEFAULT 0,
  actual_card NUMERIC DEFAULT 0,
  actual_digital_wallet NUMERIC DEFAULT 0,
  actual_bank_transfer NUMERIC DEFAULT 0,
  actual_total NUMERIC DEFAULT 0,
  -- Variances
  cash_variance NUMERIC DEFAULT 0,
  card_variance NUMERIC DEFAULT 0,
  total_variance NUMERIC DEFAULT 0,
  variance_status TEXT CHECK (variance_status IN ('balanced', 'over', 'short', 'within_tolerance')),
  variance_notes TEXT,
  -- Transactions summary
  total_sales_count INTEGER DEFAULT 0,
  total_sales_amount NUMERIC DEFAULT 0,
  total_returns_count INTEGER DEFAULT 0,
  total_returns_amount NUMERIC DEFAULT 0,
  total_voids_count INTEGER DEFAULT 0,
  total_voids_amount NUMERIC DEFAULT 0,
  total_discounts_amount NUMERIC DEFAULT 0,
  -- Safe drops and withdrawals
  total_safe_drops NUMERIC DEFAULT 0,
  total_withdrawals NUMERIC DEFAULT 0,
  total_payouts NUMERIC DEFAULT 0,
  -- Approval
  manager_approved BOOLEAN DEFAULT false,
  manager_id UUID,
  manager_name TEXT,
  manager_approved_at TIMESTAMPTZ,
  manager_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_shifts_branch ON pos_cashier_shifts(branch_id, opened_at DESC);
CREATE INDEX idx_pos_shifts_cashier ON pos_cashier_shifts(cashier_id, status);

ALTER TABLE public.pos_cashier_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage shifts" ON public.pos_cashier_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pos_shift_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.pos_cashier_shifts(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('safe_drop', 'withdrawal', 'payout', 'float_adjustment', 'petty_cash')),
  amount NUMERIC NOT NULL,
  reason TEXT,
  authorized_by UUID,
  authorized_by_name TEXT,
  reference_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.pos_shift_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage shift tx" ON public.pos_shift_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pos_shift_denominations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.pos_cashier_shifts(id) ON DELETE CASCADE,
  denomination_type TEXT NOT NULL CHECK (denomination_type IN ('coin', 'bill')),
  denomination_value NUMERIC NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (denomination_value * count) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_shift_denominations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage denominations" ON public.pos_shift_denominations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- MODULE 3: POS Fraud & Exception Dashboard
-- =============================================

CREATE TABLE public.pos_exception_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('void_threshold', 'refund_threshold', 'discount_threshold', 'price_override', 'split_transaction', 'repeated_failure', 'return_without_receipt', 'unusual_hours', 'custom')),
  threshold_value NUMERIC,
  threshold_period_hours INTEGER DEFAULT 24,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN DEFAULT true,
  auto_flag BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.pos_exception_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage exception rules" ON public.pos_exception_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pos_exception_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  cashier_id UUID,
  cashier_name TEXT,
  rule_id UUID REFERENCES public.pos_exception_rules(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('void', 'refund', 'discount_override', 'price_override', 'return_no_receipt', 'split_transaction', 'repeated_failure', 'manual_entry', 'suspicious_timing', 'other')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  transaction_id TEXT,
  transaction_amount NUMERIC,
  original_amount NUMERIC,
  override_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'confirmed_fraud', 'false_positive', 'resolved', 'escalated')),
  investigated_by UUID,
  investigated_by_name TEXT,
  investigated_at TIMESTAMPTZ,
  investigation_notes TEXT,
  resolution TEXT,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_exceptions_branch ON pos_exception_events(branch_id, event_timestamp DESC);
CREATE INDEX idx_pos_exceptions_cashier ON pos_exception_events(cashier_id, status);
CREATE INDEX idx_pos_exceptions_severity ON pos_exception_events(severity, status);

ALTER TABLE public.pos_exception_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage exceptions" ON public.pos_exception_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pos_cashier_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  cashier_id UUID NOT NULL,
  cashier_name TEXT NOT NULL,
  risk_score NUMERIC NOT NULL DEFAULT 0,
  void_count INTEGER DEFAULT 0,
  refund_count INTEGER DEFAULT 0,
  discount_override_count INTEGER DEFAULT 0,
  price_override_count INTEGER DEFAULT 0,
  return_no_receipt_count INTEGER DEFAULT 0,
  total_exceptions INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  last_calculated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_risk_cashier ON pos_cashier_risk_scores(cashier_id, period_start DESC);

ALTER TABLE public.pos_cashier_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage risk scores" ON public.pos_cashier_risk_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- MODULE 4: Omnichannel Order Pickup
-- =============================================

CREATE TABLE public.pos_pickup_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  order_id UUID,
  order_number TEXT NOT NULL,
  order_source TEXT NOT NULL DEFAULT 'online' CHECK (order_source IN ('online', 'phone', 'sales_rep', 'app', 'whatsapp')),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'preparing', 'ready', 'notified', 'arrived', 'verifying', 'handed_over', 'completed', 'cancelled', 'expired', 'no_show')),
  -- Items
  items JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC DEFAULT 0,
  -- Pickup details
  pickup_date DATE,
  pickup_time_from TEXT,
  pickup_time_to TEXT,
  pickup_location TEXT,
  locker_number TEXT,
  -- Verification
  verification_method TEXT DEFAULT 'otp' CHECK (verification_method IN ('otp', 'signature', 'id_check', 'qr_code', 'none')),
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_verified BOOLEAN DEFAULT false,
  signature_url TEXT,
  verified_by UUID,
  verified_by_name TEXT,
  verified_at TIMESTAMPTZ,
  -- Preparation
  prepared_by UUID,
  prepared_by_name TEXT,
  prepared_at TIMESTAMPTZ,
  preparation_notes TEXT,
  -- Handover
  handed_over_by UUID,
  handed_over_by_name TEXT,
  handed_over_at TIMESTAMPTZ,
  handover_notes TEXT,
  -- Exceptions
  exception_type TEXT CHECK (exception_type IN ('partial_stock', 'damaged', 'wrong_item', 'customer_refused', 'expired', 'other')),
  exception_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_pos_pickup_branch ON pos_pickup_orders(branch_id, status);
CREATE INDEX idx_pos_pickup_customer ON pos_pickup_orders(customer_id, status);

ALTER TABLE public.pos_pickup_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage pickup orders" ON public.pos_pickup_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pos_pickup_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pickup_order_id UUID NOT NULL REFERENCES public.pos_pickup_orders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp', 'push', 'in_app')),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('order_ready', 'reminder', 'otp', 'expiry_warning', 'cancelled', 'thank_you')),
  recipient TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_pickup_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage pickup notif" ON public.pos_pickup_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- MODULE 5: POS Returns Intelligence
-- =============================================

CREATE TABLE public.pos_return_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  return_number TEXT NOT NULL,
  original_sale_id TEXT,
  original_sale_date DATE,
  original_receipt_number TEXT,
  has_receipt BOOLEAN DEFAULT true,
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total_refund_amount NUMERIC DEFAULT 0,
  refund_method TEXT DEFAULT 'original' CHECK (refund_method IN ('original', 'cash', 'card', 'store_credit', 'exchange')),
  return_reason TEXT NOT NULL CHECK (return_reason IN ('defective', 'wrong_item', 'not_as_described', 'changed_mind', 'size_issue', 'duplicate_purchase', 'quality_issue', 'warranty', 'other')),
  reason_details TEXT,
  condition TEXT DEFAULT 'good' CHECK (condition IN ('new', 'good', 'used', 'damaged', 'defective')),
  restocking_decision TEXT DEFAULT 'restock' CHECK (restocking_decision IN ('restock', 'return_to_vendor', 'write_off', 'refurbish', 'pending')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'escalated')),
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  risk_flag TEXT CHECK (risk_flag IN ('normal', 'high_frequency', 'high_value', 'no_receipt', 'suspicious')),
  risk_score NUMERIC DEFAULT 0,
  cashier_id UUID,
  cashier_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE SEQUENCE IF NOT EXISTS pos_return_seq START 1;

CREATE INDEX idx_pos_returns_branch ON pos_return_requests(branch_id, created_at DESC);
CREATE INDEX idx_pos_returns_customer ON pos_return_requests(customer_id, status);

ALTER TABLE public.pos_return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage returns" ON public.pos_return_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pos_return_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('customer', 'item', 'branch', 'cashier', 'reason')),
  reference_id TEXT,
  reference_name TEXT,
  total_returns INTEGER DEFAULT 0,
  total_refund_amount NUMERIC DEFAULT 0,
  return_rate NUMERIC DEFAULT 0,
  top_reasons JSONB DEFAULT '[]',
  avg_days_to_return NUMERIC DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  risk_level TEXT DEFAULT 'normal' CHECK (risk_level IN ('normal', 'watch', 'high', 'block')),
  last_calculated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_patterns_type ON pos_return_patterns(pattern_type, reference_id);

ALTER TABLE public.pos_return_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage return patterns" ON public.pos_return_patterns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_pos_offline_tx_updated_at BEFORE UPDATE ON pos_offline_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pos_product_cache_updated_at BEFORE UPDATE ON pos_product_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pos_cashier_shifts_updated_at BEFORE UPDATE ON pos_cashier_shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pos_exception_rules_updated_at BEFORE UPDATE ON pos_exception_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pos_exception_events_updated_at BEFORE UPDATE ON pos_exception_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pos_risk_scores_updated_at BEFORE UPDATE ON pos_cashier_risk_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pos_pickup_orders_updated_at BEFORE UPDATE ON pos_pickup_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pos_return_requests_updated_at BEFORE UPDATE ON pos_return_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pos_return_patterns_updated_at BEFORE UPDATE ON pos_return_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate return numbers
CREATE OR REPLACE FUNCTION public.generate_pos_return_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := 'RET-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('pos_return_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_pos_return_number_trigger BEFORE INSERT ON pos_return_requests FOR EACH ROW EXECUTE FUNCTION generate_pos_return_number();
