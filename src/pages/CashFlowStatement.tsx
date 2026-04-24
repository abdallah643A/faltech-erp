import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { PLDrillDownDialog } from '@/components/finance/pl/PLDrillDownDialog';
import { useCashFlowData, useCashFlowMonthlyData, type CFFilters, type CFLine } from '@/hooks/useCashFlowData';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatSAR, formatSARShort } from '@/lib/currency';
import {
  Download, Printer, FileText, ChevronDown, ChevronUp, Filter, RotateCcw, Play,
  TrendingUp, TrendingDown, DollarSign, ArrowUpDown, Landmark, BarChart3, PieChart, Wallet
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart as RPieChart, Pie, Cell,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const currentYear = new Date().getFullYear();
const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(142,76%,36%)', 'hsl(38,92%,50%)'];

export default function CashFlowStatement() {
  const [filters, setFilters] = useState<CFFilters>({
    companyIds: [], dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    compareDateFrom: '', compareDateTo: '', comparisonMode: 'none', branchId: '',
    costCenter: '', projectCode: '', departmentId: '', bankAccount: '',
    method: 'direct', includeUnposted: false, viewMode: 'summary',
  });
  const [generated, setGenerated] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['operating', 'investing', 'financing']));
  const [drillDown, setDrillDown] = useState<{ open: boolean; acctCode: string; acctName: string }>({ open: false, acctCode: '', acctName: '' });
  useDefaultReportCompanyIds(setFilters);

  const { lines, isLoading, hasCompare } = useCashFlowData(filters, generated);
  const { data: monthlyData } = useCashFlowMonthlyData({
    companyIds: filters.companyIds,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    branchId: filters.branchId || undefined,
  }, generated && filters.viewMode === 'summary');

  const { data: branches = [] } = useQuery({
    queryKey: ['cf-branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name').order('name');
      return data || [];
    },
  });

  const { data: costCenters = [] } = useQuery({
    queryKey: ['cf-cost-centers'],
    queryFn: async () => {
      const { data } = await supabase.from('cost_centers').select('id, name, code').order('code');
      return data || [];
    },
  });

  const getLineVal = (key: string) => lines.find(l => l.key === key)?.amount || 0;

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  const handleDrillDown = useCallback((acctCode: string, acctName: string) => {
    setDrillDown({ open: true, acctCode, acctName });
  }, []);

  const handleComparisonChange = (mode: string) => {
    const f = { ...filters, comparisonMode: mode };
    if (mode === 'previous_period') {
      const from = new Date(filters.dateFrom);
      const to = new Date(filters.dateTo);
      const diff = to.getTime() - from.getTime();
      const cTo = new Date(from.getTime() - 86400000);
      const cFrom = new Date(cTo.getTime() - diff);
      f.compareDateFrom = cFrom.toISOString().split('T')[0];
      f.compareDateTo = cTo.toISOString().split('T')[0];
    } else if (mode === 'same_period_last_year') {
      const from = new Date(filters.dateFrom);
      const to = new Date(filters.dateTo);
      f.compareDateFrom = `${from.getFullYear() - 1}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
      f.compareDateTo = `${to.getFullYear() - 1}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`;
    }
    setFilters(f);
  };

  // KPIs
  const openingCash = getLineVal('opening_cash');
  const netOperating = getLineVal('net_operating');
  const netInvesting = getLineVal('net_investing');
  const netFinancing = getLineVal('net_financing');
  const closingCash = getLineVal('closing_cash');
  const freeCashFlow = netOperating + getLineVal('asset_purchases');

  const kpis = [
    { label: 'Opening Cash', value: formatSARShort(openingCash), icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Net Operating', value: formatSARShort(netOperating), icon: netOperating >= 0 ? TrendingUp : TrendingDown, color: netOperating >= 0 ? 'text-green-600' : 'text-destructive', bg: netOperating >= 0 ? 'bg-green-500/10' : 'bg-destructive/10' },
    { label: 'Net Investing', value: formatSARShort(netInvesting), icon: ArrowUpDown, color: 'text-purple-600', bg: 'bg-purple-500/10' },
    { label: 'Net Financing', value: formatSARShort(netFinancing), icon: Landmark, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'Closing Cash', value: formatSARShort(closingCash), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Free Cash Flow', value: formatSARShort(freeCashFlow), icon: BarChart3, color: freeCashFlow >= 0 ? 'text-green-600' : 'text-destructive', bg: freeCashFlow >= 0 ? 'bg-green-500/10' : 'bg-destructive/10' },
    { label: 'Cash Conversion', value: netOperating !== 0 ? `${((closingCash / Math.abs(netOperating)) * 100).toFixed(0)}%` : 'N/A', icon: PieChart, color: 'text-cyan-600', bg: 'bg-cyan-500/10' },
  ];

  // Charts data
  const waterfallData = [
    { name: 'Opening', value: openingCash, fill: 'hsl(var(--primary))' },
    { name: 'Operating', value: netOperating, fill: netOperating >= 0 ? 'hsl(142,76%,36%)' : 'hsl(var(--destructive))' },
    { name: 'Investing', value: netInvesting, fill: netInvesting >= 0 ? 'hsl(142,76%,36%)' : 'hsl(var(--destructive))' },
    { name: 'Financing', value: netFinancing, fill: netFinancing >= 0 ? 'hsl(142,76%,36%)' : 'hsl(var(--destructive))' },
    { name: 'Closing', value: closingCash, fill: 'hsl(var(--primary))' },
  ];

  const outflowData = lines
    .filter(l => !l.isSection && l.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5)
    .map(l => ({ name: l.label, value: Math.abs(l.amount) }));

  const exportExcel = () => {
    const rows = lines.map(l => ({
      Description: l.label,
      'Amount (SAR)': l.amount,
      ...(hasCompare ? { 'Prior Period': l.compareAmount, Variance: l.amount - l.compareAmount } : {}),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
    XLSX.writeFile(wb, `CashFlow_${filters.dateFrom}_${filters.dateTo}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Cash Flow Statement', 14, 20);
    doc.setFontSize(9);
    doc.text(`Period: ${filters.dateFrom} to ${filters.dateTo}`, 14, 28);
    doc.text(`Method: ${filters.method === 'direct' ? 'Direct' : 'Indirect'}`, 14, 33);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 38);

    const head = [['Description', 'Amount (SAR)']];
    if (hasCompare) head[0].push('Prior Period', 'Variance');
    const body = lines.map(l => {
      const row = [l.isBold ? l.label.toUpperCase() : `${'  '.repeat(l.indent)}${l.label}`, formatSAR(l.amount)];
      if (hasCompare) {
        row.push(formatSAR(l.compareAmount), formatSAR(l.amount - l.compareAmount));
      }
      return row;
    });
    autoTable(doc, { head, body, startY: 44, styles: { fontSize: 8 }, headStyles: { fillColor: [30, 64, 175] } });
    doc.save(`CashFlow_${filters.dateFrom}_${filters.dateTo}.pdf`);
  };

  // Determine which lines are children of a section
  const getSectionChildren = (sectionKey: string): string[] => {
    const sectionIdx = lines.findIndex(l => l.key === sectionKey);
    if (sectionIdx < 0) return [];
    const children: string[] = [];
    for (let i = sectionIdx + 1; i < lines.length; i++) {
      if (lines[i].isSection && lines[i].indent <= lines[sectionIdx].indent) break;
      if (!lines[i].isSection) children.push(lines[i].key);
    }
    return children;
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Flow Statement</h1>
          <p className="text-sm text-muted-foreground">Direct & indirect cash flow analysis with drill-down</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!generated}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={!generated}><FileText className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!generated}><Printer className="h-4 w-4 mr-1" />Print</Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div>
              <Label className="text-xs">Company</Label>
              <CompanyMultiSelect selectedIds={filters.companyIds} onChange={v => setFilters({ ...filters, companyIds: v })} />
            </div>
            <div>
              <Label className="text-xs">Date From</Label>
              <Input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Date To</Label>
              <Input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Branch</Label>
              <Select value={filters.branchId} onValueChange={v => setFilters({ ...filters, branchId: v === 'all' ? '' : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Method</Label>
              <Select value={filters.method} onValueChange={v => setFilters({ ...filters, method: v as 'direct' | 'indirect' })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="indirect">Indirect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Comparison</Label>
              <Select value={filters.comparisonMode} onValueChange={handleComparisonChange}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="previous_period">Previous Period</SelectItem>
                  <SelectItem value="same_period_last_year">Same Period Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => setGenerated(true)} className="w-full h-9" disabled={isLoading}>
                <Play className="h-4 w-4 mr-1" />{isLoading ? 'Loading...' : 'Generate'}
              </Button>
            </div>
          </div>

          {/* Advanced filters */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-2 text-xs">
                <Filter className="h-3 w-3 mr-1" />Advanced Filters {showAdvanced ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                <div>
                  <Label className="text-xs">Cost Center</Label>
                  <Select value={filters.costCenter} onValueChange={v => setFilters({ ...filters, costCenter: v === 'all' ? '' : v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {costCenters.map(c => <SelectItem key={c.id} value={c.code}>{c.code} - {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Project</Label>
                  <Input placeholder="Project code" value={filters.projectCode} onChange={e => setFilters({ ...filters, projectCode: e.target.value })} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">View Mode</Label>
                  <Select value={filters.viewMode} onValueChange={v => setFilters({ ...filters, viewMode: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={filters.includeUnposted} onCheckedChange={v => setFilters({ ...filters, includeUnposted: v })} />
                  <Label className="text-xs">Include Unposted</Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {generated && (
        <>
          {/* Warning badge */}
          {filters.includeUnposted && (
            <Badge variant="destructive" className="text-xs">⚠ Includes unposted/draft entries — for review only</Badge>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {kpis.map(k => (
              <Card key={k.label} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-3 pb-2 px-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-muted-foreground truncate">{k.label}</p>
                    <div className={`p-1 rounded ${k.bg}`}><k.icon className={`h-3 w-3 ${k.color}`} /></div>
                  </div>
                  <p className={`text-sm font-bold ${k.color}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Cash Flow Waterfall</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <RTooltip formatter={(v: number) => formatSAR(v)} />
                    <Bar dataKey="value" fill="hsl(var(--primary))">
                      {waterfallData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {monthlyData && monthlyData.length > 1 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Cash Flow Trend</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <RTooltip formatter={(v: number) => formatSAR(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="operating" name="Operating" stroke="hsl(142,76%,36%)" strokeWidth={2} />
                      <Line type="monotone" dataKey="investing" name="Investing" stroke="hsl(var(--primary))" strokeWidth={2} />
                      <Line type="monotone" dataKey="financing" name="Financing" stroke="hsl(38,92%,50%)" strokeWidth={2} />
                      <Line type="monotone" dataKey="net" name="Net" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {outflowData.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Top Cash Outflows</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={outflowData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 9 }} className="fill-muted-foreground" />
                      <RTooltip formatter={(v: number) => formatSAR(v)} />
                      <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Balance Reconciliation */}
          <Card className="border-primary/20">
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Cash Reconciliation:</span>
                <span>Opening ({formatSAR(openingCash)}) + Net Change ({formatSAR(getLineVal('net_change'))}) = Closing ({formatSAR(closingCash)})</span>
                <Badge variant={Math.abs(openingCash + getLineVal('net_change') - closingCash) < 0.01 ? 'default' : 'destructive'}>
                  {Math.abs(openingCash + getLineVal('net_change') - closingCash) < 0.01 ? '✓ Balanced' : '✗ Imbalanced'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Main Statement Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                Cash Flow Statement — {filters.method === 'direct' ? 'Direct Method' : 'Indirect Method'}
                <Badge variant="outline" className="text-xs">{filters.dateFrom} to {filters.dateTo}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[400px]">Description</TableHead>
                    <TableHead className="text-right">Amount (SAR)</TableHead>
                    {hasCompare && <>
                      <TableHead className="text-right">Prior Period</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Var %</TableHead>
                    </>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(line => {
                    const isExpandable = line.isSection && !line.key.startsWith('net_') && !line.key.startsWith('closing') && !line.key.startsWith('opening') && ['operating', 'investing', 'financing'].includes(line.key);
                    const isChildVisible = (parentKey: string) => expandedSections.has(parentKey);

                    // Determine if this line should be visible
                    let parentSection = '';
                    if (!line.isSection) {
                      for (const sec of ['operating', 'investing', 'financing']) {
                        if (getSectionChildren(sec).includes(line.key)) {
                          parentSection = sec;
                          break;
                        }
                      }
                      if (parentSection && !expandedSections.has(parentSection)) return null;
                    }

                    const variance = line.amount - line.compareAmount;
                    const varPct = line.compareAmount !== 0 ? (variance / Math.abs(line.compareAmount)) * 100 : 0;

                    return (
                      <TableRow
                        key={line.key}
                        className={`${line.isBold ? 'bg-muted/30 font-semibold' : ''} ${line.isSection && line.indent === 0 ? 'border-t-2' : ''} cursor-pointer hover:bg-muted/50`}
                        onClick={() => {
                          if (isExpandable) toggleSection(line.key);
                          else if (line.accounts && line.accounts.length > 0) handleDrillDown(line.accounts[0].code, line.label);
                        }}
                      >
                        <TableCell className={`py-2 ${line.isBold ? 'font-semibold' : ''}`}>
                          <div className="flex items-center gap-1" style={{ paddingLeft: `${line.indent * 20}px` }}>
                            {isExpandable && (
                              expandedSections.has(line.key) ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3 rotate-180" />
                            )}
                            {line.label}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right py-2 ${line.amount < 0 ? 'text-destructive' : ''} ${line.isBold ? 'font-semibold' : ''}`}>
                          {line.isSection && !line.isBold ? '' : formatSAR(line.amount)}
                        </TableCell>
                        {hasCompare && <>
                          <TableCell className="text-right py-2 text-muted-foreground">{line.isSection && !line.isBold ? '' : formatSAR(line.compareAmount)}</TableCell>
                          <TableCell className={`text-right py-2 ${variance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {line.isSection && !line.isBold ? '' : formatSAR(variance)}
                          </TableCell>
                          <TableCell className={`text-right py-2 ${variance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {(line.isSection && !line.isBold) || line.compareAmount === 0 ? '' : `${varPct.toFixed(1)}%`}
                          </TableCell>
                        </>}
                      </TableRow>
                    );
                  })}

                  {/* Show detail accounts in detailed view */}
                  {filters.viewMode === 'detailed' && lines
                    .filter(l => !l.isSection && l.accounts && l.accounts.length > 0)
                    .flatMap(l => {
                      let parentSection = '';
                      for (const sec of ['operating', 'investing', 'financing']) {
                        if (getSectionChildren(sec).includes(l.key)) { parentSection = sec; break; }
                      }
                      if (parentSection && !expandedSections.has(parentSection)) return [];

                      return l.accounts!.map(a => (
                        <TableRow
                          key={`${l.key}-${a.code}`}
                          className="text-xs text-muted-foreground cursor-pointer hover:bg-muted/30"
                          onClick={() => handleDrillDown(a.code, a.name)}
                        >
                          <TableCell className="py-1" style={{ paddingLeft: `${(l.indent + 1) * 20}px` }}>
                            📄 {a.code} — {a.name}
                          </TableCell>
                          <TableCell className="text-right py-1">{formatSAR(a.amount)}</TableCell>
                          {hasCompare && <>
                            <TableCell className="text-right py-1">{formatSAR(a.compareAmount)}</TableCell>
                            <TableCell className="text-right py-1">{formatSAR(a.amount - a.compareAmount)}</TableCell>
                            <TableCell className="text-right py-1"></TableCell>
                          </>}
                        </TableRow>
                      ));
                    })
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Drill-Down Dialog */}
      <PLDrillDownDialog
        open={drillDown.open}
        onOpenChange={o => setDrillDown({ ...drillDown, open: o })}
        acctCode={drillDown.acctCode}
        acctName={drillDown.acctName}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        companyIds={filters.companyIds}
      />
    </div>
  );
}
