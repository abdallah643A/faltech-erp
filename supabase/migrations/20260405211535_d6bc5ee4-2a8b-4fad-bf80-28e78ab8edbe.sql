
CREATE TABLE public.material_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  substitution_number TEXT NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.projects(id),
  purchase_request_id UUID REFERENCES public.purchase_requests(id),
  material_request_id UUID REFERENCES public.material_requests(id),
  
  original_item_code TEXT NOT NULL,
  original_item_description TEXT NOT NULL,
  original_brand TEXT,
  original_specification TEXT,
  original_unit_price NUMERIC DEFAULT 0,
  original_lead_time_days INTEGER,
  original_quantity NUMERIC DEFAULT 0,
  
  proposed_item_code TEXT NOT NULL,
  proposed_item_description TEXT NOT NULL,
  proposed_brand TEXT,
  proposed_specification TEXT,
  proposed_unit_price NUMERIC DEFAULT 0,
  proposed_lead_time_days INTEGER,
  proposed_quantity NUMERIC DEFAULT 0,
  
  cost_impact NUMERIC GENERATED ALWAYS AS ((proposed_unit_price * proposed_quantity) - (original_unit_price * original_quantity)) STORED,
  lead_time_impact_days INTEGER,
  quality_impact TEXT CHECK (quality_impact IN ('equivalent', 'superior', 'inferior', 'unknown')),
  
  reason TEXT NOT NULL,
  category TEXT DEFAULT 'availability' CHECK (category IN ('availability', 'cost_saving', 'quality_upgrade', 'lead_time', 'specification_change', 'vendor_change', 'other')),
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_technical', 'pending_commercial', 'approved', 'rejected', 'cancelled')),
  
  requested_by UUID,
  requested_by_name TEXT,
  
  technical_reviewer_id UUID,
  technical_reviewer_name TEXT,
  technical_decision TEXT CHECK (technical_decision IN ('approved', 'rejected', 'conditionally_approved')),
  technical_comments TEXT,
  technical_reviewed_at TIMESTAMPTZ,
  
  commercial_reviewer_id UUID,
  commercial_reviewer_name TEXT,
  commercial_decision TEXT CHECK (commercial_decision IN ('approved', 'rejected', 'conditionally_approved')),
  commercial_comments TEXT,
  commercial_reviewed_at TIMESTAMPTZ,
  
  final_decision TEXT,
  final_decision_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS material_sub_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_material_sub_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.substitution_number IS NULL OR NEW.substitution_number = '' THEN
    NEW.substitution_number := 'MSR-' || LPAD(nextval('material_sub_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_material_sub_number
BEFORE INSERT ON public.material_substitutions
FOR EACH ROW EXECUTE FUNCTION public.generate_material_sub_number();

CREATE TRIGGER update_material_substitutions_updated_at
BEFORE UPDATE ON public.material_substitutions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.material_substitution_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  substitution_id UUID NOT NULL REFERENCES public.material_substitutions(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  comment_by UUID,
  comment_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.material_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_substitution_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view substitutions" ON public.material_substitutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create substitutions" ON public.material_substitutions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update substitutions" ON public.material_substitutions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view comments" ON public.material_substitution_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add comments" ON public.material_substitution_comments FOR INSERT TO authenticated WITH CHECK (true);
