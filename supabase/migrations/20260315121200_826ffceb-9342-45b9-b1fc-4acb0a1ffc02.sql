
-- =====================================================
-- TRADING ENHANCEMENT: Complete Database Schema
-- =====================================================

-- 1. ORDER FULFILLMENT STATE MACHINE
CREATE TABLE public.order_fulfillment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  delivery_note_id UUID NULL,
  current_state TEXT NOT NULL DEFAULT 'draft',
  state_history JSONB DEFAULT '[]'::jsonb,
  tracking_number TEXT NULL,
  carrier_name TEXT NULL,
  shipping_label_url TEXT NULL,
  estimated_delivery DATE NULL,
  actual_delivery DATE NULL,
  shipping_address TEXT NULL,
  receiver_name TEXT NULL,
  receiver_phone TEXT NULL,
  notes TEXT NULL,
  company_id UUID REFERENCES public.sap_companies(id) NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_order_fulfillment_company ON public.order_fulfillment(company_id);
CREATE INDEX idx_order_fulfillment_state ON public.order_fulfillment(current_state);
CREATE INDEX idx_order_fulfillment_so ON public.order_fulfillment(sales_order_id);

-- Fulfillment state transition log
CREATE TABLE public.fulfillment_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id UUID REFERENCES public.order_fulfillment(id) ON DELETE CASCADE NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  transitioned_by UUID NULL,
  transitioned_by_name TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. VENDOR MANAGEMENT ANALYTICS
CREATE TABLE public.vendor_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.business_partners(id) NULL,
  vendor_name TEXT NOT NULL,
  vendor_code TEXT NULL,
  -- Metrics (auto-calculated or snapshot)
  total_orders INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  on_time_deliveries INT DEFAULT 0,
  avg_lead_time_days NUMERIC(10,2) DEFAULT 0,
  promised_lead_time_days NUMERIC(10,2) DEFAULT 0,
  reliability_score NUMERIC(5,2) DEFAULT 0,
  quality_score NUMERIC(5,2) DEFAULT 100,
  total_spend NUMERIC(18,2) DEFAULT 0,
  defect_count INT DEFAULT 0,
  return_count INT DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NULL,
  company_id UUID REFERENCES public.sap_companies(id) NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_vendor_performance_company ON public.vendor_performance(company_id);
CREATE INDEX idx_vendor_performance_vendor ON public.vendor_performance(vendor_id);

-- Vendor PO acknowledgment tracking
CREATE TABLE public.vendor_po_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.business_partners(id) NULL,
  acknowledged_at TIMESTAMPTZ NULL,
  promised_delivery_date DATE NULL,
  actual_delivery_date DATE NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT NULL,
  company_id UUID REFERENCES public.sap_companies(id) NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_vendor_po_ack_company ON public.vendor_po_acknowledgments(company_id);

-- 3. DYNAMIC PRICING & MARGIN MANAGEMENT
CREATE TABLE public.dynamic_price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NULL,
  item_code TEXT NULL,
  item_group TEXT NULL,
  cost_method TEXT DEFAULT 'wac',
  target_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 20,
  min_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  markup_percent NUMERIC(5,2) NULL,
  is_active BOOLEAN DEFAULT true,
  price_list_id UUID NULL,
  effective_from DATE NULL,
  effective_to DATE NULL,
  company_id UUID REFERENCES public.sap_companies(id) NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_dynamic_price_rules_company ON public.dynamic_price_rules(company_id);

-- Margin alerts
CREATE TABLE public.margin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NULL,
  item_description TEXT NULL,
  current_cost NUMERIC(18,2) DEFAULT 0,
  selling_price NUMERIC(18,2) DEFAULT 0,
  current_margin_percent NUMERIC(5,2) DEFAULT 0,
  threshold_margin_percent NUMERIC(5,2) DEFAULT 0,
  alert_type TEXT DEFAULT 'below_threshold',
  status TEXT DEFAULT 'active',
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL,
  rule_id UUID REFERENCES public.dynamic_price_rules(id) NULL,
  company_id UUID REFERENCES public.sap_companies(id) NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_margin_alerts_company ON public.margin_alerts(company_id);
