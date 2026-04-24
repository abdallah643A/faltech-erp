
-- Create progress billing lines table for line-level tracking per billing period
CREATE TABLE IF NOT EXISTS public.cpms_progress_billing_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id UUID NOT NULL REFERENCES public.cpms_progress_billings(id) ON DELETE CASCADE,
  sov_item_id UUID NOT NULL REFERENCES public.cpms_schedule_of_values(id) ON DELETE CASCADE,
  description TEXT,
  scheduled_value NUMERIC DEFAULT 0,
  previous_billed_pct NUMERIC DEFAULT 0,
  previous_billed_amount NUMERIC DEFAULT 0,
  current_pct NUMERIC DEFAULT 0,
  current_amount NUMERIC DEFAULT 0,
  cumulative_pct NUMERIC DEFAULT 0,
  cumulative_amount NUMERIC DEFAULT 0,
  materials_stored NUMERIC DEFAULT 0,
  balance_to_finish NUMERIC DEFAULT 0,
  retainage_pct NUMERIC DEFAULT 10,
  retainage_amount NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add contract_amount alias column if missing (currently scheduled_value is used)
-- Add retention_percentage to cpms_projects if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cpms_projects' AND column_name = 'retention_percentage') THEN
    ALTER TABLE public.cpms_projects ADD COLUMN retention_percentage NUMERIC DEFAULT 10;
  END IF;
END$$;

-- RLS
ALTER TABLE public.cpms_progress_billing_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage billing lines"
  ON public.cpms_progress_billing_lines
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
