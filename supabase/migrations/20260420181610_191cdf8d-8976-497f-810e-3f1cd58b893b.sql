
-- ==============================================================
-- RESTAURANT ENHANCEMENTS
-- ==============================================================

-- 1. LOYALTY TIERS
CREATE TABLE public.rest_loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  tier_code TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  tier_name_ar TEXT,
  min_spend NUMERIC(15,2) NOT NULL DEFAULT 0,
  min_visits INTEGER DEFAULT 0,
  points_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  benefits JSONB DEFAULT '[]'::jsonb,
  color TEXT DEFAULT '#cd7f32',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, tier_code)
);

ALTER TABLE public.rest_loyalty_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_loyalty_tiers_all" ON public.rest_loyalty_tiers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. LOYALTY REWARDS CATALOG
CREATE TABLE public.rest_loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  reward_name TEXT NOT NULL,
  reward_name_ar TEXT,
  description TEXT,
  reward_type TEXT NOT NULL DEFAULT 'discount', -- discount | free_item | percent_off | upgrade
  points_cost INTEGER NOT NULL,
  discount_value NUMERIC(15,2) DEFAULT 0,
  free_item_id UUID,
  min_tier TEXT,
  valid_from DATE,
  valid_until DATE,
  max_redemptions_per_customer INTEGER,
  total_redeemed INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rest_loyalty_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_loyalty_rewards_all" ON public.rest_loyalty_rewards FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. LOYALTY CAMPAIGNS
CREATE TABLE public.rest_loyalty_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'birthday', -- birthday | visit_milestone | inactive | tier_upgrade
  trigger_config JSONB DEFAULT '{}'::jsonb, -- { days_inactive: 30, visit_count: 10, ... }
  reward_id UUID REFERENCES public.rest_loyalty_rewards(id),
  bonus_points INTEGER DEFAULT 0,
  message_template TEXT,
  message_template_ar TEXT,
  channel TEXT DEFAULT 'sms', -- sms | whatsapp | email | in_app
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  total_sent INTEGER DEFAULT 0,
  total_redeemed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rest_loyalty_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_loyalty_campaigns_all" ON public.rest_loyalty_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. BRANCH BENCHMARKS (period snapshots)
CREATE TABLE public.rest_branch_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.rest_branches(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue NUMERIC(15,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_covers INTEGER DEFAULT 0,
  avg_check NUMERIC(15,2) DEFAULT 0,
  food_cost_amount NUMERIC(15,2) DEFAULT 0,
  food_cost_pct NUMERIC(5,2) DEFAULT 0,
  labor_cost_amount NUMERIC(15,2) DEFAULT 0,
  labor_cost_pct NUMERIC(5,2) DEFAULT 0,
  void_amount NUMERIC(15,2) DEFAULT 0,
  void_pct NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  table_turnover NUMERIC(5,2) DEFAULT 0,
  avg_prep_time_min NUMERIC(6,2) DEFAULT 0,
  customer_satisfaction NUMERIC(3,2),
  rank_in_company INTEGER,
  computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, branch_id, period_start, period_end)
);

ALTER TABLE public.rest_branch_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_branch_benchmarks_all" ON public.rest_branch_benchmarks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. ROLE DASHBOARDS
CREATE TABLE public.rest_role_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL, -- owner | gm | chef | cashier | host | shift_lead
  role_name TEXT NOT NULL,
  role_name_ar TEXT,
  kpi_widgets JSONB DEFAULT '[]'::jsonb, -- ordered list of widget keys
  default_branch_filter TEXT DEFAULT 'all',
  refresh_interval_sec INTEGER DEFAULT 60,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, role_code)
);

ALTER TABLE public.rest_role_dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_role_dashboards_all" ON public.rest_role_dashboards FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. KDS STATION STATUS
CREATE TABLE public.rest_kds_station_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.rest_branches(id) ON DELETE CASCADE,
  station_code TEXT NOT NULL,
  station_name TEXT NOT NULL,
  status TEXT DEFAULT 'online', -- online | offline | overloaded
  current_load INTEGER DEFAULT 0,
  capacity INTEGER DEFAULT 10,
  avg_prep_time_sec INTEGER DEFAULT 0,
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, station_code)
);

ALTER TABLE public.rest_kds_station_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_kds_station_status_all" ON public.rest_kds_station_status FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. AGGREGATOR WEBHOOKS RAW LOG
CREATE TABLE public.rest_aggregator_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  provider TEXT NOT NULL, -- talabat | hungerstation | jahez | ubereats | deliveroo | other
  event_type TEXT,
  external_order_id TEXT,
  signature TEXT,
  raw_payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  aggregator_order_id UUID REFERENCES public.rest_aggregator_orders(id),
  received_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rest_agg_webhooks_provider ON public.rest_aggregator_webhooks (provider, received_at DESC);
