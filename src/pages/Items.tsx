import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Search, Edit, Package, MoreHorizontal, Loader2, Trash2, ArrowUp, ArrowDown, Download, Filter,
} from 'lucide-react';
import { FilterableTableHead, useColumnFilters, useColumnSort } from '@/components/ui/filterable-table-head';
import { PaginationControls, usePagination } from '@/components/ui/pagination-controls';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import type { ColumnDef } from '@/utils/exportImportUtils';

const itemColumns: ColumnDef[] = [
  { key: 'item_code', header: 'Item Code' },
  { key: 'description', header: 'Description' },
  { key: 'item_type', header: 'Type' },
  { key: 'item_group', header: 'Group' },
  { key: 'uom', header: 'UOM' },
  { key: 'unit_price', header: 'Unit Price' },
  { key: 'in_stock', header: 'In Stock' },
  { key: 'warehouse', header: 'Warehouse' },
  { key: 'status', header: 'Status' },
];

interface Item {
  id: string;
  item_code: string;
  description: string;
  foreign_name: string | null;
  item_type: string;
  item_group: string | null;
  uom: string | null;
  uom_group: string | null;
  barcode: string | null;
  unit_price: number | null;
  pricing_unit: string | null;
  price_list: string | null;
  is_inventory_item: boolean | null;
  is_sales_item: boolean | null;
  is_purchasing_item: boolean | null;
  manufacturer: string | null;
  additional_identifier: string | null;
  shipping_type: string | null;
  no_discounts: boolean | null;
  country_of_origin: string | null;
  standard_item_identification: string | null;
  commodity_classification: string | null;
  advanced_rule_type: string | null;
  preferred_vendor: string | null;
  purchase_uom: string | null;
  items_per_purchase_unit: number | null;
  purchase_packaging: string | null;
  last_purchase_price: number | null;
  purchase_currency: string | null;
  sales_uom: string | null;
  items_per_sales_unit: number | null;
  sales_packaging: string | null;
  default_price: number | null;
  sales_currency: string | null;
  warehouse: string | null;
  in_stock: number | null;
  committed: number | null;
  ordered: number | null;
  min_inventory: number | null;
  max_inventory: number | null;
  reorder_point: number | null;
  planning_method: string | null;
  procurement_method: string | null;
  order_interval: number | null;
  order_multiple: number | null;
  lead_time: number | null;
  production_standard_cost: number | null;
  properties: any;
  remarks: string | null;
  valid_from: string | null;
  valid_to: string | null;
  valid_remarks: string | null;
  status: string | null;
  sync_status: string | null;
  sap_doc_entry: string | null;
  created_at: string;
}

const emptyItem = {
  item_code: '',
  description: '',
  foreign_name: '',
  item_type: 'inventory',
  item_group: '',
  uom: 'Pcs',
  uom_group: '',
  barcode: '',
  unit_price: 0,
  pricing_unit: 'Pcs',
  price_list: 'Price List 01',
  is_inventory_item: true,
  is_sales_item: true,
  is_purchasing_item: true,
  manufacturer: '- No Manufacturer -',
  additional_identifier: '',
  shipping_type: '',
  no_discounts: false,
  country_of_origin: '',
  standard_item_identification: '',
  commodity_classification: '',
  advanced_rule_type: 'General',
  preferred_vendor: '',
  purchase_uom: 'Pcs',
  items_per_purchase_unit: 1,
  purchase_packaging: '',
  last_purchase_price: 0,
  purchase_currency: 'SAR',
  sales_uom: 'Pcs',
  items_per_sales_unit: 1,
  sales_packaging: '',
  default_price: 0,
  sales_currency: 'SAR',
  warehouse: 'WH01',
  in_stock: 0,
  committed: 0,
  ordered: 0,
  min_inventory: 0,
  max_inventory: 0,
  reorder_point: 0,
  planning_method: 'mrp',
  procurement_method: 'buy',
  order_interval: 7,
  order_multiple: 1,
  lead_time: 7,
  production_standard_cost: 0,
  properties: null,
  remarks: '',
  valid_from: '',
  valid_to: '',
  valid_remarks: '',
  status: 'active',
};

