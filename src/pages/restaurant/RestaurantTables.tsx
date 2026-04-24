import { useState } from 'react';
import { useRestaurantTables, useRestaurantBranches } from '@/hooks/useRestaurantData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  available: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle, label: 'Available' },
  occupied: { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle, label: 'Occupied' },
  reserved: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock, label: 'Reserved' },
  cleaning: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: AlertTriangle, label: 'Cleaning' },
};

export default function RestaurantTables() {
  const { data: branches } = useRestaurantBranches();
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const { data: tables } = useRestaurantTables(selectedBranch || undefined);
  const { updateStatus } = useRestaurantTables(selectedBranch || undefined);

  const stats = {
    total: (tables || []).length,
    available: (tables || []).filter((t: any) => t.status === 'available').length,
    occupied: (tables || []).filter((t: any) => t.status === 'occupied').length,
    reserved: (tables || []).filter((t: any) => t.status === 'reserved').length,
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Table Management</h1>
          <p className="text-sm text-muted-foreground">Floor plan, status, seating, and reservations</p>
        </div>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select Branch" /></SelectTrigger>
          <SelectContent>{(branches || []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Tables', value: stats.total, color: 'text-foreground' },
          { label: 'Available', value: stats.available, color: 'text-green-600' },
          { label: 'Occupied', value: stats.occupied, color: 'text-red-600' },
          { label: 'Reserved', value: stats.reserved, color: 'text-blue-600' },
        ].map(s => (
          <Card key={s.label} className="border">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!selectedBranch ? (
        <Card className="border"><CardContent className="p-8 text-center text-muted-foreground">Select a branch to view tables</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(tables || []).map((table: any) => {
            const cfg = statusConfig[table.status] || statusConfig.available;
            const Icon = cfg.icon;
            return (
              <Card key={table.id} className={`border-2 cursor-pointer hover:shadow-lg transition-all ${cfg.color}`}>
                <CardContent className="p-4 text-center space-y-2">
                  <div className="flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-lg font-bold">T{table.table_number}</p>
                  <div className="flex items-center justify-center gap-1 text-xs">
                    <Users className="h-3 w-3" />{table.seats} seats
                  </div>
                  <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                  {table.rest_dining_areas?.area_name && (
                    <p className="text-[10px] text-muted-foreground">{table.rest_dining_areas.area_name}</p>
                  )}
                  <div className="flex gap-1 justify-center pt-1">
                    {table.status === 'available' && (
                      <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => updateStatus.mutate({ id: table.id, status: 'occupied' })}>Seat</Button>
                    )}
                    {table.status === 'occupied' && (
                      <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => updateStatus.mutate({ id: table.id, status: 'cleaning' })}>Clear</Button>
                    )}
                    {table.status === 'cleaning' && (
                      <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => updateStatus.mutate({ id: table.id, status: 'available' })}>Ready</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!(tables || []).length && <p className="col-span-full text-center text-muted-foreground py-8">No tables configured for this branch</p>}
        </div>
      )}
    </div>
  );
}
