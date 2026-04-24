
-- Delay events table
CREATE TABLE public.cpms_delay_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  event_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cause_category TEXT NOT NULL DEFAULT 'other',
  cause_detail TEXT,
  responsible_party TEXT,
  impacted_activities TEXT,
  start_date DATE,
  end_date DATE,
  actual_delay_days INTEGER DEFAULT 0,
  days_claimed INTEGER DEFAULT 0,
  days_approved INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'identified',
  severity TEXT DEFAULT 'moderate',
  is_excusable BOOLEAN DEFAULT false,
  is_compensable BOOLEAN DEFAULT false,
  contract_ref TEXT,
  change_order_id UUID,
  correspondence_ref TEXT,
  weather_data TEXT,
  site_conditions TEXT,
  evidence_urls TEXT[],
  evidence_notes TEXT,
  mitigation_plan TEXT,
  mitigation_cost NUMERIC DEFAULT 0,
  linked_activity_ids TEXT[],
  reviewer_notes TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cpms_delay_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage delay events" ON public.cpms_delay_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_cpms_delay_events_updated_at
  BEFORE UPDATE ON public.cpms_delay_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- EOT Claims table
CREATE TABLE public.cpms_eot_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  delay_event_id UUID REFERENCES public.cpms_delay_events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  original_completion_date DATE,
  requested_completion_date DATE,
  total_days_requested INTEGER DEFAULT 0,
  total_days_approved INTEGER DEFAULT 0,
  cost_impact NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  contract_clause TEXT,
  supporting_docs TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cpms_eot_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage eot claims" ON public.cpms_eot_claims
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_cpms_eot_claims_updated_at
  BEFORE UPDATE ON public.cpms_eot_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate event numbers
CREATE SEQUENCE IF NOT EXISTS cpms_delay_event_seq START 1;
CREATE SEQUENCE IF NOT EXISTS cpms_eot_claim_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_delay_event_number()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.event_number IS NULL OR NEW.event_number = '' THEN
    NEW.event_number := 'DE-' || LPAD(nextval('cpms_delay_event_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_delay_event_number
  BEFORE INSERT ON public.cpms_delay_events
  FOR EACH ROW EXECUTE FUNCTION public.generate_delay_event_number();

CREATE OR REPLACE FUNCTION public.generate_eot_claim_number()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.claim_number IS NULL OR NEW.claim_number = '' THEN
    NEW.claim_number := 'EOT-' || LPAD(nextval('cpms_eot_claim_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_eot_claim_number
  BEFORE INSERT ON public.cpms_eot_claims
  FOR EACH ROW EXECUTE FUNCTION public.generate_eot_claim_number();
