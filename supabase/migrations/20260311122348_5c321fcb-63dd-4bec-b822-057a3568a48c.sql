
-- SAP Companies table (mirrors SAP B1 "Choose Company" list)
CREATE TABLE public.sap_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  database_name TEXT NOT NULL,
  service_layer_url TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  localization TEXT DEFAULT 'UK International',
  version TEXT DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(database_name)
);

-- User-Company assignments (many-to-many)
CREATE TABLE public.user_company_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Add active_company_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_company_id UUID REFERENCES public.sap_companies(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.sap_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_company_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for sap_companies
CREATE POLICY "Authenticated users can view active companies" ON public.sap_companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage companies" ON public.sap_companies
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

-- RLS policies for user_company_assignments
CREATE POLICY "Users can view own assignments" ON public.user_company_assignments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all assignments" ON public.user_company_assignments
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can manage assignments" ON public.user_company_assignments
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );
