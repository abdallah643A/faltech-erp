import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useConsolidationRuns } from '@/hooks/useFinanceEnhanced';
import { GitMerge, Plus, CheckCircle2, FileCheck } from 'lucide-react';

const statusVariant: Record<string, any> = {
  draft: 'secondary', in_review: 'default', approved: 'default', posted: 'default', rejected: 'destructive',
};

export default function EliminationsWorkflow() {
  const { data, isLoading, create, approve, post } = useConsolidationRuns();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    run_name: '', fiscal_year: new Date().getFullYear(), period_number: new Date().getMonth() + 1,
    consolidation_currency: 'SAR', notes: '',
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitMerge className="h-6 w-6" /> Intercompany Eliminations Workflow</h1>
          <p className="text-muted-foreground">Multi-company consolidation runs with approval and posting</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Run</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Consolidation Run</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Run Name *</Label><Input value={form.run_name} onChange={e => setForm({ ...form, run_name: e.target.value })} /></div>
              <div><Label>Fiscal Year *</Label><Input type="number" value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: +e.target.value })} /></div>
              <div><Label>Period</Label><Input type="number" value={form.period_number} onChange={e => setForm({ ...form, period_number: +e.target.value })} /></div>
              <div><Label>Currency</Label><Input value={form.consolidation_currency} onChange={e => setForm({ ...form, consolidation_currency: e.target.value })} /></div>
              <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={async () => { await create.mutateAsync(form); setOpen(false); }}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Consolidation Runs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Period</TableHead><TableHead>Eliminations</TableHead>
              <TableHead>Total Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center">Loading…</TableCell></TableRow> :
                data.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No runs</TableCell></TableRow> :
                data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.run_name}</TableCell>
                    <TableCell>FY{r.fiscal_year} P{r.period_number || '—'}</TableCell>
                    <TableCell>{r.total_eliminations}</TableCell>
                    <TableCell>{Number(r.total_elim_amount).toLocaleString()} {r.consolidation_currency}</TableCell>
                    <TableCell><Badge variant={statusVariant[r.status]}>{r.status}</Badge></TableCell>
                    <TableCell className="space-x-2">
                      {r.status === 'draft' && <Button size="sm" variant="outline" onClick={() => approve.mutate(r.id)}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>}
                      {r.status === 'approved' && <Button size="sm" onClick={() => post.mutate(r.id)}><FileCheck className="h-4 w-4 mr-1" /> Post</Button>}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
