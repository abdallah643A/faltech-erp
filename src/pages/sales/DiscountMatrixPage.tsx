import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Percent, Plus, Trash2 } from 'lucide-react';
import { useDiscountMatrix } from '@/hooks/useQuoteToCash';

export default function DiscountMatrixPage() {
  const { rules, isLoading, createRule, deleteRule } = useDiscountMatrix();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    rule_name: '', customer_group: '', item_group: '',
    min_quantity: 0, discount_percent: 0, priority: 100,
  });

  const handleCreate = async () => {
    await createRule.mutateAsync(form);
    setOpen(false);
    setForm({ rule_name: '', customer_group: '', item_group: '', min_quantity: 0, discount_percent: 0, priority: 100 });
  };

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Percent className="h-6 w-6 text-primary" /> Discount Matrix</h1>
          <p className="text-sm text-muted-foreground">Configurable discount rules by customer, item, volume</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Rule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Discount Rule</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Rule Name</Label><Input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Customer Group</Label><Input value={form.customer_group} onChange={(e) => setForm({ ...form, customer_group: e.target.value })} /></div>
                <div><Label>Item Group</Label><Input value={form.item_group} onChange={(e) => setForm({ ...form, item_group: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Min Qty</Label><Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Discount %</Label><Input type="number" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 100 })} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Rules ({rules.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Customer Group</TableHead><TableHead>Item Group</TableHead><TableHead>Min Qty</TableHead><TableHead>Discount %</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-6">Loading...</TableCell></TableRow>}
              {!isLoading && rules.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No rules</TableCell></TableRow>}
              {rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.rule_name}</TableCell>
                  <TableCell>{r.customer_group || '—'}</TableCell>
                  <TableCell>{r.item_group || '—'}</TableCell>
                  <TableCell>{r.min_quantity}</TableCell>
                  <TableCell><Badge>{r.discount_percent}%</Badge></TableCell>
                  <TableCell>{r.priority}</TableCell>
                  <TableCell><Badge variant={r.is_active ? 'default' : 'outline'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => deleteRule.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
