
-- Function to sync BS config to COA accounts
CREATE OR REPLACE FUNCTION public.sync_bs_config_to_coa()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Clear existing mappings first
  UPDATE chart_of_accounts SET bs_debit_line_id = NULL, bs_credit_line_id = NULL;

  -- Loop through all BS line account ranges and update matching COA accounts
  FOR rec IN
    SELECT la.line_id, la.acct_from, la.acct_to, la.balance_rule
    FROM bs_report_line_accounts la
    JOIN bs_report_lines l ON l.id = la.line_id
    ORDER BY l.line_order, la.display_order
  LOOP
    -- Update debit line mapping
    IF rec.balance_rule IN ('all', 'debit_only') THEN
      IF rec.acct_to IS NOT NULL THEN
        UPDATE chart_of_accounts
        SET bs_debit_line_id = rec.line_id
        WHERE acct_code >= rec.acct_from AND acct_code <= rec.acct_to || chr(65535)
          AND bs_debit_line_id IS NULL;
      ELSE
        UPDATE chart_of_accounts
        SET bs_debit_line_id = rec.line_id
        WHERE acct_code LIKE rec.acct_from || '%'
          AND bs_debit_line_id IS NULL;
      END IF;
    END IF;

    -- Update credit line mapping
    IF rec.balance_rule IN ('all', 'credit_only') THEN
      IF rec.acct_to IS NOT NULL THEN
        UPDATE chart_of_accounts
        SET bs_credit_line_id = rec.line_id
        WHERE acct_code >= rec.acct_from AND acct_code <= rec.acct_to || chr(65535)
          AND bs_credit_line_id IS NULL;
      ELSE
        UPDATE chart_of_accounts
        SET bs_credit_line_id = rec.line_id
        WHERE acct_code LIKE rec.acct_from || '%'
          AND bs_credit_line_id IS NULL;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Trigger function to auto-sync on BS config changes
CREATE OR REPLACE FUNCTION public.trigger_sync_bs_config_to_coa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM sync_bs_config_to_coa();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on bs_report_line_accounts
DROP TRIGGER IF EXISTS trg_sync_bs_to_coa ON public.bs_report_line_accounts;
CREATE TRIGGER trg_sync_bs_to_coa
  AFTER INSERT OR UPDATE OR DELETE ON public.bs_report_line_accounts
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_sync_bs_config_to_coa();

-- Run initial sync now
SELECT sync_bs_config_to_coa();
