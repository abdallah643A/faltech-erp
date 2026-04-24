import { useState } from 'react';
import { useFleetTrips } from '@/hooks/useFleetData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp } from 'lucide-react';

export default function FleetTrips() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data: trips = [], isLoading } = useFleetTrips({ status: statusFilter || undefined });

  const filtered = trips.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return t.trip_number?.toLowerCase().includes(s) || t.origin?.toLowerCase().includes(s) || t.destination?.toLowerCase().includes(s);
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Trip Management</h1>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search trips..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {['planned','in_progress','completed','cancelled'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Trip #</TableHead><TableHead>Vehicle</TableHead><TableHead>Driver</TableHead><TableHead>Route</TableHead><TableHead className="hidden md:table-cell">Distance</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No trips</TableCell></TableRow> :
            filtered.map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-xs font-mono">{t.trip_number}</TableCell>
                <TableCell className="text-xs">{(t as any).fleet_assets?.asset_name || '—'}</TableCell>
                <TableCell className="text-xs">{(t as any).fleet_drivers?.full_name || '—'}</TableCell>
                <TableCell className="text-xs">{t.origin} → {t.destination}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">{t.distance_km ? `${t.distance_km} km` : '—'}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{t.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
