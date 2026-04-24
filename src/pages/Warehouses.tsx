import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilterableTableHead, useColumnFilters, useColumnSort } from '@/components/ui/filterable-table-head';
import { Search, RefreshCw, Loader2, Warehouse, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';

const whColumns: ColumnDef[] = [
  { key: 'warehouse_code', header: 'Code' },
  { key: 'warehouse_name', header: 'Name' },
  { key: 'branch', header: 'Branch' },
  { key: 'location', header: 'Location' },
  { key: 'is_active', header: 'Active' },
];

export default function Warehouses() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('warehouse_code');
      if (error) throw error;
      return data;
    },
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sap-sync', {
        body: { action: 'sync', entity: 'warehouse', direction: 'from_sap' },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: language === 'ar' ? 'تمت المزامنة' : 'Sync Complete', description: `Synced: ${data.synced || 0}, Created: ${data.created || 0}` });
        queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      } else {
        toast({ title: 'Sync Failed', description: data?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Sync Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const preFiltered = (warehouses || []).filter(w =>
    w.warehouse_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.warehouse_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const whFilterKeys = ['warehouse_code', 'warehouse_name', 'location', 'branch_code'] as const;
  const { filters: colFilters, setFilter: setColFilter, filteredData: colFiltered } = useColumnFilters(preFiltered, whFilterKeys as any);
  const { sortedData: filtered, handleSort, getSortDirection } = useColumnSort(colFiltered);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'المستودعات' : 'Warehouses'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'بيانات المستودعات من SAP B1' : 'Warehouse master data from SAP B1'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons
            data={filtered}
            columns={whColumns}
            filename="warehouses"
            title="Warehouses"
          />
          <SAPSyncButton entity="item" />
          <ClearAllButton tableName="warehouses" displayName="Warehouses" queryKeys={['warehouses']} />
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
              <Warehouse className="h-5 w-5" />
              <CardTitle>{language === 'ar' ? 'المستودعات' : 'Warehouses'}</CardTitle>
            </div>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'ar' ? 'بحث...' : 'Search warehouses...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'لا توجد مستودعات. قم بالمزامنة من SAP أولاً.' : 'No warehouses found. Sync from SAP first.'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                     <FilterableTableHead sortKey="warehouse_code" sortDirection={getSortDirection('warehouse_code')} onSort={handleSort} filterValue={colFilters['warehouse_code'] || ''} onFilterChange={v => setColFilter('warehouse_code', v)}>{language === 'ar' ? 'رمز المستودع' : 'Code'}</FilterableTableHead>
                    <FilterableTableHead sortKey="warehouse_name" sortDirection={getSortDirection('warehouse_name')} onSort={handleSort} filterValue={colFilters['warehouse_name'] || ''} onFilterChange={v => setColFilter('warehouse_name', v)}>{language === 'ar' ? 'اسم المستودع' : 'Name'}</FilterableTableHead>
                    <FilterableTableHead sortKey="location" sortDirection={getSortDirection('location')} onSort={handleSort} filterValue={colFilters['location'] || ''} onFilterChange={v => setColFilter('location', v)}>{language === 'ar' ? 'الموقع' : 'Location'}</FilterableTableHead>
                    <FilterableTableHead sortKey="branch_code" sortDirection={getSortDirection('branch_code')} onSort={handleSort} filterValue={colFilters['branch_code'] || ''} onFilterChange={v => setColFilter('branch_code', v)}>{language === 'ar' ? 'الفرع' : 'Branch'}</FilterableTableHead>
                    <FilterableTableHead sortKey="is_active" sortDirection={getSortDirection('is_active')} onSort={handleSort} className="text-center">{language === 'ar' ? 'نشط' : 'Active'}</FilterableTableHead>
                    <TableHead>{language === 'ar' ? 'آخر مزامنة' : 'Last Synced'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell className="font-mono text-sm">{wh.warehouse_code}</TableCell>
                      <TableCell>{wh.warehouse_name}</TableCell>
                      <TableCell>{wh.location || '-'}</TableCell>
                      <TableCell>{wh.branch_code || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={wh.is_active ? 'default' : 'secondary'}>
                          {wh.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {wh.sap_synced_at ? new Date(wh.sap_synced_at).toLocaleString() : '-'}
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
