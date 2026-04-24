import { useState } from 'react';
import { useVendorRiskScores } from '@/hooks/useProcurementStrategic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ShieldAlert, TrendingDown, TrendingUp, Minus } from 'lucide-react';

const TIER_VARIANT: Record<string, any> = { low: 'default', medium: 'secondary', high: 'destructive', critical: 'destructive' };

export default function VendorRiskScoring() {
  const { data, isLoading, upsert } = useVendorRiskScores();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    vendor_name: '', vendor_code: '', score_period: 'monthly',
    financial_risk: 0, operational_risk: 0, compliance_risk: 0,
    geopolitical_risk: 0, esg_risk: 0, concentration_risk: 0, trend: 'stable',
  });

  const submit = async () => {
    await upsert.mutateAsync(form);
    setOpen(false);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /> Vendor Risk Scoring</h1>
          <p className="text-xs text-muted-foreground">Multi-dimensional risk assessments with weighted overall scores</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Score Vendor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Risk Assessment</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vendor Name</Label><Input value={form.vendor_name} onChange={e => setForm({...form, vendor_name: e.target.value})} /></div>
              <div><Label>Vendor Code</Label><Input value={form.vendor_code} onChange={e => setForm({...form, vendor_code: e.target.value})} /></div>
              <div><Label>Vendor ID (UUID)</Label><Input value={form.vendor_id || ''} onChange={e => setForm({...form, vendor_id: e.target.value})} /></div>
              <div><Label>Period</Label><Input value={form.score_period} onChange={e => setForm({...form, score_period: e.target.value})} /></div>
              <div><Label>Financial (0-100)</Label><Input type="number" value={form.financial_risk} onChange={e => setForm({...form, financial_risk: +e.target.value})} /></div>
              <div><Label>Operational</Label><Input type="number" value={form.operational_risk} onChange={e => setForm({...form, operational_risk: +e.target.value})} /></div>
              <div><Label>Compliance</Label><Input type="number" value={form.compliance_risk} onChange={e => setForm({...form, compliance_risk: +e.target.value})} /></div>
              <div><Label>Geopolitical</Label><Input type="number" value={form.geopolitical_risk} onChange={e => setForm({...form, geopolitical_risk: +e.target.value})} /></div>
              <div><Label>ESG</Label><Input type="number" value={form.esg_risk} onChange={e => setForm({...form, esg_risk: +e.target.value})} /></div>
              <div><Label>Concentration</Label><Input type="number" value={form.concentration_risk} onChange={e => setForm({...form, concentration_risk: +e.target.value})} /></div>
            </div>
            <Button onClick={submit} disabled={upsert.isPending}>Save (auto-computes overall)</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Latest Risk Scores</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-muted-foreground">Loading…</div> : !data?.length ? (
            <div className="text-center text-muted-foreground py-8">No assessments yet. Score a vendor to begin tracking risk.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Vendor</TableHead><TableHead>Date</TableHead>
                <TableHead className="text-right">Financial</TableHead><TableHead className="text-right">Ops</TableHead>
                <TableHead className="text-right">Compliance</TableHead><TableHead className="text-right">Geo</TableHead>
                <TableHead className="text-right">ESG</TableHead><TableHead className="text-right">Conc.</TableHead>
                <TableHead className="text-right">Overall</TableHead><TableHead>Tier</TableHead><TableHead>Trend</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.vendor_name || r.vendor_code || r.vendor_id?.slice(0,8)}</TableCell>
                    <TableCell className="text-xs">{new Date(r.scored_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.financial_risk}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.operational_risk}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.compliance_risk}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.geopolitical_risk}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.esg_risk}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.concentration_risk}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{r.overall_score}</TableCell>
                    <TableCell><Badge variant={TIER_VARIANT[r.risk_tier]}>{r.risk_tier}</Badge></TableCell>
                    <TableCell>{r.trend === 'improving' ? <TrendingDown className="h-4 w-4 text-success" /> : r.trend === 'deteriorating' ? <TrendingUp className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4 text-muted-foreground" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
