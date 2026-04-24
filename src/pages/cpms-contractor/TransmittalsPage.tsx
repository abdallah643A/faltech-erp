import { useState } from 'react';
import { useTransmittals, useUpsertTransmittal } from '@/hooks/useContractorSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Send, Plus } from 'lucide-react';

export default function TransmittalsPage() {
  const { language } = useLanguage(); const isAr = language === 'ar';
  const { data = [] } = useTransmittals();
  const upsert = useUpsertTransmittal();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ direction: 'outgoing', party: 'consultant', status: 'draft', doc_count: 1 });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Send className="h-6 w-6 text-primary" />{isAr ? 'إرساليات المستندات' : 'Document Transmittals'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'تتبع الوثائق الواردة والصادرة' : 'Track outgoing & incoming engineering documents'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isAr ? 'إرسالية' : 'New Transmittal'}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'إرسالية جديدة' : 'New Transmittal'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Transmittal #</Label><Input value={form.transmittal_no || ''} onChange={e => setForm({ ...form, transmittal_no: e.target.value })} /></div>
              <div><Label>Project ID</Label><Input value={form.project_id || ''} onChange={e => setForm({ ...form, project_id: e.target.value })} /></div>
              <div><Label>Direction</Label>
                <Select value={form.direction} onValueChange={v => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="outgoing">Outgoing</SelectItem><SelectItem value="incoming">Incoming</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Party</Label>
                <Select value={form.party} onValueChange={v => setForm({ ...form, party: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['client','consultant','subcontractor','supplier','other'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Party Name</Label><Input value={form.party_name || ''} onChange={e => setForm({ ...form, party_name: e.target.value })} /></div>
              <div><Label>Doc Count</Label><Input type="number" value={form.doc_count} onChange={e => setForm({ ...form, doc_count: +e.target.value })} /></div>
              <div className="col-span-2"><Label>Subject</Label><Input value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
              <div><Label>Sent Date</Label><Input type="date" value={form.sent_date || ''} onChange={e => setForm({ ...form, sent_date: e.target.value })} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <Button onClick={() => upsert.mutate(form, { onSuccess: () => setOpen(false) })} disabled={upsert.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>{isAr ? 'السجل' : 'Transmittal Log'}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Direction</TableHead><TableHead>Party</TableHead><TableHead>Subject</TableHead><TableHead className="text-right">Docs</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.transmittal_no}</TableCell>
                  <TableCell><Badge variant={r.direction === 'outgoing' ? 'default' : 'outline'}>{r.direction}</Badge></TableCell>
                  <TableCell>{r.party_name}<div className="text-xs text-muted-foreground">{r.party}</div></TableCell>
                  <TableCell className="max-w-md truncate">{r.subject}</TableCell>
                  <TableCell className="text-right">{r.doc_count}</TableCell>
                  <TableCell>{r.due_date || '—'}</TableCell>
                  <TableCell><Badge variant={r.status === 'closed' ? 'default' : r.status === 'overdue' ? 'destructive' : 'secondary'}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
              {!data.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">{isAr ? 'لا توجد إرساليات' : 'No transmittals yet'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
