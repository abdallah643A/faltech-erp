
-- Add cross-module linking columns to activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON public.activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_employee_id ON public.activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_sales_order_id ON public.activities(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_activities_purchase_order_id ON public.activities(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON public.activities(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to ON public.activities(assigned_to);
