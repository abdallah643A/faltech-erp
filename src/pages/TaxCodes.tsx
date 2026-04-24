import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilterableTableHead, useColumnFilters, useColumnSort } from '@/components/ui/filterable-table-head';
import { Search, RefreshCw, Loader2, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';

const taxColumns: ColumnDef[] = [
  { key: 'tax_code', header: 'Code' },
  { key: 'tax_name', header: 'Name' },
  { key: 'rate', header: 'Rate %' },
  { key: 'category', header: 'Category' },
  { key: 'account_code', header: 'Account' },
  { key: 'is_active', header: 'Active' },
];

export default function TaxCodes() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: taxCodes, isLoading } = useQuery({
    queryKey: ['taxCodes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tax_codes').select('*').order('tax_code');
      if (error) throw error;
      return data;
    },
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sap-sync', {
        body: { action: 'sync', entity: 'tax_code', direction: 'from_sap' },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: 'Sync Complete', description: `Synced: ${data.synced || 0}, Created: ${data.created || 0}` });
        queryClient.invalidateQueries({ queryKey: ['taxCodes'] });
      } else {
        toast({ title: 'Sync Failed', description: data?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Sync Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const preFiltered = (taxCodes || []).filter(t =>
    t.tax_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tax_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tcFilterKeys = ['tax_code', 'tax_name', 'category', 'account_code'] as const;
  const { filters: colFilters, setFilter: setColFilter, filteredData: colFiltered } = useColumnFilters(preFiltered, tcFilterKeys as any);
  const { sortedData: filtered, handleSort, getSortDirection } = useColumnSort(colFiltered);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'أكواد الضريبة' : 'Tax Codes'}</h1>
          <p className="text-muted-foreground">{language === 'ar' ? 'أكواد الضريبة من SAP B1' : 'Tax codes synced from SAP B1'}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons
            data={filtered}
            columns={taxColumns}
            filename="tax-codes"
            title="Tax Codes"
          />
          <SAPSyncButton entity="item" />
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {language === 'ar' ? 'مزامنة من SAP' : 'Sync from SAP'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              <CardTitle>{language === 'ar' ? 'أكواد الضريبة' : 'Tax Codes'}</CardTitle>
            </div>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={language === 'ar' ? 'بحث...' : 'Search...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tax codes found. Sync from SAP first.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <FilterableTableHead sortKey="tax_code" sortDirection={getSortDirection('tax_code')} onSort={handleSort} filterValue={colFilters['tax_code'] || ''} onFilterChange={v => setColFilter('tax_code', v)}>{language === 'ar' ? 'الرمز' : 'Code'}</FilterableTableHead>
                    <FilterableTableHead sortKey="tax_name" sortDirection={getSortDirection('tax_name')} onSort={handleSort} filterValue={colFilters['tax_name'] || ''} onFilterChange={v => setColFilter('tax_name', v)}>{language === 'ar' ? 'الاسم' : 'Name'}</FilterableTableHead>
                    <FilterableTableHead sortKey="rate" sortDirection={getSortDirection('rate')} onSort={handleSort}>{language === 'ar' ? 'النسبة' : 'Rate %'}</FilterableTableHead>
                    <FilterableTableHead sortKey="category" sortDirection={getSortDirection('category')} onSort={handleSort} filterValue={colFilters['category'] || ''} onFilterChange={v => setColFilter('category', v)}>{language === 'ar' ? 'الفئة' : 'Category'}</FilterableTableHead>
                    <FilterableTableHead sortKey="account_code" sortDirection={getSortDirection('account_code')} onSort={handleSort} filterValue={colFilters['account_code'] || ''} onFilterChange={v => setColFilter('account_code', v)}>{language === 'ar' ? 'الحساب' : 'Account'}</FilterableTableHead>
                    <FilterableTableHead sortKey="is_active" sortDirection={getSortDirection('is_active')} onSort={handleSort}>{language === 'ar' ? 'الحالة' : 'Status'}</FilterableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tc) => (
                    <TableRow key={tc.id}>
                      <TableCell className="font-mono">{tc.tax_code}</TableCell>
                      <TableCell>{tc.tax_name}</TableCell>
                      <TableCell>{tc.rate}%</TableCell>
                      <TableCell>{tc.category || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{tc.account_code || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={tc.is_active ? 'default' : 'secondary'}>{tc.is_active ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
