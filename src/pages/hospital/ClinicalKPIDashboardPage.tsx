import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Bed, Clock, FlaskConical, ScanLine, Pill } from 'lucide-react';
import { useHISKPISnapshots } from '@/hooks/useHISEnhanced';

export default function ClinicalKPIDashboardPage() {
  const { data: snapshots = [] } = useHISKPISnapshots();
  const latest = snapshots[0] || {};

  const kpis = [
    { icon: Bed, label: 'Bed Occupancy', value: `${latest.occupancy_rate ?? 0}%`, sub: `${latest.occupied_beds ?? 0}/${latest.total_beds ?? 0}` },
    { icon: Clock, label: 'ER Avg Wait', value: `${latest.er_avg_wait_minutes ?? 0} min`, sub: `${latest.er_arrivals ?? 0} arrivals` },
    { icon: Activity, label: 'OPD Wait', value: `${latest.opd_avg_wait_minutes ?? 0} min`, sub: `${latest.opd_visits ?? 0} visits` },
    { icon: FlaskConical, label: 'Lab TAT', value: `${latest.lab_avg_tat_minutes ?? 0} min`, sub: `${latest.lab_orders ?? 0} orders` },
    { icon: ScanLine, label: 'Radiology TAT', value: `${latest.radiology_avg_tat_minutes ?? 0} min`, sub: `${latest.radiology_orders ?? 0} orders` },
    { icon: Pill, label: 'Pharmacy', value: `${latest.pharmacy_dispenses ?? 0}`, sub: 'dispenses today' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />Clinical KPI Dashboard</h1>
        <p className="text-muted-foreground">Occupancy, wait times, turnaround — by hour & date</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><k.icon className="h-4 w-4 text-primary" />{k.label}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Snapshots</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Hour</TableHead><TableHead>Occ %</TableHead>
              <TableHead>ER Arr.</TableHead><TableHead>ER Wait</TableHead><TableHead>OPD</TableHead>
              <TableHead>Adm</TableHead><TableHead>Disch</TableHead><TableHead>LOS</TableHead>
              <TableHead>Lab TAT</TableHead><TableHead>Rad TAT</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {snapshots.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{s.snapshot_date}</TableCell>
                  <TableCell>{s.snapshot_hour ?? '—'}</TableCell>
                  <TableCell><Badge variant={s.occupancy_rate > 85 ? 'destructive' : 'secondary'}>{s.occupancy_rate ?? 0}%</Badge></TableCell>
                  <TableCell>{s.er_arrivals}</TableCell>
                  <TableCell className="text-xs">{s.er_avg_wait_minutes ?? 0} min</TableCell>
                  <TableCell>{s.opd_visits}</TableCell>
                  <TableCell>{s.admissions}</TableCell>
                  <TableCell>{s.discharges}</TableCell>
                  <TableCell>{s.avg_los_days ?? 0}d</TableCell>
                  <TableCell className="text-xs">{s.lab_avg_tat_minutes ?? 0}m</TableCell>
                  <TableCell className="text-xs">{s.radiology_avg_tat_minutes ?? 0}m</TableCell>
                </TableRow>
              ))}
              {snapshots.length === 0 && <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">No snapshots yet — generate via scheduled job</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
