import { useState } from 'react';
import { useToleranceRules } from '@/hooks/useProcurementStrategic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';

export default function ToleranceRules() {
  const { data, isLoading, upsert, remove } = useToleranceRules();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ rule_name: '', doc_scope: 'all', price_variance_pct: 5, qty_variance_pct: 5, over_receipt_pct: 0, under_receipt_pct: 10, action_on_breach: 'warn', is_active: true });

  const submit = async () => {
    await upsert.mutateAsync(form);
    setOpen(false);
    setForm({ rule_name: '', doc_scope: 'all', price_variance_pct: 5, qty_variance_pct: 5, over_receipt_pct: 0, under_receipt_pct: 10, action_on_breach: 'warn', is_active: true });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" /> Tolerance Rules</h1>
          <p className="text-xs text-muted-foreground">Configure price/quantity variance bands for three-way matching</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Rule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tolerance Rule</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Rule Name</Label><Input value={form.rule_name} onChange={e => setForm({...form, rule_name: e.target.value})} /></div>
              <div><Label>Doc Scope</Label>
                <Select value={form.doc_scope} onValueChange={v => setForm({...form, doc_scope: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['all','grpo','invoice','po'].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Action on Breach</Label>
                <Select value={form.action_on_breach} onValueChange={v => setForm({...form, action_on_breach: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['warn','block','approve_required'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Price Variance %</Label><Input type="number" value={form.price_variance_pct} onChange={e => setForm({...form, price_variance_pct: +e.target.value})} /></div>
              <div><Label>Qty Variance %</Label><Input type="number" value={form.qty_variance_pct} onChange={e => setForm({...form, qty_variance_pct: +e.target.value})} /></div>
              <div><Label>Over-receipt %</Label><Input type="number" value={form.over_receipt_pct} onChange={e => setForm({...form, over_receipt_pct: +e.target.value})} /></div>
              <div><Label>Under-receipt %</Label><Input type="number" value={form.under_receipt_pct} onChange={e => setForm({...form, under_receipt_pct: +e.target.value})} /></div>
            </div>
            <Button onClick={submit} disabled={upsert.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Rules</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-muted-foreground">Loading…</div> : !data?.length ? (
            <div className="text-center text-muted-foreground py-8">No tolerance rules configured.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Rule</TableHead><TableHead>Scope</TableHead>
                <TableHead className="text-right">Price ±%</TableHead><TableHead className="text-right">Qty ±%</TableHead>
                <TableHead className="text-right">Over %</TableHead><TableHead className="text-right">Under %</TableHead>
                <TableHead>Action</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.doc_scope}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{r.price_variance_pct}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.qty_variance_pct}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.over_receipt_pct}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.under_receipt_pct}</TableCell>
                    <TableCell><Badge variant={r.action_on_breach === 'block' ? 'destructive' : r.action_on_breach === 'approve_required' ? 'default' : 'secondary'}>{r.action_on_breach}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
