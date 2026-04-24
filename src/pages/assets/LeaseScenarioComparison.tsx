import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, GitCompare, CheckCircle2 } from 'lucide-react';
import { useLeaseScenarios } from '@/hooks/useAssetEnhanced';

export default function LeaseScenarioComparison() {
  const { data: scenarios = [], upsert, recommend } = useLeaseScenarios();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ scenario_type: 'buy', term_months: 36, upfront_cost: 0, monthly_cost: 0, residual_value: 0, interest_rate: 0.08, status: 'draft' });
  const fmt = (v: any) => new Intl.NumberFormat('en-SA').format(Math.round(Number(v) || 0));

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitCompare className="h-6 w-6 text-primary" />Lease vs Buy vs Rent Scenarios</h1>
          <p className="text-muted-foreground">Compare acquisition options with NPV and total cost (SAR)</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Scenario</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Scenario</TableHead><TableHead>Type</TableHead><TableHead>Term</TableHead>
              <TableHead className="text-right">Upfront</TableHead><TableHead className="text-right">Monthly</TableHead>
              <TableHead className="text-right">Residual</TableHead><TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">NPV</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {scenarios.map((s: any) => (
                <TableRow key={s.id} className={s.recommended ? 'bg-primary/5' : ''}>
                  <TableCell><div className="font-medium">{s.scenario_name}</div>{s.recommended && <Badge className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Recommended</Badge>}</TableCell>
                  <TableCell><Badge variant="outline">{s.scenario_type}</Badge></TableCell>
                  <TableCell>{s.term_months} mo</TableCell>
                  <TableCell className="text-right font-mono">{fmt(s.upfront_cost)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(s.monthly_cost)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(s.residual_value)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(s.total_cost)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(s.npv)}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => recommend.mutate(s.id)}>Recommend</Button></TableCell>
                </TableRow>
              ))}
              {scenarios.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No scenarios</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Scenario</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Name</Label><Input value={draft.scenario_name || ''} onChange={(e) => setDraft({ ...draft, scenario_name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={draft.scenario_type} onValueChange={(v) => setDraft({ ...draft, scenario_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['buy', 'lease_finance', 'lease_operating', 'rent_short', 'rent_long'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Term (months)</Label><Input type="number" value={draft.term_months} onChange={(e) => setDraft({ ...draft, term_months: Number(e.target.value) })} /></div>
            <div><Label>Upfront (SAR)</Label><Input type="number" value={draft.upfront_cost} onChange={(e) => setDraft({ ...draft, upfront_cost: Number(e.target.value) })} /></div>
            <div><Label>Monthly (SAR)</Label><Input type="number" value={draft.monthly_cost} onChange={(e) => setDraft({ ...draft, monthly_cost: Number(e.target.value) })} /></div>
            <div><Label>Residual Value</Label><Input type="number" value={draft.residual_value} onChange={(e) => setDraft({ ...draft, residual_value: Number(e.target.value) })} /></div>
            <div><Label>Interest Rate (decimal)</Label><Input type="number" step="0.001" value={draft.interest_rate} onChange={(e) => setDraft({ ...draft, interest_rate: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={!draft.scenario_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
