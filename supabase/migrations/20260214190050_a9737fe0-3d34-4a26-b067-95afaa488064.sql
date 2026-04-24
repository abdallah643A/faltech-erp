
-- =============================================
-- 1. Configuration Tables: Regions → Companies → Branches
-- =============================================

CREATE TABLE public.regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view regions" ON public.regions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage regions" ON public.regions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view companies" ON public.companies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage companies" ON public.companies
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view branches" ON public.branches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage branches" ON public.branches
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 2. User Branch Assignments (many-to-many)
-- =============================================

CREATE TABLE public.user_branch_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, branch_id)
);

ALTER TABLE public.user_branch_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignments" ON public.user_branch_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage assignments" ON public.user_branch_assignments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 3. Add branch_id to transaction tables
-- =============================================

ALTER TABLE public.sales_orders ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.ar_invoices ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.incoming_payments ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.quotes ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.opportunities ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.material_requests ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.leads ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.activities ADD COLUMN branch_id UUID REFERENCES public.branches(id);

-- =============================================
-- 4. Helper functions for branch-based access
-- =============================================

-- Get all branch IDs assigned to a user
CREATE OR REPLACE FUNCTION public.get_user_branch_ids(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(branch_id), ARRAY[]::UUID[])
  FROM user_branch_assignments
  WHERE user_id = _user_id;
$$;

-- Get all branch IDs in the regions assigned to a user (for region managers)
CREATE OR REPLACE FUNCTION public.get_user_region_branch_ids(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(b.id), ARRAY[]::UUID[])
  FROM branches b
  JOIN companies c ON c.id = b.company_id
  JOIN regions r ON r.id = c.region_id
  WHERE r.id IN (
    SELECT DISTINCT c2.region_id
    FROM user_branch_assignments uba
    JOIN branches b2 ON b2.id = uba.branch_id
    JOIN companies c2 ON c2.id = b2.company_id
    WHERE uba.user_id = _user_id
  );
$$;

-- Check if a user can access a specific branch (considering role)
CREATE OR REPLACE FUNCTION public.can_access_branch(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE
      -- Admin/manager can access everything
      WHEN has_any_role(_user_id, ARRAY['admin'::app_role, 'manager'::app_role]) THEN true
      -- No branch assigned = record visible to all
      WHEN _branch_id IS NULL THEN true
      -- Region manager: can access all branches in their regions
      WHEN has_role(_user_id, 'region_manager') THEN 
        _branch_id = ANY(get_user_region_branch_ids(_user_id))
      -- Branch manager: can access only their assigned branches
      WHEN has_role(_user_id, 'branch_manager') THEN 
        _branch_id = ANY(get_user_branch_ids(_user_id))
      -- Other users: can access all
      ELSE true
    END;
$$;

-- =============================================
-- 5. Update master data RLS to be accessible to all authenticated
-- =============================================

-- Items: ensure all authenticated can view
DROP POLICY IF EXISTS "Items are viewable by all authenticated users" ON public.items;
CREATE POLICY "Items are viewable by all authenticated users" ON public.items
  FOR SELECT TO authenticated USING (true);

-- Business Partners: make accessible to all authenticated
DROP POLICY IF EXISTS "Users can view assigned or managed business partners" ON public.business_partners;
CREATE POLICY "All authenticated can view business partners" ON public.business_partners
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- 6. Update transaction RLS policies for branch-based access
-- =============================================

-- Sales Orders
DROP POLICY IF EXISTS "Sales orders are viewable by authenticated users" ON public.sales_orders;
CREATE POLICY "Sales orders branch-filtered access" ON public.sales_orders
  FOR SELECT TO authenticated
  USING (can_access_branch(auth.uid(), branch_id));

-- AR Invoices
DROP POLICY IF EXISTS "AR invoices are viewable by authenticated users" ON public.ar_invoices;
CREATE POLICY "AR invoices branch-filtered access" ON public.ar_invoices
  FOR SELECT TO authenticated
  USING (can_access_branch(auth.uid(), branch_id));

-- Incoming Payments
DROP POLICY IF EXISTS "Incoming payments are viewable by authenticated users" ON public.incoming_payments;
CREATE POLICY "Incoming payments branch-filtered access" ON public.incoming_payments
  FOR SELECT TO authenticated
  USING (can_access_branch(auth.uid(), branch_id));

-- Quotes
DROP POLICY IF EXISTS "Quotes are viewable by authenticated users" ON public.quotes;
CREATE POLICY "Quotes branch-filtered access" ON public.quotes
  FOR SELECT TO authenticated
  USING (can_access_branch(auth.uid(), branch_id));

-- Opportunities
DROP POLICY IF EXISTS "Opportunities are viewable by authenticated users" ON public.opportunities;
CREATE POLICY "Opportunities branch-filtered access" ON public.opportunities
  FOR SELECT TO authenticated
  USING (can_access_branch(auth.uid(), branch_id));

-- Material Requests
DROP POLICY IF EXISTS "Material requests are viewable by authenticated users" ON public.material_requests;
CREATE POLICY "Material requests branch-filtered access" ON public.material_requests
  FOR SELECT TO authenticated
  USING (can_access_branch(auth.uid(), branch_id));

-- Leads
DROP POLICY IF EXISTS "Leads are viewable by authenticated users" ON public.leads;
CREATE POLICY "Leads branch-filtered access" ON public.leads
  FOR SELECT TO authenticated
  USING (can_access_branch(auth.uid(), branch_id));

-- Activities
DROP POLICY IF EXISTS "Activities are viewable by authenticated users" ON public.activities;
CREATE POLICY "Activities branch-filtered access" ON public.activities
  FOR SELECT TO authenticated
  USING (can_access_branch(auth.uid(), branch_id));

-- Triggers for updated_at
CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
