
-- Add missing columns to cpms_rfis for full RFI management
ALTER TABLE public.cpms_rfis
  ADD COLUMN IF NOT EXISTS from_company TEXT,
  ADD COLUMN IF NOT EXISTS from_person TEXT,
  ADD COLUMN IF NOT EXISTS to_company TEXT,
  ADD COLUMN IF NOT EXISTS to_person TEXT,
  ADD COLUMN IF NOT EXISTS question TEXT,
  ADD COLUMN IF NOT EXISTS cost_impact NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS schedule_impact_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_submitted DATE,
  ADD COLUMN IF NOT EXISTS response_due_date DATE,
  ADD COLUMN IF NOT EXISTS date_answered DATE,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create sequence for auto-numbering if not exists
CREATE SEQUENCE IF NOT EXISTS cpms_rfi_number_seq START 1;

-- Auto-generate RFI number trigger
CREATE OR REPLACE FUNCTION public.generate_cpms_rfi_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rfi_number IS NULL OR NEW.rfi_number = '' THEN
    NEW.rfi_number := 'RFI-' || LPAD(nextval('cpms_rfi_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_rfi_number ON public.cpms_rfis;
CREATE TRIGGER trg_generate_rfi_number
  BEFORE INSERT ON public.cpms_rfis
  FOR EACH ROW EXECUTE FUNCTION public.generate_cpms_rfi_number();
