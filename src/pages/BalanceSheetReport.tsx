import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { PLDrillDownDialog } from '@/components/finance/pl/PLDrillDownDialog';
import { useBalanceSheetData, type BSFilters, type BSLine } from '@/hooks/useBalanceSheetData';
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
  AlertTriangle, BarChart3, Loader2, ChevronRight, Scale
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#6366f1', '#ec4899'];

export default function BalanceSheetReport() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [filters, setFilters] = useState<BSFilters>({
    companyIds: [], branchId: '', asOfDate: new Date().toISOString().split('T')[0],
    compareDate: '', comparisonMode: 'none', costCenter: '', projectCode: '',
    departmentId: '', postedOnly: true, includeClosing: false, viewMode: 'classic',
  });
  const [generated, setGenerated] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [drillDown, setDrillDown] = useState<{ open: boolean; acctCode: string; acctName: string }>({ open: false, acctCode: '', acctName: '' });
  useDefaultReportCompanyIds(setFilters);

  const { bsLines, isBalanced, isLoading, kpis } = useBalanceSheetData(filters, generated);

  const { data: branches = [] } = useQuery({
    queryKey: ['bs-branches'], queryFn: async () => { const { data } = await supabase.from('branches').select('id, name').order('name'); return data || []; },
  });
  const { data: costCenters = [] } = useQuery({
    queryKey: ['bs-cost-centers'], queryFn: async () => { const { data } = await supabase.from('cost_centers').select('id, name, code').order('code'); return data || []; },
  });

  const hasCompare = filters.comparisonMode !== 'none' && !!filters.compareDate;
  const update = (partial: Partial<BSFilters>) => setFilters(f => ({ ...f, ...partial }));

  const toggleLine = (key: string) => {
    setExpandedLines(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  // Chart data
  const assetComposition = useMemo(() => {
    return bsLines
      .filter(l => ['cash_bank', 'accounts_receivable', 'other_receivables', 'inventory', 'prepaid_expenses', 'ppe', 'intangible_assets', 'investments'].includes(l.key) && Math.abs(l.amount) > 0)
      .map(l => ({ name: l.label, value: Math.abs(l.amount) }));
  }, [bsLines]);

  const liabilityComposition = useMemo(() => {
    return bsLines
      .filter(l => ['accounts_payable', 'accrued_expenses', 'short_term_loans', 'taxes_payable', 'long_term_loans', 'provisions'].includes(l.key) && Math.abs(l.amount) > 0)
      .map(l => ({ name: l.label, value: Math.abs(l.amount) }));
  }, [bsLines]);

  const handleExportExcel = () => {
    const rows = bsLines.map(l => ({
      'Line': '  '.repeat(l.indent) + l.label, 'Amount': l.amount,
      ...(hasCompare ? { 'Compare Amount': l.compareAmount, 'Variance': l.amount - l.compareAmount } : {}),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
    XLSX.writeFile(wb, `balance-sheet-${filters.asOfDate}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Balance Sheet', 14, 15);
    doc.setFontSize(9);
    doc.text(`As of: ${filters.asOfDate}`, 14, 22);
    const cols = hasCompare ? ['Line Item', 'Amount', 'Compare', 'Variance'] : ['Line Item', 'Amount'];
    autoTable(doc, {
      startY: 28,
      head: [cols],
      body: bsLines.map(l => {
        const row = ['  '.repeat(l.indent) + l.label, formatSAR(l.amount)];
        if (hasCompare) { row.push(formatSAR(l.compareAmount), formatSAR(l.amount - l.compareAmount)); }
        return row;
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      didParseCell: (data: any) => {
        const line = bsLines[data.row.index];
        if (line?.isBold) data.cell.styles.fontStyle = 'bold';
      },
    });
    doc.save(`balance-sheet-${filters.asOfDate}.pdf`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden page-enter">
      {/* Title */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--sidebar-background)/0.85)] text-sidebar-foreground px-4 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4" />
          <h1 className="text-sm font-semibold">{isAr ? 'الميزانية العمومية' : 'Balance Sheet Report'}</h1>
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
              <div><Label className="text-xs">{isAr ? 'كما في تاريخ' : 'As of Date'}</Label><Input type="date" value={filters.asOfDate} onChange={e => update({ asOfDate: e.target.value })} className="h-8 text-xs" /></div>
              <div>
                <Label className="text-xs">{isAr ? 'المقارنة' : 'Comparison'}</Label>
                <Select value={filters.comparisonMode} onValueChange={v => {
                  const mode = v;
                  let cDate = '';
                  if (mode === 'prev_month') {
                    const d = new Date(filters.asOfDate); d.setMonth(d.getMonth() - 1);
                    cDate = d.toISOString().split('T')[0];
                  } else if (mode === 'prev_year') {
                    const d = new Date(filters.asOfDate); d.setFullYear(d.getFullYear() - 1);
                    cDate = d.toISOString().split('T')[0];
                  } else if (mode === 'prev_quarter') {
                    const d = new Date(filters.asOfDate); d.setMonth(d.getMonth() - 3);
                    cDate = d.toISOString().split('T')[0];
                  }
                  update({ comparisonMode: mode, compareDate: cDate });
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isAr ? 'بدون' : 'None'}</SelectItem>
                    <SelectItem value="prev_month">{isAr ? 'الشهر السابق' : 'Previous Month'}</SelectItem>
                    <SelectItem value="prev_quarter">{isAr ? 'الربع السابق' : 'Previous Quarter'}</SelectItem>
                    <SelectItem value="prev_year">{isAr ? 'السنة السابقة' : 'Previous Year'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2"><Switch checked={filters.postedOnly} onCheckedChange={v => update({ postedOnly: v })} /><span className="text-xs">{isAr ? 'مرحّل فقط' : 'Posted Only'}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button onClick={() => setGenerated(true)} className="h-8 text-xs">{isAr ? 'توليد' : 'Generate'}</Button>
              <Button variant="outline" className="h-8 text-xs" onClick={() => { setGenerated(false); }}>{isAr ? 'إعادة تعيين' : 'Reset'}</Button>
            </div>
          </CardContent>
        </Card>

        {generated && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: isAr ? 'إجمالي الأصول' : 'Total Assets', value: kpis.totalAssets },
                { label: isAr ? 'إجمالي الالتزامات' : 'Total Liabilities', value: kpis.totalLiabilities },
                { label: isAr ? 'حقوق الملكية' : 'Total Equity', value: kpis.totalEquity },
                { label: isAr ? 'رأس المال العامل' : 'Working Capital', value: kpis.workingCapital },
                { label: isAr ? 'نسبة التداول' : 'Current Ratio', value: kpis.currentRatio, isRatio: true },
                { label: isAr ? 'الدين/الملكية' : 'Debt/Equity', value: kpis.debtToEquity, isRatio: true },
                { label: isAr ? 'النقد' : 'Cash', value: kpis.cashBalance },
              ].map((kpi, i) => (
                <Card key={i}><CardContent className="py-3 px-3"><p className="text-[10px] text-muted-foreground">{kpi.label}</p><p className="text-sm font-bold">{'isRatio' in kpi && kpi.isRatio ? kpi.value.toFixed(2) : formatSAR(kpi.value)}</p></CardContent></Card>
              ))}
              <Card className={isBalanced ? 'border-green-500' : 'border-destructive'}>
                <CardContent className="py-3 px-3 flex items-center gap-2">
                  {isBalanced ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
                  <div><p className="text-[10px] text-muted-foreground">{isAr ? 'التوازن' : 'Balance Proof'}</p><p className="text-xs font-bold">{isBalanced ? 'A = L + E ✓' : 'IMBALANCED!'}</p></div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card><CardContent className="pt-4">
                <p className="text-xs font-semibold mb-2">{isAr ? 'تكوين الأصول' : 'Asset Composition'}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={assetComposition} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {assetComposition.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie><Tooltip formatter={(v: number) => formatSAR(v)} /></PieChart>
                </ResponsiveContainer>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <p className="text-xs font-semibold mb-2">{isAr ? 'تكوين الالتزامات' : 'Liability Composition'}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={liabilityComposition} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {liabilityComposition.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie><Tooltip formatter={(v: number) => formatSAR(v)} /></PieChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </div>

            {/* Main Statement Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</span></div>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="text-[10px]">
                      <TableHead>{isAr ? 'البند' : 'Line Item'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                      {hasCompare && <>
                        <TableHead className="text-right">{isAr ? 'مقارنة' : 'Compare'}</TableHead>
                        <TableHead className="text-right">{isAr ? 'التباين' : 'Variance'}</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </>}
                    </TableRow></TableHeader>
                    <TableBody>
                      {bsLines.map(line => {
                        const hasAccounts = line.accounts && line.accounts.length > 0;
                        const isExpanded = expandedLines.has(line.key);
                        const variance = line.amount - line.compareAmount;
                        const variancePct = line.compareAmount !== 0 ? (variance / Math.abs(line.compareAmount)) * 100 : 0;
                        const isSeparator = ['total_assets', 'total_liabilities', 'total_le'].includes(line.key);

                        return (
                          <>{/* Main row */}
                            <TableRow
                              key={line.key}
                              className={`text-[11px] ${line.isBold ? 'font-bold' : ''} ${line.isSection && !line.isBold ? 'bg-muted/20' : ''} ${isSeparator ? 'border-t-2 border-primary/30 bg-muted/40' : ''} ${hasAccounts ? 'cursor-pointer hover:bg-muted/30' : ''}`}
                              onClick={() => hasAccounts && toggleLine(line.key)}
                            >
                              <TableCell className="flex items-center gap-1" style={{ paddingLeft: `${line.indent * 20 + 12}px` }}>
                                {hasAccounts && <ChevronRight className={`h-3 w-3 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />}
                                {line.label}
                              </TableCell>
                              <TableCell className="text-right">{(line.amount !== 0 || line.isSection) ? formatSAR(line.amount) : ''}</TableCell>
                              {hasCompare && <>
                                <TableCell className="text-right text-muted-foreground">{line.compareAmount !== 0 ? formatSAR(line.compareAmount) : ''}</TableCell>
                                <TableCell className={`text-right ${variance > 0 ? 'text-emerald-600' : variance < 0 ? 'text-red-600' : ''}`}>{variance !== 0 ? formatSAR(variance) : ''}</TableCell>
                                <TableCell className={`text-right ${variancePct > 0 ? 'text-emerald-600' : variancePct < 0 ? 'text-red-600' : ''}`}>{variancePct !== 0 ? `${variancePct.toFixed(1)}%` : ''}</TableCell>
                              </>}
                            </TableRow>
                            {/* Expanded account rows */}
                            {isExpanded && line.accounts?.map(acct => (
                              <TableRow
                                key={`${line.key}-${acct.code}`}
                                className="text-[10px] bg-muted/10 cursor-pointer hover:bg-muted/20"
                                onClick={() => setDrillDown({ open: true, acctCode: acct.code, acctName: acct.name })}
                              >
                                <TableCell style={{ paddingLeft: `${(line.indent + 1) * 20 + 24}px` }}>
                                  <span className="font-mono text-muted-foreground mr-2">{acct.code}</span>{acct.name}
                                </TableCell>
                                <TableCell className="text-right">{formatSAR(acct.amount)}</TableCell>
                                {hasCompare && <>
                                  <TableCell className="text-right text-muted-foreground">{formatSAR(acct.compareAmount)}</TableCell>
                                  <TableCell className="text-right">{formatSAR(acct.amount - acct.compareAmount)}</TableCell>
                                  <TableCell className="text-right">{acct.compareAmount !== 0 ? `${(((acct.amount - acct.compareAmount) / Math.abs(acct.compareAmount)) * 100).toFixed(1)}%` : ''}</TableCell>
                                </>}
                              </TableRow>
                            ))}
                          </>
                        );
                      })}
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
        dateFrom="1900-01-01"
        dateTo={filters.asOfDate}
        companyIds={filters.companyIds}
      />
    </div>
  );
}
