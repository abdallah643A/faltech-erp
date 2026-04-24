import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BSLine {
  key: string;
  label: string;
  indent: number;
  isBold: boolean;
  isSection: boolean;
  amount: number;
  compareAmount: number;
  accounts?: { code: string; name: string; amount: number; compareAmount: number }[];
}

export interface BSFilters {
  companyIds: string[];
  branchId: string;
  asOfDate: string;
  compareDate: string;
  comparisonMode: string;
  costCenter: string;
  projectCode: string;
  departmentId: string;
  postedOnly: boolean;
  includeClosing: boolean;
  viewMode: string;
}

const BS_STRUCTURE = [
  { key: 'assets', label: 'Assets', indent: 0, isSection: true, isBold: true },
  { key: 'current_assets', label: 'Current Assets', indent: 1, isSection: true, isBold: true },
  { key: 'cash_bank', label: 'Cash and Bank', indent: 2, prefixes: ['1101', '1102', '1103', '110'] },
  { key: 'accounts_receivable', label: 'Accounts Receivable', indent: 2, prefixes: ['1201', '1202', '120', '121'] },
  { key: 'other_receivables', label: 'Other Receivables', indent: 2, prefixes: ['1203', '1204', '122', '123', '124'] },
  { key: 'inventory', label: 'Inventory', indent: 2, prefixes: ['1301', '1302', '130', '131', '132'] },
  { key: 'prepaid_expenses', label: 'Prepaid Expenses', indent: 2, prefixes: ['1401', '140', '141'] },
  { key: 'total_current_assets', label: 'Total Current Assets', indent: 1, isSection: true, isBold: true, sumOf: ['cash_bank', 'accounts_receivable', 'other_receivables', 'inventory', 'prepaid_expenses'] },
  { key: 'non_current_assets', label: 'Non-Current Assets', indent: 1, isSection: true, isBold: true },
  { key: 'ppe', label: 'Property, Plant & Equipment', indent: 2, prefixes: ['1501', '150', '151', '152', '153', '160'] },
  { key: 'accum_depreciation', label: 'Accumulated Depreciation', indent: 2, prefixes: ['1591', '159', '161'], signInvert: true },
  { key: 'intangible_assets', label: 'Intangible Assets', indent: 2, prefixes: ['170', '171'] },
  { key: 'investments', label: 'Investments', indent: 2, prefixes: ['180', '181', '182'] },
  { key: 'other_nca', label: 'Other Non-Current Assets', indent: 2, prefixes: ['190', '191'] },
  { key: 'total_nca', label: 'Total Non-Current Assets', indent: 1, isSection: true, isBold: true, sumOf: ['ppe', 'accum_depreciation', 'intangible_assets', 'investments', 'other_nca'] },
  { key: 'total_assets', label: 'Total Assets', indent: 0, isSection: true, isBold: true, sumOf: ['total_current_assets', 'total_nca'] },

  { key: 'liabilities', label: 'Liabilities', indent: 0, isSection: true, isBold: true },
  { key: 'current_liabilities', label: 'Current Liabilities', indent: 1, isSection: true, isBold: true },
  { key: 'accounts_payable', label: 'Accounts Payable', indent: 2, prefixes: ['2101', '210', '211'] },
  { key: 'accrued_expenses', label: 'Accrued Expenses', indent: 2, prefixes: ['2201', '220', '221'] },
  { key: 'short_term_loans', label: 'Short-Term Loans', indent: 2, prefixes: ['2301', '230'] },
  { key: 'taxes_payable', label: 'Taxes Payable', indent: 2, prefixes: ['2401', '240', '241'] },
  { key: 'total_cl', label: 'Total Current Liabilities', indent: 1, isSection: true, isBold: true, sumOf: ['accounts_payable', 'accrued_expenses', 'short_term_loans', 'taxes_payable'] },
  { key: 'non_current_liabilities', label: 'Non-Current Liabilities', indent: 1, isSection: true, isBold: true },
  { key: 'long_term_loans', label: 'Long-Term Loans', indent: 2, prefixes: ['2501', '250', '251'] },
  { key: 'provisions', label: 'Provisions', indent: 2, prefixes: ['260', '261', '270'] },
  { key: 'total_ncl', label: 'Total Non-Current Liabilities', indent: 1, isSection: true, isBold: true, sumOf: ['long_term_loans', 'provisions'] },
  { key: 'total_liabilities', label: 'Total Liabilities', indent: 0, isSection: true, isBold: true, sumOf: ['total_cl', 'total_ncl'] },

  { key: 'equity', label: 'Equity', indent: 0, isSection: true, isBold: true },
  { key: 'share_capital', label: 'Share Capital', indent: 1, prefixes: ['3101', '310', '311'] },
  { key: 'retained_earnings', label: 'Retained Earnings', indent: 1, prefixes: ['3201', '320', '321'] },
  { key: 'current_year_earnings', label: 'Current Year Earnings', indent: 1, computed: 'pnl' },
  { key: 'reserves', label: 'Reserves', indent: 1, prefixes: ['3301', '330', '331', '340'] },
  { key: 'total_equity', label: 'Total Equity', indent: 0, isSection: true, isBold: true, sumOf: ['share_capital', 'retained_earnings', 'current_year_earnings', 'reserves'] },
  { key: 'total_le', label: 'Total Liabilities & Equity', indent: 0, isSection: true, isBold: true, sumOf: ['total_liabilities', 'total_equity'] },
] as const;

