import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, Calculator } from 'lucide-react';

interface EscalationRule {
  id: string;
  name: string;
  index_type: string;
  base_value: number;
  current_value: number;
  annual_rate: number;
  formula: string;
  applies_to: string;
  effective_date: string;
}

export function EscalationFormulas() {
  const [rules, setRules] = useState<EscalationRule[]>([
    { id: '1', name: 'KSA CPI Adjustment', index_type: 'CPI', base_value: 100, current_value: 108.5, annual_rate: 2.8, formula: 'base_price × (current_CPI / base_CPI)', applies_to: 'All contracts', effective_date: '2026-01-01' },
    { id: '2', name: 'Steel Price Index', index_type: 'Material', base_value: 1000, current_value: 1180, annual_rate: 6.0, formula: 'material_cost × (current_index / base_index)', applies_to: 'Construction materials', effective_date: '2026-01-01' },
    { id: '3', name: 'Labor Rate Escalation', index_type: 'Labor', base_value: 100, current_value: 104.2, annual_rate: 3.5, formula: 'labor_rate × (1 + annual_rate)^years', applies_to: 'All labor categories', effective_date: '2026-01-01' },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcForm, setCalcForm] = useState({ rule_id: '', original_amount: '', years: '1' });
  const [calcResult, setCalcResult] = useState<number | null>(null);

  const [form, setForm] = useState({ name: '', index_type: 'CPI', base_value: '', current_value: '', annual_rate: '', formula: '', applies_to: '', effective_date: '' });

  const handleAdd = () => {
    setRules(prev => [...prev, {
      id: crypto.randomUUID(), name: form.name, index_type: form.index_type,
      base_value: Number(form.base_value), current_value: Number(form.current_value),
      annual_rate: Number(form.annual_rate), formula: form.formula,
      applies_to: form.applies_to, effective_date: form.effective_date,
    }]);
    setDialogOpen(false);
  };

  const handleCalc = () => {
    const rule = rules.find(r => r.id === calcForm.rule_id);
    if (!rule) return;
    const amount = Number(calcForm.original_amount);
    const years = Number(calcForm.years);
    const escalated = amount * Math.pow(1 + rule.annual_rate / 100, years);
    setCalcResult(Math.round(escalated));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Escalation Formulas</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCalcOpen(true)}><Calculator className="h-4 w-4 mr-1" /> Calculate</Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Rule</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Index</TableHead><TableHead>Base</TableHead>
                <TableHead>Current</TableHead><TableHead>Annual Rate</TableHead><TableHead>Change</TableHead>
                <TableHead>Formula</TableHead><TableHead>Applies To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(r => {
                const change = r.base_value > 0 ? ((r.current_value - r.base_value) / r.base_value * 100).toFixed(1) : '0';
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline">{r.index_type}</Badge></TableCell>
                    <TableCell>{r.base_value}</TableCell>
                    <TableCell className="font-bold">{r.current_value}</TableCell>
                    <TableCell><Badge>{r.annual_rate}%</Badge></TableCell>
                    <TableCell className={Number(change) > 0 ? 'text-destructive font-bold' : 'text-emerald-600 font-bold'}>+{change}%</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.formula}</TableCell>
                    <TableCell className="text-sm">{r.applies_to}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Calculator */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Escalation Calculator</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={calcForm.rule_id} onValueChange={v => setCalcForm(f => ({ ...f, rule_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select escalation rule" /></SelectTrigger>
              <SelectContent>{rules.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.annual_rate}%)</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" placeholder="Original Amount (SAR)" value={calcForm.original_amount} onChange={e => setCalcForm(f => ({ ...f, original_amount: e.target.value }))} />
            <Input type="number" placeholder="Years" value={calcForm.years} onChange={e => setCalcForm(f => ({ ...f, years: e.target.value }))} />
            <Button onClick={handleCalc} className="w-full">Calculate Escalated Price</Button>
            {calcResult !== null && (
              <Card className="border-primary/30">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground">Escalated Amount</p>
                  <p className="text-3xl font-bold text-primary">{calcResult.toLocaleString()} SAR</p>
                  <p className="text-xs text-muted-foreground">+{(calcResult - Number(calcForm.original_amount)).toLocaleString()} increase</p>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Escalation Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Rule Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.index_type} onValueChange={v => setForm(f => ({ ...f, index_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['CPI', 'Material', 'Labor', 'Equipment', 'Custom'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Annual Rate %" value={form.annual_rate} onChange={e => setForm(f => ({ ...f, annual_rate: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Base Value" value={form.base_value} onChange={e => setForm(f => ({ ...f, base_value: e.target.value }))} />
              <Input type="number" placeholder="Current Value" value={form.current_value} onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))} />
            </div>
            <Input placeholder="Formula" value={form.formula} onChange={e => setForm(f => ({ ...f, formula: e.target.value }))} />
            <Input placeholder="Applies To" value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value }))} />
            <Button onClick={handleAdd} disabled={!form.name} className="w-full">Add Rule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
