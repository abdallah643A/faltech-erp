ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS branch_available_qty numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS company_available_qty numeric DEFAULT 0;