import { useFleetComplianceDocs } from '@/hooks/useFleetData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield } from 'lucide-react';

const urgencyColors: Record<string, string> = {
  normal: 'bg-green-500/15 text-green-700',
  attention: 'bg-blue-500/15 text-blue-700',
  warning: 'bg-amber-500/15 text-amber-700',
  critical: 'bg-red-500/15 text-red-700',
  expired: 'bg-red-700/20 text-red-800',
};

export default function FleetCompliance() {
  const { data: docs = [], isLoading } = useFleetComplianceDocs();
  const expiring = docs.filter(d => d.urgency === 'critical' || d.urgency === 'expired').length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Compliance & Renewals</h1>
        {expiring > 0 && <Badge variant="destructive">{expiring} critical/expired</Badge>}
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Vehicle</TableHead><TableHead>Expiry</TableHead><TableHead>Urgency</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
            docs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No documents</TableCell></TableRow> :
            docs.map(d => (
              <TableRow key={d.id}>
                <TableCell className="text-xs font-medium">{d.doc_name}</TableCell>
                <TableCell className="text-xs capitalize">{d.doc_type}</TableCell>
                <TableCell className="text-xs">{(d as any).fleet_assets?.asset_name || '—'}</TableCell>
                <TableCell className="text-xs">{d.expiry_date || '—'}</TableCell>
                <TableCell><Badge className={`text-[10px] ${urgencyColors[d.urgency] || ''}`}>{d.urgency}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{d.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
