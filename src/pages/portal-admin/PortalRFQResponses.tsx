import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePortalRFQResponses } from '@/hooks/useUnifiedPortal';
import { Award, Trophy, X } from 'lucide-react';

export default function PortalRFQResponses() {
  const { data: responses = [], decide } = usePortalRFQResponses();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">RFQ Responses</h1>
        <p className="text-sm text-muted-foreground">Quotes from suppliers and subcontractors against your RFQs.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{responses.length} response{responses.length !== 1 ? 's' : ''}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>RFQ #</TableHead><TableHead>Total</TableHead><TableHead>Lead time</TableHead>
              <TableHead>Validity</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {responses.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.rfq_number || r.rfq_id?.slice(0, 8)}</TableCell>
                  <TableCell>{r.currency} {Number(r.total_quoted || 0).toLocaleString()}</TableCell>
                  <TableCell>{r.lead_time_days ? `${r.lead_time_days} days` : '—'}</TableCell>
                  <TableCell>{r.validity_days ? `${r.validity_days} days` : '—'}</TableCell>
                  <TableCell><Badge>{r.status}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" title="Shortlist" onClick={() => decide.mutate({ id: r.id, status: 'shortlisted' })}><Award className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" title="Award" onClick={() => decide.mutate({ id: r.id, status: 'awarded' })}><Trophy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" title="Reject" onClick={() => decide.mutate({ id: r.id, status: 'rejected' })}><X className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {responses.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No responses yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
