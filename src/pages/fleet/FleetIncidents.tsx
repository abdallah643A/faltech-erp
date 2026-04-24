import { useFleetIncidents } from '@/hooks/useFleetData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';

export default function FleetIncidents() {
  const { data: incidents = [], isLoading } = useFleetIncidents();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" />Incidents & Claims</h1>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Incident #</TableHead><TableHead>Date</TableHead><TableHead>Vehicle</TableHead><TableHead>Driver</TableHead><TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Claim</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
            incidents.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No incidents</TableCell></TableRow> :
            incidents.map(i => (
              <TableRow key={i.id}>
                <TableCell className="text-xs font-mono">{i.incident_number}</TableCell>
                <TableCell className="text-xs">{i.incident_date?.slice(0, 10)}</TableCell>
                <TableCell className="text-xs">{(i as any).fleet_assets?.asset_name || '—'}</TableCell>
                <TableCell className="text-xs">{(i as any).fleet_drivers?.full_name || '—'}</TableCell>
                <TableCell className="text-xs capitalize">{i.incident_type}</TableCell>
                <TableCell><Badge variant={i.severity === 'major' || i.severity === 'total_loss' ? 'destructive' : 'outline'} className="text-[10px]">{i.severity}</Badge></TableCell>
                <TableCell className="text-xs capitalize">{i.claim_status}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{i.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
