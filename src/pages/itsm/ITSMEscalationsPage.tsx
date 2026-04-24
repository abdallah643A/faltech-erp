import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEscalations } from '@/hooks/useServiceITSM';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function ITSMEscalationsPage() {
  const { data: open = [] } = useEscalations('open');
  const { data: all = [] } = useEscalations();

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6" />Escalations</h1>
        <p className="text-sm text-muted-foreground">{open.length} open · {all.length} total</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">All escalations</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Ticket</TableHead><TableHead>Reason</TableHead><TableHead>Trigger</TableHead><TableHead>Level</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>
              {all.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell><Link className="font-mono text-xs underline" to={`/itsm/tickets/${e.ticket_id}`}>{e.svc_tickets?.ticket_number}</Link></TableCell>
                  <TableCell className="text-sm">{e.reason}</TableCell>
                  <TableCell><Badge variant="outline">{e.triggered_by}</Badge></TableCell>
                  <TableCell>L{e.escalation_level}</TableCell>
                  <TableCell><Badge variant={e.status === 'open' ? 'destructive' : 'default'}>{e.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</TableCell>
                </TableRow>
              ))}
              {all.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No escalations</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
