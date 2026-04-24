import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GLTransaction {
  id: string;
  postingDate: string;
  documentDate: string;
  jeNumber: string;
  jeId: string;
  sourceModule: string;
  sourceDocNumber: string;
  acctCode: string;
  acctName: string;
  branch: string;
  costCenter: string;
  department: string;
  project: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  createdBy: string;
  status: string;
}

export interface GLAccountSummary {
  acctCode: string;
  acctName: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  transactionCount: number;
  transactions: GLTransaction[];
}

export interface GLFilters {
  companyIds: string[];
  branchId: string;
  dateFrom: string;
  dateTo: string;
  acctCodeFrom: string;
  acctCodeTo: string;
  singleAccount: string;
  costCenter: string;
  projectCode: string;
  departmentId: string;
  sourceModule: string;
  sourceDocNumber: string;
  postingStatus: string;
  includeZeroBalance: boolean;
  viewMode: string;
  searchQuery: string;
}

async function fetchAllJournalEntries(params: {
  companyIds: string[];
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  postingStatus: string;
}) {
  const { companyIds, branchId, dateFrom, dateTo, postingStatus } = params;
  let query = supabase.from('journal_entries').select('id, je_number, posting_date, document_date, reference, source_module, source_document_number, status, branch_id, created_by');
  if (dateFrom) query = query.gte('posting_date', dateFrom);
  if (dateTo) query = query.lte('posting_date', dateTo);
  if (companyIds.length > 0) query = query.in('company_id', companyIds);
  if (branchId) query = query.eq('branch_id', branchId);
  if (postingStatus && postingStatus !== 'all') query = query.eq('status', postingStatus);

  const allJEs: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw error;
    allJEs.push(...(data || []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return allJEs;
}

async function fetchJournalLines(jeIds: string[], filters: {
  costCenter?: string;
  projectCode?: string;
  acctCodeFrom?: string;
  acctCodeTo?: string;
  singleAccount?: string;
}) {
  if (jeIds.length === 0) return [];
  const allLines: any[] = [];
  for (let i = 0; i < jeIds.length; i += 100) {
    const chunk = jeIds.slice(i, i + 100);
    let query = supabase.from('journal_entry_lines')
      .select('id, journal_entry_id, acct_code, acct_name, debit, credit, cost_center, project_code, description, department')
      .in('journal_entry_id', chunk);
    if (filters.costCenter) query = query.eq('cost_center', filters.costCenter);
    if (filters.projectCode) query = query.eq('project_code', filters.projectCode);
    if (filters.singleAccount) query = query.eq('acct_code', filters.singleAccount);
    if (filters.acctCodeFrom) query = query.gte('acct_code', filters.acctCodeFrom);
    if (filters.acctCodeTo) query = query.lte('acct_code', filters.acctCodeTo);
    const { data, error } = await query;
    if (error) throw error;
    allLines.push(...(data || []));
  }
  return allLines;
}

export function useGeneralLedgerData(filters: GLFilters, enabled = true) {
  // Opening balances: all JE lines before dateFrom
  const { data: openingData = {}, isLoading: openingLoading } = useQuery({
    queryKey: ['gl-report-opening', filters.companyIds, filters.dateFrom, filters.branchId, filters.acctCodeFrom, filters.acctCodeTo, filters.singleAccount, filters.costCenter, filters.projectCode],
    enabled: enabled && !!filters.dateFrom,
    queryFn: async () => {
      const jes = await fetchAllJournalEntries({
        companyIds: filters.companyIds,
        branchId: filters.branchId || undefined,
        dateTo: (() => {
          const d = new Date(filters.dateFrom);
          d.setDate(d.getDate() - 1);
          return d.toISOString().split('T')[0];
        })(),
        postingStatus: 'posted',
      });
      const lines = await fetchJournalLines(jes.map(j => j.id), {
        costCenter: filters.costCenter || undefined,
        projectCode: filters.projectCode || undefined,
        acctCodeFrom: filters.acctCodeFrom || undefined,
        acctCodeTo: filters.acctCodeTo || undefined,
        singleAccount: filters.singleAccount || undefined,
      });
      const balances: Record<string, { balance: number; name: string }> = {};
      for (const l of lines) {
        if (!balances[l.acct_code]) balances[l.acct_code] = { balance: 0, name: l.acct_name || l.acct_code };
        balances[l.acct_code].balance += (l.debit || 0) - (l.credit || 0);
      }
      return balances;
    },
  });

  // Period transactions
  const { data: periodData, isLoading: periodLoading } = useQuery({
    queryKey: ['gl-report-period', filters.companyIds, filters.dateFrom, filters.dateTo, filters.branchId, filters.postingStatus, filters.acctCodeFrom, filters.acctCodeTo, filters.singleAccount, filters.costCenter, filters.projectCode, filters.sourceModule],
    enabled: enabled && !!filters.dateFrom && !!filters.dateTo,
    queryFn: async () => {
      const jes = await fetchAllJournalEntries({
        companyIds: filters.companyIds,
        branchId: filters.branchId || undefined,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        postingStatus: filters.postingStatus || 'all',
      });

      if (filters.sourceModule && filters.sourceModule !== 'all') {
        const filtered = jes.filter(j => (j.source_module || '').toLowerCase().includes(filters.sourceModule.toLowerCase()));
        const lines = await fetchJournalLines(filtered.map(j => j.id), {
          costCenter: filters.costCenter || undefined,
          projectCode: filters.projectCode || undefined,
          acctCodeFrom: filters.acctCodeFrom || undefined,
          acctCodeTo: filters.acctCodeTo || undefined,
          singleAccount: filters.singleAccount || undefined,
        });
        return { jes: filtered, lines };
      }

      const lines = await fetchJournalLines(jes.map(j => j.id), {
        costCenter: filters.costCenter || undefined,
        projectCode: filters.projectCode || undefined,
        acctCodeFrom: filters.acctCodeFrom || undefined,
        acctCodeTo: filters.acctCodeTo || undefined,
        singleAccount: filters.singleAccount || undefined,
      });
      return { jes, lines };
    },
  });

  // Build account summaries
  const accountSummaries: GLAccountSummary[] = (() => {
    if (!periodData) return [];
    const { jes, lines } = periodData;
    const jeMap = new Map(jes.map((j: any) => [j.id, j]));

    // Group lines by account
    const acctMap = new Map<string, GLAccountSummary>();
    for (const l of lines) {
      if (!acctMap.has(l.acct_code)) {
        const opening = openingData[l.acct_code]?.balance || 0;
        acctMap.set(l.acct_code, {
          acctCode: l.acct_code,
          acctName: l.acct_name || openingData[l.acct_code]?.name || l.acct_code,
          openingBalance: opening,
          totalDebit: 0,
          totalCredit: 0,
          closingBalance: opening,
          transactionCount: 0,
          transactions: [],
        });
      }
      const summary = acctMap.get(l.acct_code)!;
      summary.totalDebit += l.debit || 0;
      summary.totalCredit += l.credit || 0;
      summary.transactionCount++;

      const je = jeMap.get(l.journal_entry_id) as any;
      summary.transactions.push({
        id: l.id,
        postingDate: je?.posting_date || '',
        documentDate: je?.document_date || je?.posting_date || '',
        jeNumber: je?.je_number || '',
        jeId: l.journal_entry_id,
        sourceModule: je?.source_module || 'Manual',
        sourceDocNumber: je?.source_document_number || '',
        acctCode: l.acct_code,
        acctName: l.acct_name || '',
        branch: '',
        costCenter: l.cost_center || '',
        department: l.department || '',
        project: l.project_code || '',
        reference: je?.reference || '',
        description: l.description || '',
        debit: l.debit || 0,
        credit: l.credit || 0,
        runningBalance: 0, // calculated below
        createdBy: je?.created_by || '',
        status: je?.status || '',
      });
    }

    // Also add accounts that only have opening balances
    if (filters.includeZeroBalance) {
      for (const [code, data] of Object.entries(openingData)) {
        if (!acctMap.has(code)) {
          acctMap.set(code, {
            acctCode: code,
            acctName: data.name,
            openingBalance: data.balance,
            totalDebit: 0,
            totalCredit: 0,
            closingBalance: data.balance,
            transactionCount: 0,
            transactions: [],
          });
        }
      }
    }

    // Calculate closing balances and running balances
    const result = Array.from(acctMap.values());
    for (const acct of result) {
      acct.closingBalance = acct.openingBalance + acct.totalDebit - acct.totalCredit;
      // Sort transactions by date, then calculate running balance
      acct.transactions.sort((a, b) => a.postingDate.localeCompare(b.postingDate) || a.jeNumber.localeCompare(b.jeNumber));
      let running = acct.openingBalance;
      for (const t of acct.transactions) {
        running += t.debit - t.credit;
        t.runningBalance = running;
      }
    }

    // Filter
    const filtered = result.filter(a => {
      if (!filters.includeZeroBalance && a.closingBalance === 0 && a.totalDebit === 0 && a.totalCredit === 0) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return a.acctCode.toLowerCase().includes(q) || a.acctName.toLowerCase().includes(q);
      }
      return true;
    });

    filtered.sort((a, b) => a.acctCode.localeCompare(b.acctCode));
    return filtered;
  })();

  // Totals
  const totals = {
    openingDebit: accountSummaries.reduce((s, a) => s + Math.max(a.openingBalance, 0), 0),
    openingCredit: accountSummaries.reduce((s, a) => s + Math.max(-a.openingBalance, 0), 0),
    totalDebit: accountSummaries.reduce((s, a) => s + a.totalDebit, 0),
    totalCredit: accountSummaries.reduce((s, a) => s + a.totalCredit, 0),
    closingDebit: accountSummaries.reduce((s, a) => s + Math.max(a.closingBalance, 0), 0),
    closingCredit: accountSummaries.reduce((s, a) => s + Math.max(-a.closingBalance, 0), 0),
    transactionCount: accountSummaries.reduce((s, a) => s + a.transactionCount, 0),
    accountCount: accountSummaries.length,
  };

  // Chart data: daily movement
  const dailyMovement = (() => {
    if (!periodData) return [];
    const dayMap = new Map<string, { date: string; debit: number; credit: number }>();
    for (const acct of accountSummaries) {
      for (const t of acct.transactions) {
        if (!dayMap.has(t.postingDate)) dayMap.set(t.postingDate, { date: t.postingDate, debit: 0, credit: 0 });
        const d = dayMap.get(t.postingDate)!;
        d.debit += t.debit;
        d.credit += t.credit;
      }
    }
    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();

  // Top source modules
  const sourceModuleBreakdown = (() => {
    const moduleMap = new Map<string, number>();
    for (const acct of accountSummaries) {
      for (const t of acct.transactions) {
        const mod = t.sourceModule || 'Manual';
        moduleMap.set(mod, (moduleMap.get(mod) || 0) + t.debit + t.credit);
      }
    }
    return Array.from(moduleMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  })();

  // Top accounts by movement
  const topAccountsByMovement = accountSummaries
    .map(a => ({ name: `${a.acctCode} ${a.acctName}`.substring(0, 30), value: a.totalDebit + a.totalCredit }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    accountSummaries,
    totals,
    dailyMovement,
    sourceModuleBreakdown,
    topAccountsByMovement,
    isLoading: openingLoading || periodLoading,
  };
}
