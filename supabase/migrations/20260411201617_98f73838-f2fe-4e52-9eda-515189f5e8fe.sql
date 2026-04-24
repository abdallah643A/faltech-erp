CREATE OR REPLACE FUNCTION public.sync_bs_config_to_coa_for_company(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.chart_of_accounts
  SET bs_debit_line_id = NULL,
      bs_credit_line_id = NULL
  WHERE company_id = p_company_id;

  FOR rec IN
    SELECT la.line_id, la.acct_from, la.acct_to, la.balance_rule
    FROM public.bs_report_line_accounts la
    JOIN public.bs_report_lines l ON l.id = la.line_id
    WHERE l.company_id = p_company_id
    ORDER BY l.line_order, la.display_order
  LOOP
    IF rec.balance_rule IN ('all', 'debit_only') THEN
      IF rec.acct_to IS NOT NULL AND rec.acct_to <> '' THEN
        UPDATE public.chart_of_accounts
        SET bs_debit_line_id = rec.line_id
        WHERE company_id = p_company_id
          AND acct_code >= rec.acct_from
          AND acct_code <= rec.acct_to || chr(65535)
          AND bs_debit_line_id IS NULL;
      ELSE
        UPDATE public.chart_of_accounts
        SET bs_debit_line_id = rec.line_id
        WHERE company_id = p_company_id
          AND acct_code LIKE rec.acct_from || '%'
          AND bs_debit_line_id IS NULL;
      END IF;
    END IF;

    IF rec.balance_rule IN ('all', 'credit_only') THEN
      IF rec.acct_to IS NOT NULL AND rec.acct_to <> '' THEN
        UPDATE public.chart_of_accounts
        SET bs_credit_line_id = rec.line_id
        WHERE company_id = p_company_id
          AND acct_code >= rec.acct_from
          AND acct_code <= rec.acct_to || chr(65535)
          AND bs_credit_line_id IS NULL;
      ELSE
        UPDATE public.chart_of_accounts
        SET bs_credit_line_id = rec.line_id
        WHERE company_id = p_company_id
          AND acct_code LIKE rec.acct_from || '%'
          AND bs_credit_line_id IS NULL;
      END IF;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_sync_bs_config_to_coa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT l.company_id
  INTO v_company_id
  FROM public.bs_report_lines l
  WHERE l.id = COALESCE(NEW.line_id, OLD.line_id)
  LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    PERFORM public.sync_bs_config_to_coa_for_company(v_company_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bs_to_coa ON public.bs_report_line_accounts;
CREATE TRIGGER trg_sync_bs_to_coa
AFTER INSERT OR UPDATE OR DELETE ON public.bs_report_line_accounts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_bs_config_to_coa();