
CREATE TABLE public.pos_checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  branch_id UUID,
  template_name TEXT NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'opening',
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pos_checklist_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.pos_checklist_templates(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  requires_count BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pos_checklist_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  branch_id UUID,
  terminal_id UUID,
  template_id UUID REFERENCES public.pos_checklist_templates(id) ON DELETE SET NULL,
  shift_id UUID,
  shift_type TEXT NOT NULL DEFAULT 'opening',
  cashier_name TEXT,
  performed_by UUID,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pos_checklist_run_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.pos_checklist_runs(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES public.pos_checklist_template_items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  count_value NUMERIC,
  photo_url TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_checklist_runs_company ON public.pos_checklist_runs(company_id, started_at DESC);
CREATE INDEX idx_pos_checklist_run_items_run ON public.pos_checklist_run_items(run_id);
CREATE INDEX idx_pos_checklist_template_items_tpl ON public.pos_checklist_template_items(template_id, sort_order);

CREATE TRIGGER trg_pos_checklist_templates_updated BEFORE UPDATE ON public.pos_checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pos_checklist_runs_updated BEFORE UPDATE ON public.pos_checklist_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pos_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_checklist_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_checklist_run_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_pos_checklist_templates" ON public.pos_checklist_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pos_checklist_template_items" ON public.pos_checklist_template_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pos_checklist_runs" ON public.pos_checklist_runs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pos_checklist_run_items" ON public.pos_checklist_run_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.v_pos_cashier_kpis AS
SELECT
  s.company_id,
  s.branch_id,
  s.cashier_name,
  COUNT(DISTINCT s.id)::INT AS shifts_count,
  COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(s.closed_at, now()) - s.opened_at)) / 3600.0), 0)::NUMERIC AS total_hours,
  COALESCE(SUM(s.total_sales_count), 0)::INT AS transaction_count,
  COALESCE(SUM(s.total_sales_amount), 0)::NUMERIC AS total_sales,
  CASE WHEN COALESCE(SUM(s.total_sales_count),0) > 0
       THEN COALESCE(SUM(s.total_sales_amount),0) / SUM(s.total_sales_count)
       ELSE 0 END AS avg_basket,
  COALESCE(SUM(s.total_voids_count), 0)::INT AS void_count,
  COALESCE(SUM(s.total_returns_count), 0)::INT AS refund_count,
  COALESCE(AVG(s.total_variance), 0)::NUMERIC AS avg_variance,
  CASE
    WHEN COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(s.closed_at, now()) - s.opened_at)) / 3600.0), 0) > 0
    THEN COALESCE(SUM(s.total_sales_count),0)::NUMERIC / SUM(EXTRACT(EPOCH FROM (COALESCE(s.closed_at, now()) - s.opened_at)) / 3600.0)
    ELSE 0
  END AS transactions_per_hour
FROM public.pos_cashier_shifts s
GROUP BY s.company_id, s.branch_id, s.cashier_name;
