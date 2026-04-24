
-- HR Document Templates
CREATE TABLE public.hr_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  template_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'offer_letter',
  language TEXT NOT NULL DEFAULT 'bilingual',
  subject_en TEXT,
  subject_ar TEXT,
  body_template_en TEXT,
  body_template_ar TEXT,
  placeholders TEXT[] DEFAULT ARRAY['{{employee_name}}','{{employee_name_ar}}','{{position}}','{{department}}','{{salary}}','{{join_date}}','{{company_name}}','{{company_name_ar}}','{{date}}','{{employee_id_number}}'],
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_templates" ON public.hr_document_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_templates" ON public.hr_document_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_templates" ON public.hr_document_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_templates" ON public.hr_document_templates FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_hr_doc_templates_updated_at BEFORE UPDATE ON public.hr_document_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- HR Generated Documents
CREATE TABLE public.hr_generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  template_id UUID REFERENCES public.hr_document_templates(id),
  document_type TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'bilingual',
  reference_number TEXT,
  subject_en TEXT,
  subject_ar TEXT,
  generated_content_en TEXT,
  generated_content_ar TEXT,
  purpose TEXT,
  status TEXT DEFAULT 'draft',
  requested_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_generated_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_gen_docs" ON public.hr_generated_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_gen_docs" ON public.hr_generated_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_gen_docs" ON public.hr_generated_documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_gen_docs" ON public.hr_generated_documents FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_hr_gen_docs_updated_at BEFORE UPDATE ON public.hr_generated_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate reference numbers
CREATE SEQUENCE IF NOT EXISTS hr_doc_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_hr_doc_ref()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := 'HR-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('hr_doc_ref_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hr_doc_ref BEFORE INSERT ON public.hr_generated_documents
FOR EACH ROW EXECUTE FUNCTION public.generate_hr_doc_ref();

