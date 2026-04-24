
-- Add sales_order_id column to incoming_payments to link payments to sales orders/contracts
ALTER TABLE public.incoming_payments 
ADD COLUMN sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_incoming_payments_sales_order_id ON public.incoming_payments(sales_order_id);
