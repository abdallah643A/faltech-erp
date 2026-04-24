import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { balanceSheetDefinition, BSAccountRange, BSLineItem, BSReportDefinition } from '@/config/balanceSheetMapping';

interface AccountBalance {
  acct_code: string;
  acct_name: string;
  balance: number;
  bp_code?: string;
  bp_name?: string;
  cost_center?: string;
}

export interface BSLineResult {
  order: number;
  label_ar: string;
  label_en: string;
  amount: number;
  details: { acct_code: string; acct_name: string; balance: number; bp_name?: string }[];
}

export interface BSSectionResult {
  key: string;
  header_ar: string;
  header_en: string;
  lines: BSLineResult[];
  total_amount: number;
  total_label_ar: string;
  total_label_en: string;
}

export interface BSReportResult {
  sections: BSSectionResult[];
  grandTotals: { key: string; label_ar: string; label_en: string; amount: number }[];
  isBalanced: boolean;
  difference: number;
}

function matchesRange(acctCode: string, from: string, to?: string): boolean {
  if (to) {
    return acctCode >= from && acctCode <= to + '\uffff';
  }
  return acctCode.startsWith(from);
}

function applyBalanceRule(balance: number, rule: BSAccountRange['rule']): number {
  if (rule === 'debit_only') return balance > 0 ? balance : 0;
  if (rule === 'credit_only') return balance < 0 ? balance : 0;
  return balance;
}

function computeLineAmount(
  line: BSLineItem,
  accountBalances: AccountBalance[]
): { amount: number; details: BSLineResult['details'] } {
  let total = 0;
  const details: BSLineResult['details'] = [];

  for (const range of line.accounts) {
    const matching = accountBalances.filter(ab => matchesRange(ab.acct_code, range.from, range.to));

    for (const ab of matching) {
      let val = applyBalanceRule(ab.balance, range.rule);
      total += val;
      if (val !== 0) {
        details.push({ acct_code: ab.acct_code, acct_name: ab.acct_name, balance: val, bp_name: ab.bp_name });
      }
    }
  }

  return { amount: total, details };
}

async function loadDBDefinition(companyId?: string): Promise<BSReportDefinition | null> {
  let q = (supabase.from as any)('bs_report_sections').select('*').order('display_order');
  if (companyId) q = q.eq('company_id', companyId);
  const { data: sections } = await q;
  if (!sections || sections.length === 0) return null;

  let lq = (supabase.from as any)('bs_report_lines').select('*').order('line_order');
  if (companyId) lq = lq.eq('company_id', companyId);
  const { data: lines } = await lq;

  const sectionIds = (sections as any[]).map((s: any) => s.id);
  const lineIds = (lines as any[] || []).map((l: any) => l.id);

  let accounts: any[] = [];
  if (lineIds.length > 0) {
    const { data: accs } = await (supabase.from as any)('bs_report_line_accounts').select('*').in('line_id', lineIds).order('display_order');
    accounts = accs || [];
  }

  let gtq = (supabase.from as any)('bs_report_grand_totals').select('*').order('display_order');
  if (companyId) gtq = gtq.eq('company_id', companyId);
  const { data: grandTotals } = await gtq;

  return {
    sections: (sections as any[]).map((sec: any) => ({
      key: sec.section_key,
      header_ar: sec.header_ar,
      header_en: sec.header_en,
      type: sec.section_type as 'header' | 'section',
      lines: ((lines as any[]) || [])
        .filter((l: any) => l.section_id === sec.id)
        .map((l: any) => ({
          order: l.line_order,
          label_ar: l.label_ar,
          label_en: l.label_en,
          accounts: (accounts || [])
            .filter((a: any) => a.line_id === l.id)
            .map((a: any) => ({
              from: a.acct_from,
              to: a.acct_to || undefined,
              label_ar: a.label_ar,
              rule: a.balance_rule as 'all' | 'debit_only' | 'credit_only',
              is_deduction: a.is_deduction,
            })),
        })),
      total: sec.total_label_ar ? {
        label_ar: sec.total_label_ar,
        label_en: sec.total_label_en || '',
        sum_orders: ((lines as any[]) || []).filter((l: any) => l.section_id === sec.id).map((l: any) => l.line_order),
      } : undefined,
    })),
    grandTotals: ((grandTotals as any[]) || []).map((gt: any) => ({
      key: gt.total_key,
      label_ar: gt.label_ar,
      label_en: gt.label_en,
      sum_totals: gt.sum_section_keys,
    })),
  };
}

