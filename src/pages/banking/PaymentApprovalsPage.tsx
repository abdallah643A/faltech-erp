import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { usePaymentApprovals, useDecideApproval } from '@/hooks/useBankTreasury';

export default function PaymentApprovalsPage() {
  const { data: approvals = [] } = usePaymentApprovals();
  const decide = useDecideApproval();
  const [tab, setTab] = useState('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 2 }).format(v);
  const filtered = approvals.filter((a: any) => tab === 'all' || a.status === tab);

  const counts = {
    pending: approvals.filter((a: any) => a.status === 'pending').length,
    approved: approvals.filter((a: any) => a.status === 'approved').length,
    rejected: approvals.filter((a: any) => a.status === 'rejected').length,
    escalated: approvals.filter((a: any) => a.status === 'escalated').length,
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-primary"/>Payment Approvals</h1>
        <p className="text-sm text-muted-foreground">Multi-level approval workflow for outgoing payments</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-600">{counts.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{counts.approved}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-red-600">{counts.rejected}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Escalated</p><p className="text-2xl font-bold text-orange-600">{counts.escalated}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="escalated">Escalated</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No payment approvals in this queue.</p> : (
            <div className="space-y-3">
              {filtered.map((a: any) => (
                <div key={a.id} className="p-4 rounded-lg border hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{a.vendor_name || 'Unknown vendor'}</span>
                        <Badge variant="outline" className="text-[10px]">{a.payment_reference || '—'}</Badge>
                        <Badge variant={a.status === 'pending' ? 'secondary' : a.status === 'approved' ? 'default' : 'destructive'} className="text-[10px]">{a.status}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto">Level {a.approval_level}/{a.required_levels}</span>
                      </div>
                      <p className="text-lg font-bold">{a.currency} {fmt(Number(a.payment_amount))}</p>
                      {a.due_by && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3"/>Due: {new Date(a.due_by).toLocaleString()}</p>}
                      {a.approval_notes && <p className="text-xs mt-2 p-2 bg-muted/50 rounded">{a.approval_notes}</p>}
                    </div>
                    {a.status === 'pending' && (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Textarea placeholder="Notes (optional)" rows={2} className="text-xs"
                          value={notes[a.id] || ''} onChange={e => setNotes({ ...notes, [a.id]: e.target.value })}/>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" className="flex-1"
                            onClick={() => decide.mutate({ id: a.id, status: 'approved', notes: notes[a.id] })}>
                            <CheckCircle2 className="h-3 w-3 mr-1"/>Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1"
                            onClick={() => decide.mutate({ id: a.id, status: 'rejected', notes: notes[a.id] })}>
                            <XCircle className="h-3 w-3 mr-1"/>Reject
                          </Button>
                        </div>
                        <Button size="sm" variant="outline"
                          onClick={() => decide.mutate({ id: a.id, status: 'escalated', notes: notes[a.id] })}>
                          <AlertTriangle className="h-3 w-3 mr-1"/>Escalate
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
