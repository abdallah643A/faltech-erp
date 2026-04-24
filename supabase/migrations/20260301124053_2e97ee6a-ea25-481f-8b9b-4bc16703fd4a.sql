
-- Create dimensions table for all 4 dimension types
CREATE TABLE public.dimensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dimension_type TEXT NOT NULL CHECK (dimension_type IN ('employees', 'branches', 'business_line', 'factory')),
  cost_center TEXT NOT NULL,
  name TEXT NOT NULL,
  dimension_code TEXT,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dimensions" ON public.dimensions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/Manager can manage dimensions" ON public.dimensions
  FOR ALL USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  );

CREATE INDEX idx_dimensions_type ON public.dimensions(dimension_type);
CREATE INDEX idx_dimensions_active ON public.dimensions(is_active);

-- Add dimension columns to quote_lines
ALTER TABLE public.quote_lines
  ADD COLUMN IF NOT EXISTS dim_employee_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_branch_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_business_line_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_factory_id UUID REFERENCES public.dimensions(id);

-- Add dimension columns to sales_order_lines
ALTER TABLE public.sales_order_lines
  ADD COLUMN IF NOT EXISTS dim_employee_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_branch_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_business_line_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_factory_id UUID REFERENCES public.dimensions(id);

-- Add dimension columns to ar_invoice_lines
ALTER TABLE public.ar_invoice_lines
  ADD COLUMN IF NOT EXISTS dim_employee_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_branch_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_business_line_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_factory_id UUID REFERENCES public.dimensions(id);

-- Add dimension columns to ap_invoice_lines
ALTER TABLE public.ap_invoice_lines
  ADD COLUMN IF NOT EXISTS dim_employee_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_branch_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_business_line_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_factory_id UUID REFERENCES public.dimensions(id);

-- Add dimension columns to purchase_order_lines
ALTER TABLE public.purchase_order_lines
  ADD COLUMN IF NOT EXISTS dim_employee_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_branch_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_business_line_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_factory_id UUID REFERENCES public.dimensions(id);

-- Add dimension columns to purchase_request_lines
ALTER TABLE public.purchase_request_lines
  ADD COLUMN IF NOT EXISTS dim_employee_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_branch_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_business_line_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_factory_id UUID REFERENCES public.dimensions(id);

-- Add dimension columns to goods_receipt_lines
ALTER TABLE public.goods_receipt_lines
  ADD COLUMN IF NOT EXISTS dim_employee_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_branch_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_business_line_id UUID REFERENCES public.dimensions(id),
  ADD COLUMN IF NOT EXISTS dim_factory_id UUID REFERENCES public.dimensions(id);

-- Trigger for updated_at
CREATE TRIGGER update_dimensions_updated_at
  BEFORE UPDATE ON public.dimensions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
