
-- Add missing columns to cpms_change_orders
ALTER TABLE public.cpms_change_orders 
  ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_date DATE,
  ADD COLUMN IF NOT EXISTS invoice_id UUID;

-- Create auto-number sequence for change orders
CREATE SEQUENCE IF NOT EXISTS cpms_co_number_seq START WITH 1;

-- Create function for auto-generating CO numbers
CREATE OR REPLACE FUNCTION public.generate_cpms_co_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.co_number IS NULL OR NEW.co_number = '' OR NEW.co_number LIKE 'CO-%' THEN
    NEW.co_number := 'CO-' || LPAD(nextval('cpms_co_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto CO number
DROP TRIGGER IF EXISTS trg_cpms_co_number ON public.cpms_change_orders;
CREATE TRIGGER trg_cpms_co_number
  BEFORE INSERT ON public.cpms_change_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_cpms_co_number();

-- Set sequence to current max
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(co_number, '[^0-9]', '', 'g'), '')::INTEGER), 0)
  INTO max_num
  FROM public.cpms_change_orders;
  IF max_num > 0 THEN
    PERFORM setval('cpms_co_number_seq', max_num);
  END IF;
END $$;
