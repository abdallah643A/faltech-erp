
-- ============================================================
-- SaaS Multi-Tenant Subscription & Access Control Schema
-- ============================================================

-- 1. Module Definitions (master list of all ERP modules)
CREATE TABLE public.saas_module_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  module_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  monthly_price NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tenants (client accounts)
CREATE TABLE public.saas_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name TEXT NOT NULL,
  tenant_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active','suspended','trial','expired','pending')),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  address TEXT,
  country TEXT DEFAULT 'SA',
  timezone TEXT DEFAULT 'Asia/Riyadh',
  settings JSONB DEFAULT '{}',
  max_companies INT DEFAULT 1,
  max_storage_gb INT DEFAULT 10,
  trial_ends_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Subscription Plans
CREATE TABLE public.saas_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL,
  plan_code TEXT NOT NULL UNIQUE,
  description TEXT,
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('free','starter','standard','professional','enterprise')),
  price_per_user NUMERIC(10,2) DEFAULT 0,
  base_price NUMERIC(10,2) DEFAULT 0,
  max_seats INT,
  max_companies INT DEFAULT 1,
  max_storage_gb INT DEFAULT 10,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','quarterly','annual')),
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Plan-Module mapping (which modules come with each plan)
CREATE TABLE public.saas_plan_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.saas_subscription_plans(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.saas_module_definitions(id) ON DELETE CASCADE,
  is_included BOOLEAN DEFAULT true,
  is_addon BOOLEAN DEFAULT false,
  addon_price NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, module_id)
);

-- 5. Tenant Subscriptions (active subscription per tenant)
CREATE TABLE public.saas_tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.saas_subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','suspended','pending')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  renewal_date DATE,
  grace_period_days INT DEFAULT 15,
  max_seats INT DEFAULT 5,
  billing_status TEXT DEFAULT 'current' CHECK (billing_status IN ('current','overdue','suspended','cancelled')),
  monthly_total NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- 6. Tenant Module overrides
CREATE TABLE public.saas_tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.saas_module_definitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled','disabled','trial','suspended')),
  trial_ends_at TIMESTAMPTZ,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  disabled_at TIMESTAMPTZ,
  enabled_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, module_id)
);

-- 7. Tenant-Company mapping
CREATE TABLE public.saas_tenant_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, company_id)
);

-- 8. User-level company access
CREATE TABLE public.saas_tenant_user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id, company_id)
);

-- 9. User-level branch access
CREATE TABLE public.saas_tenant_user_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id, branch_id)
);

-- 10. Feature Entitlements
CREATE TABLE public.saas_feature_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  limit_value INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, feature_key)
);

