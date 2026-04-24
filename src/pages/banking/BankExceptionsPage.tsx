import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBankExceptions, useResolveException } from '@/hooks/useBankRecon';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function BankExceptionsPage() {
  const { data: exc = [], isLoading } = useBankExceptions();
  const resolve = useResolveException();
  const [editing, setEditing] = useState<any>(null);
  const [status, setStatus] = useState('resolved');
  const [notes, setNotes] = useState('');

  const counts = exc.reduce((a: any, e: any) => { a[e.severity] = (a[e.severity] ?? 0) + 1; return a; }, {});
  const open = exc.filter((e: any) => e.status === 'open').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bank Exceptions</h1>
        <p className="text-muted-foreground">Investigate and resolve unmatched or disputed bank items</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold">{open}</p><p className="text-sm text-muted-foreground">Open</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-red-600">{counts.critical ?? 0}</p><p className="text-sm text-muted-foreground">Critical</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-amber-600">{counts.high ?? 0}</p><p className="text-sm text-muted-foreground">High</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold">{exc.length}</p><p className="text-sm text-muted-foreground">Total</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Exception Queue</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-6">Loading…</TableCell></TableRow>
              : exc.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell><Badge variant="outline">{e.exception_type}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={e.severity === 'critical' || e.severity === 'high' ? 'destructive' : e.severity === 'medium' ? 'secondary' : 'outline'}>
                      {e.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[400px] truncate">{e.description}</TableCell>
                  <TableCell>
                    {e.status === 'resolved' ? <Badge><CheckCircle2 className="h-3 w-3 mr-1" />{e.status}</Badge>
                    : e.status === 'open' ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{e.status}</Badge>
                    : <Badge variant="secondary">{e.status}</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {e.status !== 'resolved' && (
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(e); setStatus('resolved'); setNotes(''); }}>Resolve</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && exc.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">No exceptions</p>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Exception</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="wont_fix">Won't fix</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Resolution notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => resolve.mutate({ id: editing.id, status, notes }, { onSuccess: () => setEditing(null) })}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
