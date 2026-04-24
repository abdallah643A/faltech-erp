import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Zap, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePaymentOptimizationRuns, usePaymentRecommendations, useCreateOptimizationRun } from '@/hooks/useBankTreasury';

export default function PaymentOptimizationPage() {
  const { data: runs = [] } = usePaymentOptimizationRuns();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: recs = [] } = usePaymentRecommendations(selectedRunId || undefined);
  const createRun = useCreateOptimizationRun();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ available_cash: 100000, horizon_days: 30, strategy: 'balanced' });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v);
  const selectedRun = runs.find((r: any) => r.id === selectedRunId);

  const handleRun = async () => {
    const run: any = await createRun.mutateAsync(form);
    setSelectedRunId(run.id);
    setOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6 text-primary"/>Payment Optimization</h1>
          <p className="text-sm text-muted-foreground">Prioritize vendor payments by cash availability, due dates, and discount opportunities</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm">New Optimization Run</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Run Payment Optimization</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Available Cash (SAR)</Label><Input type="number" value={form.available_cash} onChange={e => setForm({ ...form, available_cash: Number(e.target.value) })}/></div>
              <div><Label>Horizon (days)</Label><Input type="number" value={form.horizon_days} onChange={e => setForm({ ...form, horizon_days: Number(e.target.value) })}/></div>
              <div><Label>Strategy</Label>
                <Select value={form.strategy} onValueChange={v => setForm({ ...form, strategy: v })}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="discount_max">Maximize Discounts</SelectItem>
                    <SelectItem value="liquidity_preserve">Preserve Liquidity</SelectItem>
                    <SelectItem value="priority">Priority First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={handleRun} disabled={createRun.isPending}>Run</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Runs</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {runs.length === 0 && <p className="text-sm text-muted-foreground">No runs yet.</p>}
            {runs.map((r: any) => (
              <button key={r.id} onClick={() => setSelectedRunId(r.id)}
                className={`w-full text-left p-3 rounded-lg border transition ${selectedRunId === r.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{r.run_date}</span>
                  <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">SAR {fmt(Number(r.available_cash))} → {fmt(Number(r.total_recommended))}</p>
                <Badge variant="secondary" className="text-[10px] mt-1">{r.strategy}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Recommendations {selectedRun && `(${recs.length})`}</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedRun ? <p className="text-sm text-muted-foreground">Select a run to view recommendations.</p> : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Available Cash</p>
                    <p className="text-sm font-bold">SAR {fmt(Number(selectedRun.available_cash))}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Total Payable</p>
                    <p className="text-sm font-bold">SAR {fmt(Number(selectedRun.total_payable))}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Recommended</p>
                    <p className="text-sm font-bold text-primary">SAR {fmt(Number(selectedRun.total_recommended))}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-2">Vendor</th><th>Invoice</th>
                        <th className="text-right">Amount</th><th className="text-right">Pay</th>
                        <th>Due</th><th className="text-right">Risk</th><th>Score</th><th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recs.map((r: any) => (
                        <tr key={r.id} className="border-b hover:bg-muted/30">
                          <td className="py-2">{r.vendor_name}</td>
                          <td className="font-mono text-xs">{r.invoice_number}</td>
                          <td className="text-right">{fmt(Number(r.invoice_amount))}</td>
                          <td className="text-right font-medium">
                            {r.is_selected ? <span className="text-green-600">{fmt(Number(r.recommended_amount))}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="text-xs">{r.due_date || '—'}</td>
                          <td className="text-right text-xs text-red-600">{Number(r.late_fee_risk) > 0 ? fmt(Number(r.late_fee_risk)) : '—'}</td>
                          <td><Badge variant="outline" className="text-[10px]">{Math.round(Number(r.priority_score))}</Badge></td>
                          <td className="text-xs text-muted-foreground">{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
