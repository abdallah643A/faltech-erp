
-- 1. Add new enum values for the 9-phase lifecycle
ALTER TYPE public.project_phase ADD VALUE IF NOT EXISTS 'design_costing';
ALTER TYPE public.project_phase ADD VALUE IF NOT EXISTS 'finance_gate_2';

-- 2. Create site_surveys table for Technical Assessment module
CREATE TABLE public.site_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  sales_order_id UUID REFERENCES public.sales_orders(id),
  survey_type TEXT DEFAULT 'initial_assessment', -- initial_assessment, detailed_survey, re_survey
  scheduled_date DATE,
  scheduled_time TIME,
  duration_estimate NUMERIC,
  survey_leader_id UUID,
  customer_contact_name TEXT,
  customer_contact_phone TEXT,
  site_address TEXT,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  access_requirements TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled

  -- Site Dimensions
  site_length NUMERIC,
  site_width NUMERIC,
  site_height NUMERIC,
  floor_type TEXT,
  load_bearing_capacity NUMERIC,
  ceiling_height NUMERIC,

  -- Power Availability
  voltage NUMERIC,
  power_phases TEXT,
  frequency TEXT,
  available_load NUMERIC,
  distance_to_power_source NUMERIC,

  -- Environmental Conditions
  temperature_min NUMERIC,
  temperature_max NUMERIC,
  humidity_min NUMERIC,
  humidity_max NUMERIC,
  dust_level TEXT,
  corrosive_environment BOOLEAN DEFAULT false,
  hazardous_area_classification TEXT,

  -- Existing Infrastructure
  compressed_air_available BOOLEAN DEFAULT false,
  water_supply_available BOOLEAN DEFAULT false,
  drainage_system BOOLEAN DEFAULT false,
  hvac_system BOOLEAN DEFAULT false,
  fire_protection BOOLEAN DEFAULT false,

  -- Access Details
  entry_width NUMERIC,
  entry_height NUMERIC,
  stairway_elevator TEXT,
  loading_dock BOOLEAN DEFAULT false,
  crane_available BOOLEAN DEFAULT false,
  crane_capacity NUMERIC,

  -- Special Requirements
  special_requirements TEXT,
  safety_considerations TEXT,
  installation_constraints TEXT,
  existing_equipment_interface TEXT,
  compliance_requirements TEXT,

  -- Survey Report
  executive_summary TEXT,
  detailed_findings TEXT,
  recommendations TEXT,
  challenges_identified TEXT,
  proposed_solutions TEXT,

  -- Approval
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage surveys" ON public.site_surveys
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Authenticated users can view surveys" ON public.site_surveys
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Technical team can create surveys" ON public.site_surveys
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Survey leaders can update their surveys" ON public.site_surveys
  FOR UPDATE USING (survey_leader_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- 3. Create site_survey_photos table
CREATE TABLE public.site_survey_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID REFERENCES public.site_surveys(id) ON DELETE CASCADE NOT NULL,
  photo_type TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_survey_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage survey photos" ON public.site_survey_photos
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view survey photos" ON public.site_survey_photos
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 4. Create technical_specifications table
CREATE TABLE public.technical_specifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  survey_id UUID REFERENCES public.site_surveys(id),
  spec_number TEXT,
  document_date DATE DEFAULT CURRENT_DATE,
  revision_number INTEGER DEFAULT 0,

  -- Equipment Specifications
  equipment_list JSONB DEFAULT '[]'::jsonb,
  system_integration_requirements TEXT,
  performance_criteria TEXT,
  testing_commissioning_requirements TEXT,

  -- Installation Requirements
  foundation_requirements TEXT,
  electrical_requirements TEXT,
  mechanical_requirements TEXT,
  civil_work_requirements TEXT,
  safety_systems_requirements TEXT,

  -- Deliverables
  deliverables_checklist JSONB DEFAULT '[]'::jsonb,
  training_details TEXT,
  documentation_requirements TEXT,
  spare_parts_list JSONB DEFAULT '[]'::jsonb,
  warranty_details TEXT,

  -- Customer Approval
  review_status TEXT DEFAULT 'pending_review',
  customer_comments TEXT,
  customer_signatory_name TEXT,
  customer_signature_url TEXT,
  customer_approval_date TIMESTAMPTZ,
  tech_manager_approval_by UUID,
  tech_manager_approval_at TIMESTAMPTZ,

  status TEXT DEFAULT 'draft',
  revision_count INTEGER DEFAULT 0,
  max_revisions INTEGER DEFAULT 3,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.technical_specifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage specs" ON public.technical_specifications
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Authenticated users can view specs" ON public.technical_specifications
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create specs" ON public.technical_specifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators can update specs" ON public.technical_specifications
  FOR UPDATE USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- 5. Update triggers for updated_at
CREATE TRIGGER update_site_surveys_updated_at
  BEFORE UPDATE ON public.site_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_specifications_updated_at
  BEFORE UPDATE ON public.technical_specifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Update initialize_project_phases to include 9 phases per document
CREATE OR REPLACE FUNCTION public.initialize_project_phases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.project_type = 'industrial' THEN
    INSERT INTO public.project_phases (project_id, phase, status, requires_approval, auto_progress)
    VALUES 
      (NEW.id, 'sales_initiation', 'in_progress', false, false),
      (NEW.id, 'finance_verification', 'pending', true, false),
      (NEW.id, 'operations_verification', 'pending', true, false),
      (NEW.id, 'design_costing', 'pending', true, false),
      (NEW.id, 'finance_gate_2', 'pending', true, false),
      (NEW.id, 'procurement', 'pending', true, false),
      (NEW.id, 'production', 'pending', false, true),
      (NEW.id, 'final_payment', 'pending', true, false),
      (NEW.id, 'logistics', 'pending', false, true),
      (NEW.id, 'completed', 'pending', true, false);
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Update down payment from 30% to 50%
CREATE OR REPLACE FUNCTION public.create_finance_alert_on_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.workflow_status = 'pending_finance' AND (OLD.workflow_status IS NULL OR OLD.workflow_status != 'pending_finance') THEN
    INSERT INTO public.finance_alerts (
      sales_order_id, project_id, alert_type, title, description, priority, created_by
    ) VALUES (
      NEW.id, NEW.project_id, 'payment_verification',
      'New Contract Pending Finance Verification',
      'Contract ' || COALESCE(NEW.contract_number, 'SO-' || NEW.doc_num) || ' for ' || NEW.customer_name || ' requires 50% down payment verification. Contract value: ' || COALESCE(NEW.contract_value, NEW.total),
      'high', NEW.created_by
    );
    
    -- 50% down payment (changed from 30%)
    INSERT INTO public.payment_verifications (
      sales_order_id, project_id, payment_term_number, payment_type, expected_amount, created_by
    ) VALUES (
      NEW.id, NEW.project_id, 1, 'down_payment',
      COALESCE(NEW.contract_value, NEW.total) * 0.5,
      NEW.created_by
    );
    
    INSERT INTO public.financial_clearances (
      sales_order_id, project_id, clearance_type, total_contract_value, outstanding_amount, created_by
    ) VALUES (
      NEW.id, NEW.project_id, 'contract_approval',
      COALESCE(NEW.contract_value, NEW.total),
      COALESCE(NEW.contract_value, NEW.total),
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Update approve_financial_clearance to advance to technical_assessment (operations_verification) phase
CREATE OR REPLACE FUNCTION public.approve_financial_clearance(p_clearance_id uuid, p_notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sales_order_id UUID;
  v_project_id UUID;
BEGIN
  SELECT sales_order_id, project_id INTO v_sales_order_id, v_project_id
  FROM financial_clearances WHERE id = p_clearance_id;
  
  UPDATE financial_clearances
  SET status = 'approved', approved_by = auth.uid(), approved_at = now(),
      clearance_notes = COALESCE(p_notes, clearance_notes)
  WHERE id = p_clearance_id;
  
  UPDATE sales_orders
  SET workflow_status = 'finance_approved', finance_verified_at = now(), finance_verified_by = auth.uid()
  WHERE id = v_sales_order_id;
  
  IF v_project_id IS NOT NULL THEN
    UPDATE project_phases SET status = 'completed', completed_at = now()
    WHERE project_id = v_project_id AND phase = 'finance_verification';
    
    -- Advance to Technical Assessment phase (operations_verification)
    UPDATE project_phases SET status = 'in_progress', started_at = now()
    WHERE project_id = v_project_id AND phase = 'operations_verification';
    
    UPDATE projects SET current_phase = 'operations_verification'
    WHERE id = v_project_id;
    
    PERFORM log_project_activity(v_project_id, 'finance_verification', 'phase_approved', '50% down payment verified - advancing to Technical Assessment');
  END IF;
  
  UPDATE finance_alerts SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE sales_order_id = v_sales_order_id AND status = 'pending';
END;
$$;
