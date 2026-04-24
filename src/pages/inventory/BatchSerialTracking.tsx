import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBatchSerialNumbers } from '@/hooks/useInventoryManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Loader2, Barcode, AlertTriangle } from 'lucide-react';

export default function BatchSerialTracking() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [trackingTab, setTrackingTab] = useState('batch');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    item_code: '', tracking_type: 'batch', batch_serial_number: '', warehouse_code: '', bin_code: '',
    quantity: '1', manufacturing_date: '', expiry_date: '', supplier_code: '', supplier_batch: '', lot_number: '', notes: '',
  });

  const { data: records, isLoading, create } = useBatchSerialNumbers();

  const filtered = (records || []).filter(r => {
    const matchesSearch = r.batch_serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.item_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = r.tracking_type === trackingTab;
    return matchesSearch && matchesType;
  });

  const expiringSoon = (records || []).filter(r => {
    if (!r.expiry_date) return false;
    const days = (new Date(r.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30;
  });

  const expired = (records || []).filter(r => r.expiry_date && new Date(r.expiry_date) < new Date());

  const openCreate = (type: string) => {
    setForm({ item_code: '', tracking_type: type, batch_serial_number: '', warehouse_code: '', bin_code: '', quantity: type === 'serial' ? '1' : '', manufacturing_date: '', expiry_date: '', supplier_code: '', supplier_batch: '', lot_number: '', notes: '' });
    setDialogOpen(true);
  };

  const handleSave = () => {
    create.mutate({ ...form, quantity: Number(form.quantity) || 1 }, { onSuccess: () => setDialogOpen(false) });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'available': return 'default';
      case 'committed': return 'secondary';
      case 'sold': return 'outline';
      case 'expired': return 'destructive';
      case 'quarantine': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'تتبع الدفعات والأرقام التسلسلية' : 'Batch & Serial Tracking'}</h1>
          <p className="text-muted-foreground">{language === 'ar' ? 'إدارة الدفعات والأرقام التسلسلية (OBTN/OSRN)' : 'Manage batch numbers & serial numbers (OBTN/OSRN)'}</p>
        </div>
        <Button onClick={() => openCreate(trackingTab)}><Plus className="h-4 w-4 mr-2" />{language === 'ar' ? 'إضافة' : 'Add New'}</Button>
      </div>

      {(expiringSoon.length > 0 || expired.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expired.length > 0 && (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-3 pt-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">{expired.length} {language === 'ar' ? 'دفعات منتهية الصلاحية' : 'Expired Batches'}</p>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تحتاج إلى مراجعة' : 'Require immediate review'}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {expiringSoon.length > 0 && (
            <Card className="border-yellow-500">
              <CardContent className="flex items-center gap-3 pt-4">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">{expiringSoon.length} {language === 'ar' ? 'دفعات قاربت على الانتهاء' : 'Expiring within 30 days'}</p>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تحذير مبكر' : 'Early warning alert'}</p>
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
              <Barcode className="h-5 w-5" />
              <CardTitle>{language === 'ar' ? 'التتبع' : 'Tracking Records'}</CardTitle>
            </div>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={trackingTab} onValueChange={setTrackingTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="batch">{language === 'ar' ? 'الدفعات' : 'Batches'}</TabsTrigger>
              <TabsTrigger value="serial">{language === 'ar' ? 'الأرقام التسلسلية' : 'Serial Numbers'}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={language === 'ar' ? 'بحث...' : 'Search...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد سجلات' : 'No records found.'}</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رمز الصنف' : 'Item Code'}</TableHead>
                    <TableHead>{trackingTab === 'batch' ? (language === 'ar' ? 'رقم الدفعة' : 'Batch No.') : (language === 'ar' ? 'الرقم التسلسلي' : 'Serial No.')}</TableHead>
                    <TableHead>{language === 'ar' ? 'المستودع' : 'Warehouse'}</TableHead>
                    {trackingTab === 'batch' && <TableHead className="text-right">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>}
                    <TableHead>{language === 'ar' ? 'تاريخ الإنتاج' : 'Mfg Date'}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const isExpired = r.expiry_date && new Date(r.expiry_date) < new Date();
                    return (
                      <TableRow key={r.id} className={isExpired ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-mono text-sm">{r.item_code}</TableCell>
                        <TableCell className="font-medium">{r.batch_serial_number}</TableCell>
                        <TableCell>{r.warehouse_code || '-'}</TableCell>
                        {trackingTab === 'batch' && <TableCell className="text-right">{r.quantity}</TableCell>}
                        <TableCell>{r.manufacturing_date || '-'}</TableCell>
                        <TableCell className={isExpired ? 'text-destructive font-medium' : ''}>{r.expiry_date || '-'}</TableCell>
                        <TableCell>{r.supplier_code || '-'}</TableCell>
                        <TableCell className="text-center"><Badge variant={statusColor(r.status)}>{r.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.tracking_type === 'batch' ? (language === 'ar' ? 'إضافة دفعة' : 'Add Batch') : (language === 'ar' ? 'إضافة رقم تسلسلي' : 'Add Serial Number')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{language === 'ar' ? 'رمز الصنف' : 'Item Code'}</Label><Input value={form.item_code} onChange={e => setForm({ ...form, item_code: e.target.value })} /></div>
            <div><Label>{form.tracking_type === 'batch' ? (language === 'ar' ? 'رقم الدفعة' : 'Batch No.') : (language === 'ar' ? 'الرقم التسلسلي' : 'Serial No.')}</Label><Input value={form.batch_serial_number} onChange={e => setForm({ ...form, batch_serial_number: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'المستودع' : 'Warehouse'}</Label><Input value={form.warehouse_code} onChange={e => setForm({ ...form, warehouse_code: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'الموقع' : 'Bin'}</Label><Input value={form.bin_code} onChange={e => setForm({ ...form, bin_code: e.target.value })} /></div>
            {form.tracking_type === 'batch' && <div><Label>{language === 'ar' ? 'الكمية' : 'Quantity'}</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>}
            <div><Label>{language === 'ar' ? 'تاريخ الإنتاج' : 'Mfg Date'}</Label><Input type="date" value={form.manufacturing_date} onChange={e => setForm({ ...form, manufacturing_date: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'رمز المورد' : 'Supplier Code'}</Label><Input value={form.supplier_code} onChange={e => setForm({ ...form, supplier_code: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'دفعة المورد' : 'Supplier Batch'}</Label><Input value={form.supplier_batch} onChange={e => setForm({ ...form, supplier_batch: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'رقم اللوط' : 'Lot Number'}</Label><Input value={form.lot_number} onChange={e => setForm({ ...form, lot_number: e.target.value })} /></div>
            <div className="col-span-2"><Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={!form.item_code || !form.batch_serial_number || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
