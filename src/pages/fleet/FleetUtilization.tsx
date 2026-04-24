import { useMemo } from 'react';
import { useFleetAssets } from '@/hooks/useFleetData';
import { useFleetCostEntries, useFleetFuelTransactions } from '@/hooks/useFleetEnhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, TrendingDown, Fuel, DollarSign } from 'lucide-react';
import { formatSAR } from '@/lib/currency';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts';

export default function FleetUtilization() {
  const { data: assets = [] } = useFleetAssets();
  const { data: costs = [] } = useFleetCostEntries();
  const { data: fuel = [] } = useFleetFuelTransactions();

  const rows = useMemo(() => {
    return assets.map((a: any) => {
      const aCosts = costs.filter((c: any) => c.asset_id === a.id);
      const aFuel = fuel.filter((f: any) => f.asset_id === a.id);
      const totalCost = aCosts.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const totalKm = aFuel.reduce((s: number, f: any) => s + Number(f.km_since_last_fill || 0), 0);
      const totalFuel = aFuel.reduce((s: number, f: any) => s + Number(f.liters || 0), 0);
      const cpk = totalKm > 0 ? totalCost / totalKm : 0;
      const efficiency = totalFuel > 0 ? totalKm / totalFuel : 0;
      return { id: a.id, name: a.asset_name, code: a.asset_code, totalCost, totalKm, totalFuel, cpk, efficiency };
    }).sort((a, b) => b.cpk - a.cpk);
  }, [assets, costs, fuel]);

  const totals = useMemo(() => ({
    cost: rows.reduce((s, r) => s + r.totalCost, 0),
    km: rows.reduce((s, r) => s + r.totalKm, 0),
    fuel: rows.reduce((s, r) => s + r.totalFuel, 0),
    avgCpk: rows.length > 0 && rows.some(r => r.totalKm > 0)
      ? rows.reduce((s, r) => s + r.totalCost, 0) / Math.max(1, rows.reduce((s, r) => s + r.totalKm, 0))
      : 0,
  }), [rows]);

  const cpkColor = (cpk: number) => cpk > totals.avgCpk * 1.2 ? 'hsl(var(--destructive))' : cpk > totals.avgCpk ? 'hsl(48 96% 53%)' : 'hsl(142 71% 45%)';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Fleet Utilization & CPK Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Total Cost</div>
          <div className="text-lg font-bold mt-1">{formatSAR(totals.cost)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total km</div>
          <div className="text-lg font-bold mt-1">{Math.round(totals.km).toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Fuel className="h-3 w-3" />Fuel (L)</div>
          <div className="text-lg font-bold mt-1">{Math.round(totals.fuel).toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" />Avg CPK</div>
          <div className="text-lg font-bold mt-1">{formatSAR(totals.avgCpk)}/km</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Cost per kilometer by vehicle</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rows.slice(0, 15)} margin={{ top: 5, right: 5, left: 5, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="code" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => formatSAR(Number(v)) + '/km'} />
              <Bar dataKey="cpk">
                {rows.slice(0, 15).map((r, i) => <Cell key={i} fill={cpkColor(r.cpk)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Per-vehicle utilization breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Vehicle</TableHead><TableHead className="text-right">Total km</TableHead>
              <TableHead className="text-right">Fuel (L)</TableHead><TableHead className="text-right">Efficiency</TableHead>
              <TableHead className="text-right">Total Cost</TableHead><TableHead className="text-right">CPK</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow> :
                rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-mono">{r.code}</TableCell>
                    <TableCell className="text-xs font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs text-right">{Math.round(r.totalKm).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right">{Math.round(r.totalFuel).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right">{r.efficiency.toFixed(2)} km/L</TableCell>
                    <TableCell className="text-xs text-right">{formatSAR(r.totalCost)}</TableCell>
                    <TableCell className="text-xs text-right font-bold" style={{ color: cpkColor(r.cpk) }}>{formatSAR(r.cpk)}/km</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
