
-- Add customer detail fields to sales_orders
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_mobile text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_cr text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_national_id text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_vat_number text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_city text;

-- Add branch detail fields to sales_orders
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS branch_manager_name text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS branch_mobile text;
