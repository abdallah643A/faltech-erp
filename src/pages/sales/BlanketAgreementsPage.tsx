import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { FileText, Plus, Calendar } from 'lucide-react';
import { useBlanketAgreements } from '@/hooks/useQuoteToCash';

export default function BlanketAgreementsPage() {
  const { agreements, isLoading, createAgreement } = useBlanketAgreements();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    agreement_number: '', customer_name: '', start_date: '', end_date: '',
    total_committed_amount: 0, currency: 'SAR', status: 'draft',
  });

  const handleCreate = async () => {
    await createAgreement.mutateAsync(form);
    setOpen(false);
    setForm({ agreement_number: '', customer_name: '', start_date: '', end_date: '', total_committed_amount: 0, currency: 'SAR', status: 'draft' });
  };

  const totalCommitted = agreements.reduce((s: number, a: any) => s + Number(a.total_committed_amount || 0), 0);
  const totalDrawn = agreements.reduce((s: number, a: any) => s + Number(a.total_drawn_amount || 0), 0);

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Blanket Agreements</h1>
          <p className="text-sm text-muted-foreground">Long-term customer commitments and drawdown tracking</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Agreement</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Blanket Agreement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Agreement Number</Label><Input value={form.agreement_number} onChange={(e) => setForm({ ...form, agreement_number: e.target.value })} /></div>
              <div><Label>Customer Name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div><Label>Committed Amount (SAR)</Label><Input type="number" value={form.total_committed_amount} onChange={(e) => setForm({ ...form, total_committed_amount: parseFloat(e.target.value) || 0 })} /></div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Agreements</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{agreements.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Committed</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalCommitted.toLocaleString()} SAR</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Drawn</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalDrawn.toLocaleString()} SAR</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Agreements ({agreements.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead>Period</TableHead><TableHead>Committed</TableHead><TableHead>Drawdown</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6">Loading...</TableCell></TableRow>}
              {!isLoading && agreements.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No agreements yet</TableCell></TableRow>}
              {agreements.map((a: any) => {
                const pct = a.total_committed_amount ? (Number(a.total_drawn_amount) / Number(a.total_committed_amount)) * 100 : 0;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.agreement_number}</TableCell>
                    <TableCell>{a.customer_name || '—'}</TableCell>
                    <TableCell className="text-xs"><Calendar className="h-3 w-3 inline mr-1" />{a.start_date} → {a.end_date}</TableCell>
                    <TableCell>{Number(a.total_committed_amount).toLocaleString()} {a.currency}</TableCell>
                    <TableCell className="w-48"><Progress value={pct} className="h-2" /><span className="text-xs text-muted-foreground">{pct.toFixed(1)}% drawn</span></TableCell>
                    <TableCell><Badge variant={a.status === 'active' ? 'default' : 'outline'}>{a.status}</Badge></TableCell>
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
