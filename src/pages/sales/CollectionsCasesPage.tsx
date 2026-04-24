import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Plus, Phone } from 'lucide-react';
import { useCollectionCases } from '@/hooks/useQuoteToCash';

export default function CollectionsCasesPage() {
  const { cases, isLoading, stats, createCase, updateCase } = useCollectionCases();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ case_number: '', customer_name: '', total_overdue: 0, priority: 'medium', status: 'open' });

  const handleCreate = async () => {
    await createCase.mutateAsync({ ...form, customer_id: crypto.randomUUID() });
    setOpen(false);
    setForm({ case_number: '', customer_name: '', total_overdue: 0, priority: 'medium', status: 'open' });
  };

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6 text-primary" /> Collections Cases</h1>
          <p className="text-sm text-muted-foreground">Workflow-driven collections with promises-to-pay tracking</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Open Case</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Open Collection Case</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Case Number</Label><Input value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} /></div>
              <div><Label>Customer Name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Total Overdue (SAR)</Label><Input type="number" value={form.total_overdue} onChange={(e) => setForm({ ...form, total_overdue: parseFloat(e.target.value) || 0 })} /></div>
              <Button onClick={handleCreate} className="w-full">Open</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Cases</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalCases}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{stats.open}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Promised</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-success">{stats.promised}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Overdue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalOverdue.toLocaleString()} SAR</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Cases ({cases.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Case</TableHead><TableHead>Customer</TableHead><TableHead>Overdue</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Promise Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6">Loading...</TableCell></TableRow>}
              {!isLoading && cases.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No cases</TableCell></TableRow>}
              {cases.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.case_number}</TableCell>
                  <TableCell>{c.customer_name}</TableCell>
                  <TableCell>{Number(c.total_overdue).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={c.priority === 'high' ? 'destructive' : 'secondary'}>{c.priority}</Badge></TableCell>
                  <TableCell><Badge variant={c.status === 'open' ? 'destructive' : 'default'}>{c.status}</Badge></TableCell>
                  <TableCell>{c.promise_to_pay_date || '—'}</TableCell>
                  <TableCell>
                    {c.status === 'open' && <Button size="sm" variant="ghost" onClick={() => updateCase.mutate({ id: c.id, status: 'closed', closed_at: new Date().toISOString() })}>Close</Button>}
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
