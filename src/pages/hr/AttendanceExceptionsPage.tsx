import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useAttendanceExceptions } from '@/hooks/useHREnhanced';

export default function AttendanceExceptionsPage() {
  const { data: exceptions = [], review } = useAttendanceExceptions();
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-primary" />Attendance Exceptions</h1>
        <p className="text-muted-foreground">Late, early-out, missed punch & overtime requiring review</p>
      </div>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Expected In</TableHead><TableHead>Actual In</TableHead>
            <TableHead>Variance (min)</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {exceptions.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{e.exception_date}</TableCell>
                <TableCell><Badge variant="outline">{e.exception_type}</Badge></TableCell>
                <TableCell className="text-xs">{e.expected_in || '—'}</TableCell>
                <TableCell className="text-xs">{e.actual_in || '—'}</TableCell>
                <TableCell><Badge variant={Math.abs(e.variance_minutes || 0) > 30 ? 'destructive' : 'secondary'}>{e.variance_minutes || 0}</Badge></TableCell>
                <TableCell className="text-xs max-w-xs truncate">{e.reason}</TableCell>
                <TableCell><Badge variant={e.status === 'approved' ? 'default' : e.status === 'rejected' ? 'destructive' : 'secondary'}>{e.status}</Badge></TableCell>
                <TableCell>
                  {e.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => review.mutate({ id: e.id, status: 'approved' })}><Check className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => review.mutate({ id: e.id, status: 'rejected' })}><X className="h-3 w-3" /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {exceptions.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No exceptions</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
