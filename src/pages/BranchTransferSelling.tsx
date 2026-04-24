import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBranchTransferSelling } from '@/hooks/useBranchTransferSelling';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Truck, Plus, Package, ArrowRight, Clock, CheckCircle } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Branch Transfer Selling', ar: 'بيع بتحويل فرعي' },
  newTransfer: { en: 'New Transfer Order', ar: 'أمر تحويل جديد' },
  customer: { en: 'Customer', ar: 'العميل' },
  phone: { en: 'Phone', ar: 'الهاتف' },
  amount: { en: 'Amount', ar: 'المبلغ' },
  deposit: { en: 'Deposit', ar: 'عربون' },
  arrival: { en: 'Expected Arrival', ar: 'الوصول المتوقع' },
  all: { en: 'All', ar: 'الكل' },
  create: { en: 'Create', ar: 'إنشاء' },
};

const statusColors: Record<string, string> = {
  requested: 'bg-blue-100 text-blue-800', approved: 'bg-green-100 text-green-800',
  in_transit: 'bg-yellow-100 text-yellow-800', received: 'bg-purple-100 text-purple-800',
  ready_pickup: 'bg-emerald-100 text-emerald-800', picked_up: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function BranchTransferSellingPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const { transfers, isLoading, stats, createTransfer, updateStatus } = useBranchTransferSelling({ status: statusFilter });
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', total_amount: '', deposit_amount: '', expected_arrival: '' });

  const handleCreate = () => {
    createTransfer.mutate({ ...form, total_amount: parseFloat(form.total_amount) || 0, deposit_amount: parseFloat(form.deposit_amount) || 0, expected_arrival: form.expected_arrival || null });
    setOpen(false);
    setForm({ customer_name: '', customer_phone: '', total_amount: '', deposit_amount: '', expected_arrival: '' });
  };

  return (
    <div className="p-6 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6" />{t.title[lang]}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t.newTransfer[lang]}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.newTransfer[lang]}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t.customer[lang]}</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
                <div><Label>{t.phone[lang]}</Label><Input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t.amount[lang]}</Label><Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} /></div>
                <div><Label>{t.deposit[lang]}</Label><Input type="number" value={form.deposit_amount} onChange={e => setForm(p => ({ ...p, deposit_amount: e.target.value }))} /></div>
              </div>
              <div><Label>{t.arrival[lang]}</Label><Input type="date" value={form.expected_arrival} onChange={e => setForm(p => ({ ...p, expected_arrival: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">{t.create[lang]}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" /><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-5 w-5 mx-auto mb-1 text-blue-600" /><p className="text-2xl font-bold">{stats.requested}</p><p className="text-xs text-muted-foreground">Requested</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Truck className="h-5 w-5 mx-auto mb-1 text-yellow-600" /><p className="text-2xl font-bold">{stats.inTransit}</p><p className="text-xs text-muted-foreground">In Transit</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" /><p className="text-2xl font-bold">{stats.readyPickup}</p><p className="text-xs text-muted-foreground">Ready</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'requested', 'approved', 'in_transit', 'received', 'ready_pickup', 'picked_up'].map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>{s === 'all' ? t.all[lang] : s.replace('_', ' ')}</Button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? <p>Loading...</p> : transfers.map(tr => (
          <Card key={tr.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{tr.transfer_number}</span>
                    <Badge className={statusColors[tr.transfer_status || 'requested']}>{tr.transfer_status?.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-sm">{tr.customer_name} {tr.customer_phone && `• ${tr.customer_phone}`}</p>
                  {tr.expected_arrival && <p className="text-xs text-muted-foreground">ETA: {tr.expected_arrival}</p>}
                </div>
                <div className="text-right space-y-1">
                  <p className="text-lg font-bold">{tr.total_amount} SAR</p>
                  {(tr.deposit_amount || 0) > 0 && <p className="text-xs text-green-600">Deposit: {tr.deposit_amount} SAR</p>}
                  <Select onValueChange={v => updateStatus.mutate({ id: tr.id, status: v })}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Update" /></SelectTrigger>
                    <SelectContent>
                      {['approved', 'in_transit', 'received', 'ready_pickup', 'picked_up'].map(s => (
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
