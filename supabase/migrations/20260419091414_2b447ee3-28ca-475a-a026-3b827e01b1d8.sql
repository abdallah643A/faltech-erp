
-- ============ DOCUMENT NUMBERING ============
CREATE TABLE IF NOT EXISTS public.document_numbering (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  series_name TEXT NOT NULL DEFAULT 'Primary',
  prefix TEXT,
  suffix TEXT,
  first_number INTEGER NOT NULL DEFAULT 1,
  last_number INTEGER,
  next_number INTEGER NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (company_id, doc_type, series_name)
);
CREATE INDEX IF NOT EXISTS idx_doc_numbering_company ON public.document_numbering(company_id);
ALTER TABLE public.document_numbering ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read document_numbering" ON public.document_numbering FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write document_numbering" ON public.document_numbering FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update document_numbering" ON public.document_numbering FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete document_numbering" ON public.document_numbering FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_document_numbering_updated BEFORE UPDATE ON public.document_numbering FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ POSTING PERIODS ============
CREATE TABLE IF NOT EXISTS public.posting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL, -- e.g. '2026-04'
  fiscal_year INTEGER,
  period_number INTEGER, -- 1..12
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','locked')),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, period_name)
);
CREATE INDEX IF NOT EXISTS idx_posting_periods_company ON public.posting_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_posting_periods_status ON public.posting_periods(status);
ALTER TABLE public.posting_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read posting_periods" ON public.posting_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write posting_periods" ON public.posting_periods FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update posting_periods" ON public.posting_periods FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete posting_periods" ON public.posting_periods FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_posting_periods_updated BEFORE UPDATE ON public.posting_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ WORKFLOW TASKS ============
CREATE TABLE IF NOT EXISTS public.workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled','blocked')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date DATE,
  assigned_to UUID,
  assigned_to_name TEXT,
  related_doc_type TEXT,
  related_doc_id UUID,
  related_doc_number TEXT,
  module TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON public.workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned ON public.workflow_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_due ON public.workflow_tasks(due_date);
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read workflow_tasks" ON public.workflow_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write workflow_tasks" ON public.workflow_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update workflow_tasks" ON public.workflow_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete workflow_tasks" ON public.workflow_tasks FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_workflow_tasks_updated BEFORE UPDATE ON public.workflow_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INVENTORY TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE SET NULL,
  branch_id UUID,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in','out','transfer','adjustment','count','return','consume')),
  reference_doc_type TEXT,
  reference_doc_id UUID,
  reference_doc_number TEXT,
  item_id UUID,
  item_code TEXT NOT NULL,
  item_description TEXT,
  warehouse TEXT,
  from_warehouse TEXT,
  to_warehouse TEXT,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit TEXT,
  unit_cost NUMERIC(18,4),
  total_cost NUMERIC(18,4),
  batch_no TEXT,
  serial_no TEXT,
  notes TEXT,
  posted_by UUID,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_tx_item ON public.inventory_transactions(item_code);
CREATE INDEX IF NOT EXISTS idx_inv_tx_warehouse ON public.inventory_transactions(warehouse);
CREATE INDEX IF NOT EXISTS idx_inv_tx_type ON public.inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inv_tx_posted_at ON public.inventory_transactions(posted_at DESC);
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read inventory_transactions" ON public.inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write inventory_transactions" ON public.inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update inventory_transactions" ON public.inventory_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete inventory_transactions" ON public.inventory_transactions FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_inv_tx_updated BEFORE UPDATE ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CONTACTS ============
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE SET NULL,
  business_partner_id UUID REFERENCES public.business_partners(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  position TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contacts_bp ON public.contacts(business_partner_id);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read contacts" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update contacts" ON public.contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete contacts" ON public.contacts FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ COMPATIBILITY VIEWS ============
-- inventory_counting_sessions → inventory_countings
CREATE OR REPLACE VIEW public.inventory_counting_sessions AS
  SELECT * FROM public.inventory_countings;

-- employee_trainings → training_enrollments
CREATE OR REPLACE VIEW public.employee_trainings AS
  SELECT * FROM public.training_enrollments;

-- sales_quotations → quotes (with doc_num alias)
CREATE OR REPLACE VIEW public.sales_quotations AS
  SELECT q.*, q.quote_number AS doc_num FROM public.quotes q;

-- cpms_subcontractor_orders → cpms_subcontract_orders
CREATE OR REPLACE VIEW public.cpms_subcontractor_orders AS
  SELECT * FROM public.cpms_subcontract_orders;
