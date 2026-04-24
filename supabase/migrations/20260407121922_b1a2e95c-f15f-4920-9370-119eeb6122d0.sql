
CREATE OR REPLACE FUNCTION public.get_trial_balance_summary(
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_company_ids UUID[] DEFAULT NULL,
  p_branch_id TEXT DEFAULT NULL,
  p_cost_center TEXT DEFAULT NULL,
  p_project_code TEXT DEFAULT NULL,
  p_posted_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  acct_code TEXT,
  total_debit NUMERIC,
  total_credit NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jel.acct_code,
    COALESCE(SUM(jel.debit), 0) AS total_debit,
    COALESCE(SUM(jel.credit), 0) AS total_credit
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  WHERE
    (p_date_from IS NULL OR je.posting_date >= p_date_from::DATE)
    AND (p_date_to IS NULL OR je.posting_date <= p_date_to::DATE)
    AND (p_company_ids IS NULL OR je.company_id = ANY(p_company_ids))
    AND (p_branch_id IS NULL OR je.branch_id = p_branch_id)
    AND (NOT p_posted_only OR je.status = 'posted')
    AND (p_cost_center IS NULL OR jel.cost_center = p_cost_center)
    AND (p_project_code IS NULL OR jel.project_code = p_project_code)
  GROUP BY jel.acct_code;
END;
$$;
