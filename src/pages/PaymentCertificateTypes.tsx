import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePaymentCertificateTypes } from '@/hooks/usePaymentCertificates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Settings, Pencil, Trash2 } from 'lucide-react';

export default function PaymentCertificateTypes() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { types, isLoading, createType, updateType, deleteType } = usePaymentCertificateTypes();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', name_ar: '', description: '', sort_order: '0' });

  const resetForm = () => {
    setForm({ name: '', name_ar: '', description: '', sort_order: '0' });
    setEditingId(null);
  };

  const handleOpen = (type?: any) => {
    if (type) {
      setEditingId(type.id);
      setForm({
        name: type.name,
        name_ar: type.name_ar || '',
        description: type.description || '',
        sort_order: String(type.sort_order || 0),
      });
    } else {
      resetForm();
    }
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    const payload = {
      name: form.name,
      name_ar: form.name_ar || null,
      description: form.description || null,
      sort_order: parseInt(form.sort_order) || 0,
    };
    if (editingId) {
      updateType.mutate({ id: editingId, ...payload }, { onSuccess: () => { setOpen(false); resetForm(); } });
    } else {
      createType.mutate(payload, { onSuccess: () => { setOpen(false); resetForm(); } });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isAr ? 'أنواع شهادات الدفع' : 'Payment Certificate Types'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'إعداد وإدارة أنواع شهادات الدفع' : 'Configure and manage payment certificate types'}
          </p>
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          {isAr ? 'نوع جديد' : 'New Type'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {isAr ? 'أنواع الشهادات' : 'Certificate Types'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : !types?.length ? (
            <p className="text-center py-8 text-muted-foreground">
              {isAr ? 'لا توجد أنواع. أضف نوع جديد للبدء.' : 'No types yet. Add a new type to get started.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? 'الاسم (EN)' : 'Name (EN)'}</TableHead>
                  <TableHead>{isAr ? 'الاسم (AR)' : 'Name (AR)'}</TableHead>
                  <TableHead>{isAr ? 'الوصف' : 'Description'}</TableHead>
                  <TableHead>{isAr ? 'الترتيب' : 'Order'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.name_ar || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.description || '-'}</TableCell>
                    <TableCell>{t.sort_order}</TableCell>
                    <TableCell>
                      <Switch
                        checked={t.is_active}
                        onCheckedChange={checked => updateType.mutate({ id: t.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteType.mutate(t.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? (isAr ? 'تعديل النوع' : 'Edit Type')
                : (isAr ? 'إضافة نوع جديد' : 'Add New Type')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? 'الاسم (English)' : 'Name (English)'}</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الاسم (العربية)' : 'Name (Arabic)'}</Label>
              <Input value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))} dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الوصف' : 'Description'}</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الترتيب' : 'Sort Order'}</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={createType.isPending || updateType.isPending}>
              {isAr ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