async function fetchBalanceSummary(params: {
  companyIds: string[];
  asOfDate: string;
  branchId?: string;
  costCenter?: string;
  projectCode?: string;
  postedOnly: boolean;
}): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('get_balance_sheet_summary', {
    p_as_of_date: params.asOfDate,
    p_company_ids: params.companyIds.length > 0 ? params.companyIds : null,
    p_branch_id: params.branchId || null,
    p_cost_center: params.costCenter || null,
    p_project_code: params.projectCode || null,
    p_posted_only: params.postedOnly,
  });
  if (error) throw error;
  const balances: Record<string, number> = {};
  for (const row of data || []) {
    balances[row.acct_code] = (Number(row.total_debit) || 0) - (Number(row.total_credit) || 0);
  }
  return balances;
}

function computePnL(balances: Record<string, number>): number {
  let pnl = 0;
  for (const [code, bal] of Object.entries(balances)) {
    if (code.startsWith('4') || code.startsWith('7')) pnl -= bal;
    else if (code.startsWith('5') || code.startsWith('6')) pnl -= bal;
  }
  return pnl;
}

export function useBalanceSheetData(filters: BSFilters, enabled = true) {
  const hasCompare = filters.comparisonMode !== 'none' && !!filters.compareDate;

  const { data: currentBalances = {}, isLoading: currentLoading } = useQuery({
    queryKey: ['bs-current', filters.companyIds, filters.asOfDate, filters.branchId, filters.costCenter, filters.projectCode, filters.postedOnly],
    enabled: enabled && !!filters.asOfDate,
    queryFn: () => fetchBalanceSummary({
      companyIds: filters.companyIds,
      asOfDate: filters.asOfDate,
      branchId: filters.branchId || undefined,
      costCenter: filters.costCenter || undefined,
      projectCode: filters.projectCode || undefined,
      postedOnly: filters.postedOnly,
    }),
  });

  const { data: compareBalances = {} } = useQuery({
    queryKey: ['bs-compare', filters.companyIds, filters.compareDate, filters.branchId, filters.costCenter, filters.projectCode],
    enabled: enabled && hasCompare,
    queryFn: () => fetchBalanceSummary({
      companyIds: filters.companyIds,
      asOfDate: filters.compareDate,
      branchId: filters.branchId || undefined,
      costCenter: filters.costCenter || undefined,
      projectCode: filters.projectCode || undefined,
      postedOnly: true,
    }),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['bs-coa'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('acct_code, acct_name, acct_type')
        .eq('is_active', true)
        .order('acct_code');
      if (error) throw error;
      return data || [];
    },
  });

  const buildBS = (): BSLine[] => {
    const lineAmounts: Record<string, number> = {};
    const lineCompare: Record<string, number> = {};
    const lineAccounts: Record<string, { code: string; name: string; amount: number; compareAmount: number }[]> = {};
    const pnlCurrent = computePnL(currentBalances);
    const pnlCompare = hasCompare ? computePnL(compareBalances) : 0;

    // Build a complete set of all account codes (COA + orphans from balances)
    const coaCodes = new Set(accounts.map(a => a.acct_code));
    const allAcctEntries: { acct_code: string; acct_name: string }[] = [
      ...accounts.map(a => ({ acct_code: a.acct_code, acct_name: a.acct_name })),
    ];
    for (const code of Object.keys(currentBalances)) {
      if (!coaCodes.has(code)) {
        allAcctEntries.push({ acct_code: code, acct_name: `[Unmapped] ${code}` });
      }
    }
    for (const code of Object.keys(compareBalances)) {
      if (!coaCodes.has(code) && !currentBalances[code]) {
        allAcctEntries.push({ acct_code: code, acct_name: `[Unmapped] ${code}` });
      }
    }

    for (const item of BS_STRUCTURE) {
      if ('prefixes' in item && item.prefixes) {
        let amount = 0;
        let cmpAmount = 0;
        const accts: { code: string; name: string; amount: number; compareAmount: number }[] = [];

        for (const acct of allAcctEntries) {
          const matches = (item.prefixes as readonly string[]).some((p: string) => acct.acct_code.startsWith(p));
          if (!matches) continue;
          const bal = currentBalances[acct.acct_code] || 0;
          const cBal = compareBalances[acct.acct_code] || 0;
          const signInvert = 'signInvert' in item && item.signInvert;
          const v = signInvert ? -bal : bal;
          const cv = signInvert ? -cBal : cBal;
          amount += v;
          cmpAmount += cv;
          if (Math.abs(v) > 0.01 || Math.abs(cv) > 0.01) {
            accts.push({ code: acct.acct_code, name: acct.acct_name, amount: v, compareAmount: cv });
          }
        }

        lineAmounts[item.key] = amount;
        lineCompare[item.key] = cmpAmount;
        lineAccounts[item.key] = accts;
      } else if ('computed' in item && item.computed === 'pnl') {
        lineAmounts[item.key] = pnlCurrent;
        lineCompare[item.key] = pnlCompare;
      } else if ('sumOf' in item && item.sumOf) {
        lineAmounts[item.key] = (item.sumOf as readonly string[]).reduce((s: number, k: string) => s + (lineAmounts[k] || 0), 0);
        lineCompare[item.key] = (item.sumOf as readonly string[]).reduce((s: number, k: string) => s + (lineCompare[k] || 0), 0);
      }
    }

    return BS_STRUCTURE.map(item => ({
      key: item.key,
      label: item.label,
      indent: item.indent,
      isBold: 'isBold' in item ? !!item.isBold : false,
      isSection: 'isSection' in item ? !!item.isSection : false,
      amount: lineAmounts[item.key] || 0,
      compareAmount: lineCompare[item.key] || 0,
      accounts: lineAccounts[item.key],
    }));
  };

  const bsLines = enabled ? buildBS() : [];
  const totalAssets = bsLines.find(l => l.key === 'total_assets')?.amount || 0;
  const totalLE = bsLines.find(l => l.key === 'total_le')?.amount || 0;
  const isBalanced = Math.abs(totalAssets - totalLE) < 0.01;

  const totalLiabilities = bsLines.find(l => l.key === 'total_liabilities')?.amount || 0;
  const totalEquity = bsLines.find(l => l.key === 'total_equity')?.amount || 0;
  const currentAssets = bsLines.find(l => l.key === 'total_current_assets')?.amount || 0;
  const currentLiabilities = bsLines.find(l => l.key === 'total_cl')?.amount || 0;
  const cashBalance = bsLines.find(l => l.key === 'cash_bank')?.amount || 0;
  const workingCapital = currentAssets - currentLiabilities;
  const currentRatio = currentLiabilities !== 0 ? currentAssets / currentLiabilities : 0;
  const debtToEquity = totalEquity !== 0 ? totalLiabilities / totalEquity : 0;

  return {
    bsLines,
    isBalanced,
    isLoading: currentLoading,
    kpis: {
      totalAssets, totalLiabilities, totalEquity, workingCapital, currentRatio, debtToEquity, cashBalance,
    },
  };
}
