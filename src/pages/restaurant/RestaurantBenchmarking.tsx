import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useBranchBenchmarks, useComputeBenchmark } from '@/hooks/useRestaurantEnhanced';
import { Trophy, TrendingUp, RefreshCw, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function RestaurantBenchmarking() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(); monthStart.setDate(1);
  const [start, setStart] = useState(monthStart.toISOString().slice(0, 10));
  const [end, setEnd] = useState(today);
  const [open, setOpen] = useState(false);

  const { data: benchmarks } = useBranchBenchmarks(start, end);
  const compute = useComputeBenchmark();

  const chartData = (benchmarks || []).map((b: any) => ({
    name: b.rest_branches?.branch_name?.slice(0, 12) || 'Branch',
    revenue: Number(b.total_revenue),
    avgCheck: Number(b.avg_check),
    foodCost: Number(b.food_cost_pct),
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-primary" /> Branch Benchmarking</h1>
          <p className="text-sm text-muted-foreground">Compare outlet performance across the network</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><RefreshCw className="h-4 w-4 mr-2" /> Compute Snapshot</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Generate Benchmark Snapshot</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Period Start</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
              <div><Label>Period End</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
              <Button className="w-full" disabled={compute.isPending}
                onClick={async () => { await compute.mutateAsync({ start, end }); setOpen(false); }}>
                {compute.isPending ? 'Computing...' : 'Compute'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Revenue by Branch</CardTitle></CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-12">No benchmark data — click Compute Snapshot</p>}
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {(benchmarks || []).map((b: any) => (
          <Card key={b.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                #{b.rank_in_company || '-'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{b.rest_branches?.branch_name || 'Branch'}</h3>
                  {b.rank_in_company === 1 && <Award className="h-4 w-4 text-yellow-500" />}
                </div>
                <p className="text-xs text-muted-foreground">{b.period_start} → {b.period_end}</p>
              </div>
              <div className="grid grid-cols-4 gap-4 text-right">
                <div><p className="text-xs text-muted-foreground">Revenue</p><p className="font-bold">SAR {Number(b.total_revenue).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Orders</p><p className="font-bold">{b.total_orders}</p></div>
                <div><p className="text-xs text-muted-foreground">Avg Check</p><p className="font-bold">{Number(b.avg_check).toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Food %</p>
                  <Badge variant={Number(b.food_cost_pct) > 35 ? 'destructive' : 'secondary'}>{Number(b.food_cost_pct).toFixed(1)}%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
