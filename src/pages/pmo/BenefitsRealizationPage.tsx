import { useState } from 'react';
import { useBenefitsRealization } from '@/hooks/usePMOEnhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Plus, TrendingUp } from 'lucide-react';

const statusColor: Record<string, string> = {
  planned: 'bg-muted text-muted-foreground',
  tracking: 'bg-blue-500/10 text-blue-700',
  realized: 'bg-emerald-500/10 text-emerald-700',
  partial: 'bg-amber-500/10 text-amber-700',
  missed: 'bg-destructive/10 text-destructive',
  abandoned: 'bg-muted text-muted-foreground',
};

export default function BenefitsRealizationPage() {
  const { list, upsert } = useBenefitsRealization();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({
    benefit_name: '', benefit_type: 'financial', baseline_value: 0,
    target_value: 0, actual_value: 0, status: 'planned',
  });

  const benefits = list.data ?? [];
  const realized = benefits.filter((b: any) => b.status === 'realized').length;
  const totalTarget = benefits.reduce((s: number, b: any) => s + Number(b.target_value || 0), 0);
  const totalActual = benefits.reduce((s: number, b: any) => s + Number(b.actual_value || 0), 0);

  return (
    <div className="p-4 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6 text-primary" /> Benefits Realization</h1>
          <p className="text-sm text-muted-foreground">Track planned vs actual benefits — financial, operational, strategic, compliance</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Benefit</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Benefit</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div><Label>Benefit Name</Label><Input value={form.benefit_name} onChange={e => setForm({ ...form, benefit_name: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.benefit_type} onValueChange={v => setForm({ ...form, benefit_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['financial', 'operational', 'strategic', 'compliance', 'customer', 'employee'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Baseline</Label><Input type="number" value={form.baseline_value} onChange={e => setForm({ ...form, baseline_value: +e.target.value })} /></div>
                <div><Label>Target</Label><Input type="number" value={form.target_value} onChange={e => setForm({ ...form, target_value: +e.target.value })} /></div>
                <div><Label>Actual</Label><Input type="number" value={form.actual_value} onChange={e => setForm({ ...form, actual_value: +e.target.value })} /></div>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={form.realization_due_date || ''} onChange={e => setForm({ ...form, realization_due_date: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(statusColor).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => upsert.mutate(form, { onSuccess: () => setOpen(false) })} disabled={upsert.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Benefits</div><div className="text-2xl font-bold mt-1">{benefits.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Realized</div><div className="text-2xl font-bold mt-1 text-emerald-600">{realized}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Target</div><div className="text-xl font-bold mt-1">{totalTarget.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Actual</div><div className="text-xl font-bold mt-1 text-emerald-600">{totalActual.toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Benefits Tracker</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {benefits.map((b: any) => (
              <div key={b.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{b.benefit_name}</span>
                    <Badge variant="outline" className="text-[10px]">{b.benefit_type}</Badge>
                    <Badge className={statusColor[b.status]}>{b.status}</Badge>
                  </div>
                  <div className="text-sm text-primary font-bold"><TrendingUp className="inline h-3 w-3 mr-1" />{Number(b.realization_percent).toFixed(1)}%</div>
                </div>
                <Progress value={Math.min(100, Number(b.realization_percent))} className="h-2 mb-2" />
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>Baseline: {Number(b.baseline_value).toLocaleString()}</div>
                  <div>Target: {Number(b.target_value).toLocaleString()}</div>
                  <div>Actual: {Number(b.actual_value).toLocaleString()}</div>
                </div>
              </div>
            ))}
            {benefits.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No benefits tracked yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
