import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FilterableTableHead, useColumnFilters, useColumnSort } from '@/components/ui/filterable-table-head';
import { Search, RefreshCw, Loader2, UserCheck, Users, Mail, Phone } from 'lucide-react';
import { useSAPSync } from '@/hooks/useSAPSync';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';

const seColumns: ColumnDef[] = [
  { key: 'slp_code', header: 'Code' },
  { key: 'slp_name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'mobile', header: 'Mobile' },
  { key: 'department', header: 'Department' },
  { key: 'position', header: 'Position' },
  { key: 'branch', header: 'Branch' },
  { key: 'commission_percent', header: 'Commission %' },
  { key: 'is_active', header: 'Active' },
];

interface SalesEmployee {
  id: string;
  slp_code: number;
  slp_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  department: string | null;
  position: string | null;
  branch: string | null;
  is_active: boolean;
  commission_percent: number | null;
  last_synced_at: string | null;
  created_at: string;
}

export default function SalesEmployees() {
  const { direction } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const { sync, isLoading: isSyncing } = useSAPSync();

  const { data: employees, isLoading, refetch } = useQuery({
    queryKey: ['sales-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_employees')
        .select('*')
        .order('slp_code');
      if (error) throw error;
      return data as SalesEmployee[];
    },
  });

  const handlePullFromSAP = async () => {
    const result = await sync('sales_employee' as any, 'from_sap');
    if (result.success) refetch();
  };

  const preFilteredEmployees = employees?.filter(e => {
    return e.slp_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(e.slp_code).includes(searchQuery) ||
      (e.email || '').toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const seFilterKeys: (keyof SalesEmployee)[] = ['slp_code', 'slp_name', 'email', 'phone', 'department', 'position', 'branch'] as any;
  const { filters: colFilters, setFilter: setColFilter, filteredData: colFilteredEmployees } = useColumnFilters(preFilteredEmployees, seFilterKeys);
  const { sortedData: filteredEmployees, handleSort, getSortDirection } = useColumnSort(colFilteredEmployees);

  const stats = {
    total: employees?.length || 0,
    active: employees?.filter(e => e.is_active).length || 0,
  };

  return (
    <div className="space-y-6" dir={direction}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Employees / Owners</h1>
          <p className="text-muted-foreground">Manage sales employees from SAP B1 (OHEM)</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons
            data={filteredEmployees}
            columns={seColumns}
            filename="sales-employees"
            title="Sales Employees"
          />
          <SAPSyncButton entity="sales_employee" />
          <ClearAllButton tableName="sales_employees" displayName="Sales Employees" queryKeys={['salesEmployees']} />
          <Button onClick={handlePullFromSAP} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Pull from SAP
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
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
              <UserCheck className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2" />
              <p>No sales employees found. Pull from SAP to load data.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                   <FilterableTableHead sortKey="slp_code" sortDirection={getSortDirection('slp_code')} onSort={handleSort} filterValue={colFilters['slp_code'] || ''} onFilterChange={v => setColFilter('slp_code', v)}>Code</FilterableTableHead>
                  <FilterableTableHead sortKey="slp_name" sortDirection={getSortDirection('slp_name')} onSort={handleSort} filterValue={colFilters['slp_name'] || ''} onFilterChange={v => setColFilter('slp_name', v)}>Name</FilterableTableHead>
                  <FilterableTableHead sortKey="email" sortDirection={getSortDirection('email')} onSort={handleSort} filterValue={colFilters['email'] || ''} onFilterChange={v => setColFilter('email', v)}>Email</FilterableTableHead>
                  <FilterableTableHead sortKey="phone" sortDirection={getSortDirection('phone')} onSort={handleSort} filterValue={colFilters['phone'] || ''} onFilterChange={v => setColFilter('phone', v)}>Phone</FilterableTableHead>
                  <FilterableTableHead sortKey="mobile" sortDirection={getSortDirection('mobile')} onSort={handleSort}>Mobile</FilterableTableHead>
                  <FilterableTableHead sortKey="department" sortDirection={getSortDirection('department')} onSort={handleSort} filterValue={colFilters['department'] || ''} onFilterChange={v => setColFilter('department', v)}>Department</FilterableTableHead>
                  <FilterableTableHead sortKey="position" sortDirection={getSortDirection('position')} onSort={handleSort} filterValue={colFilters['position'] || ''} onFilterChange={v => setColFilter('position', v)}>Position</FilterableTableHead>
                  <FilterableTableHead sortKey="branch" sortDirection={getSortDirection('branch')} onSort={handleSort} filterValue={colFilters['branch'] || ''} onFilterChange={v => setColFilter('branch', v)}>Branch</FilterableTableHead>
                  <FilterableTableHead sortKey="commission_percent" sortDirection={getSortDirection('commission_percent')} onSort={handleSort}>Commission %</FilterableTableHead>
                  <FilterableTableHead sortKey="is_active" sortDirection={getSortDirection('is_active')} onSort={handleSort}>Status</FilterableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono font-medium">{e.slp_code}</TableCell>
                    <TableCell className="font-medium">{e.slp_name}</TableCell>
                    <TableCell>
                      {e.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {e.email}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {e.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {e.phone}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{e.mobile || '-'}</TableCell>
                    <TableCell>{e.department || '-'}</TableCell>
                    <TableCell>{e.position || '-'}</TableCell>
                    <TableCell>{e.branch || '-'}</TableCell>
                    <TableCell>{e.commission_percent != null ? `${e.commission_percent}%` : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={e.is_active ? 'default' : 'destructive'}>
                        {e.is_active ? 'Active' : 'Inactive'}
                      </Badge>
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
