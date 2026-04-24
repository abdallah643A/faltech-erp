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
import { Search, RefreshCw, Loader2, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';

export default function PriceLists() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: priceLists, isLoading } = useQuery({
    queryKey: ['priceLists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .order('price_list_code');
      if (error) throw error;
      return data;
    },
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sap-sync', {
        body: { action: 'sync', entity: 'price_list', direction: 'from_sap' },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: language === 'ar' ? 'تمت المزامنة' : 'Sync Complete', description: `Synced: ${data.synced || 0}, Created: ${data.created || 0}` });
        queryClient.invalidateQueries({ queryKey: ['priceLists'] });
      } else {
        toast({ title: 'Sync Failed', description: data?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Sync Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const preFiltered = (priceLists || []).filter(p =>
    p.price_list_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(p.price_list_code).includes(searchQuery)
  );

  const plFilterKeys = ['price_list_code', 'price_list_name', 'currency'] as const;
  const { filters: colFilters, setFilter: setColFilter, filteredData: colFiltered } = useColumnFilters(preFiltered, plFilterKeys as any);
  const { sortedData: filtered, handleSort, getSortDirection } = useColumnSort(colFiltered);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'قوائم الأسعار' : 'Price Lists'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'قوائم الأسعار من SAP B1' : 'Price lists synced from SAP B1'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              <DollarSign className="h-5 w-5" />
              <CardTitle>{language === 'ar' ? 'قوائم الأسعار' : 'Price Lists'}</CardTitle>
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
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" />{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد قوائم أسعار.' : 'No price lists found. Sync from SAP first.'}</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <FilterableTableHead sortKey="price_list_code" sortDirection={getSortDirection('price_list_code')} onSort={handleSort} filterValue={colFilters['price_list_code'] || ''} onFilterChange={v => setColFilter('price_list_code', v)}>{language === 'ar' ? 'الرمز' : 'Code'}</FilterableTableHead>
                    <FilterableTableHead sortKey="price_list_name" sortDirection={getSortDirection('price_list_name')} onSort={handleSort} filterValue={colFilters['price_list_name'] || ''} onFilterChange={v => setColFilter('price_list_name', v)}>{language === 'ar' ? 'الاسم' : 'Name'}</FilterableTableHead>
                    <FilterableTableHead sortKey="currency" sortDirection={getSortDirection('currency')} onSort={handleSort} filterValue={colFilters['currency'] || ''} onFilterChange={v => setColFilter('currency', v)}>{language === 'ar' ? 'العملة' : 'Currency'}</FilterableTableHead>
                    <FilterableTableHead sortKey="base_price_list" sortDirection={getSortDirection('base_price_list')} onSort={handleSort}>{language === 'ar' ? 'القائمة الأساسية' : 'Base List'}</FilterableTableHead>
                    <FilterableTableHead sortKey="factor" sortDirection={getSortDirection('factor')} onSort={handleSort}>{language === 'ar' ? 'المعامل' : 'Factor'}</FilterableTableHead>
                    <FilterableTableHead sortKey="is_active" sortDirection={getSortDirection('is_active')} onSort={handleSort}>{language === 'ar' ? 'الحالة' : 'Status'}</FilterableTableHead>
                    <TableHead>{language === 'ar' ? 'آخر مزامنة' : 'Last Synced'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((pl) => (
                    <TableRow key={pl.id}>
                      <TableCell className="font-mono">{pl.price_list_code}</TableCell>
                      <TableCell>{pl.price_list_name}</TableCell>
                      <TableCell>{pl.currency || 'SAR'}</TableCell>
                      <TableCell>{pl.base_price_list ?? '-'}</TableCell>
                      <TableCell>{pl.factor ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={pl.is_active ? 'default' : 'secondary'}>
                          {pl.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {pl.sap_synced_at ? new Date(pl.sap_synced_at).toLocaleString() : '-'}
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
