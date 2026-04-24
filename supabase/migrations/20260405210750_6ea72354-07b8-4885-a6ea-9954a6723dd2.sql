
-- Project Stock Reservations
CREATE TABLE public.project_stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  project_id UUID REFERENCES public.projects(id),
  item_id UUID REFERENCES public.items(id),
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  work_package TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  required_date DATE NOT NULL,
  reserved_qty NUMERIC NOT NULL DEFAULT 0,
  committed_qty NUMERIC NOT NULL DEFAULT 0,
  released_qty NUMERIC NOT NULL DEFAULT 0,
  shortage_qty NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'EA',
  warehouse TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  release_rule TEXT NOT NULL DEFAULT 'manual',
  auto_release_date DATE,
  notes TEXT,
  reserved_by UUID,
  released_by UUID,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_stock_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_reservations" ON public.project_stock_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_reservations" ON public.project_stock_reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_reservations" ON public.project_stock_reservations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_reservations" ON public.project_stock_reservations FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_stock_reservations_updated_at BEFORE UPDATE ON public.project_stock_reservations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stock Reservation Conflicts
CREATE TABLE public.stock_reservation_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  reservation_id UUID REFERENCES public.project_stock_reservations(id) ON DELETE CASCADE,
  conflicting_reservation_id UUID REFERENCES public.project_stock_reservations(id) ON DELETE SET NULL,
  item_code TEXT NOT NULL,
  item_description TEXT,
  conflict_type TEXT NOT NULL DEFAULT 'over_allocation',
  total_demand NUMERIC NOT NULL DEFAULT 0,
  available_stock NUMERIC NOT NULL DEFAULT 0,
  shortage NUMERIC NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'warning',
  resolution TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stock_reservation_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_conflicts" ON public.stock_reservation_conflicts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_conflicts" ON public.stock_reservation_conflicts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_conflicts" ON public.stock_reservation_conflicts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_conflicts" ON public.stock_reservation_conflicts FOR DELETE TO authenticated USING (true);
