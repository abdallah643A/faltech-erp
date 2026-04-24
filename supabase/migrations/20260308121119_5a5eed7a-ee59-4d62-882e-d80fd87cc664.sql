
ALTER TABLE public.sales_targets RENAME COLUMN item_id TO business_line_id;
ALTER TABLE public.sales_targets RENAME COLUMN item_code TO business_line_code;
ALTER TABLE public.sales_targets RENAME COLUMN item_name TO business_line_name;