export default function Items() {
  const { t, language, direction } = useLanguage();
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newItem, setNewItem] = useState(emptyItem);
  const [activeTab, setActiveTab] = useState('general');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const canEdit = hasAnyRole(['admin', 'manager']);
  const canSync = hasAnyRole(['admin', 'manager', 'sales_rep']);
  const { sync: sapSync, isLoading: isSyncing } = useSAPSync();
  const { activeCompanyId } = useActiveCompany();

  const { data: items, isLoading } = useQuery({
    queryKey: ['items', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('items').select('*').order('item_code');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Item[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (itemData: typeof newItem) => {
      if (editingItem) {
        const { error } = await supabase.from('items').update(itemData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('items').insert({ ...itemData, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', activeCompanyId] });
      toast({ title: editingItem ? 'Item Updated' : 'Item Created', description: `Item ${newItem.item_code} has been saved.` });
      setIsDialogOpen(false);
      setEditingItem(null);
      setNewItem(emptyItem);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase.from('items').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', activeCompanyId] });
      toast({ title: pendingDeleteIds.length > 1 ? `${pendingDeleteIds.length} Items Deleted` : 'Item Deleted' });
      setSelectedIds(new Set());
      setPendingDeleteIds([]);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleDeleteClick = (ids: string[]) => {
    setPendingDeleteIds(ids);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(pendingDeleteIds);
    setDeleteConfirmOpen(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedItems.map(i => i.id);
    const allSelected = pageIds.every(id => selectedIds.has(id));
    if (allSelected) {
      const next = new Set(selectedIds);
      pageIds.forEach(id => next.delete(id));
      setSelectedIds(next);
    } else {
      setSelectedIds(new Set([...selectedIds, ...pageIds]));
    }
  };

  const preFilteredItems = items?.filter((item) => {
    const matchesSearch = bidirectionalDimensionMatch(
      searchTerm,
      item.item_code,
      item.description
    );
    const matchesType = filterType === 'all' || item.item_type === filterType;
    return matchesSearch && matchesType;
  }) || [];

  function bidirectionalDimensionMatch(query: string, ...fields: string[]): boolean {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    // Check normal match first
    if (fields.some(f => f.toLowerCase().includes(q))) return true;
    // Try reversing dimension patterns like "150 * 100" → "100 * 150"
    const dimMatch = q.match(/^([\d.]+)\s*[x×*]\s*([\d.]+)$/i);
    if (dimMatch) {
      const reversed = `${dimMatch[2]}${q.includes('×') ? '×' : q.includes('x') ? 'x' : '*'}${dimMatch[1]}`;
      const reversedSpaced = `${dimMatch[2]} ${q.includes('×') ? '×' : q.includes('x') ? 'x' : '*'} ${dimMatch[1]}`;
      if (fields.some(f => {
        const fl = f.toLowerCase();
        return fl.includes(reversed) || fl.includes(reversedSpaced);
      })) return true;
    }
    return false;
  }

  const itemFilterKeys: (keyof Item)[] = ['item_code', 'description', 'item_type', 'item_group', 'status'];
  const { filters: colFilters, setFilter: setColFilter, filteredData: colFilteredItems } = useColumnFilters(preFilteredItems, itemFilterKeys);
  const { sortedData: filteredItems, handleSort, getSortDirection } = useColumnSort(colFilteredItems);

  const {
    paginatedItems,
    currentPage,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredItems, 30);

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setNewItem({
      item_code: item.item_code,
      description: item.description,
      foreign_name: item.foreign_name || '',
      item_type: item.item_type,
      item_group: item.item_group || '',
      uom: item.uom || 'Pcs',
      uom_group: item.uom_group || '',
      barcode: item.barcode || '',
      unit_price: item.unit_price || 0,
      pricing_unit: item.pricing_unit || 'Pcs',
      price_list: item.price_list || 'Price List 01',
      is_inventory_item: item.is_inventory_item ?? true,
      is_sales_item: item.is_sales_item ?? true,
      is_purchasing_item: item.is_purchasing_item ?? true,
      manufacturer: item.manufacturer || '- No Manufacturer -',
      additional_identifier: item.additional_identifier || '',
      shipping_type: item.shipping_type || '',
      no_discounts: item.no_discounts ?? false,
      country_of_origin: item.country_of_origin || '',
      standard_item_identification: item.standard_item_identification || '',
      commodity_classification: item.commodity_classification || '',
      advanced_rule_type: item.advanced_rule_type || 'General',
      preferred_vendor: item.preferred_vendor || '',
      purchase_uom: item.purchase_uom || 'Pcs',
      items_per_purchase_unit: item.items_per_purchase_unit || 1,
      purchase_packaging: item.purchase_packaging || '',
      last_purchase_price: item.last_purchase_price || 0,
      purchase_currency: item.purchase_currency || 'SAR',
      sales_uom: item.sales_uom || 'Pcs',
      items_per_sales_unit: item.items_per_sales_unit || 1,
      sales_packaging: item.sales_packaging || '',
      default_price: item.default_price || 0,
      sales_currency: item.sales_currency || 'SAR',
      warehouse: item.warehouse || 'WH01',
      in_stock: item.in_stock || 0,
      committed: item.committed || 0,
      ordered: item.ordered || 0,
      min_inventory: item.min_inventory || 0,
      max_inventory: item.max_inventory || 0,
      reorder_point: item.reorder_point || 0,
      planning_method: item.planning_method || 'mrp',
      procurement_method: item.procurement_method || 'buy',
      order_interval: item.order_interval || 7,
      order_multiple: item.order_multiple || 1,
      lead_time: item.lead_time || 7,
      production_standard_cost: item.production_standard_cost || 0,
      properties: item.properties || null,
      remarks: item.remarks || '',
      valid_from: item.valid_from || '',
      valid_to: item.valid_to || '',
      valid_remarks: item.valid_remarks || '',
      status: item.status || 'active',
    });
    setActiveTab('general');
    setIsDialogOpen(true);
  };

  const handleOpenNew = () => {
    setEditingItem(null);
    setNewItem(emptyItem);
    setActiveTab('general');
    setIsDialogOpen(true);
  };

  const stats = {
    total: items?.length || 0,
    active: items?.filter(i => i.status === 'active').length || 0,
    inventory: items?.filter(i => i.item_type === 'inventory').length || 0,
    services: items?.filter(i => i.item_type === 'service').length || 0,
  };

  // SAP B1 compact field row component
  const FieldRow = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={`grid grid-cols-[160px_1fr] items-center gap-2 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</Label>
      {children}
    </div>
  );

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'بيانات الأصناف الرئيسية' : 'Item Master Data'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة بيانات الأصناف (SAP B1)' : 'Manage item master data (SAP B1 Style)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons
            data={filteredItems}
            columns={itemColumns}
            filename="items"
            title="Item Master Data"
          />
          <SAPSyncButton entity="item" />
          <ClearAllButton tableName="items" displayName="Items" queryKeys={['items']} />
          {canEdit && (
            <Button onClick={handleOpenNew} className="gap-2">
              <Plus className="h-4 w-4" />
              {language === 'ar' ? 'صنف جديد' : 'New Item'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer" onClick={() => setFilterType('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'إجمالي الأصناف' : 'Total Items'}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilterType('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'الأصناف النشطة' : 'Active Items'}</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.active}</div></CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilterType('inventory')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'أصناف المخزون' : 'Inventory Items'}</CardTitle>
            <Package className="h-4 w-4 text-primary/80" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.inventory}</div></CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilterType('service')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'الخدمات' : 'Services'}</CardTitle>
            <Package className="h-4 w-4 text-secondary-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.services}</div></CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="enterprise-card p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'ar' ? 'بحث بكود الصنف أو الوصف...' : 'Search by item code or description...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'ar' ? 'كل الأنواع' : 'All Types'}</SelectItem>
            <SelectItem value="inventory">{language === 'ar' ? 'مخزون' : 'Inventory'}</SelectItem>
            <SelectItem value="service">{language === 'ar' ? 'خدمة' : 'Service'}</SelectItem>
            <SelectItem value="non-inventory">{language === 'ar' ? 'غير مخزني' : 'Non-Inventory'}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          {language === 'ar' ? 'تصدير' : 'Export'}
        </Button>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="enterprise-card p-3 flex items-center justify-between bg-primary/5 border-primary/20">
          <span className="text-sm font-medium">
            {language === 'ar' ? `تم تحديد ${selectedIds.size} عنصر` : `${selectedIds.size} item(s) selected`}
          </span>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(Array.from(selectedIds))}>
            <Trash2 className="h-4 w-4 mr-2" />
            {language === 'ar' ? `حذف المحدد (${selectedIds.size})` : `Delete Selected (${selectedIds.size})`}
          </Button>
        </div>
      )}

      {/* Items Table */}
      <div className="enterprise-card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.has(i.id))}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <FilterableTableHead sortKey="item_code" sortDirection={getSortDirection('item_code')} onSort={handleSort} filterValue={colFilters['item_code'] || ''} onFilterChange={v => setColFilter('item_code', v)}>{language === 'ar' ? 'كود الصنف' : 'Item Code'}</FilterableTableHead>
                  <FilterableTableHead sortKey="description" sortDirection={getSortDirection('description')} onSort={handleSort} filterValue={colFilters['description'] || ''} onFilterChange={v => setColFilter('description', v)}>{language === 'ar' ? 'الوصف' : 'Description'}</FilterableTableHead>
                  <FilterableTableHead sortKey="item_type" sortDirection={getSortDirection('item_type')} onSort={handleSort} className="col-mobile-hidden" filterValue={colFilters['item_type'] || ''} onFilterChange={v => setColFilter('item_type', v)}>{language === 'ar' ? 'النوع' : 'Type'}</FilterableTableHead>
                  <FilterableTableHead sortKey="item_group" sortDirection={getSortDirection('item_group')} onSort={handleSort} className="col-mobile-hidden" filterValue={colFilters['item_group'] || ''} onFilterChange={v => setColFilter('item_group', v)}>{language === 'ar' ? 'المجموعة' : 'Group'}</FilterableTableHead>
                  <FilterableTableHead sortKey="unit_price" sortDirection={getSortDirection('unit_price')} onSort={handleSort}>{language === 'ar' ? 'السعر' : 'Price'}</FilterableTableHead>
                  <FilterableTableHead sortKey="in_stock" sortDirection={getSortDirection('in_stock')} onSort={handleSort} className="col-mobile-hidden">{language === 'ar' ? 'المخزون' : 'In Stock'}</FilterableTableHead>
                  <TableHead className="col-mobile-hidden">{language === 'ar' ? 'متاح (الفرع)' : 'Branch Avail.'}</TableHead>
                  <TableHead className="col-mobile-hidden">{language === 'ar' ? 'متاح (الشركة)' : 'Company Avail.'}</TableHead>
                  <TableHead className="col-tablet-hidden">{language === 'ar' ? 'المزامنة' : 'Sync'}</TableHead>
                  <FilterableTableHead sortKey="status" sortDirection={getSortDirection('status')} onSort={handleSort} className="col-tablet-hidden" filterValue={colFilters['status'] || ''} onFilterChange={v => setColFilter('status', v)}>{language === 'ar' ? 'الحالة' : 'Status'}</FilterableTableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد أصناف' : 'No items found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow key={item.id} className={selectedIds.has(item.id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{item.item_code}</span>
                          {item.sap_doc_entry && <Badge variant="outline" className="text-xs">SAP</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {item.foreign_name && <p className="text-xs text-muted-foreground">{item.foreign_name}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="col-mobile-hidden">
                        <Badge variant={item.item_type === 'inventory' ? 'default' : item.item_type === 'service' ? 'secondary' : 'outline'}>
                          {item.item_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="col-mobile-hidden">{item.item_group || '-'}</TableCell>
                      <TableCell className="font-semibold">{(item.default_price || 0).toLocaleString()} {item.sales_currency || 'SAR'}</TableCell>
                      <TableCell className="col-mobile-hidden">{item.in_stock || 0}</TableCell>
                      <TableCell className="col-mobile-hidden font-medium text-primary">{(item as any).branch_available_qty || 0}</TableCell>
                      <TableCell className="col-mobile-hidden font-medium text-accent-foreground">{(item as any).company_available_qty || 0}</TableCell>
                      <TableCell className="col-tablet-hidden">
                        <Badge variant="outline" className={`text-xs ${
                          item.sync_status === 'synced' ? 'border-success text-success' :
                          item.sync_status === 'error' ? 'border-destructive text-destructive' :
                          'border-muted-foreground text-muted-foreground'
                        }`}>
                          {item.sync_status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="col-tablet-hidden">
                        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="h-4 w-4 mr-2" />{language === 'ar' ? 'تعديل' : 'Edit'}
                            </DropdownMenuItem>
                            {canSync && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => sapSync('item', 'to_sap', item.id)} disabled={isSyncing}>
                                  <ArrowUp className="h-4 w-4 mr-2" />{language === 'ar' ? 'دفع إلى SAP' : 'Push to SAP'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => sapSync('item', 'from_sap', item.id)} disabled={isSyncing}>
                                  <ArrowDown className="h-4 w-4 mr-2" />{language === 'ar' ? 'سحب من SAP' : 'Pull from SAP'}
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteClick([item.id])} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />{language === 'ar' ? 'حذف' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          <PaginationControls
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 25, 30, 50, 100]}
          />
        </div>
      </div>

      {/* SAP B1-Style Item Master Data Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setEditingItem(null); setNewItem(emptyItem); } setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[1100px] max-h-[92vh] overflow-y-auto p-0">
          {/* SAP-style header bar */}
          <div className="bg-primary/5 border-b px-6 py-3">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {editingItem
                ? (language === 'ar' ? 'بيانات الصنف الرئيسية - تعديل' : 'Item Master Data - Edit')
                : (language === 'ar' ? 'بيانات الصنف الرئيسية - إضافة' : 'Item Master Data - Add')
              }
            </DialogTitle>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* SAP B1 Header Section - Two Columns */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {/* Left Column */}
              <div className="space-y-2">
                <FieldRow label={language === 'ar' ? 'رقم الصنف' : 'Item No.'}>
                  <div className="flex gap-2">
                    <Select value="manual" disabled>
                      <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="manual">Manual</SelectItem></SelectContent>
                    </Select>
                    <Input
                      className="h-8 text-sm"
                      value={newItem.item_code}
                      onChange={(e) => setNewItem({ ...newItem, item_code: e.target.value })}
                      placeholder="e.g., WP0155"
                    />
                  </div>
                </FieldRow>
                <FieldRow label={language === 'ar' ? 'الوصف' : 'Description'}>
                  <Input
                    className="h-8 text-sm"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </FieldRow>
                <FieldRow label={language === 'ar' ? 'الاسم الأجنبي' : 'Foreign Name'}>
                  <Input
                    className="h-8 text-sm"
                    value={newItem.foreign_name}
                    onChange={(e) => setNewItem({ ...newItem, foreign_name: e.target.value })}
                  />
                </FieldRow>
                <FieldRow label={language === 'ar' ? 'نوع الصنف' : 'Item Type'}>
                  <Select value={newItem.item_type} onValueChange={(v) => setNewItem({ ...newItem, item_type: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inventory">Items</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="non-inventory">Non-Inventory</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label={language === 'ar' ? 'مجموعة الصنف' : 'Item Group'}>
                  <Select value={newItem.item_group || ''} onValueChange={(v) => setNewItem({ ...newItem, item_group: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select group" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WPVC">WPVC مبيعات تجارية</SelectItem>
                      <SelectItem value="Computers">Computers</SelectItem>
                      <SelectItem value="Furniture">Furniture</SelectItem>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Services">Services</SelectItem>
                      <SelectItem value="Supplies">Supplies</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label={language === 'ar' ? 'مجموعة الوحدات' : 'UoM Group'}>
                  <Select value={newItem.uom || 'Pcs'} onValueChange={(v) => setNewItem({ ...newItem, uom: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pcs">Pcs</SelectItem>
                      <SelectItem value="EA">Each (EA)</SelectItem>
                      <SelectItem value="BOX">Box</SelectItem>
                      <SelectItem value="KG">Kilogram</SelectItem>
                      <SelectItem value="M">Meter</SelectItem>
                      <SelectItem value="HR">Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label={language === 'ar' ? 'قائمة الأسعار' : 'Price List'}>
                  <Select value={newItem.price_list || 'Price List 01'} onValueChange={(v) => setNewItem({ ...newItem, price_list: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Price List 01">Price List 01</SelectItem>
                      <SelectItem value="Price List 02">Price List 02</SelectItem>
                      <SelectItem value="Price List 03">Price List 03</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={newItem.is_inventory_item}
                      onCheckedChange={(c) => setNewItem({ ...newItem, is_inventory_item: !!c })}
                    />
                    <Label className="text-xs">{language === 'ar' ? 'صنف مخزون' : 'Inventory Item'}</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={newItem.is_sales_item}
                      onCheckedChange={(c) => setNewItem({ ...newItem, is_sales_item: !!c })}
                    />
                    <Label className="text-xs">{language === 'ar' ? 'صنف مبيعات' : 'Sales Item'}</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={newItem.is_purchasing_item}
                      onCheckedChange={(c) => setNewItem({ ...newItem, is_purchasing_item: !!c })}
                    />
                    <Label className="text-xs">{language === 'ar' ? 'صنف مشتريات' : 'Purchasing Item'}</Label>
                  </div>
                </div>
                <FieldRow label={language === 'ar' ? 'الباركود' : 'Bar Code'}>
                  <div className="flex gap-2">
                    <Input className="h-8 text-sm" value={newItem.barcode} onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })} />
                    <span className="text-xs text-muted-foreground self-center whitespace-nowrap">Pcs</span>
                  </div>
                </FieldRow>
                <FieldRow label={language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}>
                  <div className="flex gap-2">
                    <Select value={newItem.purchase_currency || 'SAR'} onValueChange={(v) => setNewItem({ ...newItem, purchase_currency: v })}>
                      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">Primary Curr.</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-8 text-sm"
                      type="number"
                      value={newItem.unit_price}
                      onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="text-xs text-muted-foreground self-center whitespace-nowrap">Pcs</span>
                  </div>
                </FieldRow>
                <FieldRow label={language === 'ar' ? 'وحدة التسعير' : 'Pricing Unit'}>
                  <Input className="h-8 text-sm w-24" value={newItem.pricing_unit || 'Pcs'} onChange={(e) => setNewItem({ ...newItem, pricing_unit: e.target.value })} />
                </FieldRow>
              </div>
            </div>

            {/* SAP B1 Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent flex-wrap">
                {[
                  { value: 'general', en: 'General', ar: 'عام' },
                  { value: 'purchasing', en: 'Purchasing Data', ar: 'بيانات الشراء' },
                  { value: 'sales', en: 'Sales Data', ar: 'بيانات المبيعات' },
                  { value: 'inventory', en: 'Inventory Data', ar: 'بيانات المخزون' },
                  { value: 'planning', en: 'Planning Data', ar: 'بيانات التخطيط' },
                  { value: 'production', en: 'Production Data', ar: 'بيانات الإنتاج' },
                  { value: 'properties', en: 'Properties', ar: 'الخصائص' },
                  { value: 'remarks', en: 'Remarks', ar: 'ملاحظات' },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs"
                  >
                    {language === 'ar' ? tab.ar : tab.en}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={newItem.no_discounts}
                      onCheckedChange={(c) => setNewItem({ ...newItem, no_discounts: !!c })}
                    />
                    <Label className="text-sm">{language === 'ar' ? 'عدم تطبيق مجموعات الخصم' : 'Do Not Apply Discount Groups'}</Label>
                  </div>
                  <FieldRow label={language === 'ar' ? 'المصنّع' : 'Manufacturer'}>
                    <Select value={newItem.manufacturer || ''} onValueChange={(v) => setNewItem({ ...newItem, manufacturer: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="- No Manufacturer -">- No Manufacturer -</SelectItem>
                        <SelectItem value="Samsung">Samsung</SelectItem>
                        <SelectItem value="Apple">Apple</SelectItem>
                        <SelectItem value="Dell">Dell</SelectItem>
                        <SelectItem value="HP">HP</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'معرف إضافي' : 'Additional Identifier'}>
                    <Input className="h-8 text-sm" value={newItem.additional_identifier} onChange={(e) => setNewItem({ ...newItem, additional_identifier: e.target.value })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'نوع الشحن' : 'Shipping Type'}>
                    <Select value={newItem.shipping_type || ''} onValueChange={(v) => setNewItem({ ...newItem, shipping_type: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Express">Express</SelectItem>
                        <SelectItem value="الباحة">الباحة</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>

                {/* Status Section */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <input type="radio" name="status" checked={newItem.status === 'active'} onChange={() => setNewItem({ ...newItem, status: 'active' })} className="accent-primary" />
                      <Label className="text-sm">{language === 'ar' ? 'نشط' : 'Active'}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="status" checked={newItem.status === 'inactive'} onChange={() => setNewItem({ ...newItem, status: 'inactive' })} className="accent-primary" />
                      <Label className="text-sm">{language === 'ar' ? 'غير نشط' : 'Inactive'}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="status" checked={newItem.status === 'advanced'} onChange={() => setNewItem({ ...newItem, status: 'advanced' })} className="accent-primary" />
                      <Label className="text-sm">{language === 'ar' ? 'متقدم' : 'Advanced'}</Label>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <Label className="text-xs text-muted-foreground">{language === 'ar' ? 'من' : 'From'}</Label>
                      <Input className="h-8 text-sm w-32" type="date" value={newItem.valid_from} onChange={(e) => setNewItem({ ...newItem, valid_from: e.target.value })} />
                      <Label className="text-xs text-muted-foreground">{language === 'ar' ? 'إلى' : 'To'}</Label>
                      <Input className="h-8 text-sm w-32" type="date" value={newItem.valid_to} onChange={(e) => setNewItem({ ...newItem, valid_to: e.target.value })} />
                      <Label className="text-xs text-muted-foreground">{language === 'ar' ? 'ملاحظات' : 'Remarks'}</Label>
                      <Input className="h-8 text-sm flex-1" value={newItem.valid_remarks} onChange={(e) => setNewItem({ ...newItem, valid_remarks: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Advanced Rule Section */}
                <div className="border-t pt-4 mt-4 space-y-3">
                  <FieldRow label={language === 'ar' ? 'نوع القاعدة المتقدمة' : 'Advanced Rule Type'}>
                    <Select value={newItem.advanced_rule_type || 'General'} onValueChange={(v) => setNewItem({ ...newItem, advanced_rule_type: v })}>
                      <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Specific">Specific</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <div className="grid grid-cols-[160px_1fr] gap-2">
                    <div></div>
                    <div className="space-y-2">
                      <FieldRow label={language === 'ar' ? 'بلد المنشأ' : 'Country/Region of Origin'}>
                        <Input className="h-8 text-sm" value={newItem.country_of_origin} onChange={(e) => setNewItem({ ...newItem, country_of_origin: e.target.value })} />
                      </FieldRow>
                      <FieldRow label={language === 'ar' ? 'معرف قياسي' : 'Standard Item Identification'}>
                        <Input className="h-8 text-sm" value={newItem.standard_item_identification} onChange={(e) => setNewItem({ ...newItem, standard_item_identification: e.target.value })} />
                      </FieldRow>
                      <FieldRow label={language === 'ar' ? 'تصنيف السلع' : 'Commodity Classification'}>
                        <Input className="h-8 text-sm" value={newItem.commodity_classification} onChange={(e) => setNewItem({ ...newItem, commodity_classification: e.target.value })} />
                      </FieldRow>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Purchasing Data Tab */}
              <TabsContent value="purchasing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <FieldRow label={language === 'ar' ? 'المورد المفضل' : 'Preferred Vendor'}>
                    <Input className="h-8 text-sm" value={newItem.preferred_vendor} onChange={(e) => setNewItem({ ...newItem, preferred_vendor: e.target.value })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'وحدة الشراء' : 'Purchase UoM'}>
                    <Select value={newItem.purchase_uom || 'Pcs'} onValueChange={(v) => setNewItem({ ...newItem, purchase_uom: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="EA">Each</SelectItem>
                        <SelectItem value="BOX">Box</SelectItem>
                        <SelectItem value="KG">KG</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'عدد لكل وحدة' : 'Items per Purchase Unit'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.items_per_purchase_unit} onChange={(e) => setNewItem({ ...newItem, items_per_purchase_unit: parseInt(e.target.value) || 1 })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'التغليف' : 'Purchase Packaging'}>
                    <Input className="h-8 text-sm" value={newItem.purchase_packaging} onChange={(e) => setNewItem({ ...newItem, purchase_packaging: e.target.value })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'آخر سعر شراء' : 'Last Purchase Price'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.last_purchase_price} onChange={(e) => setNewItem({ ...newItem, last_purchase_price: parseFloat(e.target.value) || 0 })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'عملة الشراء' : 'Purchase Currency'}>
                    <Select value={newItem.purchase_currency || 'SAR'} onValueChange={(v) => setNewItem({ ...newItem, purchase_currency: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>
              </TabsContent>

              {/* Sales Data Tab */}
              <TabsContent value="sales" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <FieldRow label={language === 'ar' ? 'سعر البيع' : 'Default Selling Price'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.default_price} onChange={(e) => setNewItem({ ...newItem, default_price: parseFloat(e.target.value) || 0 })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'عملة البيع' : 'Sales Currency'}>
                    <Select value={newItem.sales_currency || 'SAR'} onValueChange={(v) => setNewItem({ ...newItem, sales_currency: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'وحدة البيع' : 'Sales UoM'}>
                    <Select value={newItem.sales_uom || 'Pcs'} onValueChange={(v) => setNewItem({ ...newItem, sales_uom: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="EA">Each</SelectItem>
                        <SelectItem value="BOX">Box</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'عدد لكل وحدة بيع' : 'Items per Sales Unit'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.items_per_sales_unit} onChange={(e) => setNewItem({ ...newItem, items_per_sales_unit: parseInt(e.target.value) || 1 })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'التغليف' : 'Sales Packaging'}>
                    <Input className="h-8 text-sm" value={newItem.sales_packaging} onChange={(e) => setNewItem({ ...newItem, sales_packaging: e.target.value })} />
                  </FieldRow>
                </div>
              </TabsContent>

              {/* Inventory Data Tab */}
              <TabsContent value="inventory" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <FieldRow label={language === 'ar' ? 'المستودع' : 'Warehouse'}>
                    <Select value={newItem.warehouse || 'WH01'} onValueChange={(v) => setNewItem({ ...newItem, warehouse: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WH01">WH01 - Main</SelectItem>
                        <SelectItem value="WH02">WH02 - Secondary</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'في المخزون' : 'In Stock'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.in_stock} onChange={(e) => setNewItem({ ...newItem, in_stock: parseInt(e.target.value) || 0 })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'المحجوز' : 'Committed'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.committed} onChange={(e) => setNewItem({ ...newItem, committed: parseInt(e.target.value) || 0 })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'المطلوب' : 'Ordered'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.ordered} onChange={(e) => setNewItem({ ...newItem, ordered: parseInt(e.target.value) || 0 })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'حد أدنى' : 'Min Inventory'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.min_inventory} onChange={(e) => setNewItem({ ...newItem, min_inventory: parseInt(e.target.value) || 0 })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'حد أقصى' : 'Max Inventory'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.max_inventory} onChange={(e) => setNewItem({ ...newItem, max_inventory: parseInt(e.target.value) || 0 })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'نقطة إعادة الطلب' : 'Reorder Point'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.reorder_point} onChange={(e) => setNewItem({ ...newItem, reorder_point: parseInt(e.target.value) || 0 })} />
                  </FieldRow>
                </div>
              </TabsContent>

              {/* Planning Data Tab */}
              <TabsContent value="planning" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <FieldRow label={language === 'ar' ? 'طريقة التخطيط' : 'Planning Method'}>
                    <Select value={newItem.planning_method || 'mrp'} onValueChange={(v) => setNewItem({ ...newItem, planning_method: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mrp">MRP</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'طريقة التوريد' : 'Procurement Method'}>
                    <Select value={newItem.procurement_method || 'buy'} onValueChange={(v) => setNewItem({ ...newItem, procurement_method: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="make">Make</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'فترة الطلب (أيام)' : 'Order Interval (Days)'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.order_interval} onChange={(e) => setNewItem({ ...newItem, order_interval: parseInt(e.target.value) || 0 })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'مضاعف الطلب' : 'Order Multiple'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.order_multiple} onChange={(e) => setNewItem({ ...newItem, order_multiple: parseInt(e.target.value) || 0 })} />
                  </FieldRow>
                  <FieldRow label={language === 'ar' ? 'وقت التسليم (أيام)' : 'Lead Time (Days)'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.lead_time} onChange={(e) => setNewItem({ ...newItem, lead_time: parseInt(e.target.value) || 0 })} />
                  </FieldRow>
                </div>
              </TabsContent>

              {/* Production Data Tab */}
              <TabsContent value="production" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <FieldRow label={language === 'ar' ? 'تكلفة الإنتاج القياسية' : 'Standard Cost'}>
                    <Input className="h-8 text-sm" type="number" value={newItem.production_standard_cost} onChange={(e) => setNewItem({ ...newItem, production_standard_cost: parseFloat(e.target.value) || 0 })} />
                  </FieldRow>
                </div>
              </TabsContent>

              {/* Properties Tab */}
              <TabsContent value="properties" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'تعيين خصائص مخصصة لهذا الصنف' : 'Assign custom properties to this item'}
                </p>
                <Textarea
                  rows={6}
                  placeholder={language === 'ar' ? 'أدخل الخصائص بتنسيق JSON' : 'Enter properties in JSON format'}
                  value={newItem.properties ? JSON.stringify(newItem.properties, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      setNewItem({ ...newItem, properties: e.target.value ? JSON.parse(e.target.value) : null });
                    } catch { /* ignore parse errors while typing */ }
                  }}
                />
              </TabsContent>

              {/* Remarks Tab */}
              <TabsContent value="remarks" className="space-y-4 mt-4">
                <Textarea
                  rows={6}
                  placeholder={language === 'ar' ? 'ملاحظات...' : 'Remarks...'}
                  value={newItem.remarks}
                  onChange={(e) => setNewItem({ ...newItem, remarks: e.target.value })}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => saveMutation.mutate(newItem)} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem
                ? (language === 'ar' ? 'تحديث' : 'Update')
                : (language === 'ar' ? 'إضافة' : 'Add')
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        itemCount={pendingDeleteIds.length}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
