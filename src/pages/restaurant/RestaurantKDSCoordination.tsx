import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useKDSStationStatus } from '@/hooks/useRestaurantEnhanced';
import { Activity, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function RestaurantKDSCoordination() {
  const { data: stations } = useKDSStationStatus();

  const totalLoad = (stations || []).reduce((s: number, x: any) => s + Number(x.current_load), 0);
  const onlineCount = (stations || []).filter((s: any) => s.status === 'online').length;
  const overloaded = (stations || []).filter((s: any) => s.status === 'overloaded').length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> KDS Coordination</h1>
        <p className="text-sm text-muted-foreground">Real-time station load and prep performance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Stations</p><p className="text-2xl font-bold">{stations?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Online</p><p className="text-2xl font-bold text-green-600">{onlineCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Load</p><p className="text-2xl font-bold">{totalLoad}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Overloaded</p><p className="text-2xl font-bold text-red-600">{overloaded}</p></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(stations || []).map((s: any) => {
          const utilPct = s.capacity > 0 ? Math.round((s.current_load / s.capacity) * 100) : 0;
          const StatusIcon = s.status === 'online' ? CheckCircle2 : s.status === 'overloaded' ? AlertTriangle : Clock;
          const color = s.status === 'overloaded' ? 'text-red-600' : s.status === 'online' ? 'text-green-600' : 'text-muted-foreground';
          return (
            <Card key={s.id}>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">{s.station_name}</CardTitle>
                <StatusIcon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Load</span><span>{s.current_load} / {s.capacity}</span>
                  </div>
                  <Progress value={utilPct} className={utilPct > 80 ? '[&>div]:bg-red-500' : ''} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Avg prep</span>
                  <span className="font-medium">{Math.round(s.avg_prep_time_sec / 60)} min</span>
                </div>
                <Badge variant={s.status === 'online' ? 'default' : 'destructive'} className="capitalize">{s.status}</Badge>
              </CardContent>
            </Card>
          );
        })}
        {!stations?.length && (
          <Card className="md:col-span-3"><CardContent className="p-12 text-center text-sm text-muted-foreground">No KDS stations registered yet</CardContent></Card>
        )}
      </div>
    </div>
  );
}
