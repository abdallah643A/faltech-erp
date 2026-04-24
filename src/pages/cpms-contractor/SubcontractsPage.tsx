import { useState } from 'react';
import { useSubcontracts, useUpsertSubcontract } from '@/hooks/useContractorSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Handshake, Plus } from 'lucide-react';

const STATUS_VARIANT: Record<string, any> = {
  draft: 'secondary', active: 'default', suspended: 'outline', closed: 'secondary', terminated: 'destructive',
};

export default function SubcontractsPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data = [], isLoading } = useSubcontracts();
  const upsert = useUpsertSubcontract();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ retention_pct: 10, currency: 'SAR', status: 'draft', contract_value: 0 });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Handshake className="h-6 w-6 text-primary" />{isAr ? 'إدارة عقود المقاولين الفرعيين' : 'Subcontract Administration'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'عقود FIDIC، شهادات الدفع، الضمانات' : 'FIDIC subcontracts, IPCs, retention tracking'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isAr ? 'عقد جديد' : 'New Subcontract'}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'عقد جديد' : 'New Subcontract'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{isAr ? 'رقم العقد' : 'Subcontract #'}</Label><Input value={form.subcontract_no || ''} onChange={e => setForm({ ...form, subcontract_no: e.target.value })} /></div>
              <div><Label>{isAr ? 'المقاول الفرعي' : 'Subcontractor'}</Label><Input value={form.subcontractor_name || ''} onChange={e => setForm({ ...form, subcontractor_name: e.target.value })} /></div>
              <div><Label>Project ID</Label><Input value={form.project_id || ''} onChange={e => setForm({ ...form, project_id: e.target.value })} /></div>
              <div><Label>Trade</Label><Input value={form.trade || ''} onChange={e => setForm({ ...form, trade: e.target.value })} /></div>
              <div><Label>{isAr ? 'القيمة' : 'Value'}</Label><Input type="number" value={form.contract_value} onChange={e => setForm({ ...form, contract_value: +e.target.value })} /></div>
              <div><Label>{isAr ? 'نسبة الضمان %' : 'Retention %'}</Label><Input type="number" value={form.retention_pct} onChange={e => setForm({ ...form, retention_pct: +e.target.value })} /></div>
              <div><Label>{isAr ? 'مادة FIDIC' : 'FIDIC Clause'}</Label><Input value={form.fidic_clause || ''} onChange={e => setForm({ ...form, fidic_clause: e.target.value })} /></div>
              <div><Label>Start</Label><Input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            </div>
            <Button onClick={() => upsert.mutate(form, { onSuccess: () => setOpen(false) })} disabled={upsert.isPending}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>{isAr ? 'العقود النشطة' : 'Active Subcontracts'}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{isAr ? 'رقم' : '#'}</TableHead><TableHead>{isAr ? 'المقاول' : 'Subcontractor'}</TableHead>
                <TableHead>Trade</TableHead><TableHead className="text-right">{isAr ? 'القيمة' : 'Value'}</TableHead>
                <TableHead className="text-right">{isAr ? 'مع التغييرات' : 'Revised'}</TableHead><TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.subcontract_no}</TableCell>
                    <TableCell>{r.subcontractor_name}</TableCell>
                    <TableCell>{r.trade}</TableCell>
                    <TableCell className="text-right">{Number(r.contract_value).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">{Number(r.revised_value).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[r.status] || 'secondary'}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {!data.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">{isAr ? 'لا توجد عقود' : 'No subcontracts yet'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
