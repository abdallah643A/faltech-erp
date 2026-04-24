
-- Sales Targets table
CREATE TABLE public.sales_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly', -- daily, weekly, monthly, quarterly, yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sales_target NUMERIC NOT NULL DEFAULT 0,
  sales_actual NUMERIC NOT NULL DEFAULT 0,
  collection_target NUMERIC NOT NULL DEFAULT 0,
  collection_actual NUMERIC NOT NULL DEFAULT 0,
  branch_id UUID REFERENCES public.branches(id),
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view targets"
  ON public.sales_targets FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users with admin/manager role can insert targets"
  ON public.sales_targets FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Users with admin/manager role can update targets"
  ON public.sales_targets FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Users with admin role can delete targets"
  ON public.sales_targets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated at trigger
CREATE TRIGGER update_sales_targets_updated_at
  BEFORE UPDATE ON public.sales_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_targets;
