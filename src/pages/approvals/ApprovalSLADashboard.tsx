import { useOverdueApprovals, useEscalateOverdueApprovals } from '@/hooks/useApprovalSLA';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ApprovalSLADashboard() {
  const { data: overdue = [], isLoading } = useOverdueApprovals();
  const escalate = useEscalateOverdueApprovals();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-amber-500" /> SLA & Escalation</h1>
          <p className="text-sm text-muted-foreground">Pending approvals past their due date.</p>
        </div>
        <Button onClick={() => escalate.mutate()} disabled={escalate.isPending}>
          <Zap className="h-4 w-4 mr-1" /> Escalate overdue
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Overdue</div><div className="text-2xl font-bold text-destructive">{overdue.filter((o: any) => new Date(o.due_at) < new Date()).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Escalated</div><div className="text-2xl font-bold text-amber-600">{overdue.filter((o: any) => o.sla_breached).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Avg overdue</div><div className="text-2xl font-bold">—</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Past-due approvals</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr className="border-b">
              <th className="text-left px-4 py-2">Document</th>
              <th className="text-left px-4 py-2">Stage</th>
              <th className="text-left px-4 py-2">Due</th>
              <th className="text-left px-4 py-2">Escalations</th>
              <th className="text-left px-4 py-2">Status</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
              ) : overdue.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No overdue approvals 🎉</td></tr>
              ) : overdue.map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2"><div className="font-medium">{r.document_number || r.document_type}</div><div className="text-xs text-muted-foreground">{r.requester_name}</div></td>
                  <td className="px-4 py-2">{r.current_stage} / {r.total_stages}</td>
                  <td className="px-4 py-2 text-xs text-destructive">{r.due_at ? formatDistanceToNow(new Date(r.due_at), { addSuffix: true }) : '—'}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{r.escalated_count || 0}</Badge></td>
                  <td className="px-4 py-2"><Badge variant={r.sla_breached ? 'destructive' : 'outline'}>{r.sla_breached ? 'Breached' : 'Pending'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
