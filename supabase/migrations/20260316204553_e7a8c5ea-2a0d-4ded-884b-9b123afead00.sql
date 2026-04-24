
-- Landed Cost master data: Brokers
CREATE TABLE public.landed_cost_brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  broker_code TEXT NOT NULL,
  broker_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Landed Cost master data: Cost Types/Categories setup
CREATE TABLE public.landed_cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT,
  default_allocation_method TEXT DEFAULT 'by_value',
  gl_account TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add broker and additional fields to landed_cost_documents
ALTER TABLE public.landed_cost_documents 
  ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES public.landed_cost_brokers(id),
  ADD COLUMN IF NOT EXISTS broker_name TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS posting_date DATE,
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS file_no TEXT,
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS series TEXT,
  ADD COLUMN IF NOT EXISTS projected_customs NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_customs NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customs_date DATE,
  ADD COLUMN IF NOT EXISTS customs_affects_inventory BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS total_freight_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_to_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS before_tax NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax1 NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax2 NUMERIC DEFAULT 0;

-- Add additional fields to landed_cost_items for SAP B1 parity
ALTER TABLE public.landed_cost_items
  ADD COLUMN IF NOT EXISTS base_doc_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_doc_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proj_customs NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customs_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expenditure NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alloc_costs_val NUMERIC DEFAULT 0;

-- Enable RLS
ALTER TABLE public.landed_cost_brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landed_cost_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can manage brokers" ON public.landed_cost_brokers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage lc categories" ON public.landed_cost_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
