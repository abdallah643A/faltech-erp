import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FilterableTableHead, useColumnFilters, useColumnSort } from '@/components/ui/filterable-table-head';
import { Search, RefreshCw, Loader2, Hash, Lock, Unlock } from 'lucide-react';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { useToast } from '@/hooks/use-toast';

/** Human-readable labels for SAP object codes */
const OBJECT_CODE_LABELS: Record<string, string> = {
  '2': 'Business Partners',
  '13': 'AR Invoices',
  '14': 'Credit Notes',
  '15': 'Delivery Notes',
  '17': 'Sales Orders',
  '18': 'AP Invoices',
  '20': 'Goods Receipts PO',
  '21': 'Inventory Gen. Exits',
  '22': 'Purchase Orders',
  '23': 'Sales Quotations',
  '24': 'Incoming Payments',
  '30': 'Journal Entries',
  '1470000113': 'Purchase Requests',
  '540000006': 'Purchase Quotations',
};

function getObjectLabel(code: string): string {
  return OBJECT_CODE_LABELS[code] || code;
}

interface NumberingSeries {
  id: string;
  series: number;
  series_name: string;
  prefix: string | null;
  first_no: number | null;
  next_no: number | null;
  last_no: number | null;
  object_code: string;
  document_sub_type: string | null;
  is_default: boolean;
  locked: boolean;
  group_code: string | null;
  remarks: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export default function NumberingSeries() {
  const { direction } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterObject, setFilterObject] = useState('all');
  const { sync, isLoading: isSyncing } = useSAPSync();

  const { data: series, isLoading, refetch } = useQuery({
    queryKey: ['numbering-series'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('numbering_series')
        .select('*')
        .order('object_code')
        .order('series');
      if (error) throw error;
      return data as NumberingSeries[];
    },
  });

  const handlePullFromSAP = async () => {
    const result = await sync('numbering_series' as any, 'from_sap');
    if (result.success) refetch();
  };

  const preFilteredSeries = series?.filter(s => {
    const matchesSearch =
      s.series_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.prefix || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.object_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterObject === 'all' || s.object_code === filterObject;
    return matchesSearch && matchesFilter;
  }) || [];

  const nsFilterKeys: (keyof NumberingSeries)[] = ['series_name', 'prefix', 'object_code', 'document_sub_type'];
  const { filters: colFilters, setFilter: setColFilter, filteredData: colFilteredSeries } = useColumnFilters(preFilteredSeries, nsFilterKeys);
  const { sortedData: filteredSeries, handleSort, getSortDirection } = useColumnSort(colFilteredSeries);

  const objectCodes = [...new Set(series?.map(s => s.object_code) || [])];

  const stats = {
    total: series?.length || 0,
    active: series?.filter(s => !s.locked).length || 0,
    locked: series?.filter(s => s.locked).length || 0,
    defaults: series?.filter(s => s.is_default).length || 0,
  };

  return (
    <div className="space-y-6" dir={direction}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Numbering Series</h1>
          <p className="text-muted-foreground">Manage document numbering series from SAP B1 (NNM1)</p>
        </div>
        <Button onClick={handlePullFromSAP} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Pull from SAP
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Series</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Hash className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">{stats.active}</p>
              </div>
              <Unlock className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Locked</p>
                <p className="text-2xl font-bold text-destructive">{stats.locked}</p>
              </div>
              <Lock className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Default Series</p>
                <p className="text-2xl font-bold text-primary">{stats.defaults}</p>
              </div>
              <Hash className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterObject}
          onChange={(e) => setFilterObject(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Objects</option>
          {objectCodes.map(code => (
            <option key={code} value={code}>{getObjectLabel(code)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Hash className="h-12 w-12 mx-auto mb-2" />
              <p>No numbering series found. Pull from SAP to load series data.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <FilterableTableHead sortKey="series" sortDirection={getSortDirection('series')} onSort={handleSort}>Series</FilterableTableHead>
                  <FilterableTableHead sortKey="series_name" sortDirection={getSortDirection('series_name')} onSort={handleSort} filterValue={colFilters['series_name'] || ''} onFilterChange={v => setColFilter('series_name', v)}>Name</FilterableTableHead>
                  <FilterableTableHead sortKey="prefix" sortDirection={getSortDirection('prefix')} onSort={handleSort} filterValue={colFilters['prefix'] || ''} onFilterChange={v => setColFilter('prefix', v)}>Prefix</FilterableTableHead>
                  <FilterableTableHead sortKey="object_code" sortDirection={getSortDirection('object_code')} onSort={handleSort} filterValue={colFilters['object_code'] || ''} onFilterChange={v => setColFilter('object_code', v)}>Object</FilterableTableHead>
                  <FilterableTableHead sortKey="document_sub_type" sortDirection={getSortDirection('document_sub_type')} onSort={handleSort} filterValue={colFilters['document_sub_type'] || ''} onFilterChange={v => setColFilter('document_sub_type', v)}>Sub Type</FilterableTableHead>
                  <FilterableTableHead sortKey="first_no" sortDirection={getSortDirection('first_no')} onSort={handleSort}>First No</FilterableTableHead>
                  <FilterableTableHead sortKey="next_no" sortDirection={getSortDirection('next_no')} onSort={handleSort}>Next No</FilterableTableHead>
                  <FilterableTableHead sortKey="last_no" sortDirection={getSortDirection('last_no')} onSort={handleSort}>Last No</FilterableTableHead>
                  <FilterableTableHead sortKey="is_default" sortDirection={getSortDirection('is_default')} onSort={handleSort}>Default</FilterableTableHead>
                  <FilterableTableHead sortKey="locked" sortDirection={getSortDirection('locked')} onSort={handleSort}>Status</FilterableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSeries.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-medium">{s.series}</TableCell>
                    <TableCell className="font-medium">{s.series_name}</TableCell>
                    <TableCell>
                      {s.prefix ? <Badge variant="outline">{s.prefix}</Badge> : '-'}
                    </TableCell>
                    <TableCell>{getObjectLabel(s.object_code)}</TableCell>
                    <TableCell>{s.document_sub_type || '-'}</TableCell>
                    <TableCell className="font-mono">{s.first_no ?? '-'}</TableCell>
                    <TableCell className="font-mono">{s.next_no ?? '-'}</TableCell>
                    <TableCell className="font-mono">{s.last_no ?? '-'}</TableCell>
                    <TableCell>
                      {s.is_default ? <Badge>Default</Badge> : '-'}
                    </TableCell>
                    <TableCell>
                      {s.locked ? (
                        <Badge variant="destructive" className="gap-1">
                          <Lock className="h-3 w-3" /> Locked
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Unlock className="h-3 w-3" /> Active
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
