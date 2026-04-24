import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFleetAssets, useFleetCategories } from '@/hooks/useFleetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Truck } from 'lucide-react';

const statusColors: Record<string, string> = {
  available: 'bg-green-500/15 text-green-700',
  assigned: 'bg-blue-500/15 text-blue-700',
  under_maintenance: 'bg-amber-500/15 text-amber-700',
  breakdown: 'bg-red-500/15 text-red-700',
  reserved: 'bg-purple-500/15 text-purple-700',
  inactive: 'bg-gray-500/15 text-gray-600',
  sold: 'bg-gray-500/15 text-gray-600',
  disposed: 'bg-gray-500/15 text-gray-600',
};

export default function FleetAssets() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('');
  const { data: assets = [], isLoading } = useFleetAssets({
    status: statusFilter || undefined,
    ownership_type: ownershipFilter || undefined,
  });
  const { data: categories = [] } = useFleetCategories();

  const filtered = assets.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.asset_code?.toLowerCase().includes(s) || a.asset_name?.toLowerCase().includes(s) || a.plate_number?.toLowerCase().includes(s) || a.make?.toLowerCase().includes(s);
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Fleet Register</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} vehicles / equipment</p>
        </div>
        <Button onClick={() => navigate('/fleet/assets/new')} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Vehicle</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search code, name, plate..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['available','assigned','under_maintenance','breakdown','reserved','inactive'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ownershipFilter} onValueChange={v => setOwnershipFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Ownership" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {['owned','leased','rented','subcontracted'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Make/Model</TableHead>
                <TableHead className="hidden md:table-cell">Plate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Ownership</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No vehicles found</TableCell></TableRow>
              ) : filtered.map(a => (
                <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/fleet/assets/${a.id}`)}>
                  <TableCell className="font-mono text-xs">{a.asset_code}</TableCell>
                  <TableCell className="font-medium text-sm">{a.asset_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{[a.make, a.model, a.year].filter(Boolean).join(' ')}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{a.plate_number}</TableCell>
                  <TableCell><Badge className={`text-[10px] ${statusColors[a.status] || ''}`}>{a.status?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-xs capitalize">{a.ownership_type}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">{(a as any).fleet_categories?.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
