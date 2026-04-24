import { useState, useMemo } from 'react';
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
import { Shield, Filter, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

const currentYear = new Date().getFullYear();

export default function ConsolidatedTB() {
  const [filters, setFilters] = useState<ConsolidationFilters>({
    companyIds: [], fiscalYear: String(currentYear),
    dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    includeEliminations: true, includeAdjustments: true, accountRange: '',
  });
  const [generated, setGenerated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  useDefaultReportCompanyIds(setFilters);
  const data = useConsolidationData(filters, generated);

  const accountRows = useMemo(() => {
    const accts = Object.values(data.consolidated.accounts);
    return accts
      .filter(a => !searchTerm || a.code.includes(searchTerm) || a.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [data.consolidated.accounts, searchTerm]);

  const balanced = Math.abs(data.consolidated.trialDebit - data.consolidated.trialCredit) < 0.01;

  const handleExport = () => {
    const rows = accountRows.map(a => {
      const row: Record<string, any> = { 'Account Code': a.code, 'Account Name': a.name };
      data.entities.forEach(e => {
        const ea = e.accounts[a.code];
        row[`${e.companyName} Dr`] = ea?.debit || 0;
        row[`${e.companyName} Cr`] = ea?.credit || 0;
      });
      row['Consol Debit'] = a.debit;
      row['Consol Credit'] = a.credit;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
    XLSX.writeFile(wb, `Consolidated_TB_${filters.fiscalYear}.xlsx`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1600px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Consolidated Trial Balance</h1>
          <p className="text-sm text-muted-foreground">Multi-entity trial balance with entity columns</p>
        </div>
        {generated && <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Excel</Button>}
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
          <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${balanced ? 'bg-chart-2/10 border-chart-2/30' : 'bg-destructive/10 border-destructive/30'}`}>
            <Shield className={`h-4 w-4 ${balanced ? 'text-chart-2' : 'text-destructive'}`} />
            <span className="font-medium">
              Total Debit: SAR {formatSAR(data.consolidated.trialDebit)} | Total Credit: SAR {formatSAR(data.consolidated.trialCredit)}
              {balanced ? ' ✓ Balanced' : ' ⚠ Imbalanced'}
            </span>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Account Detail</CardTitle>
                <div className="relative w-64"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search account..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" /></div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    {data.entities.map(e => (
                      <TableHead key={e.companyId} className="text-right" colSpan={1}>{e.companyName}</TableHead>
                    ))}
                    <TableHead className="text-right bg-muted/30">Consol Debit</TableHead>
                    <TableHead className="text-right bg-muted/30">Consol Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountRows.map(a => (
                    <TableRow key={a.code}>
                      <TableCell className="font-mono text-xs">{a.code}</TableCell>
                      <TableCell className="text-xs">{a.name}</TableCell>
                      {data.entities.map(e => {
                        const ea = e.accounts[a.code];
                        const net = (ea?.debit || 0) - (ea?.credit || 0);
                        return <TableCell key={e.companyId} className="text-right text-xs">{net !== 0 ? formatSAR(net) : '-'}</TableCell>;
                      })}
                      <TableCell className="text-right bg-muted/10 font-mono text-xs">{a.debit > 0 ? formatSAR(a.debit) : '-'}</TableCell>
                      <TableCell className="text-right bg-muted/10 font-mono text-xs">{a.credit > 0 ? formatSAR(a.credit) : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {accountRows.length === 0 && <TableRow><TableCell colSpan={4 + data.entities.length} className="text-center text-muted-foreground py-8">No data found.</TableCell></TableRow>}
                  {accountRows.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell></TableCell><TableCell>TOTAL</TableCell>
                      {data.entities.map(e => <TableCell key={e.companyId} className="text-right">{formatSAR(e.trialDebit - e.trialCredit)}</TableCell>)}
                      <TableCell className="text-right bg-muted/30">{formatSAR(data.consolidated.trialDebit)}</TableCell>
                      <TableCell className="text-right bg-muted/30">{formatSAR(data.consolidated.trialCredit)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
