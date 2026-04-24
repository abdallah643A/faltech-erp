import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, TrendingUp } from 'lucide-react';
import { useAssetProfitability } from '@/hooks/useAssetEnhanced';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AssetProfitabilityPage() {
  const { data: rows = [], upsert } = useAssetProfitability();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ period_start: '', period_end: '', revenue: 0, direct_cost: 0, maintenance_cost: 0, fuel_cost: 0, depreciation_cost: 0, insurance_cost: 0, other_cost: 0, utilization_hours: 0, available_hours: 0, currency: 'SAR' });
  const fmt = (v: any) => new Intl.NumberFormat('en-SA').format(Math.round(Number(v) || 0));

  const summary = useMemo(() => {
    const totRev = rows.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0);
    const totCost = rows.reduce((s: number, r: any) => s + Number(r.total_cost || 0), 0);
    return { totRev, totCost, margin: totRev - totCost, count: rows.length };
  }, [rows]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" />Asset Profitability</h1>
          <p className="text-muted-foreground">Revenue vs cost, ROI, payback by asset & period</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Period</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Records</p><p className="text-2xl font-bold">{summary.count}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">{fmt(summary.totRev)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Cost</p><p className="text-2xl font-bold">{fmt(summary.totCost)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Gross Margin</p><p className="text-2xl font-bold">{fmt(summary.margin)}</p></CardContent></Card>
      </div>

      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Margin by Period</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rows.slice(0, 12).reverse().map((r: any) => ({ period: r.period_start, revenue: r.revenue, cost: r.total_cost, margin: r.gross_margin }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="hsl(var(--chart-2))" />
                <Bar dataKey="cost" fill="hsl(var(--chart-3))" />
                <Bar dataKey="margin" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Period</TableHead><TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Total Cost</TableHead><TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right">Util %</TableHead><TableHead className="text-right">ROI %</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.period_start} → {r.period_end}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.revenue)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.total_cost)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(r.gross_margin)}</TableCell>
                  <TableCell className="text-right">{r.utilization_pct}%</TableCell>
                  <TableCell className="text-right"><Badge variant={Number(r.roi_pct) > 0 ? 'default' : 'destructive'}>{r.roi_pct}%</Badge></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Record Profitability Period</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Period Start</Label><Input type="date" value={draft.period_start} onChange={(e) => setDraft({ ...draft, period_start: e.target.value })} /></div>
            <div><Label>Period End</Label><Input type="date" value={draft.period_end} onChange={(e) => setDraft({ ...draft, period_end: e.target.value })} /></div>
            <div><Label>Revenue</Label><Input type="number" value={draft.revenue} onChange={(e) => setDraft({ ...draft, revenue: Number(e.target.value) })} /></div>
            <div><Label>Direct Cost</Label><Input type="number" value={draft.direct_cost} onChange={(e) => setDraft({ ...draft, direct_cost: Number(e.target.value) })} /></div>
            <div><Label>Maintenance</Label><Input type="number" value={draft.maintenance_cost} onChange={(e) => setDraft({ ...draft, maintenance_cost: Number(e.target.value) })} /></div>
            <div><Label>Fuel</Label><Input type="number" value={draft.fuel_cost} onChange={(e) => setDraft({ ...draft, fuel_cost: Number(e.target.value) })} /></div>
            <div><Label>Depreciation</Label><Input type="number" value={draft.depreciation_cost} onChange={(e) => setDraft({ ...draft, depreciation_cost: Number(e.target.value) })} /></div>
            <div><Label>Insurance</Label><Input type="number" value={draft.insurance_cost} onChange={(e) => setDraft({ ...draft, insurance_cost: Number(e.target.value) })} /></div>
            <div><Label>Other Cost</Label><Input type="number" value={draft.other_cost} onChange={(e) => setDraft({ ...draft, other_cost: Number(e.target.value) })} /></div>
            <div><Label>Utilization Hours</Label><Input type="number" value={draft.utilization_hours} onChange={(e) => setDraft({ ...draft, utilization_hours: Number(e.target.value) })} /></div>
            <div><Label>Available Hours</Label><Input type="number" value={draft.available_hours} onChange={(e) => setDraft({ ...draft, available_hours: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={!draft.period_start || !draft.period_end}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
