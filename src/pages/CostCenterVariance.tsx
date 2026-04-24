import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KPICard } from '@/components/ui/kpi-card';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import { useCostCenterReportData, type CCFilters } from '@/hooks/useCostCenterReportData';
import { formatSAR, formatSARShort } from '@/lib/currency';
import { AlertTriangle, TrendingDown, Filter, Download, FileText, Printer, Search, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const currentYear = new Date().getFullYear();

export default function CostCenterVariance() {
  const [filters, setFilters] = useState<CCFilters>({
    companyIds: [], branchId: '', costCenterId: '', departmentId: '',
    projectId: '', fiscalYear: String(currentYear),
    dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    accountRange: '', includeUnposted: false,
  });
  const [generated, setGenerated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [threshold, setThreshold] = useState(10);
  useDefaultReportCompanyIds(setFilters);

  const data = useCostCenterReportData(filters, generated);

  const varianceCCs = useMemo(() => {
    return data.costCenters
      .filter(cc => cc.budget > 0)
      .map(cc => ({ ...cc, absVariancePct: Math.abs(cc.variancePct) }))
      .filter(cc => !searchTerm || cc.name.toLowerCase().includes(searchTerm.toLowerCase()) || cc.code.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.variance - b.variance);
  }, [data.costCenters, searchTerm]);

  const overThreshold = varianceCCs.filter(cc => cc.absVariancePct >= threshold);

  const chartData = varianceCCs.slice(0, 20).map(cc => ({
    name: cc.code, fullName: cc.name, variance: cc.variance, variancePct: cc.variancePct,
  }));

  const handleExportExcel = useCallback(() => {
    const rows = varianceCCs.map(cc => ({
      'Code': cc.code, 'Name': cc.name, 'Budget': cc.budget, 'Actual': cc.actual,
      'Variance': cc.variance, 'Variance %': cc.variancePct.toFixed(1),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Variance');
    XLSX.writeFile(wb, `CC_Variance_${filters.fiscalYear}.xlsx`);
  }, [varianceCCs, filters]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1600px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cost Center Variance Report</h1>
          <p className="text-sm text-muted-foreground">Identify budget deviations and overspending by cost center</p>
        </div>
        {generated && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div><Label className="text-xs">Companies</Label><CompanyMultiSelect selectedIds={filters.companyIds} onChange={v => setFilters(f => ({ ...f, companyIds: v }))} /></div>
            <div><Label className="text-xs">Fiscal Year</Label><Input value={filters.fiscalYear} onChange={e => setFilters(f => ({ ...f, fiscalYear: e.target.value }))} /></div>
            <div><Label className="text-xs">Date From</Label><Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} /></div>
            <div><Label className="text-xs">Date To</Label><Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} /></div>
            <div><Label className="text-xs">Threshold %</Label><Input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} /></div>
            <div className="flex items-end"><Button className="w-full" onClick={() => setGenerated(true)}><Filter className="h-4 w-4 mr-1" />Generate</Button></div>
          </div>
        </CardContent>
      </Card>

      {generated && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label={`Exceeding ${threshold}% Threshold`} value={String(overThreshold.length)} subtitle={`of ${varianceCCs.length} with budget`} />
            <KPICard icon={<TrendingDown className="h-4 w-4 text-chart-4" />} label="Worst Variance" value={varianceCCs.length > 0 ? `SAR ${formatSARShort(varianceCCs[0]?.variance || 0)}` : '-'} subtitle={varianceCCs[0]?.name || ''} />
            <KPICard icon={<BarChart3 className="h-4 w-4 text-chart-2" />} label="Total Over Budget" value={`SAR ${formatSARShort(varianceCCs.filter(c => c.variance < 0).reduce((s, c) => s + Math.abs(c.variance), 0))}`} />
            <KPICard icon={<BarChart3 className="h-4 w-4 text-chart-1" />} label="Total Under Budget" value={`SAR ${formatSARShort(varianceCCs.filter(c => c.variance > 0).reduce((s, c) => s + c.variance, 0))}`} />
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Variance Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatSARShort(v)} />
                  <Tooltip formatter={(v: number) => `SAR ${formatSAR(v)}`} labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l} />
                  <ReferenceLine y={0} className="stroke-border" />
                  <Bar dataKey="variance" radius={[4, 4, 0, 0]}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.variance < 0 ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-2))'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Variance Detail</CardTitle>
                <div className="relative w-64"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" /></div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Code</TableHead><TableHead>Name</TableHead>
                    <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead><TableHead className="text-right">Var %</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {varianceCCs.map(cc => {
                      const over = cc.variance < 0;
                      const flag = cc.absVariancePct >= threshold;
                      return (
                        <TableRow key={cc.code} className={flag ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-mono text-xs">{cc.code}</TableCell>
                          <TableCell className="font-medium">{cc.name}</TableCell>
                          <TableCell className="text-right">SAR {formatSAR(cc.budget)}</TableCell>
                          <TableCell className="text-right">SAR {formatSAR(cc.actual)}</TableCell>
                          <TableCell className={`text-right font-medium ${over ? 'text-destructive' : 'text-chart-2'}`}>SAR {formatSAR(cc.variance)}</TableCell>
                          <TableCell className={`text-right ${over ? 'text-destructive' : ''}`}>{cc.variancePct.toFixed(1)}%</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={over ? 'destructive' : 'secondary'} className="text-[10px]">{over ? 'Over' : 'Under'}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {varianceCCs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No budgeted cost centers found.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
