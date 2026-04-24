import { useState } from 'react';
import { useVariationOrders, useUpsertVO } from '@/hooks/useContractorSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileEdit, Plus } from 'lucide-react';

export default function VariationOrdersPage() {
  const { language } = useLanguage(); const isAr = language === 'ar';
  const { data = [], isLoading } = useVariationOrders();
  const upsert = useUpsertVO();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ party: 'client', fidic_clause: '13.3', status: 'draft', cost_impact: 0, time_impact_days: 0 });

  const totals = data.reduce((a: any, r: any) => {
    if (r.status === 'approved') { a.cost += Number(r.cost_impact); a.days += Number(r.time_impact_days); }
    return a;
  }, { cost: 0, days: 0 });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><FileEdit className="h-6 w-6 text-primary" />{isAr ? 'أوامر التغيير' : 'Variation Orders (FIDIC 13)'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'تتبع التأثير على التكلفة والوقت' : 'Track cost and time impact per FIDIC clause 13'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isAr ? 'أمر جديد' : 'New VO'}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'أمر تغيير جديد' : 'New Variation Order'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>VO #</Label><Input value={form.vo_no || ''} onChange={e => setForm({ ...form, vo_no: e.target.value })} /></div>
              <div><Label>Project ID</Label><Input value={form.project_id || ''} onChange={e => setForm({ ...form, project_id: e.target.value })} /></div>
              <div><Label>{isAr ? 'الطرف' : 'Party'}</Label>
                <Select value={form.party} onValueChange={v => setForm({ ...form, party: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="client">Client</SelectItem><SelectItem value="subcontractor">Subcontractor</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>FIDIC Clause</Label><Input value={form.fidic_clause} onChange={e => setForm({ ...form, fidic_clause: e.target.value })} /></div>
              <div className="col-span-2"><Label>{isAr ? 'العنوان' : 'Title'}</Label><Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="col-span-2"><Label>{isAr ? 'الوصف' : 'Description'}</Label><Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>{isAr ? 'التأثير المالي' : 'Cost Impact'}</Label><Input type="number" value={form.cost_impact} onChange={e => setForm({ ...form, cost_impact: +e.target.value })} /></div>
              <div><Label>{isAr ? 'تمديد الوقت (يوم)' : 'Time Impact (days)'}</Label><Input type="number" value={form.time_impact_days} onChange={e => setForm({ ...form, time_impact_days: +e.target.value })} /></div>
            </div>
            <Button onClick={() => upsert.mutate(form, { onSuccess: () => setOpen(false) })} disabled={upsert.isPending}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? 'إجمالي VOs' : 'Total VOs'}</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? 'تأثير معتمد - تكلفة' : 'Approved Cost Impact'}</p><p className="text-2xl font-bold text-primary">{totals.cost.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? 'تأثير معتمد - أيام' : 'Approved Time Impact'}</p><p className="text-2xl font-bold">{totals.days}d</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{isAr ? 'سجل أوامر التغيير' : 'VO Register'}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>Title</TableHead><TableHead>Party</TableHead><TableHead>Clause</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Days</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.vo_no}</TableCell><TableCell>{r.vo_date}</TableCell>
                    <TableCell>{r.title}</TableCell><TableCell>{r.party}</TableCell><TableCell>{r.fidic_clause}</TableCell>
                    <TableCell className="text-right">{Number(r.cost_impact).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.time_impact_days}</TableCell>
                    <TableCell><Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {!data.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">{isAr ? 'لا توجد أوامر تغيير' : 'No variation orders yet'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
