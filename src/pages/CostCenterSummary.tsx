import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KPICard } from '@/components/ui/kpi-card';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { PLDrillDownDialog } from '@/components/finance/pl/PLDrillDownDialog';
import { useCostCenterReportData, type CCFilters } from '@/hooks/useCostCenterReportData';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import { formatSAR, formatSARShort } from '@/lib/currency';
import { DollarSign, TrendingDown, AlertTriangle, BarChart3, ChevronDown, ChevronUp, Filter, Download, Printer, ChevronRight, FileText, Search, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const currentYear = new Date().getFullYear();

export default function CostCenterSummary() {
  const [filters, setFilters] = useState<CCFilters>({
    companyIds: [], branchId: '', costCenterId: '', departmentId: '',
    projectId: '', fiscalYear: String(currentYear),
    dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    accountRange: '', includeUnposted: false,
  });
  const [generated, setGenerated] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedCC, setExpandedCC] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [drillDown, setDrillDown] = useState<{ open: boolean; acctCode: string; acctName: string }>({ open: false, acctCode: '', acctName: '' });
  useDefaultReportCompanyIds(setFilters);

  const data = useCostCenterReportData(filters, generated);

  const { data: branches = [] } = useQuery({
    queryKey: ['cc-branches'], queryFn: async () => { const { data } = await supabase.from('branches').select('id, name').order('name'); return data || []; },
  });

  const filtered = data.costCenters.filter(cc =>
    !searchTerm || cc.name.toLowerCase().includes(searchTerm.toLowerCase()) || cc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = filtered.slice(0, 15).map(cc => ({
    name: cc.code.length > 8 ? cc.code.slice(0, 8) + '…' : cc.code,
    fullName: cc.name,
    budget: cc.budget,
    actual: cc.actual,
  }));

  const topSpenders = [...filtered].sort((a, b) => b.actual - a.actual).slice(0, 10);

  const handleExportExcel = useCallback(() => {
    const rows = data.costCenters.map(cc => ({
      'Cost Center': cc.code, 'Name': cc.name, 'Budget': cc.budget,
      'Actual': cc.actual, 'Variance': cc.variance, 'Variance %': cc.variancePct.toFixed(1),
      'Utilization': cc.budget > 0 ? ((cc.actual / cc.budget) * 100).toFixed(1) + '%' : 'N/A',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cost Center Summary');
    XLSX.writeFile(wb, `Cost_Center_Summary_${filters.fiscalYear}.xlsx`);
  }, [data, filters]);

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16); doc.text('Cost Center Summary Report', 14, 15);
    doc.setFontSize(10); doc.text(`Fiscal Year: ${filters.fiscalYear} | ${filters.dateFrom} to ${filters.dateTo}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [['Code', 'Name', 'Budget', 'Actual', 'Variance', 'Var %']],
      body: data.costCenters.map(cc => [cc.code, cc.name, formatSAR(cc.budget), formatSAR(cc.actual), formatSAR(cc.variance), cc.variancePct.toFixed(1) + '%']),
      styles: { fontSize: 7 },
    });
    doc.save(`Cost_Center_Summary_${filters.fiscalYear}.pdf`);
  }, [data, filters]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1600px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cost Center Summary Report</h1>
          <p className="text-sm text-muted-foreground">Budget vs actual analysis by cost center with variance drill-down</p>
        </div>
        {generated && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="h-4 w-4 mr-1" />PDF</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><Label className="text-xs">Companies</Label><CompanyMultiSelect selectedIds={filters.companyIds} onChange={v => setFilters(f => ({ ...f, companyIds: v }))} /></div>
            <div><Label className="text-xs">Fiscal Year</Label><Input value={filters.fiscalYear} onChange={e => setFilters(f => ({ ...f, fiscalYear: e.target.value }))} /></div>
            <div><Label className="text-xs">Date From</Label><Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} /></div>
            <div><Label className="text-xs">Date To</Label><Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} /></div>
            <div className="flex items-end"><Button className="w-full" onClick={() => setGenerated(true)}><Filter className="h-4 w-4 mr-1" />Generate</Button></div>
          </div>
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="mt-2 text-xs">{showAdvanced ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}Advanced Filters</Button></CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Branch</Label>
                  <Select value={filters.branchId || 'all'} onValueChange={v => setFilters(f => ({ ...f, branchId: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2"><Switch checked={filters.includeUnposted} onCheckedChange={v => setFilters(f => ({ ...f, includeUnposted: v }))} /><Label className="text-xs">Include unposted</Label></div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {generated && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <KPICard icon={<DollarSign className="h-4 w-4 text-primary" />} label="Total Budget" value={`SAR ${formatSARShort(data.totalBudget)}`} />
            <KPICard icon={<BarChart3 className="h-4 w-4 text-chart-2" />} label="Total Actual" value={`SAR ${formatSARShort(data.totalActual)}`} />
            <KPICard icon={<TrendingDown className="h-4 w-4 text-chart-1" />} label="Total Variance" value={`SAR ${formatSARShort(data.totalVariance)}`} subtitle={data.totalVariance >= 0 ? 'Under budget' : 'Over budget'} />
            <KPICard icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Overspent Centers" value={String(data.overspentCount)} subtitle={`of ${data.costCenters.length}`} />
            <KPICard icon={<BarChart3 className="h-4 w-4 text-chart-3" />} label="Utilization" value={`${data.utilization.toFixed(1)}%`} />
            <KPICard icon={<Building2 className="h-4 w-4 text-muted-foreground" />} label="Cost Centers" value={String(data.costCenters.length)} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Budget vs Actual</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatSARShort(v)} />
                    <Tooltip formatter={(v: number) => `SAR ${formatSAR(v)}`} labelFormatter={(l, payload) => payload?.[0]?.payload?.fullName || l} />
                    <Legend />
                    <Bar dataKey="budget" name="Budget" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Actual" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 by Spend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topSpenders} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatSARShort(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
                    <Tooltip formatter={(v: number) => `SAR ${formatSAR(v)}`} />
                    <Bar dataKey="actual" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]}>
                      {topSpenders.map((e, i) => <Cell key={i} fill={e.actual > e.budget && e.budget > 0 ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-2))'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Grid */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Cost Center Detail</CardTitle>
                <div className="relative w-64"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" /></div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Var %</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(cc => (
                      <CCRow key={cc.code} cc={cc} expanded={expandedCC === cc.code}
                        onToggle={() => setExpandedCC(expandedCC === cc.code ? null : cc.code)}
                        onDrill={(code, name) => setDrillDown({ open: true, acctCode: code, acctName: name })} />
                    ))}
                    {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No data. Adjust filters and generate.</TableCell></TableRow>}
                    {filtered.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell></TableCell><TableCell>TOTAL</TableCell><TableCell>{filtered.length} centers</TableCell>
                        <TableCell className="text-right">SAR {formatSAR(data.totalBudget)}</TableCell>
                        <TableCell className="text-right">SAR {formatSAR(data.totalActual)}</TableCell>
                        <TableCell className="text-right">SAR {formatSAR(data.totalVariance)}</TableCell>
                        <TableCell className="text-right">{data.totalBudget > 0 ? ((data.totalVariance / data.totalBudget) * 100).toFixed(1) + '%' : '-'}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <PLDrillDownDialog open={drillDown.open} onOpenChange={o => setDrillDown(d => ({ ...d, open: o }))} acctCode={drillDown.acctCode} acctName={drillDown.acctName} companyIds={filters.companyIds} dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
    </div>
  );
}

function CCRow({ cc, expanded, onToggle, onDrill }: { cc: any; expanded: boolean; onToggle: () => void; onDrill: (code: string, name: string) => void }) {
  const overspent = cc.actual > cc.budget && cc.budget > 0;
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-accent/30" onClick={onToggle}>
        <TableCell><ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} /></TableCell>
        <TableCell className="font-mono text-xs">{cc.code}</TableCell>
        <TableCell className="font-medium">{cc.name}</TableCell>
        <TableCell className="text-right">{cc.budget > 0 ? `SAR ${formatSAR(cc.budget)}` : '-'}</TableCell>
        <TableCell className="text-right">SAR {formatSAR(cc.actual)}</TableCell>
        <TableCell className={`text-right ${overspent ? 'text-destructive font-medium' : ''}`}>SAR {formatSAR(cc.variance)}</TableCell>
        <TableCell className={`text-right ${overspent ? 'text-destructive' : ''}`}>{cc.budget > 0 ? cc.variancePct.toFixed(1) + '%' : '-'}</TableCell>
        <TableCell className="text-center"><Badge variant={overspent ? 'destructive' : 'secondary'} className="text-[10px]">{overspent ? 'Over' : 'OK'}</Badge></TableCell>
      </TableRow>
      {expanded && cc.accounts.map((a: any) => (
        <TableRow key={a.accountCode} className="bg-muted/20 cursor-pointer hover:bg-accent/20" onClick={() => onDrill(a.accountCode, a.accountName)}>
          <TableCell></TableCell>
          <TableCell className="pl-8 font-mono text-xs">{a.accountCode}</TableCell>
          <TableCell className="text-xs">{a.accountName}</TableCell>
          <TableCell className="text-right text-xs">{a.budget > 0 ? `SAR ${formatSAR(a.budget)}` : '-'}</TableCell>
          <TableCell className="text-right text-xs">SAR {formatSAR(a.actual)}</TableCell>
          <TableCell className="text-right text-xs">SAR {formatSAR(a.variance)}</TableCell>
          <TableCell></TableCell><TableCell></TableCell>
        </TableRow>
      ))}
    </>
  );
}
