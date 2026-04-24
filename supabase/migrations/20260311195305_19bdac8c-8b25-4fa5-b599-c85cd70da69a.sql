
-- Add company_id to core master data tables
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.business_partners ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.dimensions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.price_lists ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.tax_codes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

-- Transaction tables
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.delivery_notes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.ar_invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.ar_credit_memos ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.ar_returns ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

-- Procurement
ALTER TABLE public.material_requests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.goods_receipts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.ap_invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.ap_credit_memos ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

-- Inventory
ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.inventory_goods_receipts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.inventory_goods_issues ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.inventory_countings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

-- Projects & Assets
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_items_company_id ON public.items(company_id);
CREATE INDEX IF NOT EXISTS idx_business_partners_company_id ON public.business_partners(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_company_id ON public.sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_company_id ON public.ar_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON public.activities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON public.opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON public.warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON public.purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_incoming_payments_company_id ON public.incoming_payments(company_id);

-- Helper function
CREATE OR REPLACE FUNCTION public.get_active_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT active_company_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;
$$;
