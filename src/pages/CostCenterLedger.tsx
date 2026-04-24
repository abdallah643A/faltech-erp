import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { PLDrillDownDialog } from '@/components/finance/pl/PLDrillDownDialog';
import { useCostCenterReportData, type CCFilters } from '@/hooks/useCostCenterReportData';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import { formatSAR } from '@/lib/currency';
import { Filter, Download, BookOpen, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

const currentYear = new Date().getFullYear();

export default function CostCenterLedger() {
  const [filters, setFilters] = useState<CCFilters>({
    companyIds: [], branchId: '', costCenterId: '', departmentId: '',
    projectId: '', fiscalYear: String(currentYear),
    dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    accountRange: '', includeUnposted: false,
  });
  const [generated, setGenerated] = useState(false);
  const [selectedCC, setSelectedCC] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [drillDown, setDrillDown] = useState<{ open: boolean; acctCode: string; acctName: string }>({ open: false, acctCode: '', acctName: '' });
  useDefaultReportCompanyIds(setFilters);

  const data = useCostCenterReportData(filters, generated);

  const selectedCCData = useMemo(() => {
    if (!selectedCC) return null;
    return data.costCenters.find(cc => cc.code === selectedCC) || null;
  }, [data.costCenters, selectedCC]);

  const filteredAccounts = useMemo(() => {
    if (!selectedCCData) return [];
    return selectedCCData.accounts.filter(a =>
      !searchTerm || a.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) || a.accountName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [selectedCCData, searchTerm]);

  const handleExport = () => {
    if (!selectedCCData) return;
    const rows = filteredAccounts.map(a => ({
      'Account Code': a.accountCode, 'Account Name': a.accountName,
      'Debit': a.actual > 0 ? a.actual : 0, 'Credit': a.actual < 0 ? Math.abs(a.actual) : 0,
      'Net': a.actual,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CC Ledger');
    XLSX.writeFile(wb, `CC_Ledger_${selectedCC}_${filters.fiscalYear}.xlsx`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1600px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cost Center Detailed Ledger</h1>
          <p className="text-sm text-muted-foreground">Transaction-level view by cost center and account</p>
        </div>
        {selectedCCData && <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export</Button>}
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><Label className="text-xs">Companies</Label><CompanyMultiSelect selectedIds={filters.companyIds} onChange={v => setFilters(f => ({ ...f, companyIds: v }))} /></div>
            <div><Label className="text-xs">Date From</Label><Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} /></div>
            <div><Label className="text-xs">Date To</Label><Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} /></div>
            <div><Label className="text-xs">Cost Center</Label>
              <Select value={selectedCC || 'none'} onValueChange={v => setSelectedCC(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select cost center" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {data.costCenters.map(cc => <SelectItem key={cc.code} value={cc.code}>{cc.code} - {cc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><Button className="w-full" onClick={() => setGenerated(true)}><Filter className="h-4 w-4 mr-1" />Generate</Button></div>
          </div>
        </CardContent>
      </Card>

      {generated && selectedCCData && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Cost Center</p>
              <p className="text-lg font-bold">{selectedCCData.code}</p>
              <p className="text-sm text-muted-foreground">{selectedCCData.name}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Total Actual</p>
              <p className="text-lg font-bold">SAR {formatSAR(selectedCCData.actual)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="text-lg font-bold">{selectedCCData.budget > 0 ? `SAR ${formatSAR(selectedCCData.budget)}` : 'Not set'}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Accounts</p>
              <p className="text-lg font-bold">{selectedCCData.accounts.length}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />Account Breakdown — {selectedCCData.code}</CardTitle>
                <div className="relative w-64"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search account..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" /></div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Account Code</TableHead><TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead><TableHead className="text-center">Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredAccounts.map(a => (
                      <TableRow key={a.accountCode} className="hover:bg-accent/30">
                        <TableCell className="font-mono text-xs">{a.accountCode}</TableCell>
                        <TableCell>{a.accountName}</TableCell>
                        <TableCell className="text-right">{a.actual > 0 ? `SAR ${formatSAR(a.actual)}` : '-'}</TableCell>
                        <TableCell className="text-right">{a.actual < 0 ? `SAR ${formatSAR(Math.abs(a.actual))}` : '-'}</TableCell>
                        <TableCell className="text-right font-medium">SAR {formatSAR(a.actual)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setDrillDown({ open: true, acctCode: a.accountCode, acctName: a.accountName })}>
                            Drill Down
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAccounts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No accounts found.</TableCell></TableRow>}
                    {filteredAccounts.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell></TableCell><TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">SAR {formatSAR(filteredAccounts.filter(a => a.actual > 0).reduce((s, a) => s + a.actual, 0))}</TableCell>
                        <TableCell className="text-right">SAR {formatSAR(Math.abs(filteredAccounts.filter(a => a.actual < 0).reduce((s, a) => s + a.actual, 0)))}</TableCell>
                        <TableCell className="text-right">SAR {formatSAR(filteredAccounts.reduce((s, a) => s + a.actual, 0))}</TableCell>
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

      {generated && !selectedCC && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select a cost center above to view its detailed ledger.</CardContent></Card>
      )}

      <PLDrillDownDialog open={drillDown.open} onOpenChange={o => setDrillDown(d => ({ ...d, open: o }))} acctCode={drillDown.acctCode} acctName={drillDown.acctName} companyIds={filters.companyIds} dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
    </div>
  );
}
