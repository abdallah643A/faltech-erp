import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWmsTasks, useWmsScans } from '@/hooks/useWarehouseExecution';
import { useBinLocations } from '@/hooks/useInventoryManagement';
import { Map, Activity, TrendingUp, Package, AlertTriangle } from 'lucide-react';

export default function WarehouseHeatmap() {
  const { data: tasks } = useWmsTasks();
  const { data: scans } = useWmsScans();
  const { data: bins } = useBinLocations();

  const binActivity = useMemo(() => {
    const map: Record<string, { scans: number; tasks: number; lastActivity: string }> = {};
    (scans || []).forEach((s: any) => {
      const bin = s.bin_code || s.location || 'UNKNOWN';
      if (!map[bin]) map[bin] = { scans: 0, tasks: 0, lastActivity: '' };
      map[bin].scans++;
      if (!map[bin].lastActivity || s.created_at > map[bin].lastActivity) map[bin].lastActivity = s.created_at;
    });
    (tasks || []).forEach((t: any) => {
      const bin = t.source_bin || t.target_bin || 'UNKNOWN';
      if (!map[bin]) map[bin] = { scans: 0, tasks: 0, lastActivity: '' };
      map[bin].tasks++;
    });
    return Object.entries(map).sort((a, b) => (b[1].scans + b[1].tasks) - (a[1].scans + a[1].tasks));
  }, [tasks, scans]);

  const maxActivity = binActivity.length > 0 ? Math.max(...binActivity.map(([, v]) => v.scans + v.tasks)) : 1;

  const getHeatColor = (activity: number) => {
    const ratio = activity / maxActivity;
    if (ratio > 0.75) return 'bg-red-500/30 border-red-500/50 text-red-700';
    if (ratio > 0.5) return 'bg-orange-500/20 border-orange-500/40 text-orange-700';
    if (ratio > 0.25) return 'bg-yellow-500/15 border-yellow-500/30 text-yellow-700';
    return 'bg-green-500/10 border-green-500/20 text-green-700';
  };

  const totalScansToday = (scans || []).filter((s: any) => s.created_at && new Date(s.created_at).toDateString() === new Date().toDateString()).length;
  const activeBins = binActivity.filter(([, v]) => v.scans + v.tasks > 0).length;
  const hotspots = binActivity.filter(([, v]) => (v.scans + v.tasks) / maxActivity > 0.75);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Map className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Warehouse Heatmap</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-500" /><div><div className="text-2xl font-bold">{totalScansToday}</div><div className="text-xs text-muted-foreground">Scans Today</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-green-500" /><div><div className="text-2xl font-bold">{activeBins}</div><div className="text-xs text-muted-foreground">Active Bins</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-orange-500" /><div><div className="text-2xl font-bold">{bins?.length || 0}</div><div className="text-xs text-muted-foreground">Total Bins</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /><div><div className="text-2xl font-bold">{hotspots.length}</div><div className="text-xs text-muted-foreground">Hotspots</div></div></div></Card>
      </div>

      {/* Heatmap Grid */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Bin Activity Heatmap</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/30" /> Low</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/30" /> Medium</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/30" /> High</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30" /> Hotspot</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {binActivity.map(([bin, data]) => {
              const total = data.scans + data.tasks;
              return (
                <div key={bin} className={`border rounded-lg p-2 text-center transition-all hover:scale-105 cursor-pointer ${getHeatColor(total)}`}>
                  <div className="font-bold text-xs truncate">{bin}</div>
                  <div className="text-lg font-bold">{total}</div>
                  <div className="text-[10px] opacity-70">{data.scans}s / {data.tasks}t</div>
                </div>
              );
            })}
            {binActivity.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No activity data available</p>}
          </div>
        </CardContent>
      </Card>

      {/* Hotspot Details */}
      {hotspots.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Hotspot Bins</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hotspots.map(([bin, data]) => (
                <div key={bin} className="flex items-center justify-between p-2 bg-red-500/5 rounded-lg border border-red-500/20">
                  <div className="font-medium">{bin}</div>
                  <div className="flex items-center gap-3 text-sm">
                    <span>{data.scans} scans</span>
                    <span>{data.tasks} tasks</span>
                    <Badge variant="destructive">High Traffic</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