export async function computeBalanceSheet(params: {
  fromDate: string;
  toDate: string;
  companyId?: string;
  branchId?: string;
}): Promise<BSReportResult> {
      // Try loading DB config first, fallback to hardcoded
      const definition = (await loadDBDefinition(params.companyId)) || balanceSheetDefinition;

      let query = supabase
        .from('journal_entry_lines')
        .select(`
          acct_code,
          acct_name,
          debit,
          credit,
          bp_code,
          bp_name,
          cost_center,
          journal_entries!inner(posting_date, status, company_id, branch_id)
        `)
        .lte('journal_entries.posting_date', params.toDate)
        .eq('journal_entries.status', 'posted');

      if (params.companyId) {
        query = query.eq('journal_entries.company_id', params.companyId);
      }
      if (params.branchId) {
        query = query.eq('journal_entries.branch_id', params.branchId);
      }

      const { data: rawLines, error } = await query;
      if (error) throw error;

      const balanceMap = new Map<string, AccountBalance>();
      for (const line of (rawLines || [])) {
        const key = line.acct_code;
        if (!balanceMap.has(key)) {
          balanceMap.set(key, {
            acct_code: line.acct_code,
            acct_name: line.acct_name || '',
            balance: 0,
            bp_code: line.bp_code || undefined,
            bp_name: line.bp_name || undefined,
            cost_center: line.cost_center || undefined,
          });
        }
        const entry = balanceMap.get(key)!;
        entry.balance += (line.debit || 0) - (line.credit || 0);
      }

      const accountBalances = Array.from(balanceMap.values());

      const sectionResults: BSSectionResult[] = [];
      const sectionTotalMap = new Map<string, number>();

      for (const section of definition.sections) {
        const lineResults: BSLineResult[] = [];

        for (const line of section.lines) {
          const { amount, details } = computeLineAmount(line, accountBalances);
          lineResults.push({
            order: line.order,
            label_ar: line.label_ar,
            label_en: line.label_en,
            amount,
            details,
          });
        }

        const totalAmount = lineResults.reduce((sum, lr) => sum + lr.amount, 0);
        sectionTotalMap.set(section.key, totalAmount);

        sectionResults.push({
          key: section.key,
          header_ar: section.header_ar,
          header_en: section.header_en,
          lines: lineResults,
          total_amount: totalAmount,
          total_label_ar: section.total?.label_ar || '',
          total_label_en: section.total?.label_en || '',
        });
      }

      const grandTotals = definition.grandTotals.map(gt => {
        const amount = gt.sum_totals.reduce((sum, key) => sum + (sectionTotalMap.get(key) || 0), 0);
        return { key: gt.key, label_ar: gt.label_ar, label_en: gt.label_en, amount };
      });

      const totalAssets = grandTotals.find(g => g.key === 'total_assets')?.amount || 0;
      const totalEqLiab = grandTotals.find(g => g.key === 'total_equity_and_liabilities')?.amount || 0;
      const difference = totalAssets + totalEqLiab;

      return {
        sections: sectionResults,
        grandTotals,
        isBalanced: Math.abs(difference) < 0.01,
        difference,
      };
}

export function useAuditBalanceSheet(params: {
  fromDate: string;
  toDate: string;
  companyId?: string;
  branchId?: string;
}) {
  return useQuery({
    queryKey: ['audit-balance-sheet', params.fromDate, params.toDate, params.companyId, params.branchId],
    queryFn: () => computeBalanceSheet(params),
    enabled: !!params.toDate && !!params.fromDate,
  });
}

export interface MultiCompanyBSResult {
  companyReports: { companyId: string; companyName: string; report: BSReportResult }[];
  /** Merged structure: sections/lines from first company used as template, amounts array per company */
}

export function useMultiCompanyBalanceSheet(params: {
  fromDate: string;
  toDate: string;
  companyIds: string[];
  companyNames: Record<string, string>;
  branchId?: string;
}) {
  return useQuery({
    queryKey: ['audit-balance-sheet-multi', params.fromDate, params.toDate, params.companyIds.join(','), params.branchId],
    queryFn: async (): Promise<MultiCompanyBSResult> => {
      const reports = await Promise.all(
        params.companyIds.map(async (cid) => {
          const report = await computeBalanceSheet({ fromDate: params.fromDate, toDate: params.toDate, companyId: cid, branchId: params.branchId });
          return { companyId: cid, companyName: params.companyNames[cid] || cid, report };
        })
      );
      return { companyReports: reports };
    },
    enabled: !!params.toDate && !!params.fromDate && params.companyIds.length > 0,
  });
}
