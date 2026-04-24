DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'sync_bs_config_to_coa_for_company'
  ) THEN
    -- function already exists from previous migration run; no-op guard for retry safety
    NULL;
  END IF;
END $$;