-- Seed default supplier onboarding questions (idempotent)
INSERT INTO public.supplier_onboarding_questions (category, question_en, question_ar, answer_type, options, weight, is_required, sort_order, is_active)
SELECT * FROM (VALUES
  ('Legal',      'Is your company legally registered with a valid commercial registration?', 'هل شركتك مسجلة قانونياً ولديها سجل تجاري ساري؟',                'boolean',     '[]'::jsonb, 10, true,  10, true),
  ('Legal',      'Provide your VAT / Tax registration number',                              'يرجى تقديم رقم تسجيل ضريبة القيمة المضافة',                       'text',        '[]'::jsonb,  8, true,  20, true),
  ('Legal',      'Country of incorporation',                                                'بلد التأسيس',                                                     'text',        '[]'::jsonb,  4, true,  30, true),
  ('Financial',  'Approximate annual revenue (USD)',                                        'الإيرادات السنوية التقريبية (دولار أمريكي)',                       'number',      '[]'::jsonb,  6, false, 40, true),
  ('Financial',  'Do you provide audited financial statements for the last 2 years?',       'هل تقدم بيانات مالية مدققة لآخر سنتين؟',                          'boolean',     '[]'::jsonb,  8, true,  50, true),
  ('Financial',  'Preferred payment terms',                                                 'شروط الدفع المفضلة',                                              'select',      '["Net 15","Net 30","Net 45","Net 60","Net 90"]'::jsonb, 4, true, 60, true),
  ('Compliance', 'Do you comply with anti-bribery and anti-corruption policies?',           'هل تلتزم بسياسات مكافحة الرشوة والفساد؟',                          'boolean',     '[]'::jsonb, 10, true,  70, true),
  ('Compliance', 'Are you on any sanctions or denied-party list?',                          'هل أنت مدرج في أي قائمة عقوبات أو حظر؟',                         'boolean',     '[]'::jsonb, 15, true,  80, true),
  ('Quality',    'Do you hold ISO 9001 (or equivalent) certification?',                     'هل لديك شهادة ISO 9001 (أو ما يعادلها)؟',                         'boolean',     '[]'::jsonb,  6, false, 90, true),
  ('Quality',    'Categories of goods/services you supply',                                 'فئات السلع/الخدمات التي توردها',                                  'multiselect', '["Raw Materials","Equipment","Services","IT","Logistics","Construction","Consulting","Other"]'::jsonb, 5, true, 100, true),
  ('References', 'List 3 client references (name, contact, scope)',                         'اذكر 3 مراجع لعملاء (الاسم، جهة الاتصال، النطاق)',               'text',        '[]'::jsonb,  6, false, 110, true),
  ('References', 'Years of experience in this industry',                                    'سنوات الخبرة في هذا المجال',                                       'number',      '[]'::jsonb,  4, false, 120, true)
) AS v(category, question_en, question_ar, answer_type, options, weight, is_required, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.supplier_onboarding_questions);

-- Seed default approval thresholds (global / company_id NULL applies to all companies until overridden)
INSERT INTO public.procurement_approval_thresholds (company_id, doc_type, cost_center_code, vendor_category, min_amount, max_amount, approver_roles, approval_level, is_active)
SELECT * FROM (VALUES
  -- Purchase Requests
  (NULL::uuid, 'purchase_request', NULL::text, NULL::text,      0,  10000::numeric, ARRAY['buyer']::text[],            1, true),
  (NULL::uuid, 'purchase_request', NULL::text, NULL::text,  10000, 100000::numeric, ARRAY['procurement_manager']::text[], 2, true),
  (NULL::uuid, 'purchase_request', NULL::text, NULL::text, 100000,   NULL::numeric, ARRAY['finance_director','procurement_director']::text[], 3, true),
  -- Purchase Orders
  (NULL::uuid, 'purchase_order',   NULL::text, NULL::text,      0,  25000::numeric, ARRAY['buyer']::text[],            1, true),
  (NULL::uuid, 'purchase_order',   NULL::text, NULL::text,  25000, 250000::numeric, ARRAY['procurement_manager']::text[], 2, true),
  (NULL::uuid, 'purchase_order',   NULL::text, NULL::text, 250000,   NULL::numeric, ARRAY['finance_director','ceo']::text[], 3, true),
  -- AP Invoices
  (NULL::uuid, 'ap_invoice',       NULL::text, NULL::text,      0,  50000::numeric, ARRAY['ap_clerk']::text[],         1, true),
  (NULL::uuid, 'ap_invoice',       NULL::text, NULL::text,  50000, 500000::numeric, ARRAY['ap_manager']::text[],       2, true),
  (NULL::uuid, 'ap_invoice',       NULL::text, NULL::text, 500000,   NULL::numeric, ARRAY['cfo']::text[],              3, true)
) AS v(company_id, doc_type, cost_center_code, vendor_category, min_amount, max_amount, approver_roles, approval_level, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.procurement_approval_thresholds);
