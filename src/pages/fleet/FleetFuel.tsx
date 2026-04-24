import { useFleetFuelLogs } from '@/hooks/useFleetData';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Fuel } from 'lucide-react';
import { formatSAR } from '@/lib/currency';

export default function FleetFuel() {
  const { data: logs = [], isLoading } = useFleetFuelLogs();
  const totalQty = logs.reduce((s, l) => s + (l.quantity_liters || 0), 0);
  const totalCost = logs.reduce((s, l) => s + (l.total_cost || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><Fuel className="h-5 w-5 text-primary" />Fuel Management</h1>
      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">Total: <strong>{totalQty.toFixed(1)} L</strong></span>
        <span className="text-muted-foreground">Cost: <strong>{formatSAR(totalCost)}</strong></span>
        <span className="text-muted-foreground">Entries: <strong>{logs.length}</strong></span>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Vehicle</TableHead><TableHead>Driver</TableHead><TableHead>Station</TableHead><TableHead>Qty (L)</TableHead><TableHead>Cost</TableHead><TableHead className="hidden md:table-cell">Odometer</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
            logs.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No fuel logs</TableCell></TableRow> :
            logs.map(l => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">{l.fill_date}</TableCell>
                <TableCell className="text-xs">{(l as any).fleet_assets?.asset_name || '—'}</TableCell>
                <TableCell className="text-xs">{(l as any).fleet_drivers?.full_name || '—'}</TableCell>
                <TableCell className="text-xs">{l.station_name || '—'}</TableCell>
                <TableCell className="text-xs font-medium">{l.quantity_liters}</TableCell>
                <TableCell className="text-xs">{formatSAR(l.total_cost)}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">{l.odometer_at_fill?.toLocaleString() || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
