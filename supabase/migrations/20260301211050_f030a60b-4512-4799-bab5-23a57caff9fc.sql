
-- Add series column to all transaction tables
ALTER TABLE public.sales_orders ADD COLUMN series integer NULL;
ALTER TABLE public.quotes ADD COLUMN series integer NULL;
ALTER TABLE public.ar_invoices ADD COLUMN series integer NULL;
ALTER TABLE public.purchase_orders ADD COLUMN series integer NULL;
ALTER TABLE public.purchase_requests ADD COLUMN series integer NULL;
ALTER TABLE public.purchase_quotations ADD COLUMN series integer NULL;
ALTER TABLE public.goods_receipts ADD COLUMN series integer NULL;
ALTER TABLE public.ap_invoices ADD COLUMN series integer NULL;