-- Seed default bilingual templates
INSERT INTO public.hr_document_templates (template_name, document_type, language, subject_en, subject_ar, body_template_en, body_template_ar) VALUES
('Offer Letter', 'offer_letter', 'bilingual', 'Employment Offer - {{position}}', 'عرض وظيفي - {{position}}',
'Dear {{employee_name}},

We are pleased to offer you the position of {{position}} in the {{department}} department at {{company_name}}.

Your employment will commence on {{join_date}} with a monthly salary of {{salary}} SAR.

This offer is subject to successful completion of all pre-employment requirements.

We look forward to welcoming you to our team.

Sincerely,
Human Resources Department
{{company_name}}',
'السيد/ة {{employee_name_ar}} المحترم/ة،

يسعدنا أن نقدم لكم عرض العمل لشغل منصب {{position}} في قسم {{department}} بشركة {{company_name_ar}}.

سيبدأ عملكم بتاريخ {{join_date}} براتب شهري قدره {{salary}} ريال سعودي.

هذا العرض مشروط بإتمام جميع متطلبات ما قبل التوظيف.

نتطلع إلى انضمامكم لفريق العمل.

مع خالص التحية،
إدارة الموارد البشرية
{{company_name_ar}}'),

('Salary Certificate', 'salary_certificate', 'bilingual', 'Salary Certificate - {{employee_name}}', 'شهادة راتب - {{employee_name_ar}}',
'To Whom It May Concern,

This is to certify that {{employee_name}}, holding Employee ID {{employee_id_number}}, is employed at {{company_name}} as {{position}} in the {{department}} department since {{join_date}}.

Their current monthly salary is {{salary}} SAR.

This certificate is issued upon the employee''s request for {{purpose}}.

Human Resources Department
{{company_name}}
Date: {{date}}',
'إلى من يهمه الأمر،

نفيد بأن {{employee_name_ar}}، رقم الموظف {{employee_id_number}}، يعمل/تعمل لدى {{company_name_ar}} بمنصب {{position}} في قسم {{department}} منذ {{join_date}}.

الراتب الشهري الحالي: {{salary}} ريال سعودي.

صدرت هذه الشهادة بناءً على طلب الموظف/ة لغرض {{purpose}}.

إدارة الموارد البشرية
{{company_name_ar}}
التاريخ: {{date}}'),

('Experience Certificate', 'experience_certificate', 'bilingual', 'Experience Certificate - {{employee_name}}', 'شهادة خبرة - {{employee_name_ar}}',
'To Whom It May Concern,

This is to certify that {{employee_name}} was employed at {{company_name}} from {{join_date}} to {{end_date}} as {{position}} in the {{department}} department.

During their tenure, they demonstrated professionalism and dedication in their responsibilities.

We wish them all the best in their future endeavors.

Human Resources Department
{{company_name}}
Date: {{date}}',
'إلى من يهمه الأمر،

نشهد بأن {{employee_name_ar}} قد عمل/عملت لدى {{company_name_ar}} في الفترة من {{join_date}} إلى {{end_date}} بمنصب {{position}} في قسم {{department}}.

وقد أظهر/أظهرت خلال فترة عمله/ها التزاماً ومهنية في أداء المهام الموكلة إليه/ها.

نتمنى له/لها التوفيق في مسيرته/ها المهنية.

إدارة الموارد البشرية
{{company_name_ar}}
التاريخ: {{date}}'),

('Warning Letter', 'warning_letter', 'bilingual', 'Warning Letter - {{employee_name}}', 'خطاب إنذار - {{employee_name_ar}}',
'Dear {{employee_name}},

Subject: {{warning_level}} Warning

This letter serves as a {{warning_level}} warning regarding {{violation_description}}.

Date of Incident: {{incident_date}}

You are required to take immediate corrective action. Failure to comply may result in further disciplinary action.

Human Resources Department
{{company_name}}
Date: {{date}}',
'السيد/ة {{employee_name_ar}} المحترم/ة،

الموضوع: إنذار {{warning_level}}

يعتبر هذا الخطاب بمثابة إنذار {{warning_level}} بشأن {{violation_description}}.

تاريخ الواقعة: {{incident_date}}

يُطلب منكم اتخاذ إجراء تصحيحي فوري. عدم الامتثال قد يؤدي إلى إجراءات تأديبية إضافية.

إدارة الموارد البشرية
{{company_name_ar}}
التاريخ: {{date}}'),

('NOC Letter', 'noc', 'bilingual', 'No Objection Certificate - {{employee_name}}', 'شهادة عدم ممانعة - {{employee_name_ar}}',
'To Whom It May Concern,

This is to certify that {{company_name}} has no objection to {{employee_name}}, Employee ID {{employee_id_number}}, {{position}} in the {{department}} department, for the purpose of {{purpose}}.

This certificate is valid for {{validity_period}}.

Human Resources Department
{{company_name}}
Date: {{date}}',
'إلى من يهمه الأمر،

نفيد بأن {{company_name_ar}} لا تمانع في قيام الموظف/ة {{employee_name_ar}}، رقم الموظف {{employee_id_number}}، {{position}} في قسم {{department}}، بغرض {{purpose}}.

هذه الشهادة صالحة لمدة {{validity_period}}.

إدارة الموارد البشرية
{{company_name_ar}}
التاريخ: {{date}}'),

('Employment Contract', 'contract', 'bilingual', 'Employment Contract - {{employee_name}}', 'عقد عمل - {{employee_name_ar}}',
'EMPLOYMENT CONTRACT

Between: {{company_name}} ("Employer")
And: {{employee_name}} ("Employee")

Position: {{position}}
Department: {{department}}
Start Date: {{join_date}}
Monthly Salary: {{salary}} SAR
Probation Period: {{probation_period}}

Terms and Conditions:
1. Working hours shall be as per company policy.
2. The employee is entitled to annual leave as per labor law.
3. This contract is governed by the laws of the Kingdom of Saudi Arabia.

Employer Signature: ________________
Employee Signature: ________________

Date: {{date}}',
'عقد عمل

بين: {{company_name_ar}} ("صاحب العمل")
و: {{employee_name_ar}} ("الموظف")

المسمى الوظيفي: {{position}}
القسم: {{department}}
تاريخ البدء: {{join_date}}
الراتب الشهري: {{salary}} ريال سعودي
فترة التجربة: {{probation_period}}

الشروط والأحكام:
١. تكون ساعات العمل وفقاً لسياسة الشركة.
٢. يحق للموظف إجازة سنوية وفقاً لنظام العمل.
٣. يخضع هذا العقد لأنظمة المملكة العربية السعودية.

توقيع صاحب العمل: ________________
توقيع الموظف: ________________

التاريخ: {{date}}'),

('Policy Acknowledgement', 'policy_acknowledgement', 'bilingual', 'Policy Acknowledgement', 'إقرار بالسياسة',
'ACKNOWLEDGEMENT OF RECEIPT

I, {{employee_name}}, Employee ID {{employee_id_number}}, acknowledge that I have received, read, and understood the {{policy_name}} policy of {{company_name}}.

I agree to comply with all terms and conditions outlined in the policy.

Employee Signature: ________________
Date: {{date}}',
'إقرار باستلام

أنا، {{employee_name_ar}}، رقم الموظف {{employee_id_number}}، أقر بأنني استلمت وقرأت وفهمت سياسة {{policy_name}} الخاصة بشركة {{company_name_ar}}.

أوافق على الالتزام بجميع الشروط والأحكام الواردة في السياسة.

توقيع الموظف: ________________
التاريخ: {{date}}');
