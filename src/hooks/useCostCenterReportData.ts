import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface CCFilters {
  companyIds: string[];
  branchId: string;
  costCenterId: string;
  departmentId: string;
  projectId: string;
  fiscalYear: string;
  dateFrom: string;
  dateTo: string;
  accountRange: string;
  includeUnposted: boolean;
}

export interface CostCenterRow {
  code: string;
  name: string;
  parentId: string | null;
  department: string;
  branch: string;
  budget: number;
  actual: number;
  commitment: number;
  forecast: number;
  variance: number;
  variancePct: number;
  priorPeriod: number;
  priorYear: number;
  directCost: number;
  allocatedCost: number;
  accounts: CCAccountRow[];
  monthlyActuals: Record<string, number>;
}

export interface CCAccountRow {
  accountCode: string;
  accountName: string;
  budget: number;
  actual: number;
  variance: number;
}

export interface CCReportData {
  costCenters: CostCenterRow[];
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  overspentCount: number;
  utilization: number;
  isLoading: boolean;
}

const currentYear = new Date().getFullYear();

export function useCostCenterReportData(filters: CCFilters, enabled: boolean): CCReportData {
  // Fetch cost centers
  const { data: costCenters = [] } = useQuery({
    queryKey: ['cc-report-centers', filters.companyIds],
    queryFn: async () => {
      let q = supabase.from('cost_centers').select('id, code, name, parent_id, company_id, is_active').eq('is_active', true);
      if (filters.companyIds.length > 0) q = q.in('company_id', filters.companyIds);
      const { data } = await q.order('code').limit(1000);
      return data || [];
    },
    enabled,
  });

  // Fetch journal entry lines with cost_center
  const { data: jeLines = [], isLoading: loadingJE } = useQuery({
    queryKey: ['cc-report-je', filters.companyIds, filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      let q = supabase.from('finance_journal_entry_lines').select(`
        id, account_code, account_name, debit_amount, credit_amount, cost_center, created_at,
        je:finance_journal_entries!inner(id, company_id, posting_date, status)
      `);
      if (filters.companyIds.length > 0) q = q.in('je.company_id', filters.companyIds);
      if (filters.dateFrom) q = q.gte('je.posting_date', filters.dateFrom);
      if (filters.dateTo) q = q.lte('je.posting_date', filters.dateTo);
      if (!filters.includeUnposted) q = q.eq('je.status', 'posted');

      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data } = await q.range(from, from + 999);
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
    enabled,
  });

  // Fetch budget lines
  const { data: budgetLines = [] } = useQuery({
    queryKey: ['cc-report-budget', filters.companyIds, filters.fiscalYear],
    queryFn: async () => {
      let q = supabase.from('budget_lines').select('account_code, account_name, cost_code, original_amount, revised_amount, actual_amount, committed_amount, forecast_amount, fiscal_year, period, company_id');
      if (filters.companyIds.length > 0) q = q.in('company_id', filters.companyIds);
      if (filters.fiscalYear) q = q.eq('fiscal_year', parseInt(filters.fiscalYear));
      const { data } = await q.limit(5000);
      return data || [];
    },
    enabled,
  });

  return useMemo(() => {
    // Build cost center map
    const ccMap = new Map<string, CostCenterRow>();

    costCenters.forEach(cc => {
      ccMap.set(cc.code, {
        code: cc.code,
        name: cc.name,
        parentId: cc.parent_id,
        department: '',
        branch: '',
        budget: 0,
        actual: 0,
        commitment: 0,
        forecast: 0,
        variance: 0,
        variancePct: 0,
        priorPeriod: 0,
        priorYear: 0,
        directCost: 0,
        allocatedCost: 0,
        accounts: [],
        monthlyActuals: {},
      });
    });

    // Aggregate actuals from JE lines
    const acctMap = new Map<string, Map<string, { code: string; name: string; actual: number }>>();

    jeLines.forEach((line: any) => {
      const ccCode = line.cost_center;
      if (!ccCode) return;
      
      let cc = ccMap.get(ccCode);
      if (!cc) {
        cc = {
          code: ccCode, name: ccCode, parentId: null, department: '', branch: '',
          budget: 0, actual: 0, commitment: 0, forecast: 0, variance: 0, variancePct: 0,
          priorPeriod: 0, priorYear: 0, directCost: 0, allocatedCost: 0, accounts: [],
          monthlyActuals: {},
        };
        ccMap.set(ccCode, cc);
      }
      
      const amount = (line.debit_amount || 0) - (line.credit_amount || 0);
      cc.actual += amount;
      cc.directCost += amount;

      // Monthly
      const postDate = line.je?.posting_date || line.created_at;
      if (postDate) {
        const month = postDate.substring(0, 7);
        cc.monthlyActuals[month] = (cc.monthlyActuals[month] || 0) + amount;
      }

      // Account breakdown
      if (!acctMap.has(ccCode)) acctMap.set(ccCode, new Map());
      const accts = acctMap.get(ccCode)!;
      const acctKey = line.account_code || 'unknown';
      if (!accts.has(acctKey)) accts.set(acctKey, { code: acctKey, name: line.account_name || acctKey, actual: 0 });
      accts.get(acctKey)!.actual += amount;
    });

    // Aggregate budgets
    budgetLines.forEach((bl: any) => {
      const ccCode = bl.cost_code;
      if (!ccCode) return;
      let cc = ccMap.get(ccCode);
      if (!cc) return;
      cc.budget += bl.revised_amount || bl.original_amount || 0;
      cc.commitment += bl.committed_amount || 0;
      cc.forecast += bl.forecast_amount || 0;
    });

    // Compute variance and build account arrays
    ccMap.forEach((cc, code) => {
      cc.variance = cc.budget - cc.actual;
      cc.variancePct = cc.budget > 0 ? (cc.variance / cc.budget) * 100 : 0;
      
      const accts = acctMap.get(code);
      if (accts) {
        cc.accounts = Array.from(accts.values()).map(a => ({
          accountCode: a.code,
          accountName: a.name,
          budget: 0,
          actual: a.actual,
          variance: -a.actual,
        })).sort((a, b) => Math.abs(b.actual) - Math.abs(a.actual));
      }
    });

    const rows = Array.from(ccMap.values())
      .filter(cc => cc.actual !== 0 || cc.budget !== 0)
      .sort((a, b) => Math.abs(b.actual) - Math.abs(a.actual));

    const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
    const totalActual = rows.reduce((s, r) => s + r.actual, 0);

    return {
      costCenters: rows,
      totalBudget,
      totalActual,
      totalVariance: totalBudget - totalActual,
      overspentCount: rows.filter(r => r.actual > r.budget && r.budget > 0).length,
      utilization: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
      isLoading: loadingJE,
    };
  }, [costCenters, jeLines, budgetLines, loadingJE]);
}
