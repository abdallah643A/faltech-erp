import { useState } from 'react';
import { useFleetCompliance, useFleetComplianceMutations } from '@/hooks/useFleetEnhanced';
import { useFleetAssets } from '@/hooks/useFleetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Plus, AlertTriangle } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

export default function FleetComplianceReminders() {
  const { data: docs = [], isLoading } = useFleetCompliance();
  const { data: assets = [] } = useFleetAssets();
  const { upsert } = useFleetComplianceMutations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    asset_id: '', document_type: 'registration', document_number: '', issuer: '',
    issue_date: '', expiry_date: '', reminder_days_before: 30, status: 'active', cost: 0,
  });

  const expiryStatus = (d: any) => {
    const days = differenceInDays(new Date(d.expiry_date), new Date());
    if (days < 0) return { label: 'Expired', variant: 'destructive' as const, icon: true };
    if (days <= (d.reminder_days_before || 30)) return { label: `${days}d left`, variant: 'default' as const, icon: true };
    return { label: `${days}d`, variant: 'outline' as const, icon: false };
  };

  const submit = async () => {
    if (!form.asset_id || !form.expiry_date) return;
    await upsert.mutateAsync(form);
    setOpen(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Compliance Reminders</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Document</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Compliance Document</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Vehicle *</Label>
                <Select value={form.asset_id} onValueChange={v => setForm({ ...form, asset_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.document_type} onValueChange={v => setForm({ ...form, document_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['registration','insurance','inspection','permit','license','other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Document #</Label>
                  <Input value={form.document_number} onChange={e => setForm({ ...form, document_number: e.target.value })} />
                </div>
                <div>
                  <Label>Issuer</Label>
                  <Input value={form.issuer} onChange={e => setForm({ ...form, issuer: e.target.value })} />
                </div>
                <div>
                  <Label>Cost</Label>
                  <Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Issue Date</Label>
                  <Input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} />
                </div>
                <div>
                  <Label>Expiry Date *</Label>
                  <Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
                <div>
                  <Label>Reminder (days before)</Label>
                  <Input type="number" value={form.reminder_days_before} onChange={e => setForm({ ...form, reminder_days_before: Number(e.target.value) })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={upsert.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Documents — sorted by expiry</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Vehicle</TableHead><TableHead>Type</TableHead><TableHead>Document #</TableHead>
              <TableHead>Issuer</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
                docs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No documents</TableCell></TableRow> :
                docs.map((d: any) => {
                  const st = expiryStatus(d);
                  const asset = assets.find((a: any) => a.id === d.asset_id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs">{asset?.asset_name || '—'}</TableCell>
                      <TableCell className="text-xs capitalize">{d.document_type}</TableCell>
                      <TableCell className="text-xs font-mono">{d.document_number || '—'}</TableCell>
                      <TableCell className="text-xs">{d.issuer || '—'}</TableCell>
                      <TableCell className="text-xs">{format(new Date(d.expiry_date), 'PP')}</TableCell>
                      <TableCell><Badge variant={st.variant} className="text-[10px]">{st.icon && <AlertTriangle className="h-3 w-3 mr-1" />}{st.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
