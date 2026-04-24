import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PLSection {
  key: string;
  label: string;
  labelAr?: string;
  type: 'normal' | 'calculated' | 'subtotal';
  order: number;
  totalLabel?: string;
  formula?: string;
  signInversion?: boolean;
  lines: PLLine[];
  amount: number;
  compareAmount: number;
  budgetAmount: number;
}

export interface PLLine {
  id: string;
  label: string;
  labelAr?: string;
  order: number;
  isBold?: boolean;
  indent?: number;
  accounts: PLLineAccount[];
  amount: number;
  compareAmount: number;
  budgetAmount: number;
}

export interface PLLineAccount {
  acctFrom: string;
  acctTo: string;
  balanceRule: string;
  isDeduction: boolean;
}

// Default P&L structure when no DB config exists
const DEFAULT_PL_SECTIONS: Omit<PLSection, 'amount' | 'compareAmount' | 'budgetAmount' | 'lines'>[] = [
  { key: 'revenue', label: 'Revenue', labelAr: 'الإيرادات', type: 'normal', order: 1, totalLabel: 'Total Revenue', signInversion: true },
  { key: 'cost_of_sales', label: 'Cost of Sales', labelAr: 'تكلفة المبيعات', type: 'normal', order: 2, totalLabel: 'Total Cost of Sales' },
  { key: 'gross_profit', label: 'Gross Profit', labelAr: 'مجمل الربح', type: 'calculated', order: 3, formula: 'revenue - cost_of_sales' },
  { key: 'operating_expenses', label: 'Operating Expenses', labelAr: 'المصروفات التشغيلية', type: 'normal', order: 4, totalLabel: 'Total Operating Expenses' },
  { key: 'ebitda', label: 'EBITDA', labelAr: 'الأرباح قبل الفوائد والضرائب والاستهلاك', type: 'calculated', order: 5, formula: 'gross_profit - operating_expenses' },
  { key: 'depreciation', label: 'Depreciation & Amortization', labelAr: 'الاستهلاك والإطفاء', type: 'normal', order: 6, totalLabel: 'Total D&A' },
  { key: 'operating_profit', label: 'Operating Profit', labelAr: 'الربح التشغيلي', type: 'calculated', order: 7, formula: 'ebitda - depreciation' },
  { key: 'other_income', label: 'Other Income & Expenses', labelAr: 'إيرادات ومصروفات أخرى', type: 'normal', order: 8, totalLabel: 'Net Other Income' },
  { key: 'finance_cost', label: 'Finance Cost', labelAr: 'تكاليف التمويل', type: 'normal', order: 9, totalLabel: 'Total Finance Cost' },
  { key: 'net_profit_before_tax', label: 'Net Profit Before Tax', labelAr: 'صافي الربح قبل الضريبة', type: 'calculated', order: 10, formula: 'operating_profit + other_income - finance_cost' },
  { key: 'tax', label: 'Tax', labelAr: 'الضريبة', type: 'normal', order: 11, totalLabel: 'Total Tax' },
  { key: 'net_profit', label: 'Net Profit After Tax', labelAr: 'صافي الربح بعد الضريبة', type: 'calculated', order: 12, formula: 'net_profit_before_tax - tax' },
];

// Classify accounts into P&L sections by code patterns
function classifyAccount(acctCode: string): string {
  const c = acctCode;
  if (c.startsWith('41') || c.startsWith('40')) return 'revenue';
  if (c.startsWith('51') || c.startsWith('50')) return 'cost_of_sales';
  if (c.startsWith('61') || c.startsWith('60') || c.startsWith('62') || c.startsWith('63') || c.startsWith('64') || c.startsWith('65')) return 'operating_expenses';
  if (c.startsWith('66') || c.startsWith('67')) return 'depreciation';
  if (c.startsWith('42') || c.startsWith('43') || c.startsWith('44') || c.startsWith('71') || c.startsWith('72') || c.startsWith('73')) return 'other_income';
  if (c.startsWith('68') || c.startsWith('69')) return 'finance_cost';
  if (c.startsWith('74') || c.startsWith('75')) return 'tax';
  return 'operating_expenses';
}

interface UsePLDataParams {
  companyIds: string[];
  dateFrom: string;
  dateTo: string;
  compareDateFrom?: string;
  compareDateTo?: string;
  branchId?: string;
  costCenter?: string;
  projectCode?: string;
  includeUnposted?: boolean;
}

