import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TBAccount {
  acctCode: string;
  acctName: string;
  acctType: string;
  parentCode: string | null;
  level: number;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
  netMovement: number;
  lastPostDate: string | null;
  children?: TBAccount[];
}

export interface TBFilters {
  companyIds: string[];
  branchId: string;
  dateFrom: string;
  dateTo: string;
  fiscalYear: string;
  accountFrom: string;
  accountTo: string;
  accountLevel: string;
  accountType: string;
  costCenter: string;
  projectCode: string;
  departmentId: string;
  postedOnly: boolean;
  includeZeroBalance: boolean;
  includeInactive: boolean;
  comparisonMode: string;
  compareDateFrom: string;
  compareDateTo: string;
  viewMode: string;
}

async function fetchTBSummary(params: {
  companyIds: string[];
  dateFrom: string;
  dateTo: string;
  branchId?: string;
  costCenter?: string;
  projectCode?: string;
  postedOnly: boolean;
}): Promise<Record<string, { d: number; c: number }>> {
  const { data, error } = await supabase.rpc('get_trial_balance_summary', {
    p_date_from: params.dateFrom || null,
    p_date_to: params.dateTo || null,
    p_company_ids: params.companyIds.length > 0 ? params.companyIds : null,
    p_branch_id: params.branchId || null,
    p_cost_center: params.costCenter || null,
    p_project_code: params.projectCode || null,
    p_posted_only: params.postedOnly,
  });
  if (error) throw error;
  const map: Record<string, { d: number; c: number }> = {};
  for (const row of data || []) {
    map[row.acct_code] = { d: Number(row.total_debit) || 0, c: Number(row.total_credit) || 0 };
  }
  return map;
}

export function useTrialBalanceData(filters: TBFilters, enabled = true) {
  const { data: accounts = [] } = useQuery({
    queryKey: ['tb-accounts', filters.companyIds],
    enabled,
    queryFn: async () => {
      let q = supabase
        .from('chart_of_accounts')
        .select('acct_code, acct_name, acct_type, father_acct_code, is_active, acct_level')
        .order('acct_code');
      if (filters.companyIds.length > 0) {
        q = q.or(filters.companyIds.map(id => `company_id.eq.${id}`).join(',') + ',company_id.is.null');
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Opening balances (everything before dateFrom) — single DB aggregation
  const { data: openMap = {}, isLoading: openingLoading } = useQuery({
    queryKey: ['tb-opening-rpc', filters.companyIds, filters.dateFrom, filters.branchId, filters.costCenter, filters.projectCode, filters.postedOnly],
    enabled: enabled && !!filters.dateFrom,
    queryFn: () => fetchTBSummary({
      companyIds: filters.companyIds,
      dateFrom: '1900-01-01',
      dateTo: new Date(new Date(filters.dateFrom).getTime() - 86400000).toISOString().split('T')[0],
      branchId: filters.branchId || undefined,
      costCenter: filters.costCenter || undefined,
      projectCode: filters.projectCode || undefined,
      postedOnly: filters.postedOnly,
    }),
  });

  // Period movements — single DB aggregation
  const { data: periodMap = {}, isLoading: periodLoading } = useQuery({
    queryKey: ['tb-period-rpc', filters.companyIds, filters.dateFrom, filters.dateTo, filters.branchId, filters.costCenter, filters.projectCode, filters.postedOnly],
    enabled: enabled && !!filters.dateFrom && !!filters.dateTo,
    queryFn: () => fetchTBSummary({
      companyIds: filters.companyIds,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      branchId: filters.branchId || undefined,
      costCenter: filters.costCenter || undefined,
      projectCode: filters.projectCode || undefined,
      postedOnly: filters.postedOnly,
    }),
  });

  const isLoading = openingLoading || periodLoading;

  const buildTB = (): TBAccount[] => {
    const maxLevel = filters.accountLevel ? parseInt(filters.accountLevel) : 99;

    // Build set of known COA codes
    const coaCodes = new Set(accounts.map(a => a.acct_code));

    // Collect orphan account codes from RPC results not in COA
    const orphanCodes = new Set<string>();
    for (const code of Object.keys(openMap)) {
      if (!coaCodes.has(code)) orphanCodes.add(code);
    }
    for (const code of Object.keys(periodMap)) {
      if (!coaCodes.has(code)) orphanCodes.add(code);
    }

    const coaRows = accounts
      .filter(a => {
        if (!filters.includeInactive && !a.is_active) return false;
        if (filters.accountFrom && a.acct_code < filters.accountFrom) return false;
        if (filters.accountTo && a.acct_code > filters.accountTo) return false;
        if (filters.accountType && a.acct_type !== filters.accountType) return false;
        const level = a.acct_level || 1;
        if (level > maxLevel) return false;
        return true;
      })
      .map(a => ({
        acct_code: a.acct_code,
        acct_name: a.acct_name,
        acct_type: a.acct_type || '',
        father_acct_code: a.father_acct_code,
        acct_level: a.acct_level || 1,
      }));

    // Add orphan accounts so totals balance
    const orphanRows = Array.from(orphanCodes)
      .filter(code => {
        if (filters.accountFrom && code < filters.accountFrom) return false;
        if (filters.accountTo && code > filters.accountTo) return false;
        return true;
      })
      .map(code => ({
        acct_code: code,
        acct_name: `[Unmapped] ${code}`,
        acct_type: code.startsWith('1') ? 'Asset' : code.startsWith('2') ? 'Liability' : code.startsWith('3') ? 'Equity' : code.startsWith('4') ? 'Revenue' : 'Expense',
        father_acct_code: null as string | null,
        acct_level: 1,
      }));

    const allRows = [...coaRows, ...orphanRows].sort((a, b) => a.acct_code.localeCompare(b.acct_code));

    return allRows
      .map(a => {
        const open = openMap[a.acct_code] || { d: 0, c: 0 };
        const period = periodMap[a.acct_code] || { d: 0, c: 0 };
        const closingD = open.d + period.d;
        const closingC = open.c + period.c;
        const netBalance = closingD - closingC;

        return {
          acctCode: a.acct_code,
          acctName: a.acct_name,
          acctType: a.acct_type,
          parentCode: a.father_acct_code,
          level: a.acct_level,
          openingDebit: open.d,
          openingCredit: open.c,
          periodDebit: period.d,
          periodCredit: period.c,
          closingDebit: netBalance > 0 ? netBalance : 0,
          closingCredit: netBalance < 0 ? Math.abs(netBalance) : 0,
          netMovement: period.d - period.c,
          lastPostDate: null,
        } as TBAccount;
      })
      .filter(a => {
        if (filters.includeZeroBalance) return true;
        return a.openingDebit !== 0 || a.openingCredit !== 0 || a.periodDebit !== 0 || a.periodCredit !== 0;
      });
  };

  const tbAccounts = (enabled && accounts.length > 0) ? buildTB() : [];

  const totals = tbAccounts.reduce(
    (acc, a) => ({
      openingDebit: acc.openingDebit + a.openingDebit,
      openingCredit: acc.openingCredit + a.openingCredit,
      periodDebit: acc.periodDebit + a.periodDebit,
      periodCredit: acc.periodCredit + a.periodCredit,
      closingDebit: acc.closingDebit + a.closingDebit,
      closingCredit: acc.closingCredit + a.closingCredit,
    }),
    { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0, closingDebit: 0, closingCredit: 0 }
  );

  const isBalanced = Math.abs(totals.closingDebit - totals.closingCredit) < 0.01;

  return { tbAccounts, totals, isBalanced, isLoading, accounts };
}
