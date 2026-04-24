import { useState } from 'react';
import { useBusinessCases } from '@/hooks/usePMOEnhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Plus, TrendingUp, DollarSign, Clock, Target } from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-500/10 text-blue-700',
  under_review: 'bg-amber-500/10 text-amber-700',
  approved: 'bg-emerald-500/10 text-emerald-700',
  rejected: 'bg-destructive/10 text-destructive',
  on_hold: 'bg-orange-500/10 text-orange-700',
};

export default function BusinessCasesPage() {
  const { list, upsert } = useBusinessCases();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({
    case_name: '', strategic_alignment_score: 5, estimated_investment: 0,
    estimated_benefit: 0, npv: 0, irr: 0, payback_months: 12, risk_level: 'medium', status: 'draft',
  });

  const cases = list.data ?? [];
  const totalInvestment = cases.reduce((s: number, c: any) => s + Number(c.estimated_investment || 0), 0);
  const totalBenefit = cases.reduce((s: number, c: any) => s + Number(c.estimated_benefit || 0), 0);
  const approved = cases.filter((c: any) => c.status === 'approved').length;

  return (
    <div className="p-4 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6 text-primary" /> Business Cases</h1>
          <p className="text-sm text-muted-foreground">Investment justification with NPV, IRR, payback and strategic alignment</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Business Case</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New Business Case</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Case Name</Label><Input value={form.case_name} onChange={e => setForm({ ...form, case_name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Problem Statement</Label><Textarea rows={2} value={form.problem_statement || ''} onChange={e => setForm({ ...form, problem_statement: e.target.value })} /></div>
              <div className="col-span-2"><Label>Proposed Solution</Label><Textarea rows={2} value={form.proposed_solution || ''} onChange={e => setForm({ ...form, proposed_solution: e.target.value })} /></div>
              <div><Label>Investment (SAR)</Label><Input type="number" value={form.estimated_investment} onChange={e => setForm({ ...form, estimated_investment: +e.target.value })} /></div>
              <div><Label>Estimated Benefit (SAR)</Label><Input type="number" value={form.estimated_benefit} onChange={e => setForm({ ...form, estimated_benefit: +e.target.value })} /></div>
              <div><Label>NPV</Label><Input type="number" value={form.npv} onChange={e => setForm({ ...form, npv: +e.target.value })} /></div>
              <div><Label>IRR (%)</Label><Input type="number" step="0.01" value={form.irr} onChange={e => setForm({ ...form, irr: +e.target.value })} /></div>
              <div><Label>Payback (months)</Label><Input type="number" value={form.payback_months} onChange={e => setForm({ ...form, payback_months: +e.target.value })} /></div>
              <div><Label>Strategic Alignment (0-10)</Label><Input type="number" min={0} max={10} value={form.strategic_alignment_score} onChange={e => setForm({ ...form, strategic_alignment_score: +e.target.value })} /></div>
              <div>
                <Label>Risk Level</Label>
                <Select value={form.risk_level} onValueChange={v => setForm({ ...form, risk_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(statusColors).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => upsert.mutate(form, { onSuccess: () => setOpen(false) })} disabled={upsert.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Total Cases</span><Briefcase className="h-4 w-4 text-primary" /></div><div className="text-2xl font-bold mt-1">{cases.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Approved</span><Target className="h-4 w-4 text-emerald-600" /></div><div className="text-2xl font-bold mt-1 text-emerald-600">{approved}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Total Investment</span><DollarSign className="h-4 w-4 text-amber-600" /></div><div className="text-xl font-bold mt-1">{totalInvestment.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Total Benefit</span><TrendingUp className="h-4 w-4 text-emerald-600" /></div><div className="text-xl font-bold mt-1 text-emerald-600">{totalBenefit.toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Business Cases</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {cases.map((c: any) => (
              <div key={c.id} className="border rounded-md p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{c.case_name}</span>
                    <Badge className={statusColors[c.status]}>{c.status}</Badge>
                    <Badge variant="outline" className="text-[10px]">Risk: {c.risk_level}</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-muted-foreground">
                    <div><DollarSign className="inline h-3 w-3" /> Inv: {Number(c.estimated_investment).toLocaleString()}</div>
                    <div><TrendingUp className="inline h-3 w-3" /> Ben: {Number(c.estimated_benefit).toLocaleString()}</div>
                    <div>NPV: {Number(c.npv).toLocaleString()}</div>
                    <div>IRR: {c.irr}%</div>
                    <div><Clock className="inline h-3 w-3" /> Payback: {c.payback_months}m</div>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-muted-foreground">Alignment</div>
                  <div className="text-xl font-bold text-primary">{c.strategic_alignment_score}/10</div>
                </div>
              </div>
            ))}
            {cases.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No business cases yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
