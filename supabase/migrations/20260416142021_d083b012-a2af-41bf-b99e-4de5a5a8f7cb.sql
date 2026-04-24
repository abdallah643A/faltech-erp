-- Phase 2 & 3: Additional restaurant tables

-- Customer profiles for loyalty and CRM
CREATE TABLE public.rest_customer_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  customer_name TEXT NOT NULL,
  customer_name_ar TEXT,
  phone TEXT,
  email TEXT,
  loyalty_tier TEXT DEFAULT 'bronze',
  points_balance NUMERIC DEFAULT 0,
  total_spend NUMERIC DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  birth_date DATE,
  preferred_branch_id UUID,
  notes TEXT,
  is_corporate BOOLEAN DEFAULT false,
  corporate_name TEXT,
  vat_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Combo meal definitions
CREATE TABLE public.rest_combo_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  combo_name TEXT NOT NULL,
  combo_name_ar TEXT,
  combo_price NUMERIC NOT NULL DEFAULT 0,
  category_id UUID REFERENCES public.rest_menu_categories(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  available_from TIME,
  available_to TIME,
  available_days TEXT[], -- e.g. ['mon','tue']
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rest_combo_meal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_id UUID NOT NULL REFERENCES public.rest_combo_meals(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.rest_menu_items(id),
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  is_optional BOOLEAN DEFAULT false,
  group_name TEXT, -- e.g. 'Choose your drink'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aggregator order tracking (Talabat, Jahez, HungerStation, etc.)
CREATE TABLE public.rest_aggregator_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.rest_branches(id),
  order_id UUID REFERENCES public.rest_orders(id),
  aggregator_name TEXT NOT NULL, -- Talabat, Jahez, HungerStation, Mrsool, TheChefz
  external_order_id TEXT,
  platform_fee NUMERIC DEFAULT 0,
  commission_percent NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'received',
  received_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rider assignments for delivery
CREATE TABLE public.rest_rider_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_order_id UUID NOT NULL REFERENCES public.rest_delivery_orders(id),
  rider_name TEXT NOT NULL,
  rider_phone TEXT,
  rider_type TEXT DEFAULT 'internal', -- internal, freelance, aggregator
  assigned_at TIMESTAMPTZ DEFAULT now(),
  pickup_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  distance_km NUMERIC,
  delivery_fee NUMERIC DEFAULT 0,
  tip_amount NUMERIC DEFAULT 0,
  cod_collected NUMERIC DEFAULT 0,
  cod_reconciled BOOLEAN DEFAULT false,
  cod_reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Menu engineering analytics cache
CREATE TABLE public.rest_menu_engineering (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.rest_branches(id),
  menu_item_id UUID REFERENCES public.rest_menu_items(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  units_sold INTEGER DEFAULT 0,
  gross_revenue NUMERIC DEFAULT 0,
  food_cost NUMERIC DEFAULT 0,
  contribution_margin NUMERIC DEFAULT 0,
  margin_percent NUMERIC DEFAULT 0,
  popularity_index NUMERIC DEFAULT 0,
  classification TEXT, -- star, puzzle, plow_horse, dog
  rank_in_category INTEGER,
  computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock consumption log for theoretical vs actual
CREATE TABLE public.rest_stock_consumption_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.rest_branches(id),
  order_id UUID REFERENCES public.rest_orders(id),
  menu_item_id UUID REFERENCES public.rest_menu_items(id),
  ingredient_item_code TEXT,
  ingredient_name TEXT NOT NULL,
  theoretical_qty NUMERIC NOT NULL DEFAULT 0,
  actual_qty NUMERIC,
  uom TEXT,
  unit_cost NUMERIC DEFAULT 0,
  theoretical_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC,
  variance_qty NUMERIC GENERATED ALWAYS AS (COALESCE(actual_qty, theoretical_qty) - theoretical_qty) STORED,
  variance_cost NUMERIC GENERATED ALWAYS AS (COALESCE(actual_cost, theoretical_cost) - theoretical_cost) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Procurement suggestions
CREATE TABLE public.rest_procurement_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.rest_branches(id),
  ingredient_item_code TEXT,
  ingredient_name TEXT NOT NULL,
  current_stock NUMERIC DEFAULT 0,
  par_level NUMERIC DEFAULT 0,
  reorder_qty NUMERIC DEFAULT 0,
  avg_daily_usage NUMERIC DEFAULT 0,
  days_of_stock NUMERIC DEFAULT 0,
  suggested_vendor TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  urgency TEXT DEFAULT 'normal', -- low, normal, high, critical
  status TEXT DEFAULT 'pending', -- pending, approved, ordered, received
  pr_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.rest_customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rest_combo_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rest_combo_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rest_aggregator_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rest_rider_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rest_menu_engineering ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rest_stock_consumption_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rest_procurement_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "auth_rest_customer_profiles" ON public.rest_customer_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rest_combo_meals" ON public.rest_combo_meals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rest_combo_meal_items" ON public.rest_combo_meal_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rest_aggregator_orders" ON public.rest_aggregator_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rest_rider_assignments" ON public.rest_rider_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rest_menu_engineering" ON public.rest_menu_engineering FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rest_stock_consumption_log" ON public.rest_stock_consumption_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rest_procurement_suggestions" ON public.rest_procurement_suggestions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_rest_customer_profiles_company ON public.rest_customer_profiles(company_id);
CREATE INDEX idx_rest_customer_profiles_phone ON public.rest_customer_profiles(phone);
CREATE INDEX idx_rest_combo_meals_company ON public.rest_combo_meals(company_id);
CREATE INDEX idx_rest_aggregator_orders_company ON public.rest_aggregator_orders(company_id);
CREATE INDEX idx_rest_aggregator_orders_external ON public.rest_aggregator_orders(aggregator_name, external_order_id);
CREATE INDEX idx_rest_menu_engineering_item ON public.rest_menu_engineering(menu_item_id, period_start);
CREATE INDEX idx_rest_stock_consumption_order ON public.rest_stock_consumption_log(order_id);
CREATE INDEX idx_rest_procurement_suggestions_status ON public.rest_procurement_suggestions(status);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rest_rider_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rest_aggregator_orders;