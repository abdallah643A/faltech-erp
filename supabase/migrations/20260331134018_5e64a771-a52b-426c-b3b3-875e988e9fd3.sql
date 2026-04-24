
-- Deal number sequence
CREATE SEQUENCE IF NOT EXISTS deal_number_seq START 1;

-- Deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_number TEXT NOT NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  sales_order_id UUID REFERENCES public.sales_orders(id),
  shipment_id UUID REFERENCES public.shipments(id),
  product_name TEXT,
  quantity NUMERIC DEFAULT 0,
  buy_price NUMERIC DEFAULT 0,
  buy_currency TEXT DEFAULT 'SAR',
  buy_exchange_rate NUMERIC DEFAULT 1,
  sell_price NUMERIC DEFAULT 0,
  sell_currency TEXT DEFAULT 'SAR',
  sell_exchange_rate NUMERIC DEFAULT 1,
  preliminary_margin NUMERIC GENERATED ALWAYS AS ((sell_price * sell_exchange_rate) - (buy_price * buy_exchange_rate)) STORED,
  landed_cost NUMERIC DEFAULT 0,
  actual_margin NUMERIC GENERATED ALWAYS AS ((sell_price * sell_exchange_rate) - COALESCE(NULLIF(landed_cost, 0), buy_price * buy_exchange_rate)) STORED,
  margin_percentage NUMERIC GENERATED ALWAYS AS (
    CASE WHEN (sell_price * sell_exchange_rate) > 0
      THEN (((sell_price * sell_exchange_rate) - COALESCE(NULLIF(landed_cost, 0), buy_price * buy_exchange_rate)) / (sell_price * sell_exchange_rate)) * 100
      ELSE 0
    END
  ) STORED,
  status TEXT NOT NULL DEFAULT 'Active',
  supplier_name TEXT,
  customer_name TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generate deal number
CREATE OR REPLACE FUNCTION public.generate_deal_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deal_number IS NULL OR NEW.deal_number = '' THEN
    NEW.deal_number := 'DEAL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('deal_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_deal_number
  BEFORE INSERT ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.generate_deal_number();

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deals"
  ON public.deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert deals"
  ON public.deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update deals"
  ON public.deals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete deals"
  ON public.deals FOR DELETE TO authenticated USING (true);
