import { useState } from 'react';
import { useFleetDrivers } from '@/hooks/useFleetData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/15 text-green-700',
  on_leave: 'bg-amber-500/15 text-amber-700',
  suspended: 'bg-red-500/15 text-red-700',
  unavailable: 'bg-gray-500/15 text-gray-600',
};

export default function FleetDrivers() {
  const [search, setSearch] = useState('');
  const { data: drivers = [], isLoading } = useFleetDrivers();

  const filtered = drivers.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return d.full_name?.toLowerCase().includes(s) || d.license_number?.toLowerCase().includes(s) || d.driver_code?.toLowerCase().includes(s);
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Drivers & Operators</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} records</p>
        </div>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, license, code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Code</TableHead>
            <TableHead>License</TableHead>
            <TableHead className="hidden md:table-cell">License Expiry</TableHead>
            <TableHead>Safety Score</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No drivers</TableCell></TableRow> :
            filtered.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium text-sm">{d.full_name}</TableCell>
                <TableCell className="hidden md:table-cell text-xs font-mono">{d.driver_code || '—'}</TableCell>
                <TableCell className="text-xs">{d.license_class} {d.license_number}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">{d.license_expiry || '—'}</TableCell>
                <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{d.safety_score ?? 100}</Badge></TableCell>
                <TableCell><Badge className={`text-[10px] ${statusColors[d.status] || ''}`}>{d.status?.replace(/_/g, ' ')}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
