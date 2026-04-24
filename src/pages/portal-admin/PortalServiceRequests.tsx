import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LifeBuoy } from 'lucide-react';
import { usePortalServiceRequests } from '@/hooks/usePortalEnhanced';
import { format } from 'date-fns';

const SEVERITY: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  normal: 'bg-slate-100 text-slate-800',
  high: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
};
const STATUS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-800',
};

export default function PortalServiceRequests() {
  const { data: rows = [], updateStatus } = usePortalServiceRequests();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2"><LifeBuoy className="h-6 w-6" /><h1 className="text-2xl font-bold">Portal Service Requests</h1></div>
      <Card>
        <CardHeader><CardTitle>Inbox ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>#</TableHead><TableHead>Subject</TableHead><TableHead>Category</TableHead>
              <TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.request_number}</TableCell>
                  <TableCell className="max-w-xs truncate">{r.subject}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell><Badge className={SEVERITY[r.severity] ?? ''}>{r.severity}</Badge></TableCell>
                  <TableCell><Badge className={STATUS[r.status] ?? ''}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(s) => updateStatus.mutate({ id: r.id, status: s })}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No service requests</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
