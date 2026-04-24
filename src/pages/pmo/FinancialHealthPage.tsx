import { useState } from 'react';
import { useFinancialHealth } from '@/hooks/usePMOEnhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';

const healthBadge: Record<string, string> = {
  green: 'bg-emerald-500/10 text-emerald-700',
  amber: 'bg-amber-500/10 text-amber-700',
  red: 'bg-destructive/10 text-destructive',
};

export default function FinancialHealthPage() {
  const { list, upsert } = useFinancialHealth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({
    project_id: '', snapshot_date: new Date().toISOString().slice(0, 10),
    budget_at_completion: 0, planned_value: 0, earned_value: 0, actual_cost: 0,
    estimate_at_completion: 0, health_indicator: 'green',
  });

  const snaps = list.data ?? [];
  const greens = snaps.filter((s: any) => s.health_indicator === 'green').length;
  const reds = snaps.filter((s: any) => s.health_indicator === 'red').length;

  return (
    <div className="p-4 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> Project Financial Health (EVM)</h1>
          <p className="text-sm text-muted-foreground">Earned Value Management: PV, EV, AC, CPI, SPI, EAC, VAC</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Snapshot</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>EVM Snapshot</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2"><Label>Project ID</Label><Input value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} placeholder="UUID" /></div>
              <div><Label>Snapshot Date</Label><Input type="date" value={form.snapshot_date} onChange={e => setForm({ ...form, snapshot_date: e.target.value })} /></div>
              <div><Label>Period</Label><Input value={form.fiscal_period || ''} onChange={e => setForm({ ...form, fiscal_period: e.target.value })} placeholder="Q1-2026" /></div>
              <div><Label>BAC (Budget)</Label><Input type="number" value={form.budget_at_completion} onChange={e => setForm({ ...form, budget_at_completion: +e.target.value })} /></div>
              <div><Label>PV (Planned Value)</Label><Input type="number" value={form.planned_value} onChange={e => setForm({ ...form, planned_value: +e.target.value })} /></div>
              <div><Label>EV (Earned Value)</Label><Input type="number" value={form.earned_value} onChange={e => setForm({ ...form, earned_value: +e.target.value })} /></div>
              <div><Label>AC (Actual Cost)</Label><Input type="number" value={form.actual_cost} onChange={e => setForm({ ...form, actual_cost: +e.target.value })} /></div>
              <div><Label>EAC</Label><Input type="number" value={form.estimate_at_completion} onChange={e => setForm({ ...form, estimate_at_completion: +e.target.value })} /></div>
              <div>
                <Label>Health</Label>
                <Select value={form.health_indicator} onValueChange={v => setForm({ ...form, health_indicator: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">🟢 Green</SelectItem>
                    <SelectItem value="amber">🟡 Amber</SelectItem>
                    <SelectItem value="red">🔴 Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => upsert.mutate(form, { onSuccess: () => setOpen(false) })} disabled={upsert.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Healthy (Green)</span><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><div className="text-2xl font-bold mt-1 text-emerald-600">{greens}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Snapshots</div><div className="text-2xl font-bold mt-1">{snaps.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">At Risk (Red)</span><AlertTriangle className="h-4 w-4 text-destructive" /></div><div className="text-2xl font-bold mt-1 text-destructive">{reds}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">EVM Snapshots</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">PV</TableHead>
                <TableHead className="text-right">EV</TableHead>
                <TableHead className="text-right">AC</TableHead>
                <TableHead className="text-right">CV</TableHead>
                <TableHead className="text-right">SV</TableHead>
                <TableHead className="text-right">CPI</TableHead>
                <TableHead className="text-right">SPI</TableHead>
                <TableHead>Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snaps.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{s.snapshot_date}</TableCell>
                  <TableCell className="font-mono text-xs">{String(s.project_id).slice(0, 8)}</TableCell>
                  <TableCell className="text-right">{Number(s.planned_value).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{Number(s.earned_value).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{Number(s.actual_cost).toLocaleString()}</TableCell>
                  <TableCell className={`text-right ${Number(s.cost_variance) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{Number(s.cost_variance).toLocaleString()}</TableCell>
                  <TableCell className={`text-right ${Number(s.schedule_variance) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{Number(s.schedule_variance).toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-bold ${Number(s.cpi) < 1 ? 'text-destructive' : 'text-emerald-600'}`}>{Number(s.cpi).toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-bold ${Number(s.spi) < 1 ? 'text-destructive' : 'text-emerald-600'}`}>{Number(s.spi).toFixed(2)}</TableCell>
                  <TableCell><Badge className={healthBadge[s.health_indicator]}>{s.health_indicator}</Badge></TableCell>
                </TableRow>
              ))}
              {snaps.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No EVM snapshots yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
