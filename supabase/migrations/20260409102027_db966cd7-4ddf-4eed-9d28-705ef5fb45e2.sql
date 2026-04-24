ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS bs_debit_line_id uuid REFERENCES public.bs_report_lines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bs_credit_line_id uuid REFERENCES public.bs_report_lines(id) ON DELETE SET NULL;