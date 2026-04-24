import { useState } from 'react';
import { useClientIPCs, useUpsertClientIPC } from '@/hooks/useContractorSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Receipt, Plus } from 'lucide-react';

export default function ClientIPCPage() {
  const { language } = useLanguage(); const isAr = language === 'ar';
  const { data = [], isLoading } = useClientIPCs();
  const upsert = useUpsertClientIPC();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ ipc_no: 1, retention_pct: 10, cumulative_work_done: 0, previous_certified: 0, materials_on_site: 0, advance_recovery: 0, status: 'draft' });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" />{isAr ? 'شهادات الدفع للعميل (IPC)' : 'Client Progress Billing (IPC)'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'حساب تلقائي للضمان وضريبة القيمة المضافة' : 'Auto retention, advance recovery & VAT'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isAr ? 'IPC جديد' : 'New IPC'}</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{isAr ? 'شهادة دفع جديدة' : 'New Interim Payment Certificate'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Project ID</Label><Input value={form.project_id || ''} onChange={e => setForm({ ...form, project_id: e.target.value })} /></div>
              <div><Label>IPC #</Label><Input type="number" value={form.ipc_no} onChange={e => setForm({ ...form, ipc_no: +e.target.value })} /></div>
              <div><Label>Period From</Label><Input type="date" value={form.period_from || ''} onChange={e => setForm({ ...form, period_from: e.target.value })} /></div>
              <div><Label>Period To</Label><Input type="date" value={form.period_to || ''} onChange={e => setForm({ ...form, period_to: e.target.value })} /></div>
              <div><Label>{isAr ? 'تراكمي العمل المنفذ' : 'Cumulative Work Done'}</Label><Input type="number" value={form.cumulative_work_done} onChange={e => setForm({ ...form, cumulative_work_done: +e.target.value })} /></div>
              <div><Label>{isAr ? 'سابق معتمد' : 'Previous Certified'}</Label><Input type="number" value={form.previous_certified} onChange={e => setForm({ ...form, previous_certified: +e.target.value })} /></div>
              <div><Label>{isAr ? 'مواد بالموقع' : 'Materials on Site'}</Label><Input type="number" value={form.materials_on_site} onChange={e => setForm({ ...form, materials_on_site: +e.target.value })} /></div>
              <div><Label>{isAr ? 'استرداد دفعة مقدمة' : 'Advance Recovery'}</Label><Input type="number" value={form.advance_recovery} onChange={e => setForm({ ...form, advance_recovery: +e.target.value })} /></div>
              <div><Label>{isAr ? 'نسبة الضمان %' : 'Retention %'}</Label><Input type="number" value={form.retention_pct} onChange={e => setForm({ ...form, retention_pct: +e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">{isAr ? 'سيتم احتساب الضمان وضريبة القيمة المضافة (15%) تلقائياً.' : 'Retention and VAT (15%) will be auto-calculated.'}</p>
            <Button onClick={() => upsert.mutate(form, { onSuccess: () => setOpen(false) })} disabled={upsert.isPending}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>{isAr ? 'شهادات الدفع' : 'Interim Payment Certificates'}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>IPC#</TableHead><TableHead>Period</TableHead>
                <TableHead className="text-right">This Period</TableHead>
                <TableHead className="text-right">Retention</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Net Certified</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">#{r.ipc_no}</TableCell>
                    <TableCell className="text-xs">{r.period_from} → {r.period_to}</TableCell>
                    <TableCell className="text-right">{Number(r.this_period).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-amber-600">-{Number(r.retention_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(r.vat_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{Number(r.net_certified).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={r.status === 'certified' ? 'default' : r.status === 'collected' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {!data.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">{isAr ? 'لا توجد شهادات' : 'No IPCs yet'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