ALTER TABLE public.rest_aggregator_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_aggregator_webhooks_all" ON public.rest_aggregator_webhooks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. RECIPE VARIANCE (theoretical vs actual)
CREATE TABLE public.rest_recipe_variance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.rest_branches(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  ingredient_item_code TEXT NOT NULL,
  ingredient_name TEXT,
  uom TEXT,
  theoretical_qty NUMERIC(15,4) DEFAULT 0,
  actual_qty NUMERIC(15,4) DEFAULT 0,
  variance_qty NUMERIC(15,4) GENERATED ALWAYS AS (actual_qty - theoretical_qty) STORED,
  variance_pct NUMERIC(8,2),
  variance_cost NUMERIC(15,2) DEFAULT 0,
  unit_cost NUMERIC(15,4) DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rest_recipe_variance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_recipe_variance_all" ON public.rest_recipe_variance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================
-- TRIGGER: Auto-deduct ingredients on order line completion
-- ==============================================================
CREATE OR REPLACE FUNCTION public.rest_auto_deduct_ingredients()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe_id UUID;
  v_line RECORD;
BEGIN
  -- Only fire when transitioning to completed/served
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('served','completed') THEN
    SELECT id INTO v_recipe_id FROM public.rest_recipes
      WHERE menu_item_id = NEW.menu_item_id AND is_active = true
      ORDER BY version DESC LIMIT 1;

    IF v_recipe_id IS NOT NULL THEN
      FOR v_line IN
        SELECT ingredient_item_code, ingredient_name, quantity, uom, unit_cost
        FROM public.rest_recipe_lines WHERE recipe_id = v_recipe_id
      LOOP
        INSERT INTO public.rest_stock_consumption_log (
          company_id, order_line_id, item_code, item_name,
          quantity, uom, unit_cost, total_cost, consumed_at
        ) VALUES (
          (SELECT company_id FROM public.rest_orders WHERE id = NEW.order_id),
          NEW.id,
          v_line.ingredient_item_code,
          v_line.ingredient_name,
          v_line.quantity * NEW.quantity,
          v_line.uom,
          v_line.unit_cost,
          v_line.quantity * NEW.quantity * COALESCE(v_line.unit_cost, 0),
          now()
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rest_auto_deduct ON public.rest_order_lines;
CREATE TRIGGER trg_rest_auto_deduct
  AFTER UPDATE ON public.rest_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.rest_auto_deduct_ingredients();

-- ==============================================================
-- FUNCTION: Compute branch benchmark snapshot
-- ==============================================================
CREATE OR REPLACE FUNCTION public.rest_compute_branch_benchmark(
  p_company_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.rest_branch_benchmarks (
    company_id, branch_id, period_start, period_end,
    total_revenue, total_orders, avg_check, food_cost_amount, food_cost_pct
  )
  SELECT
    p_company_id,
    o.branch_id,
    p_period_start,
    p_period_end,
    COALESCE(SUM(o.total_amount), 0),
    COUNT(*),
    CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(o.total_amount),0) / COUNT(*) ELSE 0 END,
    COALESCE(SUM(o.cost_total), 0),
    CASE WHEN SUM(o.total_amount) > 0
         THEN (COALESCE(SUM(o.cost_total),0) / SUM(o.total_amount)) * 100
         ELSE 0 END
  FROM public.rest_orders o
  WHERE o.company_id = p_company_id
    AND o.order_date >= p_period_start
    AND o.order_date <= p_period_end
    AND o.status IN ('completed','closed','paid')
  GROUP BY o.branch_id
  ON CONFLICT (company_id, branch_id, period_start, period_end)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_orders = EXCLUDED.total_orders,
    avg_check = EXCLUDED.avg_check,
    food_cost_amount = EXCLUDED.food_cost_amount,
    food_cost_pct = EXCLUDED.food_cost_pct,
    computed_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Rank within company
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_revenue DESC) AS rnk
    FROM public.rest_branch_benchmarks
    WHERE company_id = p_company_id
      AND period_start = p_period_start
      AND period_end = p_period_end
  )
  UPDATE public.rest_branch_benchmarks b
  SET rank_in_company = r.rnk
  FROM ranked r WHERE b.id = r.id;

  RETURN v_count;
END;
$$;

-- Update trigger for updated_at
CREATE TRIGGER trg_rest_loyalty_tiers_updated BEFORE UPDATE ON public.rest_loyalty_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rest_loyalty_rewards_updated BEFORE UPDATE ON public.rest_loyalty_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rest_loyalty_campaigns_updated BEFORE UPDATE ON public.rest_loyalty_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rest_role_dashboards_updated BEFORE UPDATE ON public.rest_role_dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rest_kds_station_status_updated BEFORE UPDATE ON public.rest_kds_station_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
