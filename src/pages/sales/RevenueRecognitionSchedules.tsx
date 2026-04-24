import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Plus } from 'lucide-react';
import { useRevenueRecognition } from '@/hooks/useQuoteToCash';

export default function RevenueRecognitionSchedules() {
  const { schedules, isLoading, stats, createSchedule } = useRevenueRecognition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ invoice_number: '', total_amount: 0, recognition_method: 'straight_line', start_date: '', end_date: '' });

  const handleCreate = async () => {
    await createSchedule.mutateAsync({ ...form, deferred_amount: form.total_amount, recognized_amount: 0 });
    setOpen(false);
    setForm({ invoice_number: '', total_amount: 0, recognition_method: 'straight_line', start_date: '', end_date: '' });
  };

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" /> Revenue Recognition</h1>
          <p className="text-sm text-muted-foreground">Deferred revenue schedules with period-based recognition</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Schedule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Revenue Recognition Schedule</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Invoice Number</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></div>
              <div><Label>Total Amount</Label><Input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) || 0 })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Schedules</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Amount</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalAmount.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Recognized</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-success">{stats.recognized.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Deferred</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-warning">{stats.deferred.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Schedules</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Period</TableHead><TableHead>Recognition</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6">Loading...</TableCell></TableRow>}
              {!isLoading && schedules.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No schedules</TableCell></TableRow>}
              {schedules.map((s: any) => {
                const pct = s.total_amount ? (Number(s.recognized_amount) / Number(s.total_amount)) * 100 : 0;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.invoice_number}</TableCell>
                    <TableCell>{Number(s.total_amount).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{s.recognition_method}</Badge></TableCell>
                    <TableCell className="text-xs">{s.start_date} → {s.end_date}</TableCell>
                    <TableCell className="w-40"><Progress value={pct} className="h-2" /><span className="text-xs">{pct.toFixed(1)}%</span></TableCell>
                    <TableCell><Badge>{s.status}</Badge></TableCell>
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
