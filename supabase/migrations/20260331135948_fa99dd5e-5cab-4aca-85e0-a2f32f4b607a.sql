
-- Supplier reviews table
CREATE TABLE public.supplier_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.business_partners(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  company_id UUID REFERENCES public.sap_companies(id),
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reviewer_name TEXT NOT NULL,
  po_reference TEXT,
  shipment_reference TEXT,
  on_time BOOLEAN,
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  price_rating TEXT CHECK (price_rating IN ('competitive', 'fair', 'high')),
  overall_rating NUMERIC(3,2) GENERATED ALWAYS AS (
    COALESCE(quality_rating, 3)::NUMERIC * 0.4 + COALESCE(communication_rating, 3)::NUMERIC * 0.3 +
    CASE WHEN price_rating = 'competitive' THEN 5 WHEN price_rating = 'fair' THEN 3 ELSE 1 END::NUMERIC * 0.3
  ) STORED,
  issues TEXT,
  strengths TEXT,
  recommendation TEXT CHECK (recommendation IN ('excellent', 'good', 'acceptable', 'do_not_use')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.supplier_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage supplier reviews" ON public.supplier_reviews
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Supplier RFQs table
CREATE TABLE public.supplier_rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number TEXT NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'units',
  required_by DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'closed', 'awarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.supplier_rfqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage supplier rfqs" ON public.supplier_rfqs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS supplier_rfq_number_seq START 1;

-- Supplier RFQ responses table
CREATE TABLE public.supplier_rfq_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES public.supplier_rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.business_partners(id),
  supplier_name TEXT NOT NULL,
  quoted_price NUMERIC,
  currency TEXT DEFAULT 'SAR',
  lead_time_days INTEGER,
  response_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'quoted', 'declined', 'awarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_rfq_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage rfq responses" ON public.supplier_rfq_responses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add performance fields to business_partners
ALTER TABLE public.business_partners
  ADD COLUMN IF NOT EXISTS overall_rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_time_delivery_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_competitiveness NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS communication_score NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_purchase_value NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_purchase_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_lead_time_days NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_performance_review_date DATE;

-- Function to auto-update supplier ratings from reviews
CREATE OR REPLACE FUNCTION public.update_supplier_rating_from_reviews()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supplier_id UUID;
BEGIN
  v_supplier_id := COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  UPDATE public.business_partners SET
    overall_rating = sub.avg_overall,
    quality_score = sub.avg_quality * 20,
    communication_score = sub.avg_comm,
    last_performance_review_date = sub.last_date
  FROM (
    SELECT
      AVG(overall_rating) as avg_overall,
      AVG(quality_rating) as avg_quality,
      AVG(communication_rating) as avg_comm,
      MAX(review_date) as last_date
    FROM public.supplier_reviews
    WHERE supplier_id = v_supplier_id
  ) sub
  WHERE id = v_supplier_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_supplier_rating
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_reviews
FOR EACH ROW EXECUTE FUNCTION update_supplier_rating_from_reviews();
