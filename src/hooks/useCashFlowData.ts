import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CFLine {
  key: string;
  label: string;
  indent: number;
  isBold: boolean;
  isSection: boolean;
  amount: number;
  compareAmount: number;
  accounts?: { code: string; name: string; amount: number; compareAmount: number }[];
}

export interface CFFilters {
  companyIds: string[];
  branchId: string;
  dateFrom: string;
  dateTo: string;
  compareDateFrom: string;
  compareDateTo: string;
  comparisonMode: string;
  costCenter: string;
  projectCode: string;
  departmentId: string;
  bankAccount: string;
  method: 'direct' | 'indirect';
  includeUnposted: boolean;
  viewMode: string;
}

// Cash flow structure - Direct method mapping by GL prefix
const CF_STRUCTURE = [
  { key: 'opening_cash', label: 'Opening Cash Balance', indent: 0, isSection: true, isBold: true },

  { key: 'operating', label: 'Cash Flows from Operating Activities', indent: 0, isSection: true, isBold: true },
  { key: 'cash_from_customers', label: 'Cash Received from Customers', indent: 1, prefixes: ['1201', '1202', '120', '121'], cashPrefixes: ['1101', '1102', '1103', '110'], direction: 'inflow' },
  { key: 'cash_to_suppliers', label: 'Cash Paid to Suppliers', indent: 1, prefixes: ['2101', '210', '211'], direction: 'outflow' },
  { key: 'cash_to_employees', label: 'Cash Paid to Employees', indent: 1, prefixes: ['6301', '630', '631', '632', '633'], direction: 'outflow' },
  { key: 'taxes_paid', label: 'Taxes Paid', indent: 1, prefixes: ['2401', '240', '241', '7401', '740'], direction: 'outflow' },
  { key: 'finance_charges', label: 'Finance Charges Paid', indent: 1, prefixes: ['6801', '680', '681', '690'], direction: 'outflow' },
  { key: 'other_operating', label: 'Other Operating Cash Flows', indent: 1, prefixes: ['4201', '420', '421', '7101', '710'], direction: 'mixed' },
  { key: 'net_operating', label: 'Net Cash from Operating Activities', indent: 0, isSection: true, isBold: true, sumOf: ['cash_from_customers', 'cash_to_suppliers', 'cash_to_employees', 'taxes_paid', 'finance_charges', 'other_operating'] },

  { key: 'investing', label: 'Cash Flows from Investing Activities', indent: 0, isSection: true, isBold: true },
  { key: 'asset_purchases', label: 'Asset Purchases', indent: 1, prefixes: ['1501', '150', '151', '152', '153', '160', '170'], direction: 'outflow' },
  { key: 'asset_disposals', label: 'Asset Disposals', indent: 1, prefixes: ['4301', '430'], direction: 'inflow' },
  { key: 'investments_made', label: 'Investments Made', indent: 1, prefixes: ['180', '181', '182'], direction: 'outflow' },
  { key: 'investment_collections', label: 'Investment Collections', indent: 1, prefixes: ['4401', '440'], direction: 'inflow' },
  { key: 'net_investing', label: 'Net Cash from Investing Activities', indent: 0, isSection: true, isBold: true, sumOf: ['asset_purchases', 'asset_disposals', 'investments_made', 'investment_collections'] },

  { key: 'financing', label: 'Cash Flows from Financing Activities', indent: 0, isSection: true, isBold: true },
  { key: 'loans_received', label: 'Loans Received', indent: 1, prefixes: ['2501', '250', '251', '2301', '230'], direction: 'inflow' },
  { key: 'loans_repaid', label: 'Loans Repaid', indent: 1, prefixes: ['2502'], direction: 'outflow' },
  { key: 'capital_contributions', label: 'Capital Contributions', indent: 1, prefixes: ['3101', '310', '311'], direction: 'inflow' },
  { key: 'dividends_paid', label: 'Dividends Paid (placeholder)', indent: 1, prefixes: ['3401', '340'], direction: 'outflow' },
  { key: 'lease_payments', label: 'Lease Payments (placeholder)', indent: 1, prefixes: ['2601', '260'], direction: 'outflow' },
  { key: 'net_financing', label: 'Net Cash from Financing Activities', indent: 0, isSection: true, isBold: true, sumOf: ['loans_received', 'loans_repaid', 'capital_contributions', 'dividends_paid', 'lease_payments'] },

  { key: 'net_change', label: 'Net Increase / Decrease in Cash', indent: 0, isSection: true, isBold: true, sumOf: ['net_operating', 'net_investing', 'net_financing'] },
  { key: 'closing_cash', label: 'Closing Cash Balance', indent: 0, isSection: true, isBold: true, sumOf: ['opening_cash', 'net_change'] },
] as const;

