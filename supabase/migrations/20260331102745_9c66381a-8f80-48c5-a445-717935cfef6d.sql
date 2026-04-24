
-- Create expense category enum
CREATE TYPE public.cpms_expense_category AS ENUM ('materials', 'labor', 'equipment', 'subcontractor', 'permits', 'other');
CREATE TYPE public.cpms_payment_method AS ENUM ('cash', 'check', 'credit_card', 'ach', 'other');

-- Create expenses table
CREATE TABLE public.cpms_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name TEXT NOT NULL,
  project_id UUID REFERENCES public.cpms_projects(id) ON DELETE SET NULL,
  cost_code TEXT,
  category cpms_expense_category NOT NULL DEFAULT 'other',
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  receipt_url TEXT,
  payment_method cpms_payment_method NOT NULL DEFAULT 'other',
  paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.cpms_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses" ON public.cpms_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert expenses" ON public.cpms_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update expenses" ON public.cpms_expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete expenses" ON public.cpms_expenses FOR DELETE TO authenticated USING (true);

-- Updated at trigger
CREATE TRIGGER update_cpms_expenses_updated_at
  BEFORE UPDATE ON public.cpms_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
