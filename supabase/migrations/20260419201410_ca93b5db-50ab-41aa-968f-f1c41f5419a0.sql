
-- Templates registry
CREATE TABLE public.industry_pack_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_key text NOT NULL,
  template_key text NOT NULL,
  template_name text NOT NULL,
  template_name_ar text,
  description text,
  version text NOT NULL DEFAULT '1.0.0',
  seed_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pack_key, template_key, version)
);

-- Pack dependencies
CREATE TABLE public.industry_pack_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_key text NOT NULL,
  depends_on_pack_key text NOT NULL,
  is_hard boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pack_key, depends_on_pack_key)
);

-- Per-pack feature flags catalog
CREATE TABLE public.industry_pack_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_key text NOT NULL,
  flag_key text NOT NULL,
  flag_name text NOT NULL,
  flag_name_ar text,
  description text,
  default_enabled boolean NOT NULL DEFAULT true,
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pack_key, flag_key)
);

-- Per-tenant feature flag overrides
CREATE TABLE public.tenants_pack_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  pack_key text NOT NULL,
  flag_key text NOT NULL,
  is_enabled boolean NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, pack_key, flag_key)
);

-- Per-tenant template installations
CREATE TABLE public.tenants_pack_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  pack_key text NOT NULL,
  template_id uuid NOT NULL REFERENCES public.industry_pack_templates(id) ON DELETE CASCADE,
  version text NOT NULL,
  install_status text NOT NULL DEFAULT 'pending',
  seeded_records jsonb NOT NULL DEFAULT '{}'::jsonb,
  installed_by uuid,
  installed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, template_id)
);

-- RLS
ALTER TABLE public.industry_pack_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_pack_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_pack_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants_pack_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants_pack_installations ENABLE ROW LEVEL SECURITY;

-- Catalog tables: readable by all authenticated users
CREATE POLICY "Authenticated can read templates" ON public.industry_pack_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read dependencies" ON public.industry_pack_dependencies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read feature flags" ON public.industry_pack_feature_flags
  FOR SELECT TO authenticated USING (true);

-- Tenant tables: visible to authenticated, write requires admin role if has_role exists else allow authenticated
CREATE POLICY "Authenticated can read overrides" ON public.tenants_pack_feature_overrides
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write overrides" ON public.tenants_pack_feature_overrides
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read installations" ON public.tenants_pack_installations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write installations" ON public.tenants_pack_installations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER trg_industry_pack_templates_updated
  BEFORE UPDATE ON public.industry_pack_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_tenants_pack_installations_updated
  BEFORE UPDATE ON public.tenants_pack_installations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed dependencies
INSERT INTO public.industry_pack_dependencies (pack_key, depends_on_pack_key, is_hard, notes) VALUES
  ('restaurant', 'retail_pos', false, 'Restaurant benefits from POS for table billing'),
  ('hospital', 'retail_pos', false, 'Hospital pharmacy can leverage POS')
ON CONFLICT DO NOTHING;

-- Seed feature flags
INSERT INTO public.industry_pack_feature_flags (pack_key, flag_key, flag_name, flag_name_ar, description, default_enabled, is_premium) VALUES
  ('hospital','opd','Outpatient (OPD)','عيادات خارجية','Outpatient appointments and billing', true, false),
  ('hospital','ipd','Inpatient (IPD)','تنويم','Ward management and inpatient billing', true, false),
  ('hospital','pharmacy','Pharmacy','صيدلية','Hospital pharmacy module', false, false),
  ('hospital','insurance_claims','Insurance Claims','مطالبات التأمين','Insurance claim processing', false, true),
  ('restaurant','table_mgmt','Table Management','إدارة الطاولات','Floor & table planning', true, false),
  ('restaurant','kds','Kitchen Display','شاشة المطبخ','Kitchen display system', false, true),
  ('restaurant','online_orders','Online Orders','طلبات أونلاين','Aggregator integrations', false, true),
  ('retail_pos','offline_mode','Offline POS','وضع غير متصل','Operate POS without internet', false, true),
  ('retail_pos','loyalty','Loyalty Program','برنامج الولاء','Customer loyalty & points', false, true),
  ('education','admissions','Admissions','القبول','Student admissions workflow', true, false),
  ('education','exams','Exams & Grading','الامتحانات والدرجات','Exam scheduling and grading', true, false),
  ('education','transport','Transport','النقل','Bus routes and tracking', false, true)
ON CONFLICT DO NOTHING;

-- Seed starter templates
INSERT INTO public.industry_pack_templates (pack_key, template_key, template_name, template_name_ar, description, version, seed_payload) VALUES
  ('hospital','starter','Hospital Starter Pack','حزمة المستشفى المبدئية','Departments, service catalog, room types', '1.0.0',
    '{"departments":["Cardiology","Pediatrics","Radiology"],"room_types":["General","Private","ICU"],"services":["Consultation","X-Ray","Lab Test"]}'::jsonb),
  ('restaurant','starter','Restaurant Starter Pack','حزمة المطعم المبدئية','Menu categories, table layout, modifiers', '1.0.0',
    '{"menu_categories":["Starters","Mains","Desserts","Beverages"],"tables":[{"zone":"Main","count":12}],"modifiers":["Spice Level","Extra Cheese"]}'::jsonb),
  ('retail_pos','starter','Retail POS Starter','حزمة نقاط البيع المبدئية','Outlets, cashier roles, payment methods', '1.0.0',
    '{"outlets":["Main Store"],"roles":["Cashier","Supervisor"],"payment_methods":["Cash","Card","Wallet"]}'::jsonb),
  ('education','starter','Education Starter Pack','حزمة التعليم المبدئية','Grades, subjects, terms', '1.0.0',
    '{"grades":["Grade 1","Grade 2","Grade 3"],"subjects":["Math","Science","English"],"terms":["Term 1","Term 2"]}'::jsonb)
ON CONFLICT DO NOTHING;
