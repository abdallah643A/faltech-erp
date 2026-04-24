import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useCloseReadiness } from '@/hooks/useFinanceEnhanced';
import { Gauge, Camera, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ControllerDashboard() {
  const { data, snapshot } = useCloseReadiness();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    fiscal_year: new Date().getFullYear(), period_number: new Date().getMonth() + 1,
    unposted_je_count: 0, unbalanced_je_count: 0, pending_approvals: 0,
    open_recon_items: 0, ic_unmatched: 0, checklist_completed: 0, checklist_total: 0, notes: '',
  });

  const latest = data[0];
  const score = latest?.readiness_score ?? 0;
  const scoreColor = score >= 95 ? 'text-emerald-600' : score >= 70 ? 'text-amber-600' : 'text-destructive';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Gauge className="h-6 w-6" /> Controller Dashboard</h1>
          <p className="text-muted-foreground">Compliance and close-readiness metrics</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Camera className="h-4 w-4 mr-2" /> Capture Snapshot</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Close Readiness Snapshot</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fiscal Year</Label><Input type="number" value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: +e.target.value })} /></div>
              <div><Label>Period</Label><Input type="number" value={form.period_number} onChange={e => setForm({ ...form, period_number: +e.target.value })} /></div>
              <div><Label>Unposted JEs</Label><Input type="number" value={form.unposted_je_count} onChange={e => setForm({ ...form, unposted_je_count: +e.target.value })} /></div>
              <div><Label>Unbalanced JEs</Label><Input type="number" value={form.unbalanced_je_count} onChange={e => setForm({ ...form, unbalanced_je_count: +e.target.value })} /></div>
              <div><Label>Pending Approvals</Label><Input type="number" value={form.pending_approvals} onChange={e => setForm({ ...form, pending_approvals: +e.target.value })} /></div>
              <div><Label>Open Recon Items</Label><Input type="number" value={form.open_recon_items} onChange={e => setForm({ ...form, open_recon_items: +e.target.value })} /></div>
              <div><Label>IC Unmatched</Label><Input type="number" value={form.ic_unmatched} onChange={e => setForm({ ...form, ic_unmatched: +e.target.value })} /></div>
              <div><Label>Checklist Done / Total</Label>
                <div className="flex gap-2">
                  <Input type="number" value={form.checklist_completed} onChange={e => setForm({ ...form, checklist_completed: +e.target.value })} />
                  <Input type="number" value={form.checklist_total} onChange={e => setForm({ ...form, checklist_total: +e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={async () => { await snapshot.mutateAsync(form); setOpen(false); }}>Capture</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {latest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Current Close Readiness · FY{latest.fiscal_year} P{latest.period_number}
              <Badge variant={latest.status === 'ready' ? 'default' : latest.status === 'blocked' ? 'destructive' : 'secondary'}>{latest.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Readiness Score</span>
                <span className={`text-2xl font-bold ${scoreColor}`}>{Number(score).toFixed(1)}%</span>
              </div>
              <Progress value={score} />
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 pt-2">
              {[
                ['Unposted JEs', latest.unposted_je_count],
                ['Unbalanced', latest.unbalanced_je_count],
                ['Pending Approvals', latest.pending_approvals],
                ['Open Recons', latest.open_recon_items],
                ['IC Unmatched', latest.ic_unmatched],
                ['Checklist', `${latest.checklist_completed}/${latest.checklist_total}`],
              ].map(([k, v]: any) => (
                <div key={k} className="border rounded p-3">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="text-lg font-bold">{v}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Snapshot History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Period</TableHead><TableHead>Score</TableHead>
              <TableHead>Status</TableHead><TableHead>Blockers</TableHead><TableHead>Checklist</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No snapshots yet</TableCell></TableRow> :
                data.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{format(new Date(s.snapshot_date), 'PP HH:mm')}</TableCell>
                    <TableCell>FY{s.fiscal_year} P{s.period_number}</TableCell>
                    <TableCell className="font-bold">{Number(s.readiness_score).toFixed(1)}%</TableCell>
                    <TableCell>
                      {s.status === 'ready' ? <Badge><CheckCircle2 className="h-3 w-3 mr-1" />{s.status}</Badge> :
                        <Badge variant={s.status === 'blocked' ? 'destructive' : 'secondary'}><AlertTriangle className="h-3 w-3 mr-1" />{s.status}</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">U:{s.unposted_je_count} · B:{s.unbalanced_je_count} · A:{s.pending_approvals} · IC:{s.ic_unmatched}</TableCell>
                    <TableCell>{s.checklist_completed}/{s.checklist_total}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