export function useProfitLossData(params: UsePLDataParams, enabled = true) {
  const { companyIds, dateFrom, dateTo, compareDateFrom, compareDateTo, branchId, costCenter, projectCode, includeUnposted } = params;

  // Fetch journal entry lines for the period
  const { data: jeData, isLoading: jeLoading } = useQuery({
    queryKey: ['pl-je-data', companyIds, dateFrom, dateTo, branchId, costCenter, projectCode, includeUnposted],
    enabled: enabled && !!dateFrom && !!dateTo,
    queryFn: async () => {
      // Fetch journal entries
      let jeQuery = supabase.from('journal_entries').select('id, posting_date, status, company_id, branch_id');
      if (dateFrom) jeQuery = jeQuery.gte('posting_date', dateFrom);
      if (dateTo) jeQuery = jeQuery.lte('posting_date', dateTo);
      if (companyIds.length > 0) jeQuery = jeQuery.in('company_id', companyIds);
      if (branchId) jeQuery = jeQuery.eq('branch_id', branchId);
      if (!includeUnposted) jeQuery = jeQuery.eq('status', 'posted');

      const allJEs: any[] = [];
      let from = 0;
      const chunkSize = 1000;
      while (true) {
        const { data, error } = await jeQuery.range(from, from + chunkSize - 1);
        if (error) throw error;
        allJEs.push(...(data || []));
        if (!data || data.length < chunkSize) break;
        from += chunkSize;
      }

      const jeIds = allJEs.map(j => j.id);
      if (jeIds.length === 0) return [];

      // Fetch lines in chunks
      const allLines: any[] = [];
      for (let i = 0; i < jeIds.length; i += 100) {
        const chunk = jeIds.slice(i, i + 100);
        let lQuery = supabase.from('journal_entry_lines').select('*').in('journal_entry_id', chunk);
        if (costCenter) lQuery = lQuery.eq('cost_center', costCenter);
        if (projectCode) lQuery = lQuery.eq('project_code', projectCode);
        const { data, error } = await lQuery;
        if (error) throw error;
        allLines.push(...(data || []));
      }
      return allLines;
    },
  });

  // Fetch comparison period data
  const { data: compareData } = useQuery({
    queryKey: ['pl-compare-data', companyIds, compareDateFrom, compareDateTo, branchId, costCenter, projectCode],
    enabled: enabled && !!compareDateFrom && !!compareDateTo,
    queryFn: async () => {
      let jeQuery = supabase.from('journal_entries').select('id, posting_date, status, company_id');
      if (compareDateFrom) jeQuery = jeQuery.gte('posting_date', compareDateFrom);
      if (compareDateTo) jeQuery = jeQuery.lte('posting_date', compareDateTo);
      if (companyIds.length > 0) jeQuery = jeQuery.in('company_id', companyIds);
      if (branchId) jeQuery = jeQuery.eq('branch_id', branchId);
      jeQuery = jeQuery.eq('status', 'posted');

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
      if (jeIds.length === 0) return [];

      const allLines: any[] = [];
      for (let i = 0; i < jeIds.length; i += 100) {
        const chunk = jeIds.slice(i, i + 100);
        let lQuery = supabase.from('journal_entry_lines').select('*').in('journal_entry_id', chunk);
        if (costCenter) lQuery = lQuery.eq('cost_center', costCenter);
        if (projectCode) lQuery = lQuery.eq('project_code', projectCode);
        const { data, error } = await lQuery;
        if (error) throw error;
        allLines.push(...(data || []));
      }
      return allLines;
    },
  });

  // Fetch budget data
  const { data: budgetData } = useQuery({
    queryKey: ['pl-budget-data', companyIds, dateFrom, dateTo],
    enabled: enabled && companyIds.length > 0,
    queryFn: async () => {
      let q = supabase.from('budget_lines').select('*');
      if (companyIds.length > 0) q = q.in('company_id', companyIds);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch P&L config from DB
  const { data: dbSections } = useQuery({
    queryKey: ['pl-config-sections', companyIds],
    enabled,
    queryFn: async () => {
      let q = supabase.from('pl_report_sections' as any).select('*').order('display_order') as any;
      if (companyIds.length === 1) q = q.or(`company_id.eq.${companyIds[0]},company_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  // Build report
  const buildReport = (): PLSection[] => {
    const lines = jeData || [];
    const cmpLines = compareData || [];
    const budgets = budgetData || [];

    // Aggregate by account
    const acctTotals: Record<string, { debit: number; credit: number }> = {};
    const acctTotalsCmp: Record<string, { debit: number; credit: number }> = {};

    for (const l of lines) {
      const code = l.acct_code;
      if (!acctTotals[code]) acctTotals[code] = { debit: 0, credit: 0 };
      acctTotals[code].debit += Number(l.debit || 0);
      acctTotals[code].credit += Number(l.credit || 0);
    }

    for (const l of cmpLines) {
      const code = l.acct_code;
      if (!acctTotalsCmp[code]) acctTotalsCmp[code] = { debit: 0, credit: 0 };
      acctTotalsCmp[code].debit += Number(l.debit || 0);
      acctTotalsCmp[code].credit += Number(l.credit || 0);
    }

    // Aggregate budgets by account
    const budgetByAcct: Record<string, number> = {};
    for (const b of budgets) {
      const code = b.account_code;
      budgetByAcct[code] = (budgetByAcct[code] || 0) + Number(b.revised_amount || b.original_amount || 0);
    }

    // Group by section
    const sectionAmounts: Record<string, { amount: number; compare: number; budget: number }> = {};
    const allAcctCodes = [...new Set([...Object.keys(acctTotals), ...Object.keys(acctTotalsCmp)])];

    for (const code of allAcctCodes) {
      const section = classifyAccount(code);
      if (!sectionAmounts[section]) sectionAmounts[section] = { amount: 0, compare: 0, budget: 0 };

      const t = acctTotals[code] || { debit: 0, credit: 0 };
      const tc = acctTotalsCmp[code] || { debit: 0, credit: 0 };

      // Revenue: credit - debit; Expenses: debit - credit
      if (section === 'revenue' || section === 'other_income') {
        sectionAmounts[section].amount += (t.credit - t.debit);
        sectionAmounts[section].compare += (tc.credit - tc.debit);
      } else {
        sectionAmounts[section].amount += (t.debit - t.credit);
        sectionAmounts[section].compare += (tc.debit - tc.credit);
      }
      sectionAmounts[section].budget += (budgetByAcct[code] || 0);
    }

    // Build sections
    const sections: PLSection[] = DEFAULT_PL_SECTIONS.map(s => {
      let amount = 0, compareAmount = 0, budgetAmount = 0;

      if (s.type === 'calculated' && s.formula) {
        // Simple formula evaluation
        const getVal = (key: string, field: 'amount' | 'compare' | 'budget') => {
          const sec = sectionAmounts[key];
          return sec ? sec[field] : 0;
        };

        if (s.key === 'gross_profit') {
          amount = getVal('revenue', 'amount') - getVal('cost_of_sales', 'amount');
          compareAmount = getVal('revenue', 'compare') - getVal('cost_of_sales', 'compare');
          budgetAmount = getVal('revenue', 'budget') - getVal('cost_of_sales', 'budget');
        } else if (s.key === 'ebitda') {
          const gp = getVal('revenue', 'amount') - getVal('cost_of_sales', 'amount');
          const gpC = getVal('revenue', 'compare') - getVal('cost_of_sales', 'compare');
          amount = gp - getVal('operating_expenses', 'amount');
          compareAmount = gpC - getVal('operating_expenses', 'compare');
          budgetAmount = getVal('revenue', 'budget') - getVal('cost_of_sales', 'budget') - getVal('operating_expenses', 'budget');
        } else if (s.key === 'operating_profit') {
          const gp = getVal('revenue', 'amount') - getVal('cost_of_sales', 'amount');
          const gpC = getVal('revenue', 'compare') - getVal('cost_of_sales', 'compare');
          amount = gp - getVal('operating_expenses', 'amount') - getVal('depreciation', 'amount');
          compareAmount = gpC - getVal('operating_expenses', 'compare') - getVal('depreciation', 'compare');
        } else if (s.key === 'net_profit_before_tax') {
          const gp = getVal('revenue', 'amount') - getVal('cost_of_sales', 'amount');
          const op = gp - getVal('operating_expenses', 'amount') - getVal('depreciation', 'amount');
          amount = op + getVal('other_income', 'amount') - getVal('finance_cost', 'amount');
          const gpC = getVal('revenue', 'compare') - getVal('cost_of_sales', 'compare');
          const opC = gpC - getVal('operating_expenses', 'compare') - getVal('depreciation', 'compare');
          compareAmount = opC + getVal('other_income', 'compare') - getVal('finance_cost', 'compare');
        } else if (s.key === 'net_profit') {
          const gp = getVal('revenue', 'amount') - getVal('cost_of_sales', 'amount');
          const op = gp - getVal('operating_expenses', 'amount') - getVal('depreciation', 'amount');
          const npbt = op + getVal('other_income', 'amount') - getVal('finance_cost', 'amount');
          amount = npbt - getVal('tax', 'amount');
          const gpC = getVal('revenue', 'compare') - getVal('cost_of_sales', 'compare');
          const opC = gpC - getVal('operating_expenses', 'compare') - getVal('depreciation', 'compare');
          const npbtC = opC + getVal('other_income', 'compare') - getVal('finance_cost', 'compare');
          compareAmount = npbtC - getVal('tax', 'compare');
        }
      } else {
        const sec = sectionAmounts[s.key];
        if (sec) {
          amount = sec.amount;
          compareAmount = sec.compare;
          budgetAmount = sec.budget;
        }
      }

      // Build account-level lines for normal sections
      const sectionLines: PLLine[] = [];
      if (s.type === 'normal') {
        const sectionAccounts = allAcctCodes.filter(c => classifyAccount(c) === s.key);
        for (const code of sectionAccounts.sort()) {
          const t = acctTotals[code] || { debit: 0, credit: 0 };
          const tc = acctTotalsCmp[code] || { debit: 0, credit: 0 };
          let lineAmt = 0, lineCmp = 0;
          if (s.key === 'revenue' || s.key === 'other_income') {
            lineAmt = t.credit - t.debit;
            lineCmp = tc.credit - tc.debit;
          } else {
            lineAmt = t.debit - t.credit;
            lineCmp = tc.debit - tc.credit;
          }
          if (Math.abs(lineAmt) > 0.01 || Math.abs(lineCmp) > 0.01) {
            // Find account name from lines
            const line = lines.find((l: any) => l.acct_code === code);
            const cmpLine = cmpLines.find((l: any) => l.acct_code === code);
            sectionLines.push({
              id: code,
              label: line?.acct_name || cmpLine?.acct_name || code,
              order: 0,
              amount: lineAmt,
              compareAmount: lineCmp,
              budgetAmount: budgetByAcct[code] || 0,
              accounts: [{ acctFrom: code, acctTo: code, balanceRule: 'credit_minus_debit', isDeduction: false }],
            });
          }
        }
      }

      return { ...s, lines: sectionLines, amount, compareAmount, budgetAmount };
    });

    return sections;
  };

  return {
    sections: buildReport(),
    isLoading: jeLoading,
    rawLines: jeData || [],
    compareLines: compareData || [],
    budgetData: budgetData || [],
  };
}

// Monthly breakdown for columnar view
export function usePLMonthlyData(params: UsePLDataParams, enabled = true) {
  const { companyIds, dateFrom, dateTo, branchId, costCenter, projectCode } = params;

  return useQuery({
    queryKey: ['pl-monthly-breakdown', companyIds, dateFrom, dateTo, branchId, costCenter, projectCode],
    enabled: enabled && !!dateFrom && !!dateTo,
    queryFn: async () => {
      let jeQuery = supabase.from('journal_entries').select('id, posting_date, status, company_id');
      if (dateFrom) jeQuery = jeQuery.gte('posting_date', dateFrom);
      if (dateTo) jeQuery = jeQuery.lte('posting_date', dateTo);
      if (companyIds.length > 0) jeQuery = jeQuery.in('company_id', companyIds);
      if (branchId) jeQuery = jeQuery.eq('branch_id', branchId);
      jeQuery = jeQuery.eq('status', 'posted');

      const allJEs: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await jeQuery.range(from, from + 999);
        if (error) throw error;
        allJEs.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }

      // Create JE date map
      const jeDateMap: Record<string, string> = {};
      for (const je of allJEs) jeDateMap[je.id] = je.posting_date;

      const jeIds = allJEs.map(j => j.id);
      if (jeIds.length === 0) return {};

      const allLines: any[] = [];
      for (let i = 0; i < jeIds.length; i += 100) {
        const chunk = jeIds.slice(i, i + 100);
        let lQuery = supabase.from('journal_entry_lines').select('*').in('journal_entry_id', chunk);
        if (costCenter) lQuery = lQuery.eq('cost_center', costCenter);
        if (projectCode) lQuery = lQuery.eq('project_code', projectCode);
        const { data, error } = await lQuery;
        if (error) throw error;
        allLines.push(...(data || []));
      }

      // Group by month and section
      const monthly: Record<string, Record<string, number>> = {};
      for (const l of allLines) {
        const postDate = jeDateMap[l.journal_entry_id];
        if (!postDate) continue;
        const month = postDate.substring(0, 7); // YYYY-MM
        if (!monthly[month]) monthly[month] = {};
        const section = classifyAccount(l.acct_code);
        const isRevenue = section === 'revenue' || section === 'other_income';
        const amt = isRevenue
          ? (Number(l.credit || 0) - Number(l.debit || 0))
          : (Number(l.debit || 0) - Number(l.credit || 0));
        monthly[month][section] = (monthly[month][section] || 0) + amt;
      }
      return monthly;
    },
  });
}
