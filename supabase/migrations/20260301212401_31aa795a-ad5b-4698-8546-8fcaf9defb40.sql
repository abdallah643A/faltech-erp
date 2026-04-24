-- Add unique constraint on (series, object_code) for upsert support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'numbering_series_series_object_code_key'
  ) THEN
    ALTER TABLE public.numbering_series ADD CONSTRAINT numbering_series_series_object_code_key UNIQUE (series, object_code);
  END IF;
END $$;