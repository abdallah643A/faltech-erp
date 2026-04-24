import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useShelfLabels } from '@/hooks/useShelfLabels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tag, Plus, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Electronic Shelf Labels', ar: 'ملصقات الرفوف الإلكترونية' },
  labels: { en: 'Labels', ar: 'الملصقات' },
  queue: { en: 'Price Queue', ar: 'قائمة الأسعار' },
  queueChange: { en: 'Queue Price Change', ar: 'إضافة تغيير سعر' },
  itemCode: { en: 'Item Code', ar: 'كود المنتج' },
  oldPrice: { en: 'Old Price', ar: 'السعر القديم' },
  newPrice: { en: 'New Price', ar: 'السعر الجديد' },
  reason: { en: 'Reason', ar: 'السبب' },
  apply: { en: 'Apply', ar: 'تطبيق' },
  synced: { en: 'Synced', ar: 'متزامن' },
  pending: { en: 'Pending', ar: 'معلق' },
  discrepancies: { en: 'Discrepancies', ar: 'تناقضات' },
};

const syncColors: Record<string, string> = { synced: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', error: 'bg-red-100 text-red-800', offline: 'bg-gray-100 text-gray-800' };

export default function ShelfLabelManagementPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const [open, setOpen] = useState(false);
  const { labels, queue, isLoading, stats, queuePriceChange, applyChange } = useShelfLabels();
  const [form, setForm] = useState({ item_code: '', old_price: '', new_price: '', change_reason: '' });

  const handleQueue = () => {
    queuePriceChange.mutate({ ...form, old_price: parseFloat(form.old_price) || 0, new_price: parseFloat(form.new_price) || 0 });
    setOpen(false);
    setForm({ item_code: '', old_price: '', new_price: '', change_reason: '' });
  };

  return (
    <div className="p-6 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6" />{t.title[lang]}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t.queueChange[lang]}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.queueChange[lang]}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t.itemCode[lang]}</Label><Input value={form.item_code} onChange={e => setForm(p => ({ ...p, item_code: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t.oldPrice[lang]}</Label><Input type="number" value={form.old_price} onChange={e => setForm(p => ({ ...p, old_price: e.target.value }))} /></div>
                <div><Label>{t.newPrice[lang]}</Label><Input type="number" value={form.new_price} onChange={e => setForm(p => ({ ...p, new_price: e.target.value }))} /></div>
              </div>
              <div><Label>{t.reason[lang]}</Label><Input value={form.change_reason} onChange={e => setForm(p => ({ ...p, change_reason: e.target.value }))} /></div>
              <Button onClick={handleQueue} className="w-full">{t.queueChange[lang]}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Labels', value: stats.total, icon: Tag },
          { label: t.synced[lang], value: stats.synced, icon: CheckCircle },
          { label: t.pending[lang], value: stats.pending + stats.queuePending, icon: Clock },
          { label: t.discrepancies[lang], value: stats.discrepancies, icon: AlertTriangle },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><s.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" /><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="labels">
        <TabsList><TabsTrigger value="labels">{t.labels[lang]}</TabsTrigger><TabsTrigger value="queue">{t.queue[lang]} ({stats.queuePending})</TabsTrigger></TabsList>
        <TabsContent value="labels" className="space-y-2">
          {labels.map(l => (
            <Card key={l.id}><CardContent className="p-3 flex items-center justify-between">
              <div><p className="font-medium text-sm">{l.item_code}</p><p className="text-xs text-muted-foreground">{l.item_description}</p></div>
              <div className="flex items-center gap-3">
                <div className="text-right"><p className="text-xs text-muted-foreground">System: {l.system_price} SAR</p><p className="text-xs text-muted-foreground">Label: {l.label_price} SAR</p></div>
                <Badge className={syncColors[l.sync_status || 'synced']}>{l.sync_status}</Badge>
                {l.discrepancy && <AlertTriangle className="h-4 w-4 text-destructive" />}
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>
        <TabsContent value="queue" className="space-y-2">
          {queue.map(q => (
            <Card key={q.id}><CardContent className="p-3 flex items-center justify-between">
              <div><p className="font-medium text-sm">{q.item_code}</p><p className="text-xs text-muted-foreground">{q.old_price} → {q.new_price} SAR • {q.change_reason}</p></div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{q.status}</Badge>
                {q.status === 'pending' && <Button size="sm" variant="outline" onClick={() => applyChange.mutate(q.id)}><RefreshCw className="h-3 w-3 mr-1" />{t.apply[lang]}</Button>}
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
