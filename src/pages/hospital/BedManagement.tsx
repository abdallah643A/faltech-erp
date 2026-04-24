import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHospWards, useHospBeds, useReleaseBed } from '@/hooks/useHospital';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { BedDouble } from 'lucide-react';

export default function BedManagement() {
  const [wardId, setWardId] = useState<string>('');
  const { data: wards = [] } = useHospWards();
  const { data: beds = [] } = useHospBeds(wardId || undefined);
  const release = useReleaseBed();

  const grouped = wards.map((w: any) => ({ ward: w, beds: beds.filter((b: any) => b.ward_id === w.id) })).filter((g: any) => g.beds.length);

  const summary = {
    total: beds.length,
    occupied: beds.filter((b: any) => b.status === 'occupied').length,
    available: beds.filter((b: any) => b.status === 'available').length,
    cleaning: beds.filter((b: any) => b.status === 'cleaning').length,
    blocked: beds.filter((b: any) => b.status === 'blocked').length,
  };

  return (
    <HospitalShell title="Bed Management" subtitle="Hospital-wide bed board" icon={<BedDouble className="h-5 w-5" />}
      actions={
        <Select value={wardId || 'all'} onValueChange={(v) => setWardId(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All wards" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wards</SelectItem>
            {wards.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-semibold">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Occupied</p><p className="text-2xl font-semibold text-primary">{summary.occupied}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Available</p><p className="text-2xl font-semibold text-emerald-600">{summary.available}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Cleaning</p><p className="text-2xl font-semibold text-amber-600">{summary.cleaning}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Blocked</p><p className="text-2xl font-semibold text-destructive">{summary.blocked}</p></CardContent></Card>
      </div>

      {grouped.map((g: any) => (
        <Card key={g.ward.id}>
          <CardHeader className="pb-2"><CardTitle className="text-base">{g.ward.name} <span className="text-xs font-normal text-muted-foreground">({g.beds.length} beds)</span></CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {g.beds.map((b: any) => (
                <div key={b.id} className={`border rounded p-2 ${
                  b.status === 'occupied' ? 'border-primary bg-primary/5' :
                  b.status === 'available' ? 'border-emerald-500/40 bg-emerald-500/5' :
                  b.status === 'cleaning' ? 'border-amber-500/40 bg-amber-500/5' :
                  'border-destructive/40 bg-destructive/5'
                }`}>
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium">{b.bed_no}</p>
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 ${statusColor(b.status)}`}>{b.status}</Badge>
                  </div>
                  {b.status === 'occupied' && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs px-1 mt-1 w-full"
                      onClick={() => release.mutate(b.id)}>Release</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </HospitalShell>
  );
}
