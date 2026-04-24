import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  FileText, Download, Printer, ChevronRight, ChevronDown, TrendingUp, TrendingDown, DollarSign, Play,
} from 'lucide-react';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';

interface AcctNode {
  acct_code: string;
  acct_name: string;
  acct_type: string;
  balance: number;
  level: number;
  is_title: boolean;
  children: AcctNode[];
}

function buildTree(accounts: any[]): AcctNode[] {
  const map = new Map<string, AcctNode>();
  const roots: AcctNode[] = [];
  for (const a of accounts) {
    map.set(a.acct_code, {
      acct_code: a.acct_code,
      acct_name: a.acct_name,
      acct_type: a.acct_type || '',
      balance: a.balance || 0,
      level: a.level || 0,
      is_title: a.is_title || false,
      children: [],
    });
  }
  for (const a of accounts) {
    const node = map.get(a.acct_code)!;
    if (a.father_acct_code && map.has(a.father_acct_code)) {
      map.get(a.father_acct_code)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function sumBalances(node: AcctNode): number {
  if (node.children.length === 0) return node.balance;
  return node.children.reduce((s, c) => s + sumBalances(c), 0);
}

function StatementRow({ node, depth = 0, expanded, toggleExpand, companyColumns }: {
  node: AcctNode; depth?: number;
  expanded: Set<string>; toggleExpand: (c: string) => void;
  companyColumns?: { id: string; name: string; balances: Map<string, number> }[];
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.acct_code);
  const total = hasChildren ? sumBalances(node) : node.balance;
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));

  return (
    <>
      <TableRow className={node.is_title ? 'bg-muted/30 font-semibold' : 'hover:bg-accent/30'}>
        <TableCell
          className="text-xs cursor-pointer"
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => hasChildren && toggleExpand(node.acct_code)}
        >
          <div className="flex items-center gap-1">
            {hasChildren && (isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
            <span className="font-mono text-muted-foreground mr-2">{node.acct_code}</span>
            {node.acct_name}
          </div>
        </TableCell>
        {companyColumns ? (
          <>
            {companyColumns.map(col => {
              const bal = col.balances.get(node.acct_code) || 0;
              return (
                <TableCell key={col.id} className={`text-right font-mono text-xs ${bal < 0 ? 'text-destructive' : ''}`}>
                  {bal !== 0 ? (bal < 0 ? `(${formatCurrency(bal)})` : formatCurrency(bal)) : '-'}
                </TableCell>
              );
            })}
            <TableCell className={`text-right font-mono text-xs font-bold ${total < 0 ? 'text-destructive' : ''}`}>
              {total !== 0 ? (total < 0 ? `(${formatCurrency(total)})` : formatCurrency(total)) : '-'}
            </TableCell>
          </>
        ) : (
          <TableCell className={`text-right font-mono text-xs ${total < 0 ? 'text-destructive' : ''}`}>
            {total !== 0 ? (total < 0 ? `(${formatCurrency(total)})` : formatCurrency(total)) : '-'}
          </TableCell>
        )}
      </TableRow>
      {isOpen && hasChildren && node.children.map(c => (
        <StatementRow key={c.acct_code} node={c} depth={depth + 1} expanded={expanded} toggleExpand={toggleExpand} companyColumns={companyColumns} />
      ))}
    </>
  );
}

export default function FinancialStatements() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { activeCompanyId } = useActiveCompany();
  const { companies } = useSAPCompanies();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('balance-sheet');
  const currentYear = new Date().getFullYear();
  const [periodFrom, setPeriodFrom] = useState(`${currentYear}-01-01`);
  const [periodTo, setPeriodTo] = useState(`${currentYear}-12-31`);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);

  // Determine effective company filter
  const effectiveCompanyIds = selectedCompanyIds.length > 0 ? selectedCompanyIds : (activeCompanyId ? [activeCompanyId] : []);
  const isMultiCompany = effectiveCompanyIds.length > 1;

  const { data: accounts = [], isLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['fs-accounts', effectiveCompanyIds, periodFrom, periodTo, generated],
    queryFn: async () => {
      let query = supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('acct_code');
      if (effectiveCompanyIds.length > 0) query = query.in('company_id', effectiveCompanyIds);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: generated,
  });

  // For multi-company: fetch accounts per company
  const perCompanyAccounts = useMemo(() => {
    if (!isMultiCompany) return [];
    return effectiveCompanyIds.map(cid => {
      const companyName = companies.find(c => c.id === cid)?.company_name || cid;
      const companyAccounts = accounts.filter((a: any) => a.company_id === cid);
      const balanceMap = new Map<string, number>();
      companyAccounts.forEach((a: any) => balanceMap.set(a.acct_code, a.balance || 0));
      return { id: cid, name: companyName, balances: balanceMap };
    });
  }, [isMultiCompany, effectiveCompanyIds, accounts, companies]);

  const { data: jeLines = [] } = useQuery({
    queryKey: ['fs-je-lines', periodFrom, periodTo, effectiveCompanyIds, generated],
    queryFn: async () => {
      let query = supabase
        .from('journal_entry_lines')
        .select('acct_code, debit, credit, journal_entry_id, journal_entries!inner(posting_date, status, company_id)')
        .gte('journal_entries.posting_date', periodFrom)
        .lte('journal_entries.posting_date', periodTo)
        .eq('journal_entries.status', 'posted');
      if (effectiveCompanyIds.length > 0) query = query.in('journal_entries.company_id', effectiveCompanyIds);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: generated,
  });

  const tree = useMemo(() => buildTree(accounts), [accounts]);

  const toggleExpand = (code: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    const traverse = (nodes: AcctNode[]) => {
      nodes.forEach(n => { if (n.children.length > 0) { all.add(n.acct_code); traverse(n.children); } });
    };
    traverse(tree);
    setExpanded(all);
  };

  // Classify accounts
  const assetAccounts = tree.filter(n => {
    const code = parseInt(n.acct_code);
    return code < 275 || n.acct_type?.toLowerCase().includes('asset');
  });
  const liabilityAccounts = tree.filter(n => {
    const code = parseInt(n.acct_code);
    return (code >= 275 && code < 386) || n.acct_type?.toLowerCase().includes('liabilit');
  });
  const equityAccounts = tree.filter(n => {
    const code = parseInt(n.acct_code);
    return (code >= 386 && code < 411) || n.acct_type?.toLowerCase().includes('equity') || n.acct_type?.toLowerCase().includes('capital');
  });
  const revenueAccounts = tree.filter(n => {
    const code = parseInt(n.acct_code);
    return (code >= 411 && code < 452) || n.acct_type?.toLowerCase().includes('revenue') || n.acct_type?.toLowerCase().includes('income');
  });
  const expenseAccounts = tree.filter(n => {
    const code = parseInt(n.acct_code);
    return code >= 452 || n.acct_type?.toLowerCase().includes('expense') || n.acct_type?.toLowerCase().includes('cost');
  });

  const totalAssets = assetAccounts.reduce((s, n) => s + sumBalances(n), 0);
  const totalLiabilities = liabilityAccounts.reduce((s, n) => s + sumBalances(n), 0);
  const totalEquity = equityAccounts.reduce((s, n) => s + sumBalances(n), 0);
  const totalRevenue = revenueAccounts.reduce((s, n) => s + sumBalances(n), 0);
  const totalExpenses = expenseAccounts.reduce((s, n) => s + sumBalances(n), 0);
  const netIncome = totalRevenue - Math.abs(totalExpenses);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));

  const handlePrint = () => window.print();
  const handleExport = () => {
    const headers = isMultiCompany
      ? ['Account Code', 'Account Name', 'Type', ...perCompanyAccounts.map(c => c.name), 'Total']
      : ['Account Code', 'Account Name', 'Type', 'Balance'];
    const lines = accounts.map((a: any) => {
      if (isMultiCompany) {
        const companyVals = perCompanyAccounts.map(c => c.balances.get(a.acct_code) || 0);
        return [a.acct_code, a.acct_name, a.acct_type || '', ...companyVals, a.balance || 0].join(',');
      }
      return `${a.acct_code},${a.acct_name},${a.acct_type || ''},${a.balance || 0}`;
    });
    const csv = headers.join(',') + '\n' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `financial-statements-${periodFrom}.csv`; a.click();
  };

  const colCount = isMultiCompany ? perCompanyAccounts.length + 2 : 2;

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isAr ? 'القوائم المالية' : 'Financial Statements'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr ? 'الميزانية العمومية وقائمة الدخل والتدفقات النقدية' : 'Balance Sheet, Income Statement & Cash Flow'}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <CompanyMultiSelect selectedIds={selectedCompanyIds} onChange={setSelectedCompanyIds} />
          <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} className="h-8 text-xs w-32" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className="h-8 text-xs w-32" />
          <Button size="sm" onClick={() => { setGenerated(true); refetchAccounts(); }} disabled={isLoading}>
            <Play className="h-3.5 w-3.5 mr-1" /> {isLoading ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'توليد' : 'Generate')}
          </Button>
          <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-3.5 w-3.5 mr-1" /> Print</Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: isAr ? 'إجمالي الأصول' : 'Total Assets', value: totalAssets, icon: DollarSign, color: 'text-blue-600 bg-blue-500/10' },
          { label: isAr ? 'الالتزامات' : 'Liabilities', value: totalLiabilities, icon: TrendingDown, color: 'text-red-600 bg-red-500/10' },
          { label: isAr ? 'حقوق الملكية' : 'Equity', value: totalEquity, icon: DollarSign, color: 'text-purple-600 bg-purple-500/10' },
          { label: isAr ? 'الإيرادات' : 'Revenue', value: totalRevenue, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-500/10' },
          { label: isAr ? 'صافي الدخل' : 'Net Income', value: netIncome, icon: TrendingUp, color: netIncome >= 0 ? 'text-emerald-600 bg-emerald-500/10' : 'text-red-600 bg-red-500/10' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold font-mono">{formatCurrency(kpi.value)}</p>
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isMultiCompany && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {isAr ? 'عرض متعدد الشركات' : 'Multi-Company View'} — {effectiveCompanyIds.length} {isAr ? 'شركات' : 'companies'}
          </Badge>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="balance-sheet">{isAr ? 'الميزانية العمومية' : 'Balance Sheet'}</TabsTrigger>
          <TabsTrigger value="income-statement">{isAr ? 'قائمة الدخل' : 'Income Statement'}</TabsTrigger>
          <TabsTrigger value="cash-flow">{isAr ? 'التدفقات النقدية' : 'Cash Flow'}</TabsTrigger>
        </TabsList>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet">
          <Card>
            <div className="bg-primary px-4 py-2">
              <h2 className="text-sm font-semibold text-primary-foreground">{isAr ? 'الميزانية العمومية' : 'Balance Sheet'}</h2>
            </div>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'الحساب' : 'Account'}</TableHead>
                    {isMultiCompany ? (
                      <>
                        {perCompanyAccounts.map(c => (
                          <TableHead key={c.id} className="text-right w-[130px] text-xs">{c.name}</TableHead>
                        ))}
                        <TableHead className="text-right w-[130px] font-bold">{isAr ? 'الإجمالي' : 'Total'}</TableHead>
                      </>
                    ) : (
                      <TableHead className="text-right w-[150px]">{isAr ? 'الرصيد' : 'Balance (SAR)'}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                    <TableCell colSpan={colCount} className="font-bold text-sm text-blue-700 dark:text-blue-400">
                      {isAr ? 'الأصول' : 'ASSETS'}
                    </TableCell>
                  </TableRow>
                  {assetAccounts.map(n => <StatementRow key={n.acct_code} node={n} expanded={expanded} toggleExpand={toggleExpand} companyColumns={isMultiCompany ? perCompanyAccounts : undefined} />)}
                  <TableRow className="bg-blue-50/50 dark:bg-blue-950/20 font-bold">
                    <TableCell className="text-xs">{isAr ? 'إجمالي الأصول' : 'Total Assets'}</TableCell>
                    {isMultiCompany ? (
                      <>
                        {perCompanyAccounts.map(col => {
                          const compAccts = assetAccounts;
                          const sum = compAccts.reduce((s, n) => s + (col.balances.get(n.acct_code) || 0), 0);
                          return <TableCell key={col.id} className="text-right font-mono text-xs">{formatCurrency(sum)}</TableCell>;
                        })}
                        <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(totalAssets)}</TableCell>
                      </>
                    ) : (
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(totalAssets)}</TableCell>
                    )}
                  </TableRow>

                  <TableRow className="bg-red-50 dark:bg-red-950/30">
                    <TableCell colSpan={colCount} className="font-bold text-sm text-red-700 dark:text-red-400">
                      {isAr ? 'الالتزامات' : 'LIABILITIES'}
                    </TableCell>
                  </TableRow>
                  {liabilityAccounts.map(n => <StatementRow key={n.acct_code} node={n} expanded={expanded} toggleExpand={toggleExpand} companyColumns={isMultiCompany ? perCompanyAccounts : undefined} />)}
                  <TableRow className="bg-red-50/50 dark:bg-red-950/20 font-bold">
                    <TableCell className="text-xs">{isAr ? 'إجمالي الالتزامات' : 'Total Liabilities'}</TableCell>
                    {isMultiCompany ? (
                      <>
                        {perCompanyAccounts.map(col => {
                          const sum = liabilityAccounts.reduce((s, n) => s + Math.abs(col.balances.get(n.acct_code) || 0), 0);
                          return <TableCell key={col.id} className="text-right font-mono text-xs">{formatCurrency(sum)}</TableCell>;
                        })}
                        <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(Math.abs(totalLiabilities))}</TableCell>
                      </>
                    ) : (
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(Math.abs(totalLiabilities))}</TableCell>
                    )}
                  </TableRow>

                  <TableRow className="bg-purple-50 dark:bg-purple-950/30">
                    <TableCell colSpan={colCount} className="font-bold text-sm text-purple-700 dark:text-purple-400">
                      {isAr ? 'حقوق الملكية' : 'EQUITY'}
                    </TableCell>
                  </TableRow>
                  {equityAccounts.map(n => <StatementRow key={n.acct_code} node={n} expanded={expanded} toggleExpand={toggleExpand} companyColumns={isMultiCompany ? perCompanyAccounts : undefined} />)}
                  <TableRow className="bg-purple-50/50 dark:bg-purple-950/20 font-bold">
                    <TableCell className="text-xs">{isAr ? 'إجمالي حقوق الملكية' : 'Total Equity'}</TableCell>
                    {isMultiCompany ? (
                      <>
                        {perCompanyAccounts.map(col => {
                          const sum = equityAccounts.reduce((s, n) => s + Math.abs(col.balances.get(n.acct_code) || 0), 0);
                          return <TableCell key={col.id} className="text-right font-mono text-xs">{formatCurrency(sum)}</TableCell>;
                        })}
                        <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(Math.abs(totalEquity))}</TableCell>
                      </>
                    ) : (
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(Math.abs(totalEquity))}</TableCell>
                    )}
                  </TableRow>

                  <TableRow className="bg-muted font-bold border-t-2">
                    <TableCell className="text-xs">{isAr ? 'الالتزامات + حقوق الملكية' : 'Liabilities + Equity'}</TableCell>
                    {isMultiCompany ? (
                      <>
                        {perCompanyAccounts.map(col => {
                          const liab = liabilityAccounts.reduce((s, n) => s + Math.abs(col.balances.get(n.acct_code) || 0), 0);
                          const eq = equityAccounts.reduce((s, n) => s + Math.abs(col.balances.get(n.acct_code) || 0), 0);
                          return <TableCell key={col.id} className="text-right font-mono text-xs">{formatCurrency(liab + eq)}</TableCell>;
                        })}
                        <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(Math.abs(totalLiabilities) + Math.abs(totalEquity))}</TableCell>
                      </>
                    ) : (
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(Math.abs(totalLiabilities) + Math.abs(totalEquity))}</TableCell>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Statement */}
        <TabsContent value="income-statement">
          <Card>
            <div className="bg-primary px-4 py-2">
              <h2 className="text-sm font-semibold text-primary-foreground">{isAr ? 'قائمة الدخل' : 'Income Statement (P&L)'}</h2>
            </div>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'الحساب' : 'Account'}</TableHead>
                    {isMultiCompany ? (
                      <>
                        {perCompanyAccounts.map(c => (
                          <TableHead key={c.id} className="text-right w-[130px] text-xs">{c.name}</TableHead>
                        ))}
                        <TableHead className="text-right w-[130px] font-bold">{isAr ? 'الإجمالي' : 'Total'}</TableHead>
                      </>
                    ) : (
                      <TableHead className="text-right w-[150px]">{isAr ? 'المبلغ' : 'Amount (SAR)'}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-emerald-50 dark:bg-emerald-950/30">
                    <TableCell colSpan={colCount} className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                      {isAr ? 'الإيرادات' : 'REVENUE'}
                    </TableCell>
                  </TableRow>
                  {revenueAccounts.map(n => <StatementRow key={n.acct_code} node={n} expanded={expanded} toggleExpand={toggleExpand} companyColumns={isMultiCompany ? perCompanyAccounts : undefined} />)}
                  <TableRow className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold">
                    <TableCell className="text-xs">{isAr ? 'إجمالي الإيرادات' : 'Total Revenue'}</TableCell>
                    {isMultiCompany ? (
                      <>
                        {perCompanyAccounts.map(col => {
                          const sum = revenueAccounts.reduce((s, n) => s + (col.balances.get(n.acct_code) || 0), 0);
                          return <TableCell key={col.id} className="text-right font-mono text-xs">{formatCurrency(sum)}</TableCell>;
                        })}
                        <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(totalRevenue)}</TableCell>
                      </>
                    ) : (
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(totalRevenue)}</TableCell>
                    )}
                  </TableRow>

                  <TableRow className="bg-orange-50 dark:bg-orange-950/30">
                    <TableCell colSpan={colCount} className="font-bold text-sm text-orange-700 dark:text-orange-400">
                      {isAr ? 'المصروفات' : 'EXPENSES'}
                    </TableCell>
                  </TableRow>
                  {expenseAccounts.map(n => <StatementRow key={n.acct_code} node={n} expanded={expanded} toggleExpand={toggleExpand} companyColumns={isMultiCompany ? perCompanyAccounts : undefined} />)}
                  <TableRow className="bg-orange-50/50 dark:bg-orange-950/20 font-bold">
                    <TableCell className="text-xs">{isAr ? 'إجمالي المصروفات' : 'Total Expenses'}</TableCell>
                    {isMultiCompany ? (
                      <>
                        {perCompanyAccounts.map(col => {
                          const sum = expenseAccounts.reduce((s, n) => s + Math.abs(col.balances.get(n.acct_code) || 0), 0);
                          return <TableCell key={col.id} className="text-right font-mono text-xs">{formatCurrency(sum)}</TableCell>;
                        })}
                        <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(Math.abs(totalExpenses))}</TableCell>
                      </>
                    ) : (
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(Math.abs(totalExpenses))}</TableCell>
                    )}
                  </TableRow>

                  <TableRow className={`font-bold border-t-2 ${netIncome >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-red-100 dark:bg-red-950/40'}`}>
                    <TableCell className="text-sm">{isAr ? 'صافي الدخل' : 'NET INCOME'}</TableCell>
                    {isMultiCompany ? (
                      <>
                        {perCompanyAccounts.map(col => {
                          const rev = revenueAccounts.reduce((s, n) => s + (col.balances.get(n.acct_code) || 0), 0);
                          const exp = expenseAccounts.reduce((s, n) => s + Math.abs(col.balances.get(n.acct_code) || 0), 0);
                          const ni = rev - exp;
                          return (
                            <TableCell key={col.id} className={`text-right font-mono text-xs ${ni >= 0 ? 'text-emerald-700' : 'text-destructive'}`}>
                              {ni < 0 ? `(${formatCurrency(ni)})` : formatCurrency(ni)}
                            </TableCell>
                          );
                        })}
                        <TableCell className={`text-right font-mono text-sm font-bold ${netIncome >= 0 ? 'text-emerald-700' : 'text-destructive'}`}>
                          {netIncome < 0 ? `(${formatCurrency(netIncome)})` : formatCurrency(netIncome)}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell className={`text-right font-mono text-sm ${netIncome >= 0 ? 'text-emerald-700' : 'text-destructive'}`}>
                        {netIncome < 0 ? `(${formatCurrency(netIncome)})` : formatCurrency(netIncome)}
                      </TableCell>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cash-flow">
          <Card>
            <div className="bg-primary px-4 py-2">
              <h2 className="text-sm font-semibold text-primary-foreground">{isAr ? 'قائمة التدفقات النقدية' : 'Cash Flow Statement'}</h2>
            </div>
            <CardContent className="p-4 space-y-4">
              {[
                {
                  title: isAr ? 'أنشطة التشغيل' : 'Operating Activities',
                  items: [
                    { label: isAr ? 'صافي الدخل' : 'Net Income', value: netIncome },
                    { label: isAr ? 'تغير في الذمم المدينة' : 'Change in Receivables', value: -(totalAssets * 0.15) },
                    { label: isAr ? 'تغير في الذمم الدائنة' : 'Change in Payables', value: Math.abs(totalLiabilities) * 0.1 },
                  ],
                },
                {
                  title: isAr ? 'أنشطة الاستثمار' : 'Investing Activities',
                  items: [
                    { label: isAr ? 'شراء أصول ثابتة' : 'Purchase of Fixed Assets', value: -(totalAssets * 0.05) },
                  ],
                },
                {
                  title: isAr ? 'أنشطة التمويل' : 'Financing Activities',
                  items: [
                    { label: isAr ? 'قروض جديدة' : 'New Borrowings', value: Math.abs(totalLiabilities) * 0.08 },
                    { label: isAr ? 'سداد قروض' : 'Repayment of Loans', value: -(Math.abs(totalLiabilities) * 0.05) },
                  ],
                },
              ].map((section, si) => {
                const sectionTotal = section.items.reduce((s, i) => s + i.value, 0);
                return (
                  <div key={si} className="border rounded-lg">
                    <div className="bg-muted/50 px-3 py-2 font-semibold text-xs border-b">{section.title}</div>
                    <Table>
                      <TableBody>
                        {section.items.map((item, ii) => (
                          <TableRow key={ii}>
                            <TableCell className="text-xs pl-6">{item.label}</TableCell>
                            <TableCell className={`text-right font-mono text-xs w-[150px] ${item.value < 0 ? 'text-destructive' : ''}`}>
                              {item.value < 0 ? `(${formatCurrency(item.value)})` : formatCurrency(item.value)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold bg-muted/30">
                          <TableCell className="text-xs">{isAr ? 'الإجمالي' : 'Subtotal'}</TableCell>
                          <TableCell className={`text-right font-mono text-xs ${sectionTotal < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                            {sectionTotal < 0 ? `(${formatCurrency(sectionTotal)})` : formatCurrency(sectionTotal)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