-- 11. Seat Licenses
CREATE TABLE public.saas_seat_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  seat_type TEXT DEFAULT 'full' CHECK (seat_type IN ('full','readonly','limited')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','deactivated','suspended')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  deactivated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- 12. Usage Records
CREATE TABLE public.saas_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL,
  usage_value NUMERIC DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 13. SaaS Audit Logs
CREATE TABLE public.saas_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.saas_tenants(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  performed_by UUID,
  performed_by_name TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add tenant_id to profiles table for tenant user mapping
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.saas_tenants(id);

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE public.saas_module_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plan_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_tenant_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_tenant_user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_tenant_user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_seat_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: check if user is super admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_saas_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Helper: get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Module definitions: readable by all authenticated
CREATE POLICY "Authenticated can read modules" ON public.saas_module_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage modules" ON public.saas_module_definitions FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));

-- Tenants: admins see all, tenant users see own
CREATE POLICY "Admins manage tenants" ON public.saas_tenants FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "Tenant users see own" ON public.saas_tenants FOR SELECT TO authenticated USING (id = public.get_user_tenant_id(auth.uid()));

-- Plans: readable by all authenticated
CREATE POLICY "Authenticated read plans" ON public.saas_subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage plans" ON public.saas_subscription_plans FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));

-- Plan modules: readable by all
CREATE POLICY "Authenticated read plan modules" ON public.saas_plan_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage plan modules" ON public.saas_plan_modules FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));

-- Tenant subscriptions
CREATE POLICY "Admins manage subscriptions" ON public.saas_tenant_subscriptions FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "Tenant sees own subscription" ON public.saas_tenant_subscriptions FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Tenant modules
CREATE POLICY "Admins manage tenant modules" ON public.saas_tenant_modules FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "Tenant sees own modules" ON public.saas_tenant_modules FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Tenant companies
CREATE POLICY "Admins manage tenant companies" ON public.saas_tenant_companies FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "Tenant sees own companies" ON public.saas_tenant_companies FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- User companies
CREATE POLICY "Admins manage user companies" ON public.saas_tenant_user_companies FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "Users see own company access" ON public.saas_tenant_user_companies FOR SELECT TO authenticated USING (user_id = auth.uid());

-- User branches
CREATE POLICY "Admins manage user branches" ON public.saas_tenant_user_branches FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "Users see own branch access" ON public.saas_tenant_user_branches FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Feature entitlements
CREATE POLICY "Admins manage entitlements" ON public.saas_feature_entitlements FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "Tenant sees own entitlements" ON public.saas_feature_entitlements FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Seat licenses
CREATE POLICY "Admins manage seats" ON public.saas_seat_licenses FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "Users see own seat" ON public.saas_seat_licenses FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Usage records
CREATE POLICY "Admins read usage" ON public.saas_usage_records FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "Tenant sees own usage" ON public.saas_usage_records FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Audit logs
CREATE POLICY "Admins read audit" ON public.saas_audit_logs FOR ALL TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "Tenant reads own audit" ON public.saas_audit_logs FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_saas_tenants_status ON public.saas_tenants(status);
CREATE INDEX idx_saas_tenants_slug ON public.saas_tenants(tenant_slug);
CREATE INDEX idx_saas_tenant_subs_tenant ON public.saas_tenant_subscriptions(tenant_id);
CREATE INDEX idx_saas_tenant_modules_tenant ON public.saas_tenant_modules(tenant_id);
CREATE INDEX idx_saas_tenant_companies_tenant ON public.saas_tenant_companies(tenant_id);
CREATE INDEX idx_saas_user_companies_user ON public.saas_tenant_user_companies(user_id);
CREATE INDEX idx_saas_user_branches_user ON public.saas_tenant_user_branches(user_id);
CREATE INDEX idx_saas_seat_licenses_tenant ON public.saas_seat_licenses(tenant_id);
CREATE INDEX idx_saas_audit_logs_tenant ON public.saas_audit_logs(tenant_id);
CREATE INDEX idx_saas_audit_logs_created ON public.saas_audit_logs(created_at);
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);

-- ============================================================
-- Timestamp triggers
-- ============================================================
CREATE TRIGGER update_saas_tenants_updated_at BEFORE UPDATE ON public.saas_tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_saas_plans_updated_at BEFORE UPDATE ON public.saas_subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_saas_tenant_subs_updated_at BEFORE UPDATE ON public.saas_tenant_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_saas_tenant_modules_updated_at BEFORE UPDATE ON public.saas_tenant_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_saas_feature_entitlements_updated_at BEFORE UPDATE ON public.saas_feature_entitlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Seed module definitions from existing routeToModuleKey map
-- ============================================================
INSERT INTO public.saas_module_definitions (module_key, module_name, category, sort_order, is_premium) VALUES
('dashboard', 'Dashboard', 'Core', 1, false),
('leads', 'Leads', 'Sales', 10, false),
('opportunities', 'Opportunities', 'Sales', 11, false),
('activities', 'Activities', 'Sales', 12, false),
('tasks', 'Tasks', 'Core', 13, false),
('visits', 'Visits', 'Sales', 14, false),
('visitAnalytics', 'Visit Analytics', 'Sales', 15, false),
('businessPartners', 'Business Partners', 'Core', 20, false),
('items', 'Items', 'Core', 21, false),
('quotes', 'Quotes', 'Sales', 30, false),
('salesOrders', 'Sales Orders', 'Sales', 31, false),
('arInvoices', 'AR Invoices', 'Sales', 32, false),
('incomingPayments', 'Incoming Payments', 'Finance', 33, false),
('materialRequests', 'Material Requests', 'Procurement', 40, false),
('mrWorkflow', 'MR Workflow', 'Procurement', 41, false),
('financeOverview', 'Finance Overview', 'Finance', 50, false),
('financeGates', 'Finance Gates', 'Finance', 51, false),
('hrDashboard', 'HR Dashboard', 'HR', 60, false),
('employees', 'Employees', 'HR', 61, false),
('departments', 'Departments', 'HR', 62, false),
('positions', 'Positions', 'HR', 63, false),
('leaveManagement', 'Leave Management', 'HR', 64, false),
('attendance', 'Attendance', 'HR', 65, false),
('payroll', 'Payroll', 'HR', 66, true),
('performance', 'Performance', 'HR', 67, false),
('technicalAssessment', 'Technical Assessment', 'Operations', 70, true),
('designCosting', 'Design & Costing', 'Operations', 71, true),
('manufacturing', 'Manufacturing', 'Operations', 72, true),
('deliveryInstallation', 'Delivery & Installation', 'Operations', 73, true),
('projects', 'Projects', 'Projects', 80, false),
('targets', 'Targets', 'Sales', 81, false),
('assets', 'Inventory & Assets', 'Inventory', 90, false),
('itService', 'IT Service', 'IT', 100, true),
('reports', 'Reports', 'Core', 110, false),
('adminPanel', 'Admin Panel', 'Admin', 120, false),
('adminSettings', 'Admin Settings', 'Admin', 121, false),
('users', 'Users', 'Admin', 122, false),
('workflow', 'Workflow', 'Admin', 123, false),
('authorization', 'Authorization', 'Admin', 124, false),
('sapIntegration', 'SAP Integration', 'Integration', 130, true),
('whatsappSettings', 'WhatsApp Settings', 'Integration', 131, true);
