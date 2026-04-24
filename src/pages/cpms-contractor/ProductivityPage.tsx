import { useState } from 'react';
import { useProductivity, useLogProductivity } from '@/hooks/useContractorSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Activity, Plus } from 'lucide-react';

export default function ProductivityPage() {
  const { language } = useLanguage(); const isAr = language === 'ar';
  const { data = [] } = useProductivity();
  const log = useLogProductivity();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ resource_type: 'labor', output_qty: 0, manhours: 0, equipment_hours: 0 });

  const avg = data.length ? data.reduce((s: number, r: any) => s + (Number(r.productivity_factor) || 0), 0) / data.length : 0;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />{isAr ? 'إنتاجية العمالة والمعدات' : 'Labor & Equipment Productivity'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'مقارنة المعدل الفعلي مقابل المخطط' : 'Compare actual vs target productivity factor'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isAr ? 'تسجيل' : 'Log Entry'}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'تسجيل إنتاجية' : 'Log Productivity'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Project ID</Label><Input value={form.project_id || ''} onChange={e => setForm({ ...form, project_id: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.log_date || ''} onChange={e => setForm({ ...form, log_date: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.resource_type} onValueChange={v => setForm({ ...form, resource_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="labor">Labor</SelectItem><SelectItem value="equipment">Equipment</SelectItem><SelectItem value="crew">Crew</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Resource Name</Label><Input value={form.resource_name || ''} onChange={e => setForm({ ...form, resource_name: e.target.value })} /></div>
              <div><Label>Trade / Cost Code</Label><Input value={form.trade || ''} onChange={e => setForm({ ...form, trade: e.target.value })} /></div>
              <div><Label>UOM</Label><Input value={form.uom || ''} onChange={e => setForm({ ...form, uom: e.target.value })} /></div>
              <div><Label>{isAr ? 'الكمية المنفذة' : 'Output Qty'}</Label><Input type="number" value={form.output_qty} onChange={e => setForm({ ...form, output_qty: +e.target.value })} /></div>
              <div><Label>{isAr ? 'ساعات العمل' : 'Manhours'}</Label><Input type="number" value={form.manhours} onChange={e => setForm({ ...form, manhours: +e.target.value })} /></div>
              <div><Label>{isAr ? 'ساعات المعدات' : 'Equipment Hrs'}</Label><Input type="number" value={form.equipment_hours} onChange={e => setForm({ ...form, equipment_hours: +e.target.value })} /></div>
              <div><Label>{isAr ? 'المعدل المخطط (س/و)' : 'Budget Rate (hr/uom)'}</Label><Input type="number" value={form.budget_rate || ''} onChange={e => setForm({ ...form, budget_rate: +e.target.value })} /></div>
            </div>
            <Button onClick={() => log.mutate(form, { onSuccess: () => setOpen(false) })} disabled={log.isPending}>Log</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? 'سجلات' : 'Entries'}</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? 'متوسط معامل الإنتاجية' : 'Avg Productivity Factor'}</p><p className={`text-2xl font-bold ${avg >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>{avg.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? 'الهدف' : 'Target'}</p><p className="text-2xl font-bold">≥ 1.00</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{isAr ? 'السجل' : 'Productivity Log'}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Resource</TableHead><TableHead>Trade</TableHead><TableHead className="text-right">Output</TableHead><TableHead className="text-right">MHrs</TableHead><TableHead className="text-right">Actual Rate</TableHead><TableHead className="text-right">PF</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.slice(0, 100).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.log_date}</TableCell>
                  <TableCell>{r.resource_name} <Badge variant="outline" className="ml-1">{r.resource_type}</Badge></TableCell>
                  <TableCell>{r.trade}</TableCell>
                  <TableCell className="text-right">{Number(r.output_qty).toFixed(2)} {r.uom}</TableCell>
                  <TableCell className="text-right">{Number(r.manhours).toFixed(1)}</TableCell>
                  <TableCell className="text-right">{r.actual_rate ? Number(r.actual_rate).toFixed(3) : '—'}</TableCell>
                  <TableCell className={`text-right font-semibold ${r.productivity_factor >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>{r.productivity_factor ? Number(r.productivity_factor).toFixed(2) : '—'}</TableCell>
                </TableRow>
              ))}
              {!data.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">{isAr ? 'لا توجد سجلات' : 'No entries yet'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
