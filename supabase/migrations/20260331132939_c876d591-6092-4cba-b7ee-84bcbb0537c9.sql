
-- Performance reviews table
CREATE TABLE public.cpms_subcontractor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES public.cpms_subcontractors(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.cpms_projects(id),
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reviewer_name TEXT,
  reviewer_id UUID,
  schedule_rating INTEGER NOT NULL DEFAULT 3 CHECK (schedule_rating BETWEEN 1 AND 5),
  quality_rating INTEGER NOT NULL DEFAULT 3 CHECK (quality_rating BETWEEN 1 AND 5),
  safety_rating INTEGER NOT NULL DEFAULT 3 CHECK (safety_rating BETWEEN 1 AND 5),
  financial_rating INTEGER NOT NULL DEFAULT 3 CHECK (financial_rating BETWEEN 1 AND 5),
  communication_rating INTEGER NOT NULL DEFAULT 3 CHECK (communication_rating BETWEEN 1 AND 5),
  overall_rating NUMERIC(3,2) GENERATED ALWAYS AS (
    (schedule_rating + quality_rating + safety_rating + financial_rating + communication_rating)::NUMERIC / 5.0
  ) STORED,
  strengths TEXT,
  areas_for_improvement TEXT,
  recommendation TEXT DEFAULT 'Good' CHECK (recommendation IN ('Excellent - Use Again', 'Good', 'Acceptable', 'Do Not Use')),
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Add performance score columns to subcontractors
ALTER TABLE public.cpms_subcontractors
  ADD COLUMN IF NOT EXISTS schedule_score NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS safety_score NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS financial_score NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS communication_score NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overall_performance_rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_review_date DATE,
  ADD COLUMN IF NOT EXISTS recommendation TEXT;

-- RLS
ALTER TABLE public.cpms_subcontractor_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reviews"
  ON public.cpms_subcontractor_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert reviews"
  ON public.cpms_subcontractor_reviews FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update reviews"
  ON public.cpms_subcontractor_reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reviews"
  ON public.cpms_subcontractor_reviews FOR DELETE TO authenticated USING (true);

-- Function to update subcontractor aggregate scores when a review is added/updated/deleted
CREATE OR REPLACE FUNCTION public.update_subcontractor_performance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub_id UUID;
BEGIN
  v_sub_id := COALESCE(NEW.subcontractor_id, OLD.subcontractor_id);
  
  UPDATE public.cpms_subcontractors SET
    schedule_score = sub.avg_schedule * 20,
    quality_score = sub.avg_quality * 20,
    safety_score = sub.avg_safety * 20,
    financial_score = sub.avg_financial * 20,
    communication_score = sub.avg_comm * 20,
    overall_performance_rating = sub.avg_overall,
    total_reviews = sub.cnt,
    last_review_date = sub.last_date,
    rating = ROUND(sub.avg_overall),
    recommendation = sub.last_rec
  FROM (
    SELECT
      AVG(schedule_rating) as avg_schedule,
      AVG(quality_rating) as avg_quality,
      AVG(safety_rating) as avg_safety,
      AVG(financial_rating) as avg_financial,
      AVG(communication_rating) as avg_comm,
      AVG(overall_rating) as avg_overall,
      COUNT(*) as cnt,
      MAX(review_date) as last_date,
      (SELECT r2.recommendation FROM public.cpms_subcontractor_reviews r2 
       WHERE r2.subcontractor_id = v_sub_id ORDER BY r2.review_date DESC LIMIT 1) as last_rec
    FROM public.cpms_subcontractor_reviews
    WHERE subcontractor_id = v_sub_id
  ) sub
  WHERE id = v_sub_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_sub_performance
AFTER INSERT OR UPDATE OR DELETE ON public.cpms_subcontractor_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_subcontractor_performance();
