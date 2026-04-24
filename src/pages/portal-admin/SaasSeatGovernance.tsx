import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSaasSeats } from '@/hooks/useUnifiedPortal';
import { Plus, Trash2, Users } from 'lucide-react';

export default function SaasSeatGovernance() {
  const { data: seats = [], assign, revoke } = useSaasSeats();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');

  const submit = () => {
    if (!email) return;
    assign.mutate({ assigned_email: email, seat_label: label }, {
      onSuccess: () => { setOpen(false); setEmail(''); setLabel(''); },
    });
  };

  const active = seats.filter((s: any) => s.status === 'active').length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Seat Governance</h1>
          <p className="text-sm text-muted-foreground">{active} active seat{active !== 1 ? 's' : ''} assigned.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Assign seat</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign a seat</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Seat label (optional)</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Sales rep #3" /></div>
              <Button className="w-full" onClick={submit} disabled={!email || assign.isPending}>Assign</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>All seats</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Email</TableHead><TableHead>Label</TableHead><TableHead>Status</TableHead>
              <TableHead>Assigned</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {seats.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.assigned_email}</TableCell>
                  <TableCell>{s.seat_label || '—'}</TableCell>
                  <TableCell><Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge></TableCell>
                  <TableCell>{new Date(s.assigned_at).toLocaleDateString()}</TableCell>
                  <TableCell>{s.status === 'active' && <Button size="sm" variant="ghost" onClick={() => revoke.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>}</TableCell>
                </TableRow>
              ))}
              {seats.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No seats assigned yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
