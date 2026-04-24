
CREATE TABLE public.inventory_aging_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  item_id UUID REFERENCES public.items(id),
  item_code TEXT NOT NULL,
  item_description TEXT,
  warehouse TEXT,
  current_qty NUMERIC NOT NULL DEFAULT 0,
  last_movement_date DATE,
  last_movement_type TEXT,
  days_since_movement INTEGER DEFAULT 0,
  aging_category TEXT NOT NULL DEFAULT 'active',
  unit_cost NUMERIC DEFAULT 0,
  carrying_cost NUMERIC DEFAULT 0,
  excess_qty NUMERIC DEFAULT 0,
  projected_monthly_demand NUMERIC DEFAULT 0,
  months_of_supply NUMERIC DEFAULT 0,
  reorder_point NUMERIC DEFAULT 0,
  suggested_action TEXT DEFAULT 'keep',
  action_status TEXT DEFAULT 'pending',
  action_notes TEXT,
  action_taken_by UUID,
  action_taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory_aging_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_aging" ON public.inventory_aging_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_aging" ON public.inventory_aging_analysis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_aging" ON public.inventory_aging_analysis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_aging" ON public.inventory_aging_analysis FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_aging_updated_at BEFORE UPDATE ON public.inventory_aging_analysis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dead_stock_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  aging_analysis_id UUID REFERENCES public.inventory_aging_analysis(id) ON DELETE SET NULL,
  item_code TEXT NOT NULL,
  item_description TEXT,
  action_type TEXT NOT NULL DEFAULT 'transfer',
  from_warehouse TEXT,
  to_warehouse TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  target_price NUMERIC DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dead_stock_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_dsa" ON public.dead_stock_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_dsa" ON public.dead_stock_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_dsa" ON public.dead_stock_actions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_dsa" ON public.dead_stock_actions FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_dsa_updated_at BEFORE UPDATE ON public.dead_stock_actions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
