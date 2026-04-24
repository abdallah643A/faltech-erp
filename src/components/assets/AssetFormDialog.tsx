import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Asset, AssetCategory } from '@/hooks/useAssets';

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset | null;
  categories: AssetCategory[];
  onSave: (data: Record<string, any>) => void;
}

export function AssetFormDialog({ open, onOpenChange, asset, categories, onSave }: AssetFormDialogProps) {
  const { language } = useLanguage();
  const isEdit = !!asset;

  const [form, setForm] = useState({
    name: '', category_id: '', serial_number: '', purchase_value: '',
    current_value: '', location: '', department: '', vendor: '',
    purchase_date: '', warranty_start: '', warranty_end: '',
    condition: 'new', depreciation_method: 'straight_line', depreciation_rate: '20',
    notes: '',
  });

  useEffect(() => {
    if (asset) {
      setForm({
        name: asset.name || '',
        category_id: asset.category_id || '',
        serial_number: asset.serial_number || '',
        purchase_value: String(asset.purchase_value || ''),
        current_value: String(asset.current_value || ''),
        location: asset.location || '',
        department: asset.department || '',
        vendor: asset.vendor || '',
        purchase_date: asset.purchase_date || '',
        warranty_start: asset.warranty_start || '',
        warranty_end: asset.warranty_end || '',
        condition: asset.condition || 'new',
        depreciation_method: asset.depreciation_method || 'straight_line',
        depreciation_rate: String(asset.depreciation_rate || '20'),
        notes: asset.notes || '',
      });
    } else {
      setForm({
        name: '', category_id: '', serial_number: '', purchase_value: '',
        current_value: '', location: '', department: '', vendor: '',
        purchase_date: '', warranty_start: '', warranty_end: '',
        condition: 'new', depreciation_method: 'straight_line', depreciation_rate: '20',
        notes: '',
      });
    }
  }, [asset, open]);

  const handleSave = () => {
    const data: Record<string, any> = {
      name: form.name,
      category_id: form.category_id || null,
      serial_number: form.serial_number || null,
      purchase_value: parseFloat(form.purchase_value) || 0,
      current_value: parseFloat(form.current_value) || parseFloat(form.purchase_value) || 0,
      location: form.location || null,
      department: form.department || null,
      vendor: form.vendor || null,
      purchase_date: form.purchase_date || null,
      warranty_start: form.warranty_start || null,
      warranty_end: form.warranty_end || null,
      condition: form.condition,
      depreciation_method: form.depreciation_method || null,
      depreciation_rate: parseFloat(form.depreciation_rate) || null,
      notes: form.notes || null,
    };
    if (isEdit) data.id = asset!.id;
    onSave(data);
    onOpenChange(false);
  };

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit Asset', 'تعديل أصل') : t('Register New Asset', 'تسجيل أصل جديد')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Asset Name', 'اسم الأصل')} *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('Category', 'الفئة')}</Label>
              <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder={t('Select', 'اختر')} /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{language === 'ar' ? (c.name_ar || c.name) : c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Serial Number', 'الرقم التسلسلي')}</Label>
              <Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('Vendor', 'المورد')}</Label>
              <Input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('Purchase Date', 'تاريخ الشراء')}</Label>
              <Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('Purchase Value', 'قيمة الشراء')}</Label>
              <Input type="number" value={form.purchase_value} onChange={e => setForm({ ...form, purchase_value: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('Current Value', 'القيمة الحالية')}</Label>
              <Input type="number" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Warranty Start', 'بداية الضمان')}</Label>
              <Input type="date" value={form.warranty_start} onChange={e => setForm({ ...form, warranty_start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('Warranty End', 'نهاية الضمان')}</Label>
              <Input type="date" value={form.warranty_end} onChange={e => setForm({ ...form, warranty_end: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Location', 'الموقع')}</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('Department', 'القسم')}</Label>
              <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('Condition', 'الحالة')}</Label>
              <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{t('New', 'جديد')}</SelectItem>
                  <SelectItem value="good">{t('Good', 'جيد')}</SelectItem>
                  <SelectItem value="fair">{t('Fair', 'مقبول')}</SelectItem>
                  <SelectItem value="poor">{t('Poor', 'ضعيف')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('Depreciation', 'الإهلاك')}</Label>
              <Select value={form.depreciation_method} onValueChange={v => setForm({ ...form, depreciation_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">{t('Straight Line', 'خط مستقيم')}</SelectItem>
                  <SelectItem value="declining">{t('Declining', 'متناقص')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('Rate %', 'النسبة %')}</Label>
              <Input type="number" value={form.depreciation_rate} onChange={e => setForm({ ...form, depreciation_rate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('Notes', 'ملاحظات')}</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel', 'إلغاء')}</Button>
          <Button onClick={handleSave} disabled={!form.name}>{t('Save', 'حفظ')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
