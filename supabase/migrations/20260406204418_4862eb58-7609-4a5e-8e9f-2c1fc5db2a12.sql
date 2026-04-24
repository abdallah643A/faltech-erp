
-- =============================================
-- COLLECTIONS WORKBENCH TABLES
-- =============================================

CREATE TABLE public.collection_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_code TEXT,
  customer_name TEXT NOT NULL,
  collector_user_id UUID,
  collector_name TEXT,
  priority TEXT DEFAULT 'medium',
  total_outstanding NUMERIC DEFAULT 0,
  oldest_invoice_date DATE,
  last_contact_date TIMESTAMPTZ,
  next_action_date DATE,
  next_action_type TEXT,
  risk_score NUMERIC DEFAULT 0,
  promise_reliability NUMERIC DEFAULT 100,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.collection_promises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  invoice_id UUID,
  invoice_number TEXT,
  promised_amount NUMERIC NOT NULL DEFAULT 0,
  promised_date DATE NOT NULL,
  actual_amount NUMERIC,
  actual_date DATE,
  status TEXT DEFAULT 'pending',
  collector_user_id UUID,
  collector_name TEXT,
  follow_up_notes TEXT,
  broken_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.collection_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT NOT NULL,
  collector_user_id UUID,
  collector_name TEXT,
  visit_date DATE NOT NULL,
  visit_time TEXT,
  location TEXT,
  purpose TEXT,
  status TEXT DEFAULT 'planned',
  outcome TEXT,
  amount_collected NUMERIC DEFAULT 0,
  next_visit_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.collection_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  invoice_id UUID,
  invoice_number TEXT,
  communication_type TEXT NOT NULL DEFAULT 'phone',
  direction TEXT DEFAULT 'outbound',
  subject TEXT,
  body TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  outcome TEXT,
  promised_amount NUMERIC,
  promised_date DATE,
  collector_user_id UUID,
  collector_name TEXT,
  escalated_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.collection_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  invoice_id UUID,
  invoice_number TEXT,
  dispute_amount NUMERIC NOT NULL DEFAULT 0,
  dispute_reason TEXT NOT NULL,
  dispute_category TEXT DEFAULT 'pricing',
  status TEXT DEFAULT 'open',
  resolution TEXT,
  resolved_amount NUMERIC,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  assigned_to TEXT,
  escalated BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MASTER DATA GOVERNANCE TABLES
-- =============================================

CREATE TABLE public.mdg_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  change_type TEXT NOT NULL DEFAULT 'update',
  field_changes JSONB DEFAULT '[]'::JSONB,
  justification TEXT,
  impact_analysis TEXT,
  requester_id UUID,
  requester_name TEXT,
  reviewer_id UUID,
  reviewer_name TEXT,
  status TEXT DEFAULT 'pending',
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mdg_stewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  entity_type TEXT NOT NULL,
  steward_user_id UUID,
  steward_name TEXT NOT NULL,
  steward_email TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mdg_quality_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  entity_type TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'mandatory_field',
  field_name TEXT,
  validation_pattern TEXT,
  error_message TEXT,
  severity TEXT DEFAULT 'warning',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mdg_blocked_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,
  block_reason TEXT NOT NULL,
  blocked_by UUID,
  blocked_by_name TEXT,
  blocked_at TIMESTAMPTZ DEFAULT now(),
  unblocked_by UUID,
  unblocked_by_name TEXT,
  unblocked_at TIMESTAMPTZ,
  is_blocked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collection_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdg_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdg_stewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdg_quality_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdg_blocked_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Collections
CREATE POLICY "Authenticated users can manage collection_assignments" ON public.collection_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage collection_promises" ON public.collection_promises FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage collection_visits" ON public.collection_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage collection_communications" ON public.collection_communications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage collection_disputes" ON public.collection_disputes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies - MDG
CREATE POLICY "Authenticated users can manage mdg_change_requests" ON public.mdg_change_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage mdg_stewards" ON public.mdg_stewards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage mdg_quality_rules" ON public.mdg_quality_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage mdg_blocked_records" ON public.mdg_blocked_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_collection_assignments_updated_at BEFORE UPDATE ON public.collection_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_collection_promises_updated_at BEFORE UPDATE ON public.collection_promises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_collection_visits_updated_at BEFORE UPDATE ON public.collection_visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_collection_disputes_updated_at BEFORE UPDATE ON public.collection_disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mdg_change_requests_updated_at BEFORE UPDATE ON public.mdg_change_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mdg_quality_rules_updated_at BEFORE UPDATE ON public.mdg_quality_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
