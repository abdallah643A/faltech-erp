
-- Add incoterm column to purchase_orders, sales_orders, business_partners
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS incoterm text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS incoterm text;
ALTER TABLE public.business_partners ADD COLUMN IF NOT EXISTS default_incoterm text;
