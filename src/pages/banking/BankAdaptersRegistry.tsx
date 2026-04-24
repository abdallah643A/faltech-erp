import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Play, Plug, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTreasBankAdapters } from '@/hooks/useTreasuryEnhanced';
import { format } from 'date-fns';

export default function BankAdaptersRegistry() {
  const { data: adapters = [], upsert, runNow } = useTreasBankAdapters();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ connection_type: 'sftp', protocol: 'mt940', is_active: true });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Bank Integration Adapters</h1>
          <p className="text-muted-foreground">SFTP, API, Host-to-Host & SWIFT MT connectors (SAMA: SARIE, MADA, SWIFT)</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Adapter</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{adapters.length}</p><p className="text-xs text-muted-foreground">Adapters</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-green-600">{adapters.filter((a: any) => a.is_active).length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{adapters.filter((a: any) => a.last_status === 'success').length}</p><p className="text-xs text-muted-foreground">Last Run OK</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-red-600">{adapters.filter((a: any) => a.last_status === 'error').length}</p><p className="text-xs text-muted-foreground">Failures</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Configured Adapters</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Adapter</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adapters.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell><div className="font-medium">{a.bank_name}</div><div className="text-xs text-muted-foreground">{a.bank_code}</div></TableCell>
                  <TableCell>{a.adapter_name}</TableCell>
                  <TableCell><Badge variant="outline"><Plug className="h-3 w-3 mr-1" />{a.connection_type}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{a.protocol}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{a.schedule_cron || '—'}</TableCell>
                  <TableCell className="text-xs">{a.last_run_at ? format(new Date(a.last_run_at), 'MMM d HH:mm') : '—'}</TableCell>
                  <TableCell>
                    {a.last_status === 'success' && <Badge><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>}
                    {a.last_status === 'error' && <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>}
                    {!a.last_status && <Badge variant="outline">Pending</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => runNow.mutate(a.id)}><Play className="h-3 w-3 mr-1" />Run</Button>
                  </TableCell>
                </TableRow>
              ))}
              {adapters.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No adapters configured</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Bank Adapter</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Adapter Name</Label><Input value={draft.adapter_name || ''} onChange={(e) => setDraft({ ...draft, adapter_name: e.target.value })} /></div>
            <div><Label>Bank Code</Label><Input value={draft.bank_code || ''} onChange={(e) => setDraft({ ...draft, bank_code: e.target.value })} /></div>
            <div className="col-span-2"><Label>Bank Name</Label><Input value={draft.bank_name || ''} onChange={(e) => setDraft({ ...draft, bank_name: e.target.value })} /></div>
            <div>
              <Label>Connection</Label>
              <Select value={draft.connection_type} onValueChange={(v) => setDraft({ ...draft, connection_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['sftp', 'api', 'host2host', 'manual_upload', 'swift_mt'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Protocol</Label>
              <Select value={draft.protocol} onValueChange={(v) => setDraft({ ...draft, protocol: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['mt940', 'camt053', 'camt054', 'csv', 'json'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Endpoint URL</Label><Input value={draft.endpoint_url || ''} onChange={(e) => setDraft({ ...draft, endpoint_url: e.target.value })} placeholder="sftp://… or https://…" /></div>
            <div><Label>Cron Schedule</Label><Input value={draft.schedule_cron || ''} onChange={(e) => setDraft({ ...draft, schedule_cron: e.target.value })} placeholder="0 6 * * *" /></div>
            <div className="flex items-center gap-2 mt-6"><Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} /><Label>Active</Label></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); setDraft({ connection_type: 'sftp', protocol: 'mt940', is_active: true }); }} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
