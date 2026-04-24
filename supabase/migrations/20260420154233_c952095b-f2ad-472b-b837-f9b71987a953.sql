
-- Prequalification questionnaire (extends supplier_onboarding_questions with weights already there)
CREATE TABLE IF NOT EXISTS public.supplier_prequalification_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  vendor_id uuid,
  portal_account_id uuid,
  application_id uuid REFERENCES public.supplier_onboarding_applications(id) ON DELETE CASCADE,
  category text,
  total_score numeric DEFAULT 0,
  max_score numeric DEFAULT 0,
  score_pct numeric DEFAULT 0,
  risk_level text DEFAULT 'unknown',
  ai_risk_summary text,
  ai_recommendation text,
  ai_generated_at timestamptz,
  ai_model text,
  reviewer_decision text,
  reviewer_id uuid,
  reviewed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_prequalification_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.supplier_prequalification_assessments(id) ON DELETE CASCADE,
  question_id uuid,
  question_text text,
  category text,
  answer_value text,
  answer_score numeric DEFAULT 0,
  weight numeric DEFAULT 1,
  weighted_score numeric DEFAULT 0,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Disputes tied to PO/Invoice/RFQ with SLA + escalation
CREATE TABLE IF NOT EXISTS public.supplier_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  portal_account_id uuid,
  vendor_id uuid,
  vendor_name text,
  entity_type text NOT NULL, -- 'po' | 'invoice' | 'rfq' | 'grpo'
  entity_id uuid,
  entity_reference text,
  subject text NOT NULL,
  description text,
  category text DEFAULT 'general',
  priority text DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open', -- open|in_review|awaiting_supplier|resolved|escalated|closed
  sla_hours integer DEFAULT 48,
  sla_due_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  escalated_at timestamptz,
  escalated_to uuid,
  escalation_level integer DEFAULT 0,
  assigned_buyer_id uuid,
  resolution_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.supplier_disputes(id) ON DELETE CASCADE,
  sender_type text NOT NULL, -- 'supplier' | 'buyer' | 'system'
  sender_id uuid,
  sender_name text,
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_internal boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Profile change requests with field-level diff + dual approval for sensitive fields
CREATE TABLE IF NOT EXISTS public.supplier_profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  portal_account_id uuid,
  vendor_id uuid,
  vendor_name text,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb, -- { field: {old, new, sensitive} }
  sensitive_fields text[] DEFAULT ARRAY[]::text[],
  requires_dual_approval boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- pending|approved_primary|approved|rejected|applied
  primary_reviewer_id uuid,
  primary_reviewed_at timestamptz,
  primary_decision text,
  secondary_reviewer_id uuid,
  secondary_reviewed_at timestamptz,
  secondary_decision text,
  rejection_reason text,
  applied_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Compliance reminders catalogue (per supplier doc/cert) - extends existing portal_reminders
CREATE TABLE IF NOT EXISTS public.supplier_compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  portal_account_id uuid,
  vendor_id uuid,
  item_type text NOT NULL, -- cert|insurance|tax|license|iso|other
  item_name text NOT NULL,
  document_url text,
  issued_date date,
  expiry_date date,
  reminder_days_before integer DEFAULT 30,
  last_reminded_at timestamptz,
  status text DEFAULT 'active', -- active|expired|renewed|missing
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Performance scorecard publication (visibility flag) - reuse supplier_monthly_scorecards via flag table
CREATE TABLE IF NOT EXISTS public.supplier_scorecard_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id uuid,
  vendor_id uuid,
  portal_account_id uuid,
  period_start date,
  period_end date,
  overall_score numeric,
  metrics jsonb DEFAULT '{}'::jsonb,
  is_visible_to_supplier boolean DEFAULT true,
  published_at timestamptz DEFAULT now(),
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sp_preq_app ON public.supplier_prequalification_assessments(application_id);
CREATE INDEX IF NOT EXISTS idx_sp_preq_vendor ON public.supplier_prequalification_assessments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sp_disputes_entity ON public.supplier_disputes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sp_disputes_status ON public.supplier_disputes(status);
CREATE INDEX IF NOT EXISTS idx_sp_disputes_sla ON public.supplier_disputes(sla_due_at) WHERE status NOT IN ('resolved','closed');
CREATE INDEX IF NOT EXISTS idx_sp_dispute_msg ON public.supplier_dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_sp_profile_req_status ON public.supplier_profile_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_sp_compliance_expiry ON public.supplier_compliance_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_sp_scorecard_pub_vendor ON public.supplier_scorecard_publications(vendor_id);

-- Trigger: auto-set sla_due_at on dispute insert
CREATE OR REPLACE FUNCTION public.set_supplier_dispute_sla()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.sla_due_at IS NULL AND NEW.sla_hours IS NOT NULL THEN
    NEW.sla_due_at := NEW.created_at + (NEW.sla_hours || ' hours')::interval;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_supplier_dispute_sla ON public.supplier_disputes;
CREATE TRIGGER trg_supplier_dispute_sla BEFORE INSERT OR UPDATE ON public.supplier_disputes
FOR EACH ROW EXECUTE FUNCTION public.set_supplier_dispute_sla();

-- Trigger: classify sensitive fields on profile change request
CREATE OR REPLACE FUNCTION public.classify_supplier_profile_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  sens text[] := ARRAY['bank_account','iban','swift','tax_id','vat_number','legal_name','registration_number','beneficiary_name'];
  k text;
  found text[] := ARRAY[]::text[];
BEGIN
  IF NEW.changes IS NOT NULL THEN
    FOR k IN SELECT jsonb_object_keys(NEW.changes) LOOP
      IF k = ANY(sens) THEN
        found := array_append(found, k);
      END IF;
    END LOOP;
  END IF;
  NEW.sensitive_fields := found;
  NEW.requires_dual_approval := array_length(found, 1) > 0;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_classify_supplier_profile ON public.supplier_profile_change_requests;
CREATE TRIGGER trg_classify_supplier_profile BEFORE INSERT OR UPDATE OF changes ON public.supplier_profile_change_requests
FOR EACH ROW EXECUTE FUNCTION public.classify_supplier_profile_change();

-- Enable RLS
ALTER TABLE public.supplier_prequalification_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_prequalification_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_profile_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_scorecard_publications ENABLE ROW LEVEL SECURITY;

-- Permissive policies (internal ERP users authenticated; supplier portal access uses portal_account_id binding via edge functions/anon flows already in place)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'supplier_prequalification_assessments',
    'supplier_prequalification_answers',
    'supplier_disputes',
    'supplier_dispute_messages',
    'supplier_profile_change_requests',
    'supplier_compliance_items',
    'supplier_scorecard_publications'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_all_%I" ON public.%I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_read_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "anon_read_%I" ON public.%I FOR SELECT USING (true)', t, t);
  END LOOP;
END $$;
