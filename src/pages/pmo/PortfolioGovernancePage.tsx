import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Briefcase } from 'lucide-react';
import { usePortfolios, useCreatePortfolio } from '@/hooks/usePMO';

export default function PortfolioGovernancePage() {
  const { data: portfolios, isLoading } = usePortfolios();
  const create = useCreatePortfolio();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ code: '', name: '', description: '', owner_name: '', strategic_objective: '', budget_total: 0 });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio Governance</h1>
          <p className="text-sm text-muted-foreground mt-1">Group projects under strategic portfolios for executive oversight and budget allocation.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Portfolio</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Portfolio</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="P-001" /></div>
                <div><Label>Owner</Label><Input value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} /></div>
              </div>
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Strategic Objective</Label><Textarea value={form.strategic_objective} onChange={e => setForm({ ...form, strategic_objective: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Total Budget</Label><Input type="number" value={form.budget_total} onChange={e => setForm({ ...form, budget_total: +e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!form.code || !form.name) return;
                await create.mutateAsync(form);
                setOpen(false); setForm({ code: '', name: '', description: '', owner_name: '', strategic_objective: '', budget_total: 0 });
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4" />Portfolios ({portfolios?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground">Loading…</div>
            : (portfolios?.length ?? 0) === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No portfolios yet.</div>
            : (
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Owner</TableHead><TableHead>Objective</TableHead><TableHead className="text-right">Budget</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {portfolios!.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">{p.code}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-xs">{p.owner_name || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md truncate">{p.strategic_objective || '—'}</TableCell>
                      <TableCell className="text-right">{Number(p.budget_total || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={p.status === 'active' ? 'default' : 'outline'}>{p.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
