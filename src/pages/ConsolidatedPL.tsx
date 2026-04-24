import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KPICard } from '@/components/ui/kpi-card';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import { useConsolidationData, type ConsolidationFilters } from '@/hooks/useConsolidationData';
import { formatSAR, formatSARShort } from '@/lib/currency';
import { DollarSign, TrendingUp, Filter, Download, FileText, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const currentYear = new Date().getFullYear();

export default function ConsolidatedPL() {
  const [filters, setFilters] = useState<ConsolidationFilters>({
    companyIds: [], fiscalYear: String(currentYear),
    dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    includeEliminations: true, includeAdjustments: true, accountRange: '',
  });
  const [generated, setGenerated] = useState(false);
  useDefaultReportCompanyIds(setFilters);
  const data = useConsolidationData(filters, generated);

  const lineItems = [
    { label: 'Revenue', key: 'revenue' as const, bold: false },
    { label: 'Cost of Goods Sold', key: 'cogs' as const, bold: false },
    { label: 'Gross Profit', key: 'grossProfit' as const, bold: true },
    { label: 'Operating Expenses', key: 'operatingExpenses' as const, bold: false },
    { label: 'Net Profit', key: 'netProfit' as const, bold: true },
  ];

  const handleExportExcel = () => {
    const rows = lineItems.map(li => {
      const row: Record<string, any> = { 'Line Item': li.label };
      data.entities.forEach(e => { row[e.companyName] = e[li.key]; });
      row['Consolidated'] = data.consolidated[li.key];
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidated P&L');
    XLSX.writeFile(wb, `Consolidated_PL_${filters.fiscalYear}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16); doc.text('Consolidated Profit & Loss', 14, 15);
    doc.setFontSize(10); doc.text(`${filters.dateFrom} to ${filters.dateTo}`, 14, 22);
    const cols = ['Line Item', ...data.entities.map(e => e.companyName), 'Consolidated'];
    const rows = lineItems.map(li => [li.label, ...data.entities.map(e => formatSAR(e[li.key])), formatSAR(data.consolidated[li.key])]);
    autoTable(doc, { startY: 28, head: [cols], body: rows, styles: { fontSize: 7 } });
    doc.save(`Consolidated_PL_${filters.fiscalYear}.pdf`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1600px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Consolidated Profit & Loss</h1>
          <p className="text-sm text-muted-foreground">Multi-entity income statement with entity columns</p>
        </div>
        {generated && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="h-4 w-4 mr-1" />PDF</Button>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard icon={<DollarSign className="h-4 w-4 text-primary" />} label="Revenue" value={`SAR ${formatSARShort(data.consolidated.revenue)}`} />
            <KPICard icon={<TrendingUp className="h-4 w-4 text-chart-2" />} label="Gross Profit" value={`SAR ${formatSARShort(data.consolidated.grossProfit)}`} subtitle={data.consolidated.revenue > 0 ? `${((data.consolidated.grossProfit / data.consolidated.revenue) * 100).toFixed(1)}% margin` : ''} />
            <KPICard icon={<TrendingUp className="h-4 w-4 text-chart-1" />} label="Net Profit" value={`SAR ${formatSARShort(data.consolidated.netProfit)}`} />
            <KPICard icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} label="Entities" value={String(data.entities.length)} />
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
                    <TableRow key={li.key} className={li.bold ? 'bg-muted/30 font-bold' : ''}>
                      <TableCell className={li.bold ? 'font-bold' : ''}>{li.label}</TableCell>
                      {data.entities.map(e => <TableCell key={e.companyId} className="text-right">SAR {formatSAR(e[li.key])}</TableCell>)}
                      <TableCell className="text-right bg-muted/20 font-bold">SAR {formatSAR(data.consolidated[li.key])}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
