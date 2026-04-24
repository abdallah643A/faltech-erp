import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useProfileChangeRequests, useProfileChangeActions } from '@/hooks/useSupplierPortalEnhanced';

const statusColor = (s: string) => ({
  pending: 'bg-yellow-500/10 text-yellow-500',
  approved_primary: 'bg-blue-500/10 text-blue-500',
  approved: 'bg-green-500/10 text-green-500',
  rejected: 'bg-red-500/10 text-red-500',
  applied: 'bg-green-500/10 text-green-500',
}[s] || 'bg-gray-500/10');

export default function SupplierProfileApprovals() {
  const { data: requests = [] } = useProfileChangeRequests();
  const { review } = useProfileChangeActions();
  const [selected, setSelected] = useState<any | null>(null);
  const [reason, setReason] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Supplier Profile Change Approvals</h2>
        <p className="text-sm text-muted-foreground">Field-level diff with dual approval for sensitive fields (bank, tax, legal name)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Fields Changed</TableHead><TableHead>Sensitive</TableHead><TableHead>Approval</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {requests.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pending changes</TableCell></TableRow> :
                requests.map((r: any) => {
                  const fieldCount = Object.keys(r.changes || {}).length;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.vendor_name || r.vendor_id?.slice(0, 8) || '-'}</TableCell>
                      <TableCell>{fieldCount} field{fieldCount !== 1 ? 's' : ''}</TableCell>
                      <TableCell>{r.sensitive_fields?.length ? <Badge className="bg-orange-500/10 text-orange-500"><ShieldAlert className="h-3 w-3 mr-1" />{r.sensitive_fields.length}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{r.requires_dual_approval ? 'Dual' : 'Single'}</TableCell>
                      <TableCell><Badge className={statusColor(r.status)}>{r.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => setSelected(r)}>Review</Button></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Profile Change — {selected?.vendor_name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge className={statusColor(selected.status)}>{selected.status}</Badge>
                {selected.requires_dual_approval && <Badge className="bg-orange-500/10 text-orange-500">Dual approval required</Badge>}
              </div>
              <div className="border rounded">
                <Table>
                  <TableHeader><TableRow><TableHead>Field</TableHead><TableHead>Old</TableHead><TableHead></TableHead><TableHead>New</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {Object.entries(selected.changes || {}).map(([field, val]: any) => (
                      <TableRow key={field}>
                        <TableCell className="font-mono text-xs">{field} {selected.sensitive_fields?.includes(field) && <ShieldAlert className="h-3 w-3 inline text-orange-500" />}</TableCell>
                        <TableCell className="text-muted-foreground line-through">{String(val.old ?? '—')}</TableCell>
                        <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                        <TableCell className="font-medium">{String(val.new ?? '—')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selected.primary_decision && (
                <div className="text-xs text-muted-foreground">
                  Primary: {selected.primary_decision} on {selected.primary_reviewed_at && format(new Date(selected.primary_reviewed_at), 'dd MMM HH:mm')}
                </div>
              )}
              <Textarea placeholder="Rejection reason (if rejecting)" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
            </div>
          )}
          <DialogFooter className="gap-2">
            {selected?.status === 'pending' && (
              <>
                <Button variant="destructive" onClick={() => { if (selected) { review.mutate({ id: selected.id, level: 'primary', decision: 'rejected', reason }); setSelected(null); } }}><XCircle className="h-4 w-4 mr-2" />Reject (Primary)</Button>
                <Button className="bg-green-600" onClick={() => { if (selected) { review.mutate({ id: selected.id, level: 'primary', decision: 'approved' }); setSelected(null); } }}><CheckCircle2 className="h-4 w-4 mr-2" />Approve (Primary)</Button>
              </>
            )}
            {selected?.status === 'approved_primary' && selected?.requires_dual_approval && (
              <>
                <Button variant="destructive" onClick={() => { if (selected) { review.mutate({ id: selected.id, level: 'secondary', decision: 'rejected', reason }); setSelected(null); } }}><XCircle className="h-4 w-4 mr-2" />Reject (Secondary)</Button>
                <Button className="bg-green-600" onClick={() => { if (selected) { review.mutate({ id: selected.id, level: 'secondary', decision: 'approved' }); setSelected(null); } }}><CheckCircle2 className="h-4 w-4 mr-2" />Approve & Apply</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
