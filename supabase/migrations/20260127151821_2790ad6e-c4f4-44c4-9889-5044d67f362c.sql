-- Create sequence for quote numbers FIRST
CREATE SEQUENCE IF NOT EXISTS quotes_quote_number_seq START WITH 1001;

-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  business_partner_id UUID REFERENCES public.business_partners(id),
  value NUMERIC NOT NULL DEFAULT 0,
  probability INTEGER NOT NULL DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  stage TEXT NOT NULL DEFAULT 'Discovery',
  expected_close DATE,
  owner_id UUID,
  owner_name TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number INTEGER NOT NULL DEFAULT nextval('quotes_quote_number_seq'::regclass),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.business_partners(id),
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  valid_until DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  currency TEXT DEFAULT 'SAR',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote_lines table
CREATE TABLE public.quote_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_id UUID REFERENCES public.items(id),
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  tax_percent NUMERIC DEFAULT 15,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

-- Opportunities RLS Policies
CREATE POLICY "Users can view their own opportunities or all if manager/admin"
  ON public.opportunities FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR created_by = auth.uid() 
    OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Sales reps and above can create opportunities"
  ON public.opportunities FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales_rep'::app_role])
  );

CREATE POLICY "Users can update their own opportunities or all if manager/admin"
  ON public.opportunities FOR UPDATE
  USING (
    owner_id = auth.uid() 
    OR created_by = auth.uid() 
    OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Only admins can delete opportunities"
  ON public.opportunities FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Quotes RLS Policies
CREATE POLICY "Users can view their own quotes or all if manager/admin"
  ON public.quotes FOR SELECT
  USING (
    created_by = auth.uid() 
    OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Sales reps and above can create quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales_rep'::app_role])
  );

CREATE POLICY "Users can update their own quotes or all if manager/admin"
  ON public.quotes FOR UPDATE
  USING (
    created_by = auth.uid() 
    OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Only admins can delete quotes"
  ON public.quotes FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Quote Lines RLS Policies (access through parent quote)
CREATE POLICY "Users can view quote lines for accessible quotes"
  ON public.quote_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_lines.quote_id
      AND (q.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    )
  );

CREATE POLICY "Users can manage quote lines for accessible quotes"
  ON public.quote_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_lines.quote_id
      AND (q.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_opportunities_owner_id ON public.opportunities(owner_id);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX idx_opportunities_created_by ON public.opportunities(created_by);
CREATE INDEX idx_quotes_opportunity_id ON public.quotes(opportunity_id);
CREATE INDEX idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX idx_quotes_created_by ON public.quotes(created_by);
CREATE INDEX idx_quote_lines_quote_id ON public.quote_lines(quote_id);