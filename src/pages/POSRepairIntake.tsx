import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRepairOrders } from '@/hooks/useRepairOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Wrench, Plus, Package, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Repair & Service Intake', ar: 'استلام الإصلاح والخدمة' },
  newRepair: { en: 'New Repair Order', ar: 'أمر إصلاح جديد' },
  customer: { en: 'Customer Name', ar: 'اسم العميل' },
  phone: { en: 'Phone', ar: 'الهاتف' },
  item: { en: 'Item Description', ar: 'وصف المنتج' },
  serial: { en: 'Serial Number', ar: 'الرقم التسلسلي' },
  issue: { en: 'Issue Description', ar: 'وصف المشكلة' },
  estCost: { en: 'Estimated Cost', ar: 'التكلفة المقدرة' },
  estDate: { en: 'Est. Completion', ar: 'تاريخ الإنجاز المتوقع' },
  warranty: { en: 'Warranty Covered', ar: 'مشمول بالضمان' },
  all: { en: 'All', ar: 'الكل' },
  received: { en: 'Received', ar: 'مستلم' },
  diagnosing: { en: 'Diagnosing', ar: 'تشخيص' },
  inRepair: { en: 'In Repair', ar: 'قيد الإصلاح' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' },
  create: { en: 'Create', ar: 'إنشاء' },
};

const statusColors: Record<string, string> = {
  received: 'bg-blue-100 text-blue-800', diagnosing: 'bg-yellow-100 text-yellow-800',
  waiting_approval: 'bg-orange-100 text-orange-800', approved: 'bg-green-100 text-green-800',
  in_repair: 'bg-purple-100 text-purple-800', completed: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-gray-100 text-gray-800', cancelled: 'bg-red-100 text-red-800',
};

export default function POSRepairIntakePage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const { orders, isLoading, stats, createOrder, updateStatus } = useRepairOrders({ status: statusFilter });

  const [form, setForm] = useState({ customer_name: '', customer_phone: '', item_description: '', serial_number: '', issue_description: '', estimated_cost: '', estimated_completion: '', warranty_covered: false });

  const handleCreate = () => {
    createOrder.mutate({ ...form, estimated_cost: parseFloat(form.estimated_cost) || 0, estimated_completion: form.estimated_completion || null });
    setOpen(false);
    setForm({ customer_name: '', customer_phone: '', item_description: '', serial_number: '', issue_description: '', estimated_cost: '', estimated_completion: '', warranty_covered: false });
  };

  return (
    <div className="p-6 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" />{t.title[lang]}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t.newRepair[lang]}</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t.newRepair[lang]}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t.customer[lang]}</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
                <div><Label>{t.phone[lang]}</Label><Input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} /></div>
              </div>
              <div><Label>{t.item[lang]}</Label><Input value={form.item_description} onChange={e => setForm(p => ({ ...p, item_description: e.target.value }))} /></div>
              <div><Label>{t.serial[lang]}</Label><Input value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} /></div>
              <div><Label>{t.issue[lang]}</Label><Textarea value={form.issue_description} onChange={e => setForm(p => ({ ...p, issue_description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t.estCost[lang]}</Label><Input type="number" value={form.estimated_cost} onChange={e => setForm(p => ({ ...p, estimated_cost: e.target.value }))} /></div>
                <div><Label>{t.estDate[lang]}</Label><Input type="date" value={form.estimated_completion} onChange={e => setForm(p => ({ ...p, estimated_completion: e.target.value }))} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full">{t.create[lang]}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t.all[lang], value: stats.total, icon: Package },
          { label: t.received[lang], value: stats.received, icon: Clock },
          { label: 'Awaiting Approval', value: stats.awaitingApproval, icon: AlertTriangle },
          { label: t.inRepair[lang], value: stats.inRepair, icon: Wrench },
          { label: t.completed[lang], value: stats.completed, icon: CheckCircle },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><s.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" /><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'received', 'diagnosing', 'waiting_approval', 'in_repair', 'completed', 'delivered'].map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>{s === 'all' ? t.all[lang] : s.replace('_', ' ')}</Button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? <p>Loading...</p> : orders.map(order => (
          <Card key={order.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{order.repair_number}</span>
                    <Badge className={statusColors[order.repair_status || 'received']}>{order.repair_status}</Badge>
                    {order.warranty_covered && <Badge variant="outline" className="text-green-600">Warranty</Badge>}
                  </div>
                  <p className="text-sm font-medium">{order.customer_name} {order.customer_phone && `• ${order.customer_phone}`}</p>
                  <p className="text-sm text-muted-foreground">{order.item_description} {order.serial_number && `(S/N: ${order.serial_number})`}</p>
                  <p className="text-xs text-muted-foreground mt-1">{order.issue_description}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-bold">{order.estimated_cost} SAR</p>
                  {order.estimated_completion && <p className="text-xs text-muted-foreground">Due: {order.estimated_completion}</p>}
                  <Select onValueChange={v => updateStatus.mutate({ id: order.id, status: v })}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="Update" /></SelectTrigger>
                    <SelectContent>
                      {['received', 'diagnosing', 'waiting_approval', 'approved', 'in_repair', 'completed', 'delivered'].map(s => (
                        <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
