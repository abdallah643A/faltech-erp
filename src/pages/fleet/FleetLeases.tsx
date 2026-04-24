import { useFleetLeases } from '@/hooks/useFleetData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3 } from 'lucide-react';
import { formatSAR } from '@/lib/currency';

export default function FleetLeases() {
  const { data: leases = [], isLoading } = useFleetLeases();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Lease & Rental Management</h1>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Contract</TableHead><TableHead>Vehicle</TableHead><TableHead>Type</TableHead><TableHead>Vendor</TableHead><TableHead>Monthly Rent</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
            leases.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No leases</TableCell></TableRow> :
            leases.map(l => (
              <TableRow key={l.id}>
                <TableCell className="text-xs font-mono">{l.contract_number || '—'}</TableCell>
                <TableCell className="text-xs">{(l as any).fleet_assets?.asset_name || '—'}</TableCell>
                <TableCell className="text-xs capitalize">{l.lease_type}</TableCell>
                <TableCell className="text-xs">{l.vendor_name || '—'}</TableCell>
                <TableCell className="text-xs">{formatSAR(l.monthly_rent)}</TableCell>
                <TableCell className="text-xs">{l.start_date} → {l.end_date || '—'}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{l.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
