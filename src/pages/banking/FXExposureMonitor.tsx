import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, TrendingUp, AlertTriangle } from 'lucide-react';
import { useTreasFXExposures } from '@/hooks/useTreasuryEnhanced';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const RISK_COLOR: Record<string, string> = { critical: 'destructive', high: 'destructive', medium: 'secondary', low: 'default' };

export default function FXExposureMonitor() {
  const { data: exposures = [], upsert } = useTreasFXExposures();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ as_of_date: new Date().toISOString().slice(0, 10), base_currency: 'SAR', cash_balance: 0, ar_balance: 0, ap_balance: 0, hedged_amount: 0, spot_rate: 1 });

  const byCurrency = useMemo(() => {
    const latest: Record<string, any> = {};
    exposures.forEach((e: any) => {
      if (!latest[e.currency] || e.as_of_date > latest[e.currency].as_of_date) latest[e.currency] = e;
    });
    return Object.values(latest);
  }, [exposures]);

  const totalRisk = byCurrency.reduce((s: number, e: any) => s + Math.abs((e.net_exposure_base || 0) * (e.spot_rate || 1)), 0);
  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">FX Exposure Monitor</h1>
          <p className="text-muted-foreground">Net foreign currency position with 1% sensitivity & risk banding</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Exposure</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Currencies Monitored</p><p className="text-2xl font-bold">{byCurrency.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Net Exposure (SAR)</p><p className="text-2xl font-bold">{fmt(totalRisk)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">High/Critical Risks</p><p className="text-2xl font-bold text-red-600">{byCurrency.filter((e: any) => ['high', 'critical'].includes(e.risk_band)).length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">1% Sensitivity (SAR)</p><p className="text-2xl font-bold">{fmt(totalRisk * 0.01)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Net Exposure by Currency</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCurrency.map((e: any) => ({ currency: e.currency, exposure: Math.abs(e.net_exposure_base || 0), risk: e.risk_band }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="currency" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="exposure">
                {byCurrency.map((e: any, i: number) => (
                  <Cell key={i} fill={e.risk_band === 'critical' || e.risk_band === 'high' ? 'hsl(var(--destructive))' : e.risk_band === 'medium' ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-2))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Exposure Detail</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">AR</TableHead>
                <TableHead className="text-right">AP</TableHead>
                <TableHead className="text-right">Hedged</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Spot</TableHead>
                <TableHead className="text-right">1% Impact</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exposures.slice(0, 50).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.as_of_date}</TableCell>
                  <TableCell><Badge variant="outline">{e.currency}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{fmt(e.cash_balance)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(e.ar_balance)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(e.ap_balance)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(e.hedged_amount)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(e.net_exposure)}</TableCell>
                  <TableCell className="font-mono text-xs">{e.spot_rate}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(e.sensitivity_1pct)}</TableCell>
                  <TableCell><Badge variant={RISK_COLOR[e.risk_band] as any}>{e.risk_band}</Badge></TableCell>
                </TableRow>
              ))}
              {exposures.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">No exposures recorded</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Record FX Exposure</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={draft.as_of_date} onChange={(e) => setDraft({ ...draft, as_of_date: e.target.value })} /></div>
            <div><Label>Currency</Label><Input value={draft.currency || ''} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} placeholder="USD/EUR/AED" /></div>
            <div><Label>Cash Balance</Label><Input type="number" value={draft.cash_balance} onChange={(e) => setDraft({ ...draft, cash_balance: Number(e.target.value) })} /></div>
            <div><Label>AR Balance</Label><Input type="number" value={draft.ar_balance} onChange={(e) => setDraft({ ...draft, ar_balance: Number(e.target.value) })} /></div>
            <div><Label>AP Balance</Label><Input type="number" value={draft.ap_balance} onChange={(e) => setDraft({ ...draft, ap_balance: Number(e.target.value) })} /></div>
            <div><Label>Hedged Amount</Label><Input type="number" value={draft.hedged_amount} onChange={(e) => setDraft({ ...draft, hedged_amount: Number(e.target.value) })} /></div>
            <div><Label>Spot Rate (vs SAR)</Label><Input type="number" step="0.0001" value={draft.spot_rate} onChange={(e) => setDraft({ ...draft, spot_rate: Number(e.target.value) })} /></div>
            <div><Label>Base Currency</Label><Input value={draft.base_currency} onChange={(e) => setDraft({ ...draft, base_currency: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={upsert.isPending || !draft.currency}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
