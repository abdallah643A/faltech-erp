
-- Expense claims table
CREATE TABLE public.expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.employees(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expense claim lines for itemized expenses
CREATE TABLE public.expense_claim_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_claim_id UUID NOT NULL REFERENCES public.expense_claims(id) ON DELETE CASCADE,
  line_num INT NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  category TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  receipt_url TEXT,
  expense_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sequence for claim numbers
CREATE SEQUENCE IF NOT EXISTS expense_claim_number_seq START 1;

-- Enable RLS
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claim_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense_claims
CREATE POLICY "Authenticated users can view expense claims" ON public.expense_claims
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert expense claims" ON public.expense_claims
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update expense claims" ON public.expense_claims
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete expense claims" ON public.expense_claims
  FOR DELETE TO authenticated USING (true);

-- RLS policies for expense_claim_lines
CREATE POLICY "Authenticated users can view expense claim lines" ON public.expense_claim_lines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert expense claim lines" ON public.expense_claim_lines
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update expense claim lines" ON public.expense_claim_lines
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete expense claim lines" ON public.expense_claim_lines
  FOR DELETE TO authenticated USING (true);

-- Updated_at trigger
CREATE TRIGGER update_expense_claims_updated_at
  BEFORE UPDATE ON public.expense_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
