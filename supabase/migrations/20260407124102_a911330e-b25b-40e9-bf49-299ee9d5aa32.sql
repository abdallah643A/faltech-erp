
CREATE OR REPLACE FUNCTION public.get_balance_sheet_summary(
  p_as_of_date DATE,
  p_company_ids UUID[] DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_cost_center TEXT DEFAULT NULL,
  p_project_code TEXT DEFAULT NULL,
  p_posted_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(acct_code TEXT, total_debit NUMERIC, total_credit NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jel.acct_code,
    COALESCE(SUM(jel.debit), 0) AS total_debit,
    COALESCE(SUM(jel.credit), 0) AS total_credit
  FROM journal_entry_lines jel
  INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
  WHERE je.posting_date <= p_as_of_date
    AND (p_company_ids IS NULL OR je.company_id = ANY(p_company_ids))
    AND (p_branch_id IS NULL OR je.branch_id = p_branch_id)
    AND (p_cost_center IS NULL OR jel.cost_center = p_cost_center)
    AND (p_project_code IS NULL OR jel.project_code = p_project_code)
    AND (NOT p_posted_only OR je.status = 'posted')
  GROUP BY jel.acct_code;
END;
$$;
