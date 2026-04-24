import { useState } from 'react';
import { useFinancialClose } from '@/hooks/useFinancialClose';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Clock, Shield } from 'lucide-react';

export default function SignoffMatrix() {
  const { periods, useCloseSignoffs, signOff, rejectSignoff } = useFinancialClose();
  const activePeriods = periods.filter(p => p.status !== 'not_started');
  const [selectedPeriod, setSelectedPeriod] = useState(activePeriods[0]?.id || '');
  const { data: signoffs = [] } = useCloseSignoffs(selectedPeriod || null);
  const [actionDialog, setActionDialog] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [comments, setComments] = useState('');

  const handleAction = () => {
    if (!actionDialog) return;
    if (actionDialog.action === 'approve') signOff.mutate({ id: actionDialog.id, comments });
    else rejectSignoff.mutate({ id: actionDialog.id, comments });
    setActionDialog(null);
    setComments('');
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'approved': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sign-off Matrix</h1>
          <p className="text-muted-foreground">Hierarchical approval workflow for period close</p>
        </div>
        {activePeriods.length > 0 && (
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select period" /></SelectTrigger>
            <SelectContent>
              {activePeriods.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.period_label || `${p.fiscal_year} P${p.period_number}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Sign-off Progress</CardTitle></CardHeader>
        <CardContent>
          {/* Visual flow */}
          <div className="flex items-center justify-center gap-4 mb-8 py-4">
            {signoffs.map((s, i) => (
              <div key={s.id} className="flex items-center gap-4">
                <div className={`p-4 rounded-xl border-2 text-center min-w-[160px] ${
                  s.status === 'approved' ? 'border-green-400 bg-green-50' :
                  s.status === 'rejected' ? 'border-red-400 bg-red-50' :
                  'border-amber-300 bg-amber-50'
                }`}>
                  {statusIcon(s.status)}
                  <p className="font-semibold mt-2">{s.signoff_role}</p>
                  <Badge variant={s.status === 'approved' ? 'default' : s.status === 'rejected' ? 'destructive' : 'secondary'} className="mt-1">{s.status}</Badge>
                  {s.signer_name && <p className="text-xs mt-1 text-muted-foreground">{s.signer_name}</p>}
                  {s.signed_at && <p className="text-xs text-muted-foreground">{new Date(s.signed_at).toLocaleDateString()}</p>}
                </div>
                {i < signoffs.length - 1 && <div className="text-2xl text-muted-foreground">→</div>}
              </div>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signed By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signoffs.map(s => {
                const prevApproved = signoffs.filter(x => x.signoff_level < s.signoff_level).every(x => x.status === 'approved');
                return (
                  <TableRow key={s.id}>
                    <TableCell>{s.signoff_level}</TableCell>
                    <TableCell className="font-medium">{s.signoff_role}</TableCell>
                    <TableCell><div className="flex items-center gap-2">{statusIcon(s.status)}<span>{s.status}</span></div></TableCell>
                    <TableCell>{s.signer_name || '—'}</TableCell>
                    <TableCell>{s.signed_at ? new Date(s.signed_at).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{s.comments || '—'}</TableCell>
                    <TableCell>
                      {s.status === 'pending' && prevApproved && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" onClick={() => setActionDialog({ id: s.id, action: 'approve' })}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => setActionDialog({ id: s.id, action: 'reject' })}>Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {signoffs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sign-offs configured for this period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{actionDialog?.action === 'approve' ? 'Approve' : 'Reject'} Sign-off</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Comments</Label><Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder={actionDialog?.action === 'reject' ? 'Rejection reason (required)...' : 'Optional comments...'} /></div>
            <Button className="w-full" variant={actionDialog?.action === 'reject' ? 'destructive' : 'default'} onClick={handleAction} disabled={actionDialog?.action === 'reject' && !comments}>
              {actionDialog?.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
