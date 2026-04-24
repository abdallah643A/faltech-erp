import { useState } from 'react';
import { useDelayEvents, useUpsertDelay } from '@/hooks/useContractorSuite';
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
import { Clock, Plus } from 'lucide-react';

const CAUSES = ['weather', 'client_change', 'design', 'supplier', 'force_majeure', 'other'];

export default function DelayRegisterPage() {
  const { language } = useLanguage(); const isAr = language === 'ar';
  const { data = [] } = useDelayEvents();
  const upsert = useUpsertDelay();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ cause_category: 'weather', impact_days: 0, eot_claimed_days: 0, eot_granted_days: 0, fidic_clause: '8.5', status: 'open' });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Clock className="h-6 w-6 text-primary" />{isAr ? 'سجل التأخير / تمديد المدة (EOT)' : 'Delay & EOT Register (FIDIC 8.5)'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'تسجيل أحداث التأخير ومطالبات تمديد المدة' : 'Track delay events and Extension of Time claims'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isAr ? 'حدث تأخير' : 'New Delay Event'}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'حدث تأخير' : 'Delay Event'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Event #</Label><Input value={form.event_no || ''} onChange={e => setForm({ ...form, event_no: e.target.value })} /></div>
              <div><Label>Project ID</Label><Input value={form.project_id || ''} onChange={e => setForm({ ...form, project_id: e.target.value })} /></div>
              <div><Label>{isAr ? 'السبب' : 'Cause'}</Label>
                <Select value={form.cause_category} onValueChange={v => setForm({ ...form, cause_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CAUSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>FIDIC Clause</Label><Input value={form.fidic_clause} onChange={e => setForm({ ...form, fidic_clause: e.target.value })} /></div>
              <div className="col-span-2"><Label>{isAr ? 'الوصف' : 'Description'}</Label><Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>{isAr ? 'أيام التأثير' : 'Impact Days'}</Label><Input type="number" value={form.impact_days} onChange={e => setForm({ ...form, impact_days: +e.target.value })} /></div>
              <div><Label>{isAr ? 'EOT مطلوب' : 'EOT Claimed (days)'}</Label><Input type="number" value={form.eot_claimed_days} onChange={e => setForm({ ...form, eot_claimed_days: +e.target.value })} /></div>
            </div>
            <Button onClick={() => upsert.mutate(form, { onSuccess: () => setOpen(false) })} disabled={upsert.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>{isAr ? 'سجل أحداث التأخير' : 'Delay Events'}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>Cause</TableHead><TableHead>Clause</TableHead><TableHead className="text-right">Impact</TableHead><TableHead className="text-right">Claimed</TableHead><TableHead className="text-right">Granted</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.event_no}</TableCell>
                  <TableCell>{r.event_date}</TableCell>
                  <TableCell><Badge variant="outline">{r.cause_category}</Badge></TableCell>
                  <TableCell>{r.fidic_clause}</TableCell>
                  <TableCell className="text-right">{r.impact_days}d</TableCell>
                  <TableCell className="text-right">{r.eot_claimed_days}d</TableCell>
                  <TableCell className="text-right text-emerald-600">{r.eot_granted_days}d</TableCell>
                  <TableCell><Badge variant={r.status === 'awarded' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
              {!data.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">{isAr ? 'لا توجد أحداث' : 'No delay events yet'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
