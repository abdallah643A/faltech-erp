import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Check, X } from 'lucide-react';
import { usePortalSubscriptionRequests } from '@/hooks/usePortalEnhanced';
import { format } from 'date-fns';

export default function PortalSubscriptionRequests() {
  const { data: rows = [], decide } = usePortalSubscriptionRequests();
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const apply = (id: string, status: 'approved' | 'rejected') => {
    decide.mutate({ id, status, decision_notes: notes }, { onSuccess: () => { setOpen(null); setNotes(''); } });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2"><CreditCard className="h-6 w-6" /><h1 className="text-2xl font-bold">Subscription Requests</h1></div>
      <Card>
        <CardHeader><CardTitle>Self-service requests ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Type</TableHead><TableHead>Tenant</TableHead><TableHead>Requested seats</TableHead>
              <TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="capitalize">{r.request_type}</TableCell>
                  <TableCell className="font-mono text-xs">{r.tenant_id?.slice(0, 8) || '—'}</TableCell>
                  <TableCell>{r.requested_seats ?? '—'}</TableCell>
                  <TableCell><Badge variant={r.status === 'pending' ? 'secondary' : r.status === 'approved' ? 'default' : 'destructive'}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    {r.status === 'pending' && (
                      <Dialog open={open === r.id} onOpenChange={(o) => setOpen(o ? r.id : null)}>
                        <DialogTrigger asChild><Button size="sm" variant="outline">Review</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Review subscription request</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">{r.notes || 'No notes provided.'}</p>
                            <Textarea placeholder="Decision notes" value={notes} onChange={e => setNotes(e.target.value)} />
                            <div className="flex gap-2">
                              <Button className="flex-1" onClick={() => apply(r.id, 'approved')}><Check className="h-4 w-4 mr-2" /> Approve</Button>
                              <Button className="flex-1" variant="destructive" onClick={() => apply(r.id, 'rejected')}><X className="h-4 w-4 mr-2" /> Reject</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No requests pending</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
