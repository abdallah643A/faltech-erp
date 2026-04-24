import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useItemWarehouseInfo, useInventoryValuation } from '@/hooks/useInventoryManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, Package, AlertTriangle, TrendingDown, Edit } from 'lucide-react';

export default function ItemWarehouseInfo() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('stock');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({
    item_code: '', warehouse_code: '', min_stock: '0', max_stock: '0', reorder_point: '0', reorder_quantity: '0',
    valuation_method: 'moving_average', default_bin_code: '',
  });

  const { data: items, isLoading, upsert } = useItemWarehouseInfo();
  const { data: valuations, isLoading: valLoading } = useInventoryValuation();

  const filtered = (items || []).filter(i =>
    i.item_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.warehouse_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const belowReorder = filtered.filter(i => i.reorder_point > 0 && i.in_stock <= i.reorder_point);
  const belowMin = filtered.filter(i => i.min_stock > 0 && i.in_stock < i.min_stock);

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      item_code: item.item_code, warehouse_code: item.warehouse_code,
      min_stock: item.min_stock?.toString() || '0', max_stock: item.max_stock?.toString() || '0',
      reorder_point: item.reorder_point?.toString() || '0', reorder_quantity: item.reorder_quantity?.toString() || '0',
      valuation_method: item.valuation_method || 'moving_average', default_bin_code: item.default_bin_code || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    upsert.mutate({
      ...form,
      min_stock: Number(form.min_stock), max_stock: Number(form.max_stock),
      reorder_point: Number(form.reorder_point), reorder_quantity: Number(form.reorder_quantity),
    }, { onSuccess: () => setDialogOpen(false) });
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'بيانات المخزون حسب المستودع' : 'Item Warehouse Details'}</h1>
          <p className="text-muted-foreground">{language === 'ar' ? 'الكميات والتقييم ومستويات الطلب (OITW)' : 'Stock levels, valuation & reorder points (OITW)'}</p>
        </div>
      </div>

      {(belowReorder.length > 0 || belowMin.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {belowMin.length > 0 && (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-3 pt-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">{belowMin.length} {language === 'ar' ? 'أصناف أقل من الحد الأدنى' : 'Items Below Minimum'}</p>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تحتاج إلى تعبئة فورية' : 'Require immediate replenishment'}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {belowReorder.length > 0 && (
            <Card className="border-yellow-500">
              <CardContent className="flex items-center gap-3 pt-4">
                <TrendingDown className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">{belowReorder.length} {language === 'ar' ? 'أصناف وصلت لنقطة الطلب' : 'Items at Reorder Point'}</p>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'يجب إنشاء طلبات شراء' : 'Purchase orders should be created'}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>{language === 'ar' ? 'المخزون' : 'Inventory'}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="stock">{language === 'ar' ? 'الكميات' : 'Stock Levels'}</TabsTrigger>
              <TabsTrigger value="valuation">{language === 'ar' ? 'التقييم' : 'Valuation'}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={language === 'ar' ? 'بحث...' : 'Search...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>

          {activeTab === 'stock' && (
            isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد بيانات' : 'No item warehouse data found.'}</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'رمز الصنف' : 'Item Code'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المستودع' : 'Warehouse'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'متوفر' : 'In Stock'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'محجوز' : 'Committed'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'مطلوب' : 'Ordered'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'متاح' : 'Available'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'الحد الأدنى' : 'Min'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'نقطة الطلب' : 'Reorder'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التقييم' : 'Valuation'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'متوسط السعر' : 'Avg Price'}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(i => {
                      const isBelowMin = i.min_stock > 0 && i.in_stock < i.min_stock;
                      const isAtReorder = i.reorder_point > 0 && i.in_stock <= i.reorder_point;
                      return (
                        <TableRow key={i.id} className={isBelowMin ? 'bg-destructive/5' : isAtReorder ? 'bg-yellow-500/5' : ''}>
                          <TableCell className="font-mono text-sm">{i.item_code}</TableCell>
                          <TableCell>{i.warehouse_code}</TableCell>
                          <TableCell className="text-right font-medium">{Number(i.in_stock).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(i.committed).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(i.ordered).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">{Number(i.available).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(i.min_stock).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(i.reorder_point).toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{i.valuation_method?.replace('_', ' ')}</Badge></TableCell>
                          <TableCell className="text-right">{Number(i.avg_price || 0).toLocaleString()} SAR</TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(i)}><Edit className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          )}

          {activeTab === 'valuation' && (
            valLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
            ) : (valuations || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد تقييمات' : 'No valuation snapshots yet.'}</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'رمز الصنف' : 'Item Code'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المستودع' : 'Warehouse'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'القيمة الإجمالية' : 'Total Value'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الطريقة' : 'Method'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(valuations || []).map(v => (
                      <TableRow key={v.id}>
                        <TableCell>{v.snapshot_date}</TableCell>
                        <TableCell className="font-mono text-sm">{v.item_code}</TableCell>
                        <TableCell>{v.item_description || '-'}</TableCell>
                        <TableCell>{v.warehouse_code}</TableCell>
                        <TableCell className="text-right">{Number(v.quantity).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{Number(v.unit_cost).toLocaleString()} SAR</TableCell>
                        <TableCell className="text-right font-medium">{Number(v.total_value).toLocaleString()} SAR</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{v.valuation_method?.replace('_', ' ')}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{language === 'ar' ? 'تعديل إعدادات المخزون' : 'Edit Stock Settings'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{language === 'ar' ? 'رمز الصنف' : 'Item Code'}</Label><Input value={form.item_code} disabled /></div>
            <div><Label>{language === 'ar' ? 'المستودع' : 'Warehouse'}</Label><Input value={form.warehouse_code} disabled /></div>
            <div><Label>{language === 'ar' ? 'الحد الأدنى' : 'Min Stock'}</Label><Input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'الحد الأقصى' : 'Max Stock'}</Label><Input type="number" value={form.max_stock} onChange={e => setForm({ ...form, max_stock: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'نقطة الطلب' : 'Reorder Point'}</Label><Input type="number" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'كمية الطلب' : 'Reorder Qty'}</Label><Input type="number" value={form.reorder_quantity} onChange={e => setForm({ ...form, reorder_quantity: e.target.value })} /></div>
            <div>
              <Label>{language === 'ar' ? 'طريقة التقييم' : 'Valuation'}</Label>
              <Select value={form.valuation_method} onValueChange={v => setForm({ ...form, valuation_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moving_average">{language === 'ar' ? 'المتوسط المتحرك' : 'Moving Average'}</SelectItem>
                  <SelectItem value="fifo">{language === 'ar' ? 'الوارد أولاً' : 'FIFO'}</SelectItem>
                  <SelectItem value="standard">{language === 'ar' ? 'التكلفة المعيارية' : 'Standard Cost'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{language === 'ar' ? 'الموقع الافتراضي' : 'Default Bin'}</Label><Input value={form.default_bin_code} onChange={e => setForm({ ...form, default_bin_code: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
