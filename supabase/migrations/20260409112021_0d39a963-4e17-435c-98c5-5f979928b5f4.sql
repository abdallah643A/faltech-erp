
-- ECM Tasks
CREATE TABLE public.ecm_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assignee_user_id UUID,
  assignee_name TEXT,
  department TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  progress INTEGER NOT NULL DEFAULT 0,
  linked_document_id UUID REFERENCES public.ecm_documents(id),
  linked_correspondence_id UUID REFERENCES public.ecm_correspondences(id),
  linked_reference TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ECM tasks" ON public.ecm_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_ecm_tasks_updated_at BEFORE UPDATE ON public.ecm_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ECM Memos
CREATE TABLE public.ecm_memos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  body TEXT,
  from_user_id UUID,
  from_name TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  department TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  has_attachment BOOLEAN DEFAULT false,
  company_id UUID REFERENCES public.sap_companies(id),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ECM memos" ON public.ecm_memos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_ecm_memos_updated_at BEFORE UPDATE ON public.ecm_memos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ECM Memo Recipients
CREATE TABLE public.ecm_memo_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memo_id UUID NOT NULL REFERENCES public.ecm_memos(id) ON DELETE CASCADE,
  user_id UUID,
  user_name TEXT,
  recipient_type TEXT NOT NULL DEFAULT 'to',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_memo_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage memo recipients" ON public.ecm_memo_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ECM Signatures
CREATE TABLE public.ecm_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_name TEXT NOT NULL,
  document_id UUID REFERENCES public.ecm_documents(id),
  signer_user_id UUID,
  signer_name TEXT,
  signature_method TEXT DEFAULT 'OTP + Draw',
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting',
  requested_by UUID,
  requested_by_name TEXT,
  requested_department TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecm_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ECM signatures" ON public.ecm_signatures FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_ecm_signatures_updated_at BEFORE UPDATE ON public.ecm_signatures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