CREATE INDEX idx_margin_alerts_status ON public.margin_alerts(status);

-- 4. SALES FORECASTING & SAFETY STOCK
CREATE TABLE public.sales_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL,
  item_description TEXT NULL,
  forecast_method TEXT DEFAULT 'sma',
  period_type TEXT DEFAULT 'monthly',
  forecast_date DATE NOT NULL,
  forecasted_qty NUMERIC(18,2) DEFAULT 0,
  actual_qty NUMERIC(18,2) NULL,
  confidence_level NUMERIC(5,2) NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  company_id UUID REFERENCES public.sap_companies(id) NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sales_forecasts_company ON public.sales_forecasts(company_id);
CREATE INDEX idx_sales_forecasts_item ON public.sales_forecasts(item_code);

-- Safety stock / reorder points
CREATE TABLE public.item_reorder_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL,
  item_description TEXT NULL,
  warehouse TEXT NULL,
  avg_daily_usage NUMERIC(18,4) DEFAULT 0,
  max_daily_usage NUMERIC(18,4) DEFAULT 0,
  avg_lead_time_days NUMERIC(10,2) DEFAULT 0,
  max_lead_time_days NUMERIC(10,2) DEFAULT 0,
  safety_stock NUMERIC(18,2) GENERATED ALWAYS AS (
    (max_daily_usage * max_lead_time_days) - (avg_daily_usage * avg_lead_time_days)
  ) STORED,
  reorder_point NUMERIC(18,2) GENERATED ALWAYS AS (
    (avg_daily_usage * avg_lead_time_days) + ((max_daily_usage * max_lead_time_days) - (avg_daily_usage * avg_lead_time_days))
  ) STORED,
  economic_order_qty NUMERIC(18,2) NULL,
  is_auto_calculated BOOLEAN DEFAULT true,
  last_calculated_at TIMESTAMPTZ NULL,
  company_id UUID REFERENCES public.sap_companies(id) NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_item_reorder_company ON public.item_reorder_config(company_id);
CREATE INDEX idx_item_reorder_item ON public.item_reorder_config(item_code);

-- 5. CUSTOMER CREDIT MANAGEMENT
CREATE TABLE public.customer_credit_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.business_partners(id) NULL,
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  approved_credit_limit NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_outstanding NUMERIC(18,2) DEFAULT 0,
  available_credit NUMERIC(18,2) GENERATED ALWAYS AS (
    approved_credit_limit - current_outstanding
  ) STORED,
  credit_status TEXT DEFAULT 'active',
  risk_level TEXT DEFAULT 'low',
  last_payment_date DATE NULL,
  avg_days_to_pay NUMERIC(10,2) NULL,
  credit_score NUMERIC(5,2) NULL,
  approved_by UUID NULL,
  approved_at TIMESTAMPTZ NULL,
  review_date DATE NULL,
  notes TEXT NULL,
  company_id UUID REFERENCES public.sap_companies(id) NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_customer_credit_company ON public.customer_credit_limits(company_id);
CREATE INDEX idx_customer_credit_customer ON public.customer_credit_limits(customer_id);

-- Credit check log
CREATE TABLE public.credit_check_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.business_partners(id) NULL,
  customer_code TEXT NULL,
  order_amount NUMERIC(18,2) DEFAULT 0,
  outstanding_before NUMERIC(18,2) DEFAULT 0,
  credit_limit NUMERIC(18,2) DEFAULT 0,
  result TEXT NOT NULL,
  blocked_reason TEXT NULL,
  override_by UUID NULL,
  override_reason TEXT NULL,
  sales_order_id UUID NULL,
  company_id UUID REFERENCES public.sap_companies(id) NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_credit_check_company ON public.credit_check_log(company_id);

-- Enable RLS on all new tables
ALTER TABLE public.order_fulfillment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_po_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_price_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.margin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_reorder_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_check_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - authenticated users can CRUD all
CREATE POLICY "Authenticated users full access" ON public.order_fulfillment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.fulfillment_state_transitions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.vendor_performance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.vendor_po_acknowledgments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.dynamic_price_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.margin_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.sales_forecasts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.item_reorder_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.customer_credit_limits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.credit_check_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
