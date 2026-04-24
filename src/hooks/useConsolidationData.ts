import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface ConsolidationFilters {
  companyIds: string[];
  fiscalYear: string;
  dateFrom: string;
  dateTo: string;
  includeEliminations: boolean;
  includeAdjustments: boolean;
  accountRange: string;
}

export interface EntityData {
  companyId: string;
  companyName: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  trialDebit: number;
  trialCredit: number;
  accounts: Record<string, { code: string; name: string; debit: number; credit: number }>;
}

export interface ConsolidationData {
  entities: EntityData[];
  consolidated: EntityData;
  eliminationValue: number;
  adjustmentValue: number;
  isLoading: boolean;
}

export function useConsolidationData(filters: ConsolidationFilters, enabled: boolean): ConsolidationData {
  const { data: companies = [] } = useQuery({
    queryKey: ['consol-companies'],
    queryFn: async () => {
      const { data } = await supabase.from('sap_companies').select('id, company_name').order('company_name');
      return (data || []).map(c => ({ id: c.id, name: c.company_name }));
    },
    enabled,
  });

  const { data: jeLines = [], isLoading } = useQuery({
    queryKey: ['consol-je-lines', filters.companyIds, filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      const ids = filters.companyIds.length > 0 ? filters.companyIds : companies.map(c => c.id);
      if (ids.length === 0) return [];

      const allData: any[] = [];
      for (const cid of ids) {
        let q = supabase.from('finance_journal_entry_lines').select(`
          account_code, account_name, debit_amount, credit_amount,
          je:finance_journal_entries!inner(company_id, posting_date, status)
        `)
        .eq('je.company_id', cid)
        .eq('je.status', 'posted');
        if (filters.dateFrom) q = q.gte('je.posting_date', filters.dateFrom);
        if (filters.dateTo) q = q.lte('je.posting_date', filters.dateTo);

        let from = 0;
        while (true) {
          const { data } = await q.range(from, from + 999);
          if (!data || data.length === 0) break;
          allData.push(...data.map(d => ({ ...d, _companyId: cid })));
          if (data.length < 1000) break;
          from += 1000;
        }
      }
      return allData;
    },
    enabled: enabled && companies.length > 0,
  });

  return useMemo(() => {
    const companyMap = new Map(companies.map(c => [c.id, c.name]));
    const entityMap = new Map<string, EntityData>();

    const ids = filters.companyIds.length > 0 ? filters.companyIds : companies.map(c => c.id);
    ids.forEach(id => {
      entityMap.set(id, {
        companyId: id, companyName: companyMap.get(id) || id,
        revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, netProfit: 0,
        totalAssets: 0, totalLiabilities: 0, totalEquity: 0,
        trialDebit: 0, trialCredit: 0, accounts: {},
      });
    });

    jeLines.forEach((line: any) => {
      const cid = line._companyId;
      const entity = entityMap.get(cid);
      if (!entity) return;

      const code = line.account_code || '';
      const debit = line.debit_amount || 0;
      const credit = line.credit_amount || 0;
      const net = debit - credit;

      entity.trialDebit += debit;
      entity.trialCredit += credit;

      // Classify by account code prefix
      if (code.startsWith('4') || code.startsWith('7')) entity.revenue += credit - debit;
      else if (code.startsWith('50') || code.startsWith('51')) entity.cogs += debit - credit;
      else if (code.startsWith('5') || code.startsWith('6')) entity.operatingExpenses += debit - credit;
      else if (code.startsWith('1')) entity.totalAssets += net;
      else if (code.startsWith('2')) entity.totalLiabilities += credit - debit;
      else if (code.startsWith('3')) entity.totalEquity += credit - debit;

      // Track accounts
      if (!entity.accounts[code]) entity.accounts[code] = { code, name: line.account_name || code, debit: 0, credit: 0 };
      entity.accounts[code].debit += debit;
      entity.accounts[code].credit += credit;
    });

    // Compute derived
    entityMap.forEach(e => {
      e.grossProfit = e.revenue - e.cogs;
      e.netProfit = e.revenue - e.cogs - e.operatingExpenses;
    });

    const entities = Array.from(entityMap.values());

    // Consolidated
    const consolidated: EntityData = {
      companyId: 'consolidated', companyName: 'Consolidated',
      revenue: entities.reduce((s, e) => s + e.revenue, 0),
      cogs: entities.reduce((s, e) => s + e.cogs, 0),
      grossProfit: entities.reduce((s, e) => s + e.grossProfit, 0),
      operatingExpenses: entities.reduce((s, e) => s + e.operatingExpenses, 0),
      netProfit: entities.reduce((s, e) => s + e.netProfit, 0),
      totalAssets: entities.reduce((s, e) => s + e.totalAssets, 0),
      totalLiabilities: entities.reduce((s, e) => s + e.totalLiabilities, 0),
      totalEquity: entities.reduce((s, e) => s + e.totalEquity, 0),
      trialDebit: entities.reduce((s, e) => s + e.trialDebit, 0),
      trialCredit: entities.reduce((s, e) => s + e.trialCredit, 0),
      accounts: {},
    };

    // Merge accounts
    entities.forEach(e => {
      Object.values(e.accounts).forEach(a => {
        if (!consolidated.accounts[a.code]) consolidated.accounts[a.code] = { code: a.code, name: a.name, debit: 0, credit: 0 };
        consolidated.accounts[a.code].debit += a.debit;
        consolidated.accounts[a.code].credit += a.credit;
      });
    });

    return { entities, consolidated, eliminationValue: 0, adjustmentValue: 0, isLoading };
  }, [companies, jeLines, filters, isLoading]);
}
