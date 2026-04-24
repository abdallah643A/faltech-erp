import { useState } from 'react';
import { useSourcingEvents, useSourcingBidders } from '@/hooks/useProcurementStrategic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Target, Trophy } from 'lucide-react';

const STATUS_VARIANT: Record<string, any> = { draft: 'secondary', open: 'default', evaluating: 'default', awarded: 'default', cancelled: 'destructive', closed: 'outline' };

export default function SourcingEvents() {
  const { data, isLoading, upsert } = useSourcingEvents();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ event_name: '', sourcing_strategy: 'rfq', currency: 'SAR', status: 'draft', baseline_spend: 0, target_savings_pct: 0 });
  const bidders = useSourcingBidders(selectedId ?? undefined);

  const submit = async () => {
    await upsert.mutateAsync({ ...form, event_number: form.event_number || `SRC-${Date.now()}` });
    setOpen(false);
    setForm({ event_name: '', sourcing_strategy: 'rfq', currency: 'SAR', status: 'draft', baseline_spend: 0, target_savings_pct: 0 });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Strategic Sourcing Events</h1>
          <p className="text-xs text-muted-foreground">Manage sourcing pipelines from RFx through award with savings tracking</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Event</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Sourcing Event</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Event Name</Label><Input value={form.event_name} onChange={e => setForm({...form, event_name: e.target.value})} /></div>
              <div><Label>Strategy</Label>
                <Select value={form.sourcing_strategy} onValueChange={v => setForm({...form, sourcing_strategy: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['rfq','rfp','rfi','auction','direct_award','framework'].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} /></div>
              <div><Label>Baseline Spend</Label><Input type="number" value={form.baseline_spend} onChange={e => setForm({...form, baseline_spend: +e.target.value})} /></div>
              <div><Label>Target Savings %</Label><Input type="number" value={form.target_savings_pct} onChange={e => setForm({...form, target_savings_pct: +e.target.value})} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date || ''} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
              <div><Label>Region</Label><Input value={form.region_code || ''} onChange={e => setForm({...form, region_code: e.target.value})} placeholder="KSA-C" /></div>
            </div>
            <Button onClick={submit} disabled={upsert.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Pipeline</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-muted-foreground">Loading…</div> : !data?.length ? (
            <div className="text-center text-muted-foreground py-8">No sourcing events yet. Create your first event to start tracking savings.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Event #</TableHead><TableHead>Name</TableHead><TableHead>Strategy</TableHead>
                <TableHead className="text-right">Baseline</TableHead><TableHead className="text-right">Target %</TableHead>
                <TableHead className="text-right">Saved</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((e: any) => (
                  <TableRow key={e.id} className={selectedId === e.id ? 'bg-muted/50' : ''}>
                    <TableCell className="font-mono text-xs">{e.event_number}</TableCell>
                    <TableCell>{e.event_name}</TableCell>
                    <TableCell><Badge variant="outline">{e.sourcing_strategy?.toUpperCase()}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{Number(e.baseline_spend).toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.target_savings_pct}%</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(e.achieved_savings).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[e.status] || 'outline'}>{e.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setSelectedId(e.id)}>View Bids</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4" /> Bidders</CardTitle></CardHeader>
          <CardContent>
            {!bidders.data?.length ? <div className="text-muted-foreground text-sm">No bidders yet.</div> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Vendor</TableHead><TableHead className="text-right">Bid</TableHead>
                  <TableHead className="text-right">Tech</TableHead><TableHead className="text-right">Comm</TableHead>
                  <TableHead className="text-right">Total</TableHead><TableHead>Award</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bidders.data.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.vendor_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{b.bid_amount ? Number(b.bid_amount).toLocaleString() : '—'}</TableCell>
                      <TableCell className="text-right">{b.technical_score ?? '—'}</TableCell>
                      <TableCell className="text-right">{b.commercial_score ?? '—'}</TableCell>
                      <TableCell className="text-right font-semibold">{b.total_score ?? '—'}</TableCell>
                      <TableCell>{b.is_awarded ? <Badge>Awarded</Badge> : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
