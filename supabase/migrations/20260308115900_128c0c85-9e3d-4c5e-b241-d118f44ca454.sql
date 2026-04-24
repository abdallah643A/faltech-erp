
-- Add dimension columns to sales_targets for multi-dimensional tracking
ALTER TABLE public.sales_targets
  ADD COLUMN IF NOT EXISTS sales_employee_id uuid REFERENCES public.sales_employees(id),
  ADD COLUMN IF NOT EXISTS sales_employee_name text,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.regions(id),
  ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.items(id),
  ADD COLUMN IF NOT EXISTS item_code text,
  ADD COLUMN IF NOT EXISTS item_name text,
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'sales';

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_sales_targets_sales_employee ON public.sales_targets(sales_employee_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_company ON public.sales_targets(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_region ON public.sales_targets(region_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_target_type ON public.sales_targets(target_type);
