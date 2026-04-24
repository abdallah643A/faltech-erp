import { useState, useMemo } from 'react';
import { PMOPageShell } from '@/components/pmo/PMOPageShell';
import { useBudgetActuals, useCreateBudgetActual } from '@/hooks/usePMO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function BudgetVsActualPage() {
  const [projectId, setProjectId] = useState('');
  const { data: rows, isLoading } = useBudgetActuals(projectId);
  const create = useCreateBudgetActual();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ period_year: new Date().getFullYear(), period_month: new Date().getMonth() + 1, category: 'Labor', budgeted_amount: 0, actual_amount: 0, committed_amount: 0, notes: '' });

  const totals = useMemo(() => {
    const b = (rows || []).reduce((s: number, r: any) => s + Number(r.budgeted_amount || 0), 0);
    const a = (rows || []).reduce((s: number, r: any) => s + Number(r.actual_amount || 0), 0);
    const c = (rows || []).reduce((s: number, r: any) => s + Number(r.committed_amount || 0), 0);
    return { b, a, c, variance: a - b, variancePct: b > 0 ? ((a - b) / b) * 100 : 0 };
  }, [rows]);

  return (
    <PMOPageShell title="Budget vs Actual" description="Track budgeted, committed, and actual spend by period and category." projectId={projectId} setProjectId={setProjectId}>
      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Budgeted</p><p className="text-2xl font-bold">{totals.b.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Committed</p><p className="text-2xl font-bold">{totals.c.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Actual</p><p className="text-2xl font-bold">{totals.a.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Variance</p><p className={`text-2xl font-bold flex items-center gap-1 ${totals.variance > 0 ? 'text-destructive' : 'text-primary'}`}>
          {totals.variance > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          {totals.variance.toLocaleString()} <span className="text-sm font-normal">({totals.variancePct.toFixed(1)}%)</span>
        </p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Period Entries ({rows?.length ?? 0})</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Entry</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Budget vs Actual Entry</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Year *</Label><Input type="number" value={form.period_year} onChange={e => setForm({ ...form, period_year: +e.target.value })} /></div>
                  <div><Label>Month *</Label>
                    <Select value={String(form.period_month)} onValueChange={v => setForm({ ...form, period_month: +v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Category *</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Labor','Materials','Equipment','Subcontracts','Travel','Overhead','Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Budgeted</Label><Input type="number" value={form.budgeted_amount} onChange={e => setForm({ ...form, budgeted_amount: +e.target.value })} /></div>
                  <div><Label>Committed</Label><Input type="number" value={form.committed_amount} onChange={e => setForm({ ...form, committed_amount: +e.target.value })} /></div>
                  <div><Label>Actual</Label><Input type="number" value={form.actual_amount} onChange={e => setForm({ ...form, actual_amount: +e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  await create.mutateAsync({ ...form, project_id: projectId });
                  setOpen(false);
                }}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground">Loading…</div>
            : (rows?.length ?? 0) === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No entries.</div>
            : (
              <Table>
                <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Committed</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Variance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rows!.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{months[r.period_month - 1]} {r.period_year}</TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell className="text-right">{Number(r.budgeted_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(r.committed_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(r.actual_amount).toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-medium ${Number(r.variance) > 0 ? 'text-destructive' : 'text-primary'}`}>{Number(r.variance).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </PMOPageShell>
  );
}
