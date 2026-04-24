import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KPICard } from '@/components/ui/kpi-card';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import { useConsolidationData, type ConsolidationFilters } from '@/hooks/useConsolidationData';
import { formatSAR, formatSARShort } from '@/lib/currency';
import { DollarSign, BarChart3, Shield, Filter, Download, FileText, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const currentYear = new Date().getFullYear();

export default function ConsolidatedBS() {
  const [filters, setFilters] = useState<ConsolidationFilters>({
    companyIds: [], fiscalYear: String(currentYear),
    dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    includeEliminations: true, includeAdjustments: true, accountRange: '',
  });
  const [generated, setGenerated] = useState(false);
  useDefaultReportCompanyIds(setFilters);
  const data = useConsolidationData(filters, generated);

  const lineItems = [
    { label: 'Total Assets', key: 'totalAssets' as const, bold: true },
    { label: 'Total Liabilities', key: 'totalLiabilities' as const, bold: true },
    { label: 'Total Equity', key: 'totalEquity' as const, bold: true },
  ];

  const balanced = Math.abs(data.consolidated.totalAssets - data.consolidated.totalLiabilities - data.consolidated.totalEquity) < 0.01;

  const handleExport = () => {
    const rows = lineItems.map(li => {
      const row: Record<string, any> = { 'Line Item': li.label };
      data.entities.forEach(e => { row[e.companyName] = e[li.key]; });
      row['Consolidated'] = data.consolidated[li.key];
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
    XLSX.writeFile(wb, `Consolidated_BS_${filters.fiscalYear}.xlsx`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1600px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Consolidated Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">Multi-entity statement of financial position</p>
        </div>
        {generated && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Excel</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><Label className="text-xs">Companies</Label><CompanyMultiSelect selectedIds={filters.companyIds} onChange={v => setFilters(f => ({ ...f, companyIds: v }))} /></div>
            <div><Label className="text-xs">Fiscal Year</Label><Input value={filters.fiscalYear} onChange={e => setFilters(f => ({ ...f, fiscalYear: e.target.value }))} /></div>
            <div><Label className="text-xs">Date From</Label><Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} /></div>
            <div><Label className="text-xs">Date To</Label><Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} /></div>
            <div className="flex items-end"><Button className="w-full" onClick={() => setGenerated(true)}><Filter className="h-4 w-4 mr-1" />Generate</Button></div>
          </div>
        </CardContent>
      </Card>

      {generated && (
        <>
          {/* Balance Proof */}
          <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${balanced ? 'bg-chart-2/10 border-chart-2/30' : 'bg-destructive/10 border-destructive/30'}`}>
            <Shield className={`h-4 w-4 ${balanced ? 'text-chart-2' : 'text-destructive'}`} />
            <span className="font-medium">{balanced ? 'Balance Proof: Assets = Liabilities + Equity ✓' : 'Warning: Balance sheet is not balanced'}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard icon={<BarChart3 className="h-4 w-4 text-primary" />} label="Total Assets" value={`SAR ${formatSARShort(data.consolidated.totalAssets)}`} />
            <KPICard icon={<DollarSign className="h-4 w-4 text-chart-4" />} label="Total Liabilities" value={`SAR ${formatSARShort(data.consolidated.totalLiabilities)}`} />
            <KPICard icon={<DollarSign className="h-4 w-4 text-chart-2" />} label="Total Equity" value={`SAR ${formatSARShort(data.consolidated.totalEquity)}`} />
            <KPICard icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} label="Working Capital" value={`SAR ${formatSARShort(data.consolidated.totalAssets - data.consolidated.totalLiabilities)}`} />
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Line Item</TableHead>
                    {data.entities.map(e => <TableHead key={e.companyId} className="text-right min-w-[140px]">{e.companyName}</TableHead>)}
                    <TableHead className="text-right min-w-[160px] bg-muted/30">Consolidated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map(li => (
                    <TableRow key={li.key} className="bg-muted/20 font-bold">
                      <TableCell className="font-bold">{li.label}</TableCell>
                      {data.entities.map(e => <TableCell key={e.companyId} className="text-right">SAR {formatSAR(e[li.key])}</TableCell>)}
                      <TableCell className="text-right bg-muted/30 font-bold">SAR {formatSAR(data.consolidated[li.key])}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell className="font-bold">Liabilities + Equity</TableCell>
                    {data.entities.map(e => <TableCell key={e.companyId} className="text-right font-medium">SAR {formatSAR(e.totalLiabilities + e.totalEquity)}</TableCell>)}
                    <TableCell className="text-right bg-muted/30 font-bold">SAR {formatSAR(data.consolidated.totalLiabilities + data.consolidated.totalEquity)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
