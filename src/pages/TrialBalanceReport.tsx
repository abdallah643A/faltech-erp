import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { PLDrillDownDialog } from '@/components/finance/pl/PLDrillDownDialog';
import { useTrialBalanceData, type TBFilters, type TBAccount } from '@/hooks/useTrialBalanceData';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatSAR } from '@/lib/currency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Download, Printer, FileText, Filter, ChevronDown, ChevronUp, CheckCircle2,
  AlertTriangle, TrendingUp, BarChart3, Search, Loader2, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const currentYear = new Date().getFullYear();
const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'];

export default function TrialBalanceReport() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [filters, setFilters] = useState<TBFilters>({
    companyIds: [], branchId: '', dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    fiscalYear: String(currentYear), accountFrom: '', accountTo: '', accountLevel: '', accountType: '',
    costCenter: '', projectCode: '', departmentId: '', postedOnly: true, includeZeroBalance: false,
    includeInactive: false, comparisonMode: 'none', compareDateFrom: '', compareDateTo: '', viewMode: 'detailed',
  });
  const [generated, setGenerated] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [drillDown, setDrillDown] = useState<{ open: boolean; acctCode: string; acctName: string }>({ open: false, acctCode: '', acctName: '' });
  const defaultCompanyIds = useDefaultReportCompanyIds(setFilters);

  const { tbAccounts, totals, isBalanced, isLoading } = useTrialBalanceData(filters, generated);

  const { data: branches = [] } = useQuery({
    queryKey: ['tb-branches'], queryFn: async () => { const { data } = await supabase.from('branches').select('id, name').order('name'); return data || []; },
  });
  const { data: costCenters = [] } = useQuery({
    queryKey: ['tb-cost-centers'], queryFn: async () => { const { data } = await supabase.from('cost_centers').select('id, name, code').order('code'); return data || []; },
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['tb-projects'], queryFn: async () => { const { data } = await supabase.from('projects').select('id, name, code').order('code'); return data || []; },
  });

  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return tbAccounts;
    const q = searchQuery.toLowerCase();
    return tbAccounts.filter(a => a.acctCode.includes(q) || a.acctName.toLowerCase().includes(q));
  }, [tbAccounts, searchQuery]);

  // Group by type for type view
  const groupedByType = useMemo(() => {
    const groups: Record<string, TBAccount[]> = {};
    for (const a of filteredAccounts) {
      const t = a.acctType || 'Other';
      if (!groups[t]) groups[t] = [];
      groups[t].push(a);
    }
    return groups;
  }, [filteredAccounts]);

  // Anomalies
  const anomalies = useMemo(() => {
    const results: { acct: TBAccount; reason: string }[] = [];
    for (const a of tbAccounts) {
      // Asset with credit balance
      if (a.acctType === 'Asset' && a.closingCredit > a.closingDebit && a.closingCredit > 0)
        results.push({ acct: a, reason: isAr ? 'رصيد دائن غير طبيعي لحساب أصل' : 'Unusual credit balance for asset account' });
      if (a.acctType === 'Liability' && a.closingDebit > a.closingCredit && a.closingDebit > 0)
        results.push({ acct: a, reason: isAr ? 'رصيد مدين غير طبيعي لحساب التزام' : 'Unusual debit balance for liability account' });
      // Large movement (>50M threshold)
      if (Math.abs(a.netMovement) > 50000000)
        results.push({ acct: a, reason: isAr ? 'حركة كبيرة غير عادية (>50م)' : 'Unusually large movement (>50M)' });
    }
    return results;
  }, [tbAccounts, isAr]);

  // Charts data
  const movementByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of tbAccounts) {
      const t = a.acctType || 'Other';
      map[t] = (map[t] || 0) + Math.abs(a.netMovement);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [tbAccounts]);

  const top10Movement = useMemo(() => {
    return [...tbAccounts]
      .sort((a, b) => Math.abs(b.netMovement) - Math.abs(a.netMovement))
      .slice(0, 10)
      .map(a => ({ name: `${a.acctCode}`, fullName: a.acctName, value: Math.abs(a.netMovement) }));
  }, [tbAccounts]);

  const handleExportExcel = () => {
    const rows = filteredAccounts.map(a => ({
      'Account Code': a.acctCode, 'Account Name': a.acctName, 'Type': a.acctType,
      'Opening Debit': a.openingDebit, 'Opening Credit': a.openingCredit,
      'Period Debit': a.periodDebit, 'Period Credit': a.periodCredit,
      'Closing Debit': a.closingDebit, 'Closing Credit': a.closingCredit,
      'Net Movement': a.netMovement,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
    XLSX.writeFile(wb, `trial-balance-${filters.dateTo}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Trial Balance Report', 14, 15);
    doc.setFontSize(9);
    doc.text(`Period: ${filters.dateFrom} to ${filters.dateTo}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [['Code', 'Name', 'Opening Dr', 'Opening Cr', 'Period Dr', 'Period Cr', 'Closing Dr', 'Closing Cr']],
      body: filteredAccounts.map(a => [
        a.acctCode, a.acctName,
        formatSAR(a.openingDebit), formatSAR(a.openingCredit),
        formatSAR(a.periodDebit), formatSAR(a.periodCredit),
        formatSAR(a.closingDebit), formatSAR(a.closingCredit),
      ]),
      foot: [['', 'TOTAL', formatSAR(totals.openingDebit), formatSAR(totals.openingCredit), formatSAR(totals.periodDebit), formatSAR(totals.periodCredit), formatSAR(totals.closingDebit), formatSAR(totals.closingCredit)]],
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`trial-balance-${filters.dateTo}.pdf`);
  };

  const toggleType = (t: string) => {
    setExpandedTypes(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
  };

  const update = (partial: Partial<TBFilters>) => setFilters(f => ({ ...f, ...partial }));

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden page-enter">
      {/* Title */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--sidebar-background)/0.85)] text-sidebar-foreground px-4 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <h1 className="text-sm font-semibold">{isAr ? 'ميزان المراجعة' : 'Trial Balance Report'}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-sidebar-foreground" onClick={handleExportExcel}><Download className="h-3 w-3 mr-1" />Excel</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-sidebar-foreground" onClick={handleExportPDF}><FileText className="h-3 w-3 mr-1" />PDF</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-sidebar-foreground" onClick={() => window.print()}><Printer className="h-3 w-3 mr-1" />{isAr ? 'طباعة' : 'Print'}</Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-t-0 border-border rounded-b-md bg-card p-4 space-y-4">
        {/* Filter Bar */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div><Label className="text-xs">{isAr ? 'الشركة' : 'Company'}</Label><CompanyMultiSelect selectedIds={filters.companyIds} onChange={ids => update({ companyIds: ids })} /></div>
              <div><Label className="text-xs">{isAr ? 'من تاريخ' : 'Date From'}</Label><Input type="date" value={filters.dateFrom} onChange={e => update({ dateFrom: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">{isAr ? 'إلى تاريخ' : 'Date To'}</Label><Input type="date" value={filters.dateTo} onChange={e => update({ dateTo: e.target.value })} className="h-8 text-xs" /></div>
              <div>
                <Label className="text-xs">{isAr ? 'الفرع' : 'Branch'}</Label>
                <Select value={filters.branchId} onValueChange={v => update({ branchId: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={isAr ? 'الكل' : 'All'} /></SelectTrigger>
                  <SelectContent><SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isAr ? 'مركز تكلفة' : 'Cost Center'}</Label>
                <Select value={filters.costCenter} onValueChange={v => update({ costCenter: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={isAr ? 'الكل' : 'All'} /></SelectTrigger>
                  <SelectContent><SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>{costCenters.map(c => <SelectItem key={c.id} value={c.code}>{c.code} - {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isAr ? 'المشروع' : 'Project'}</Label>
                <Select value={filters.projectCode} onValueChange={v => update({ projectCode: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={isAr ? 'الكل' : 'All'} /></SelectTrigger>
                  <SelectContent><SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.code || p.id}>{p.code} - {p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 text-xs h-7"><Filter className="h-3 w-3 mr-1" />{showAdvanced ? (isAr ? 'إخفاء متقدم' : 'Hide Advanced') : (isAr ? 'فلاتر متقدمة' : 'Advanced Filters')}{showAdvanced ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}</Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
                  <div><Label className="text-xs">{isAr ? 'من حساب' : 'Account From'}</Label><Input value={filters.accountFrom} onChange={e => update({ accountFrom: e.target.value })} placeholder="e.g. 1100" className="h-8 text-xs" /></div>
                  <div><Label className="text-xs">{isAr ? 'إلى حساب' : 'Account To'}</Label><Input value={filters.accountTo} onChange={e => update({ accountTo: e.target.value })} placeholder="e.g. 9999" className="h-8 text-xs" /></div>
                  <div><Label className="text-xs">{isAr ? 'المستوى' : 'Max Level'}</Label><Input type="number" value={filters.accountLevel} onChange={e => update({ accountLevel: e.target.value })} placeholder="All" className="h-8 text-xs" /></div>
                  <div>
                    <Label className="text-xs">{isAr ? 'نوع الحساب' : 'Account Type'}</Label>
                    <Select value={filters.accountType} onValueChange={v => update({ accountType: v === 'all' ? '' : v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={isAr ? 'الكل' : 'All'} /></SelectTrigger>
                      <SelectContent><SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem><SelectItem value="Asset">Asset</SelectItem><SelectItem value="Liability">Liability</SelectItem><SelectItem value="Equity">Equity</SelectItem><SelectItem value="Revenue">Revenue</SelectItem><SelectItem value="Expense">Expense</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'العرض' : 'View'}</Label>
                    <Select value={filters.viewMode} onValueChange={v => update({ viewMode: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="detailed">{isAr ? 'تفصيلي' : 'Detailed'}</SelectItem><SelectItem value="by_type">{isAr ? 'حسب النوع' : 'By Type'}</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 pt-4">
                    <div className="flex items-center gap-2"><Switch checked={filters.postedOnly} onCheckedChange={v => update({ postedOnly: v })} /><span className="text-xs">{isAr ? 'مرحّل فقط' : 'Posted Only'}</span></div>
                    <div className="flex items-center gap-2"><Switch checked={filters.includeZeroBalance} onCheckedChange={v => update({ includeZeroBalance: v })} /><span className="text-xs">{isAr ? 'شامل الصفري' : 'Include Zero'}</span></div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex items-center gap-2 mt-3">
              <Button onClick={() => setGenerated(true)} className="h-8 text-xs">{isAr ? 'توليد' : 'Generate'}</Button>
              <Button variant="outline" className="h-8 text-xs" onClick={() => { setGenerated(false); setFilters(f => ({ ...f, companyIds: defaultCompanyIds, branchId: '', accountFrom: '', accountTo: '' })); }}>{isAr ? 'إعادة تعيين' : 'Reset'}</Button>
            </div>
          </CardContent>
        </Card>

        {generated && (
          <>
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { label: isAr ? 'رصيد افتتاحي مدين' : 'Opening Debit', value: totals.openingDebit, color: 'text-blue-600' },
                { label: isAr ? 'رصيد افتتاحي دائن' : 'Opening Credit', value: totals.openingCredit, color: 'text-blue-600' },
                { label: isAr ? 'حركة مدينة' : 'Period Debit', value: totals.periodDebit, color: 'text-emerald-600' },
                { label: isAr ? 'حركة دائنة' : 'Period Credit', value: totals.periodCredit, color: 'text-emerald-600' },
                { label: isAr ? 'رصيد ختامي مدين' : 'Closing Debit', value: totals.closingDebit, color: 'text-foreground' },
                { label: isAr ? 'رصيد ختامي دائن' : 'Closing Credit', value: totals.closingCredit, color: 'text-foreground' },
              ].map((kpi, i) => (
                <Card key={i}><CardContent className="py-3 px-3"><p className="text-[10px] text-muted-foreground">{kpi.label}</p><p className={`text-sm font-bold ${kpi.color}`}>{formatSAR(kpi.value)}</p></CardContent></Card>
              ))}
              <Card className={isBalanced ? 'border-green-500' : 'border-destructive'}>
                <CardContent className="py-3 px-3 flex items-center gap-2">
                  {isBalanced ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
                  <div><p className="text-[10px] text-muted-foreground">{isAr ? 'الحالة' : 'Status'}</p><p className="text-xs font-bold">{isBalanced ? (isAr ? 'متوازن' : 'Balanced') : (isAr ? 'غير متوازن!' : 'IMBALANCED!')}</p></div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card><CardContent className="pt-4">
                <p className="text-xs font-semibold mb-2">{isAr ? 'الحركة حسب النوع' : 'Movement by Account Type'}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={movementByType}><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: number) => formatSAR(v)} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <p className="text-xs font-semibold mb-2">{isAr ? 'أعلى 10 حسابات حركة' : 'Top 10 Accounts by Movement'}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={top10Movement} layout="vertical"><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={60} /><Tooltip formatter={(v: number) => formatSAR(v)} /><Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} /></BarChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </div>

            {/* Anomalies */}
            {anomalies.length > 0 && (
              <Card className="border-amber-500/50">
                <CardContent className="py-3">
                  <p className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{isAr ? 'تنبيهات' : 'Anomaly Alerts'} ({anomalies.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {anomalies.slice(0, 6).map((a, i) => (
                      <div key={i} className="text-[11px] flex items-center gap-2 py-1 px-2 bg-amber-50 dark:bg-amber-950/30 rounded">
                        <span className="font-mono text-amber-700 dark:text-amber-400">{a.acct.acctCode}</span>
                        <span className="text-muted-foreground truncate">{a.reason}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder={isAr ? 'بحث في الحسابات...' : 'Search accounts...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
              <Badge variant="outline" className="text-xs">{filteredAccounts.length} {isAr ? 'حساب' : 'accounts'}</Badge>
            </div>

            {/* Main Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</span></div>
            ) : filters.viewMode === 'by_type' ? (
              <Card>
                <div className="overflow-x-auto">
                  {Object.entries(groupedByType).map(([type, accts]) => (
                    <Collapsible key={type} open={expandedTypes.has(type)} onOpenChange={() => toggleType(type)}>
                      <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-muted/50 border-b text-xs font-semibold cursor-pointer">
                        <ChevronRight className={`h-3 w-3 transition-transform ${expandedTypes.has(type) ? 'rotate-90' : ''}`} />
                        {type} <Badge variant="secondary" className="text-[10px]">{accts.length}</Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Table>
                          <TableHeader><TableRow className="text-[10px]">
                            <TableHead className="w-24">{isAr ? 'الرمز' : 'Code'}</TableHead>
                            <TableHead>{isAr ? 'الاسم' : 'Name'}</TableHead>
                            <TableHead className="text-right">{isAr ? 'افتتاحي مدين' : 'Open Dr'}</TableHead>
                            <TableHead className="text-right">{isAr ? 'افتتاحي دائن' : 'Open Cr'}</TableHead>
                            <TableHead className="text-right">{isAr ? 'حركة مدينة' : 'Period Dr'}</TableHead>
                            <TableHead className="text-right">{isAr ? 'حركة دائنة' : 'Period Cr'}</TableHead>
                            <TableHead className="text-right">{isAr ? 'ختامي مدين' : 'Close Dr'}</TableHead>
                            <TableHead className="text-right">{isAr ? 'ختامي دائن' : 'Close Cr'}</TableHead>
                            <TableHead className="text-right">{isAr ? 'صافي الحركة' : 'Net Move'}</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {accts.map(a => (
                              <TableRow key={a.acctCode} className="text-[11px] cursor-pointer hover:bg-muted/30" onClick={() => setDrillDown({ open: true, acctCode: a.acctCode, acctName: a.acctName })}>
                                <TableCell className="font-mono">{a.acctCode}</TableCell>
                                <TableCell>{a.acctName}</TableCell>
                                <TableCell className="text-right">{formatSAR(a.openingDebit)}</TableCell>
                                <TableCell className="text-right">{formatSAR(a.openingCredit)}</TableCell>
                                <TableCell className="text-right">{formatSAR(a.periodDebit)}</TableCell>
                                <TableCell className="text-right">{formatSAR(a.periodCredit)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatSAR(a.closingDebit)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatSAR(a.closingCredit)}</TableCell>
                                <TableCell className={`text-right font-semibold ${a.netMovement > 0 ? 'text-emerald-600' : a.netMovement < 0 ? 'text-red-600' : ''}`}>{formatSAR(a.netMovement)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="text-[10px]">
                      <TableHead className="w-24">{isAr ? 'الرمز' : 'Code'}</TableHead>
                      <TableHead>{isAr ? 'اسم الحساب' : 'Account Name'}</TableHead>
                      <TableHead className="w-16">{isAr ? 'النوع' : 'Type'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'افتتاحي مدين' : 'Opening Dr'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'افتتاحي دائن' : 'Opening Cr'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'حركة مدينة' : 'Period Dr'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'حركة دائنة' : 'Period Cr'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'ختامي مدين' : 'Closing Dr'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'ختامي دائن' : 'Closing Cr'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'صافي الحركة' : 'Net Movement'}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {filteredAccounts.map(a => (
                        <TableRow key={a.acctCode} className="text-[11px] cursor-pointer hover:bg-muted/30" onClick={() => setDrillDown({ open: true, acctCode: a.acctCode, acctName: a.acctName })}>
                          <TableCell className="font-mono">{a.acctCode}</TableCell>
                          <TableCell>{a.acctName}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[9px]">{a.acctType}</Badge></TableCell>
                          <TableCell className="text-right">{formatSAR(a.openingDebit)}</TableCell>
                          <TableCell className="text-right">{formatSAR(a.openingCredit)}</TableCell>
                          <TableCell className="text-right">{formatSAR(a.periodDebit)}</TableCell>
                          <TableCell className="text-right">{formatSAR(a.periodCredit)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatSAR(a.closingDebit)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatSAR(a.closingCredit)}</TableCell>
                          <TableCell className={`text-right font-semibold ${a.netMovement > 0 ? 'text-emerald-600' : a.netMovement < 0 ? 'text-red-600' : ''}`}>{formatSAR(a.netMovement)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="text-[11px] font-bold bg-muted/50 border-t-2">
                        <TableCell colSpan={3}>{isAr ? 'الإجمالي' : 'TOTAL'}</TableCell>
                        <TableCell className="text-right">{formatSAR(totals.openingDebit)}</TableCell>
                        <TableCell className="text-right">{formatSAR(totals.openingCredit)}</TableCell>
                        <TableCell className="text-right">{formatSAR(totals.periodDebit)}</TableCell>
                        <TableCell className="text-right">{formatSAR(totals.periodCredit)}</TableCell>
                        <TableCell className="text-right">{formatSAR(totals.closingDebit)}</TableCell>
                        <TableCell className="text-right">{formatSAR(totals.closingCredit)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Drill-down dialog */}
      <PLDrillDownDialog
        open={drillDown.open}
        onOpenChange={o => setDrillDown(d => ({ ...d, open: o }))}
        acctCode={drillDown.acctCode}
        acctName={drillDown.acctName}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        companyIds={filters.companyIds}
      />
    </div>
  );
}
