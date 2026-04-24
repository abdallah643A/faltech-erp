import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBinLocations } from '@/hooks/useInventoryManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Loader2, Grid3X3, Edit, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function BinLocations() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<any>(null);
  const [form, setForm] = useState({
    warehouse_code: '', bin_code: '', bin_description: '', zone: '', aisle: '', shelf: '', level: '',
    max_weight: '', max_volume: '', is_receiving_bin: false, is_shipping_bin: false, is_default_bin: false, is_active: true,
  });

  const whCode = selectedWarehouse === 'all' ? undefined : selectedWarehouse;
  const { data: bins, isLoading, create, update, remove } = useBinLocations(whCode);

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses_list'],
    queryFn: async () => {
      const { data } = await supabase.from('warehouses').select('warehouse_code, warehouse_name').eq('is_active', true).order('warehouse_code');
      return data || [];
    },
  });

  const filtered = (bins || []).filter(b =>
    b.bin_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.zone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.bin_description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreate = () => {
    setEditingBin(null);
    setForm({ warehouse_code: '', bin_code: '', bin_description: '', zone: '', aisle: '', shelf: '', level: '', max_weight: '', max_volume: '', is_receiving_bin: false, is_shipping_bin: false, is_default_bin: false, is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (bin: any) => {
    setEditingBin(bin);
    setForm({
      warehouse_code: bin.warehouse_code, bin_code: bin.bin_code, bin_description: bin.bin_description || '',
      zone: bin.zone || '', aisle: bin.aisle || '', shelf: bin.shelf || '', level: bin.level || '',
      max_weight: bin.max_weight?.toString() || '', max_volume: bin.max_volume?.toString() || '',
      is_receiving_bin: bin.is_receiving_bin, is_shipping_bin: bin.is_shipping_bin, is_default_bin: bin.is_default_bin, is_active: bin.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      ...form,
      max_weight: form.max_weight ? Number(form.max_weight) : null,
      max_volume: form.max_volume ? Number(form.max_volume) : null,
    };
    if (editingBin) {
      update.mutate({ id: editingBin.id, ...payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      create.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'مواقع التخزين' : 'Bin Locations'}</h1>
          <p className="text-muted-foreground">{language === 'ar' ? 'إدارة مواقع التخزين داخل المستودعات (OBIN)' : 'Manage storage bins within warehouses (OBIN)'}</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />{language === 'ar' ? 'إضافة موقع' : 'Add Bin'}</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              <CardTitle>{language === 'ar' ? 'مواقع التخزين' : 'Bin Locations'}</CardTitle>
            </div>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={language === 'ar' ? 'بحث...' : 'Search bins...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-48 h-9"><SelectValue placeholder="All Warehouses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع المستودعات' : 'All Warehouses'}</SelectItem>
                {(warehouses || []).map(w => <SelectItem key={w.warehouse_code} value={w.warehouse_code}>{w.warehouse_code} - {w.warehouse_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد مواقع تخزين' : 'No bin locations found.'}</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'المستودع' : 'Warehouse'}</TableHead>
                    <TableHead>{language === 'ar' ? 'رمز الموقع' : 'Bin Code'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المنطقة' : 'Zone'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الممر' : 'Aisle'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الرف' : 'Shelf'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'نشط' : 'Active'}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-sm">{b.warehouse_code}</TableCell>
                      <TableCell className="font-medium">{b.bin_code}</TableCell>
                      <TableCell>{b.zone || '-'}</TableCell>
                      <TableCell>{b.aisle || '-'}</TableCell>
                      <TableCell>{b.shelf || '-'}</TableCell>
                      <TableCell className="text-center space-x-1">
                        {b.is_receiving_bin && <Badge variant="outline" className="text-xs">Recv</Badge>}
                        {b.is_shipping_bin && <Badge variant="outline" className="text-xs">Ship</Badge>}
                        {b.is_default_bin && <Badge className="text-xs">Default</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(b.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingBin ? (language === 'ar' ? 'تعديل موقع' : 'Edit Bin') : (language === 'ar' ? 'إضافة موقع' : 'Add Bin Location')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>{language === 'ar' ? 'المستودع' : 'Warehouse'}</Label>
              <Select value={form.warehouse_code} onValueChange={v => setForm({ ...form, warehouse_code: v })}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {(warehouses || []).map(w => <SelectItem key={w.warehouse_code} value={w.warehouse_code}>{w.warehouse_code} - {w.warehouse_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{language === 'ar' ? 'رمز الموقع' : 'Bin Code'}</Label><Input value={form.bin_code} onChange={e => setForm({ ...form, bin_code: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label><Input value={form.bin_description} onChange={e => setForm({ ...form, bin_description: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'المنطقة' : 'Zone'}</Label><Input value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'الممر' : 'Aisle'}</Label><Input value={form.aisle} onChange={e => setForm({ ...form, aisle: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'الرف' : 'Shelf'}</Label><Input value={form.shelf} onChange={e => setForm({ ...form, shelf: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'المستوى' : 'Level'}</Label><Input value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'الوزن الأقصى' : 'Max Weight'}</Label><Input type="number" value={form.max_weight} onChange={e => setForm({ ...form, max_weight: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'الحجم الأقصى' : 'Max Volume'}</Label><Input type="number" value={form.max_volume} onChange={e => setForm({ ...form, max_volume: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_receiving_bin} onCheckedChange={v => setForm({ ...form, is_receiving_bin: v })} /><Label>Receiving Bin</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_shipping_bin} onCheckedChange={v => setForm({ ...form, is_shipping_bin: v })} /><Label>Shipping Bin</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_default_bin} onCheckedChange={v => setForm({ ...form, is_default_bin: v })} /><Label>Default Bin</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={!form.warehouse_code || !form.bin_code || create.isPending || update.isPending}>
              {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
