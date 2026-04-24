
-- Restaurant Management Module Schema

-- Rest Brands
CREATE TABLE public.rest_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  brand_name text NOT NULL,
  brand_name_ar text,
  logo_url text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_brands_all" ON public.rest_brands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Rest Branches
CREATE TABLE public.rest_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  brand_id uuid REFERENCES public.rest_brands(id),
  branch_name text NOT NULL,
  branch_name_ar text,
  branch_code text,
  erp_branch_id uuid,
  address text,
  city text,
  phone text,
  default_warehouse_code text,
  cost_center text,
  profit_center text,
  operating_hours jsonb DEFAULT '{}',
  default_tax_code text,
  service_charge_percent numeric(5,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_branches_all" ON public.rest_branches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Dining Areas
CREATE TABLE public.rest_dining_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.rest_branches(id) ON DELETE CASCADE,
  area_name text NOT NULL,
  area_name_ar text,
  floor_number int DEFAULT 1,
  capacity int DEFAULT 0,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_dining_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_dining_areas_all" ON public.rest_dining_areas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tables
CREATE TABLE public.rest_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid REFERENCES public.rest_dining_areas(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.rest_branches(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  seats int DEFAULT 4,
  shape text DEFAULT 'rectangle',
  pos_x numeric DEFAULT 0,
  pos_y numeric DEFAULT 0,
  status text DEFAULT 'available',
  current_order_id uuid,
  current_server text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_tables_all" ON public.rest_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_rest_tables_branch ON public.rest_tables(branch_id);
CREATE INDEX idx_rest_tables_status ON public.rest_tables(status);

-- Menu Categories
CREATE TABLE public.rest_menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  category_name text NOT NULL,
  category_name_ar text,
  parent_category_id uuid REFERENCES public.rest_menu_categories(id),
  image_url text,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  schedule jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_menu_categories_all" ON public.rest_menu_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Menu Items
CREATE TABLE public.rest_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  category_id uuid REFERENCES public.rest_menu_categories(id),
  item_name text NOT NULL,
  item_name_ar text,
  item_code text,
  erp_item_code text,
  description text,
  description_ar text,
  image_url text,
  base_price numeric(15,2) DEFAULT 0,
  cost_price numeric(15,2) DEFAULT 0,
  tax_code text,
  is_recipe_based boolean DEFAULT false,
  is_combo boolean DEFAULT false,
  is_available boolean DEFAULT true,
  is_active boolean DEFAULT true,
  variants jsonb DEFAULT '[]',
  allergens text[],
  nutrition jsonb,
  prep_time_minutes int,
  kitchen_station text,
  display_order int DEFAULT 0,
  branch_prices jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_menu_items_all" ON public.rest_menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_rest_menu_items_category ON public.rest_menu_items(category_id);
CREATE INDEX idx_rest_menu_items_code ON public.rest_menu_items(item_code);

-- Modifier Groups
CREATE TABLE public.rest_modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  group_name text NOT NULL,
  group_name_ar text,
  min_selections int DEFAULT 0,
  max_selections int DEFAULT 1,
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_modifier_groups_all" ON public.rest_modifier_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Modifier Options
CREATE TABLE public.rest_modifier_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.rest_modifier_groups(id) ON DELETE CASCADE,
  option_name text NOT NULL,
  option_name_ar text,
  price_adjustment numeric(15,2) DEFAULT 0,
  erp_item_code text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_modifier_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_modifier_options_all" ON public.rest_modifier_options FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Menu Item to Modifier Group link
CREATE TABLE public.rest_item_modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid REFERENCES public.rest_menu_items(id) ON DELETE CASCADE,
  modifier_group_id uuid REFERENCES public.rest_modifier_groups(id) ON DELETE CASCADE,
  display_order int DEFAULT 0,
  UNIQUE(menu_item_id, modifier_group_id)
);
ALTER TABLE public.rest_item_modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_item_modifier_groups_all" ON public.rest_item_modifier_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Recipes
CREATE TABLE public.rest_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid REFERENCES public.rest_menu_items(id) ON DELETE CASCADE,
  recipe_name text NOT NULL,
  version int DEFAULT 1,
  yield_qty numeric(10,3) DEFAULT 1,
  yield_uom text DEFAULT 'portion',
  prep_time_minutes int,
  instructions text,
  total_cost numeric(15,4) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_recipes_all" ON public.rest_recipes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Recipe Lines
CREATE TABLE public.rest_recipe_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES public.rest_recipes(id) ON DELETE CASCADE,
  item_code text NOT NULL,
  item_description text,
  quantity numeric(15,4) NOT NULL,
  uom text DEFAULT 'kg',
  waste_factor_percent numeric(5,2) DEFAULT 0,
  unit_cost numeric(15,4) DEFAULT 0,
  line_cost numeric(15,4) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_recipe_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_recipe_lines_all" ON public.rest_recipe_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Orders
CREATE TABLE public.rest_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  branch_id uuid REFERENCES public.rest_branches(id),
  order_number text NOT NULL,
  order_type text NOT NULL DEFAULT 'dine_in',
  table_id uuid REFERENCES public.rest_tables(id),
  customer_id uuid,
  customer_name text,
  customer_phone text,
  waiter_name text,
  cashier_name text,
  shift_id uuid,
  status text DEFAULT 'open',
  subtotal numeric(15,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  discount_percent numeric(5,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  service_charge numeric(15,2) DEFAULT 0,
  tip_amount numeric(15,2) DEFAULT 0,
  grand_total numeric(15,2) DEFAULT 0,
  notes text,
  channel text DEFAULT 'pos',
  promo_code text,
  is_held boolean DEFAULT false,
  held_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);
ALTER TABLE public.rest_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_orders_all" ON public.rest_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_rest_orders_branch ON public.rest_orders(branch_id);
CREATE INDEX idx_rest_orders_status ON public.rest_orders(status);
CREATE INDEX idx_rest_orders_date ON public.rest_orders(created_at);
CREATE INDEX idx_rest_orders_number ON public.rest_orders(order_number);

-- Order Lines
CREATE TABLE public.rest_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.rest_orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.rest_menu_items(id),
  item_name text NOT NULL,
  item_name_ar text,
  quantity numeric(10,3) DEFAULT 1,
  unit_price numeric(15,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  line_total numeric(15,2) DEFAULT 0,
  modifiers jsonb DEFAULT '[]',
  notes text,
  status text DEFAULT 'ordered',
  kitchen_station text,
  course_number int DEFAULT 1,
  is_void boolean DEFAULT false,
  void_reason text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_order_lines_all" ON public.rest_order_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_rest_order_lines_order ON public.rest_order_lines(order_id);

-- Order Payments
CREATE TABLE public.rest_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.rest_orders(id) ON DELETE CASCADE,
  payment_method text NOT NULL DEFAULT 'cash',
  amount numeric(15,2) NOT NULL DEFAULT 0,
  tip_amount numeric(15,2) DEFAULT 0,
  reference_number text,
  card_type text,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_order_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_order_payments_all" ON public.rest_order_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Shifts
CREATE TABLE public.rest_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.rest_branches(id),
  terminal_name text,
  cashier_name text NOT NULL,
  cashier_id uuid,
  status text DEFAULT 'open',
  opening_cash numeric(15,2) DEFAULT 0,
  closing_cash numeric(15,2),
  expected_cash numeric(15,2),
  over_short numeric(15,2),
  total_sales numeric(15,2) DEFAULT 0,
  total_orders int DEFAULT 0,
  total_refunds numeric(15,2) DEFAULT 0,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  approved_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_shifts_all" ON public.rest_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Shift Cash Movements
CREATE TABLE public.rest_shift_cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES public.rest_shifts(id) ON DELETE CASCADE,
  movement_type text NOT NULL,
  amount numeric(15,2) NOT NULL,
  reason text,
  performed_by text,
  approved_by text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_shift_cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_shift_cash_movements_all" ON public.rest_shift_cash_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Kitchen Tickets
CREATE TABLE public.rest_kitchen_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.rest_orders(id) ON DELETE CASCADE,
  ticket_number text,
  station text,
  status text DEFAULT 'pending',
  priority text DEFAULT 'normal',
  notes text,
  sent_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_kitchen_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_kitchen_tickets_all" ON public.rest_kitchen_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_rest_kitchen_tickets_status ON public.rest_kitchen_tickets(status);

-- Kitchen Ticket Lines
CREATE TABLE public.rest_kitchen_ticket_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.rest_kitchen_tickets(id) ON DELETE CASCADE,
  order_line_id uuid REFERENCES public.rest_order_lines(id),
  item_name text NOT NULL,
  quantity numeric(10,3) DEFAULT 1,
  modifiers jsonb DEFAULT '[]',
  notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_kitchen_ticket_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_kitchen_ticket_lines_all" ON public.rest_kitchen_ticket_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reservations
CREATE TABLE public.rest_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.rest_branches(id),
  table_id uuid REFERENCES public.rest_tables(id),
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  party_size int DEFAULT 2,
  reservation_date date NOT NULL,
  reservation_time time NOT NULL,
  duration_minutes int DEFAULT 90,
  status text DEFAULT 'confirmed',
  deposit_amount numeric(15,2) DEFAULT 0,
  special_requests text,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_reservations_all" ON public.rest_reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_rest_reservations_date ON public.rest_reservations(reservation_date);

-- Delivery Orders
CREATE TABLE public.rest_delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.rest_orders(id) ON DELETE CASCADE,
  delivery_address text NOT NULL,
  delivery_zone text,
  delivery_fee numeric(15,2) DEFAULT 0,
  rider_name text,
  rider_phone text,
  status text DEFAULT 'pending',
  dispatched_at timestamptz,
  delivered_at timestamptz,
  estimated_delivery_minutes int,
  is_cod boolean DEFAULT false,
  cod_collected boolean DEFAULT false,
  cod_amount numeric(15,2) DEFAULT 0,
  aggregator_name text,
  aggregator_order_id text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_delivery_orders_all" ON public.rest_delivery_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Waste Entries
CREATE TABLE public.rest_waste_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.rest_branches(id),
  item_code text NOT NULL,
  item_description text,
  quantity numeric(15,4) NOT NULL,
  uom text,
  unit_cost numeric(15,4) DEFAULT 0,
  total_cost numeric(15,4) DEFAULT 0,
  reason text NOT NULL,
  waste_type text DEFAULT 'spoilage',
  recorded_by text,
  approved_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_waste_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_waste_entries_all" ON public.rest_waste_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Loyalty Accounts
CREATE TABLE public.rest_loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  customer_id uuid,
  customer_name text,
  customer_phone text NOT NULL,
  points_balance numeric(15,2) DEFAULT 0,
  total_points_earned numeric(15,2) DEFAULT 0,
  total_points_redeemed numeric(15,2) DEFAULT 0,
  tier text DEFAULT 'bronze',
  total_spend numeric(15,2) DEFAULT 0,
  visit_count int DEFAULT 0,
  last_visit_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_loyalty_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_loyalty_accounts_all" ON public.rest_loyalty_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Loyalty Transactions
CREATE TABLE public.rest_loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id uuid REFERENCES public.rest_loyalty_accounts(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.rest_orders(id),
  transaction_type text NOT NULL,
  points numeric(15,2) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_loyalty_transactions_all" ON public.rest_loyalty_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Promotions
CREATE TABLE public.rest_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  promo_name text NOT NULL,
  promo_name_ar text,
  promo_type text NOT NULL DEFAULT 'percentage',
  promo_value numeric(15,2) DEFAULT 0,
  promo_code text,
  rules jsonb DEFAULT '{}',
  applicable_branches uuid[] DEFAULT '{}',
  applicable_categories uuid[] DEFAULT '{}',
  applicable_items uuid[] DEFAULT '{}',
  min_order_amount numeric(15,2) DEFAULT 0,
  max_discount numeric(15,2),
  start_date timestamptz,
  end_date timestamptz,
  schedule jsonb,
  usage_limit int,
  usage_count int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rest_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_promotions_all" ON public.rest_promotions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto order number
CREATE OR REPLACE FUNCTION public.generate_rest_order_number()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  seq_num int;
  date_str text;
BEGIN
  date_str := to_char(now(), 'YYYYMMDD');
  SELECT count(*) + 1 INTO seq_num
  FROM public.rest_orders
  WHERE order_number LIKE 'REST-' || date_str || '-%';
  NEW.order_number := 'REST-' || date_str || '-' || lpad(seq_num::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rest_order_number
BEFORE INSERT ON public.rest_orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
EXECUTE FUNCTION public.generate_rest_order_number();

-- Enable realtime for orders and kitchen tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.rest_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rest_kitchen_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rest_tables;
