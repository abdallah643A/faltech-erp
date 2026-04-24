
-- 1. VARIATION & CHANGE-ORDER CONTROL
CREATE TABLE IF NOT EXISTS public.variation_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  project_id UUID REFERENCES public.cpms_projects(id),
  variation_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  variation_type TEXT NOT NULL DEFAULT 'addition',
  status TEXT NOT NULL DEFAULT 'draft',
  requested_by TEXT,
  requested_date DATE DEFAULT CURRENT_DATE,
  approved_by TEXT,
  approved_date DATE,
  cost_impact NUMERIC DEFAULT 0,
  revenue_impact NUMERIC DEFAULT 0,
  margin_impact NUMERIC DEFAULT 0,
  boq_reference TEXT,
  scope_change_summary TEXT,
  justification TEXT,
  rejection_reason TEXT,
  linked_documents JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.variation_orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='variation_orders' AND policyname='Authenticated users can manage variation_orders') THEN
    CREATE POLICY "Authenticated users can manage variation_orders" ON public.variation_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. DEMAND CONSOLIDATION
CREATE TABLE IF NOT EXISTS public.demand_consolidation_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  group_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  consolidation_type TEXT DEFAULT 'by_item',
  item_code TEXT,
  item_description TEXT,
  supplier_category TEXT,
  total_quantity NUMERIC DEFAULT 0,
  estimated_savings NUMERIC DEFAULT 0,
  target_delivery_date DATE,
  branch_ids TEXT[],
  project_ids TEXT[],
  source_request_ids TEXT[],
  consolidated_po_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.demand_consolidation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.demand_consolidation_groups(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'purchase_request',
  source_id UUID,
  source_number TEXT,
  item_code TEXT NOT NULL,
  item_description TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC DEFAULT 0,
  required_date DATE,
  branch_id UUID,
  project_id UUID,
  requester_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.demand_consolidation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_consolidation_lines ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='demand_consolidation_groups' AND policyname='Auth manage demand_consolidation_groups') THEN
    CREATE POLICY "Auth manage demand_consolidation_groups" ON public.demand_consolidation_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='demand_consolidation_lines' AND policyname='Auth manage demand_consolidation_lines') THEN
    CREATE POLICY "Auth manage demand_consolidation_lines" ON public.demand_consolidation_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. VENDOR PORTAL
CREATE TABLE IF NOT EXISTS public.vendor_portal_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  vendor_id UUID REFERENCES public.business_partners(id),
  vendor_code TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  access_token TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  portal_permissions JSONB DEFAULT '{"view_rfqs": true, "submit_quotes": true, "view_payments": true, "upload_docs": true}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.vendor_portal_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES public.vendor_portal_invitations(id),
  vendor_id UUID REFERENCES public.business_partners(id),
  submission_type TEXT NOT NULL DEFAULT 'quotation',
  reference_document TEXT,
  reference_id UUID,
  submitted_data JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'submitted',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.vendor_portal_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendor_portal_invitations' AND policyname='Auth manage vendor_portal_invitations') THEN
    CREATE POLICY "Auth manage vendor_portal_invitations" ON public.vendor_portal_invitations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendor_portal_submissions' AND policyname='Auth manage vendor_portal_submissions') THEN
    CREATE POLICY "Auth manage vendor_portal_submissions" ON public.vendor_portal_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. COMPETENCY MATRICES (training_programs and employee_trainings already exist)
CREATE TABLE IF NOT EXISTS public.competency_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  skill_name TEXT NOT NULL,
  skill_category TEXT DEFAULT 'technical',
  description TEXT,
  required_level INTEGER DEFAULT 1,
  department TEXT,
  role TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.employee_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES public.competency_matrices(id),
  current_level INTEGER DEFAULT 0,
  target_level INTEGER DEFAULT 1,
  assessed_date DATE,
  assessed_by TEXT,
  certification_status TEXT DEFAULT 'none',
  certification_expiry DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.competency_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_competencies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='competency_matrices' AND policyname='Auth manage competency_matrices') THEN
    CREATE POLICY "Auth manage competency_matrices" ON public.competency_matrices FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='employee_competencies' AND policyname='Auth manage employee_competencies') THEN
    CREATE POLICY "Auth manage employee_competencies" ON public.employee_competencies FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
