import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWarehouseKpis } from '@/hooks/useWMS';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Package, Clock, AlertCircle } from 'lucide-react';

export default function WarehouseKpisPage() {
  const [warehouse, setWarehouse] = useState('');
  const { data = [] } = useWarehouseKpis(warehouse || undefined);

  const latest = data[0] || {};
  const chartData = [...data].reverse().map((d: any) => ({
    date: format(new Date(d.snapshot_date), 'MMM d'),
    fillRate: Number(d.fill_rate_pct),
    accuracy: Number(d.inventory_accuracy_pct),
    onTime: Number(d.on_time_ship_pct),
    picks: Number(d.picks_per_hour),
  }));

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Warehouse KPI Dashboard</h1>
          <p className="text-xs text-blue-100">Operational performance trends</p>
        </div>
        <div className="w-48"><Input value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder="All warehouses" className="h-8 bg-white text-foreground" /></div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Package className="h-4 w-4" /> Fill Rate</div><div className="text-2xl font-bold">{Number(latest.fill_rate_pct || 0).toFixed(1)}%</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-4 w-4" /> Accuracy</div><div className="text-2xl font-bold">{Number(latest.inventory_accuracy_pct || 0).toFixed(1)}%</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-4 w-4" /> Avg Dwell (h)</div><div className="text-2xl font-bold">{Number(latest.avg_dwell_hours || 0).toFixed(1)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertCircle className="h-4 w-4" /> Open Exceptions</div><div className="text-2xl font-bold text-orange-600">{latest.open_exceptions || 0}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Service Level Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="fillRate" stroke="#0066cc" name="Fill Rate %" />
                <Line type="monotone" dataKey="accuracy" stroke="#10b981" name="Accuracy %" />
                <Line type="monotone" dataKey="onTime" stroke="#f59e0b" name="On-Time %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Productivity (Picks/Hour)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="picks" fill="#1a3a5c" name="Picks/Hour" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Daily Snapshots ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Warehouse</th>
              <th className="p-2 text-right">Fill %</th>
              <th className="p-2 text-right">Accuracy %</th>
              <th className="p-2 text-right">On-Time %</th>
              <th className="p-2 text-right">Dwell h</th>
              <th className="p-2 text-right">Picks/h</th>
              <th className="p-2 text-right">Util %</th>
            </tr></thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No KPI snapshots yet</td></tr>}
              {data.map((d: any) => (
                <tr key={d.id} className="border-b">
                  <td className="p-2">{format(new Date(d.snapshot_date), 'MMM d, yyyy')}</td>
                  <td className="p-2">{d.warehouse_code}</td>
                  <td className="p-2 text-right">{Number(d.fill_rate_pct).toFixed(1)}</td>
                  <td className="p-2 text-right">{Number(d.inventory_accuracy_pct).toFixed(1)}</td>
                  <td className="p-2 text-right">{Number(d.on_time_ship_pct).toFixed(1)}</td>
                  <td className="p-2 text-right">{Number(d.avg_dwell_hours).toFixed(1)}</td>
                  <td className="p-2 text-right">{Number(d.picks_per_hour).toFixed(0)}</td>
                  <td className="p-2 text-right">{Number(d.utilization_pct).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
