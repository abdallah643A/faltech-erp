
CREATE TABLE public.asset_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_code TEXT NOT NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  work_order_type TEXT NOT NULL DEFAULT 'corrective',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to_name TEXT,
  assigned_to_employee_id UUID REFERENCES public.employees(id),
  requested_by_name TEXT,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  parts_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  scheduled_start DATE,
  scheduled_end DATE,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  downtime_hours NUMERIC DEFAULT 0,
  failure_code TEXT,
  root_cause TEXT,
  resolution TEXT,
  sla_due_date TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.asset_work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage asset_work_orders" ON public.asset_work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