// Indirect method additional lines
const INDIRECT_ADJUSTMENTS = [
  { key: 'net_profit', label: 'Net Profit', indent: 1, isBold: true },
  { key: 'add_depreciation', label: 'Add: Depreciation & Amortization', indent: 2, prefixes: ['6601', '660', '661', '670'] },
  { key: 'add_finance_cost', label: 'Add: Finance Costs', indent: 2, prefixes: ['6801', '680', '681'] },
  { key: 'less_interest_income', label: 'Less: Interest Income', indent: 2, prefixes: ['4201', '420'] },
  { key: 'change_receivables', label: 'Change in Receivables', indent: 2, prefixes: ['1201', '1202', '120', '121'] },
  { key: 'change_inventory', label: 'Change in Inventory', indent: 2, prefixes: ['1301', '1302', '130', '131'] },
  { key: 'change_payables', label: 'Change in Payables', indent: 2, prefixes: ['2101', '210', '211'] },
  { key: 'change_accruals', label: 'Change in Accruals', indent: 2, prefixes: ['2201', '220', '221'] },
];

async function fetchPeriodMovements(params: {
  companyIds: string[];
  dateFrom: string;
  dateTo: string;
  branchId?: string;
  costCenter?: string;
  projectCode?: string;
  postedOnly: boolean;
}) {
  const { companyIds, dateFrom, dateTo, branchId, costCenter, projectCode, postedOnly } = params;

  let jeQuery = supabase.from('journal_entries').select('id');
  jeQuery = jeQuery.gte('posting_date', dateFrom).lte('posting_date', dateTo);
  if (companyIds.length > 0) jeQuery = jeQuery.in('company_id', companyIds);
  if (branchId) jeQuery = jeQuery.eq('branch_id', branchId);
  if (postedOnly) jeQuery = jeQuery.eq('status', 'posted');

  const allJEs: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await jeQuery.range(from, from + 999);
    if (error) throw error;
    allJEs.push(...(data || []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }

  const jeIds = allJEs.map(j => j.id);
  if (jeIds.length === 0) return {};

  const movements: Record<string, number> = {};
  for (let i = 0; i < jeIds.length; i += 100) {
    const chunk = jeIds.slice(i, i + 100);
    let lQuery = supabase.from('journal_entry_lines').select('acct_code, debit, credit').in('journal_entry_id', chunk);
    if (costCenter) lQuery = lQuery.eq('cost_center', costCenter);
    if (projectCode) lQuery = lQuery.eq('project_code', projectCode);
    const { data, error } = await lQuery;
    if (error) throw error;
    for (const l of (data || [])) {
      movements[l.acct_code] = (movements[l.acct_code] || 0) + (l.debit || 0) - (l.credit || 0);
    }
  }
  return movements;
}

async function fetchOpeningCash(params: {
  companyIds: string[];
  beforeDate: string;
  branchId?: string;
  postedOnly: boolean;
}) {
  const { companyIds, beforeDate, branchId, postedOnly } = params;
  const cashPrefixes = ['1101', '1102', '1103', '110'];

  let jeQuery = supabase.from('journal_entries').select('id');
  jeQuery = jeQuery.lt('posting_date', beforeDate);
  if (companyIds.length > 0) jeQuery = jeQuery.in('company_id', companyIds);
  if (branchId) jeQuery = jeQuery.eq('branch_id', branchId);
  if (postedOnly) jeQuery = jeQuery.eq('status', 'posted');

  const allJEs: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await jeQuery.range(from, from + 999);
    if (error) throw error;
    allJEs.push(...(data || []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }

  const jeIds = allJEs.map(j => j.id);
  if (jeIds.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < jeIds.length; i += 100) {
    const chunk = jeIds.slice(i, i + 100);
    const { data, error } = await supabase
      .from('journal_entry_lines')
      .select('acct_code, debit, credit')
      .in('journal_entry_id', chunk);
    if (error) throw error;
    for (const l of (data || [])) {
      if (cashPrefixes.some(p => l.acct_code.startsWith(p))) {
        total += (l.debit || 0) - (l.credit || 0);
      }
    }
  }
  return total;
}

function matchesPrefixes(code: string, prefixes: readonly string[]): boolean {
  return prefixes.some(p => code.startsWith(p));
}

function buildLines(
  movements: Record<string, number>,
  compareMovements: Record<string, number>,
  openingCash: number,
  compareOpeningCash: number,
): CFLine[] {
  const lineAmounts: Record<string, number> = {};
  const lineCompare: Record<string, number> = {};
  const lineAccounts: Record<string, CFLine['accounts']> = {};

  // Calculate each data line
  for (const item of CF_STRUCTURE) {
    if ('prefixes' in item && item.prefixes) {
      let amt = 0, cmp = 0;
      const accts: NonNullable<CFLine['accounts']> = [];
      for (const [code, val] of Object.entries(movements)) {
        if (matchesPrefixes(code, item.prefixes)) {
          // For outflows, movement is debit-credit; we show as negative
          const sign = item.direction === 'outflow' ? -1 : item.direction === 'inflow' ? 1 : 1;
          // Cash flow items: credit increases cash (received), debit decreases cash (paid)
          // For receivables: decrease = cash inflow; For payables: increase = cash outflow consumed
          const cashImpact = -val * sign; // Simplified: net credit = positive cash
          amt += cashImpact;
          const cmpVal = compareMovements[code] || 0;
          const cmpImpact = -cmpVal * sign;
          cmp += cmpImpact;
          if (Math.abs(val) > 0.01) {
            accts.push({ code, name: code, amount: cashImpact, compareAmount: cmpImpact });
          }
        }
      }
      // Also check compare-only accounts
      for (const [code, val] of Object.entries(compareMovements)) {
        if (matchesPrefixes(code, item.prefixes) && !(code in movements)) {
          const sign = item.direction === 'outflow' ? -1 : item.direction === 'inflow' ? 1 : 1;
          const cmpImpact = -val * sign;
          cmp += cmpImpact;
        }
      }
      lineAmounts[item.key] = amt;
      lineCompare[item.key] = cmp;
      lineAccounts[item.key] = accts.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    }
  }

  // Opening cash
  lineAmounts['opening_cash'] = openingCash;
  lineCompare['opening_cash'] = compareOpeningCash;

  // Calculate sumOf lines
  for (const item of CF_STRUCTURE) {
    if ('sumOf' in item && item.sumOf) {
      lineAmounts[item.key] = item.sumOf.reduce((s, k) => s + (lineAmounts[k] || 0), 0);
      lineCompare[item.key] = item.sumOf.reduce((s, k) => s + (lineCompare[k] || 0), 0);
    }
  }

  return CF_STRUCTURE.map(item => ({
    key: item.key,
    label: item.label,
    indent: item.indent,
    isBold: 'isBold' in item ? (item.isBold || false) : false,
    isSection: 'isSection' in item ? (item.isSection || false) : false,
    amount: lineAmounts[item.key] || 0,
    compareAmount: lineCompare[item.key] || 0,
    accounts: lineAccounts[item.key],
  }));
}

export function useCashFlowData(filters: CFFilters, enabled = true) {
  const hasCompare = filters.comparisonMode !== 'none' && !!filters.compareDateFrom && !!filters.compareDateTo;
  const postedOnly = !filters.includeUnposted;

  const { data: openingCash = 0 } = useQuery({
    queryKey: ['cf-opening', filters.companyIds, filters.dateFrom, filters.branchId],
    enabled: enabled && !!filters.dateFrom,
    queryFn: () => fetchOpeningCash({
      companyIds: filters.companyIds,
      beforeDate: filters.dateFrom,
      branchId: filters.branchId || undefined,
      postedOnly,
    }),
  });

  const { data: movements = {}, isLoading } = useQuery({
    queryKey: ['cf-movements', filters.companyIds, filters.dateFrom, filters.dateTo, filters.branchId, filters.costCenter, filters.projectCode, postedOnly],
    enabled: enabled && !!filters.dateFrom && !!filters.dateTo,
    queryFn: () => fetchPeriodMovements({
      companyIds: filters.companyIds,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      branchId: filters.branchId || undefined,
      costCenter: filters.costCenter || undefined,
      projectCode: filters.projectCode || undefined,
      postedOnly,
    }),
  });

  const { data: compareOpeningCash = 0 } = useQuery({
    queryKey: ['cf-compare-opening', filters.companyIds, filters.compareDateFrom, filters.branchId],
    enabled: enabled && hasCompare,
    queryFn: () => fetchOpeningCash({
      companyIds: filters.companyIds,
      beforeDate: filters.compareDateFrom,
      branchId: filters.branchId || undefined,
      postedOnly: true,
    }),
  });

  const { data: compareMovements = {} } = useQuery({
    queryKey: ['cf-compare-movements', filters.companyIds, filters.compareDateFrom, filters.compareDateTo, filters.branchId, filters.costCenter, filters.projectCode],
    enabled: enabled && hasCompare,
    queryFn: () => fetchPeriodMovements({
      companyIds: filters.companyIds,
      dateFrom: filters.compareDateFrom,
      dateTo: filters.compareDateTo,
      branchId: filters.branchId || undefined,
      costCenter: filters.costCenter || undefined,
      projectCode: filters.projectCode || undefined,
      postedOnly: true,
    }),
  });

  const lines = buildLines(movements, hasCompare ? compareMovements : {}, openingCash, hasCompare ? compareOpeningCash : 0);

  return { lines, isLoading, hasCompare };
}

export function useCashFlowMonthlyData(params: {
  companyIds: string[];
  dateFrom: string;
  dateTo: string;
  branchId?: string;
}, enabled = true) {
  return useQuery({
    queryKey: ['cf-monthly', params.companyIds, params.dateFrom, params.dateTo, params.branchId],
    enabled,
    queryFn: async () => {
      const start = new Date(params.dateFrom);
      const end = new Date(params.dateTo);
      const months: { month: string; operating: number; investing: number; financing: number; net: number }[] = [];

      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        const mStart = current.toISOString().split('T')[0];
        const mEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0).toISOString().split('T')[0];
        const label = current.toLocaleDateString('en', { month: 'short', year: '2-digit' });

        const mvmt = await fetchPeriodMovements({
          companyIds: params.companyIds,
          dateFrom: mStart,
          dateTo: mEnd,
          branchId: params.branchId,
          postedOnly: true,
        });

        // Simplified aggregation
        let operating = 0, investing = 0, financing = 0;
        for (const [code, val] of Object.entries(mvmt)) {
          if (code.startsWith('110') || code.startsWith('120') || code.startsWith('210') || code.startsWith('630') || code.startsWith('240') || code.startsWith('680')) {
            operating += -val;
          } else if (code.startsWith('150') || code.startsWith('160') || code.startsWith('170') || code.startsWith('180')) {
            investing += -val;
          } else if (code.startsWith('250') || code.startsWith('230') || code.startsWith('310') || code.startsWith('340')) {
            financing += -val;
          }
        }

        months.push({ month: label, operating, investing, financing, net: operating + investing + financing });
        current.setMonth(current.getMonth() + 1);
      }
      return months;
    },
  });
}
