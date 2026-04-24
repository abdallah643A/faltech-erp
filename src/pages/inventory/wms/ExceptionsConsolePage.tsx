import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWmsExceptions } from '@/hooks/useWMS';
import { format } from 'date-fns';

const severityColor: Record<string, string> = { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-gray-100 text-gray-800' };
const statusColor: Record<string, string> = { open: 'bg-red-100 text-red-800', investigating: 'bg-yellow-100 text-yellow-800', resolved: 'bg-green-100 text-green-800', escalated: 'bg-purple-100 text-purple-800' };

export default function ExceptionsConsolePage() {
  const { data = [], create, resolve } = useWmsExceptions();
  const [form, setForm] = useState<any>({ exception_type: 'short_pick', severity: 'medium', warehouse_code: '', item_code: '', expected_qty: 0, actual_qty: 0, description: '' });
  const [resolving, setResolving] = useState<any>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const open = data.filter((e: any) => e.status === 'open');
  const critical = data.filter((e: any) => e.severity === 'critical' && e.status !== 'resolved');

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Exception Resolution Console</h1>
        <p className="text-xs text-blue-100">Short-pick, over-receipt, damage & mis-pick management</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Open</div><div className="text-2xl font-bold text-red-600">{open.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Critical</div><div className="text-2xl font-bold text-orange-600">{critical.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Resolved Today</div><div className="text-2xl font-bold text-green-600">{data.filter((e: any) => e.status === 'resolved').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{data.length}</div></CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button size="sm">Log Exception</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Exception</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div><Label className="text-xs">Type</Label>
                <Select value={form.exception_type} onValueChange={(v) => setForm({ ...form, exception_type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_pick">Short Pick</SelectItem>
                    <SelectItem value="over_receipt">Over Receipt</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="mis_pick">Mis-pick</SelectItem>
                    <SelectItem value="missing">Missing Stock</SelectItem>
                    <SelectItem value="blocked">Blocked Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Warehouse</Label><Input value={form.warehouse_code} onChange={(e) => setForm({ ...form, warehouse_code: e.target.value })} className="h-9" /></div>
                <div><Label className="text-xs">Item Code</Label><Input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Expected Qty</Label><Input type="number" value={form.expected_qty} onChange={(e) => setForm({ ...form, expected_qty: parseFloat(e.target.value) })} className="h-9" /></div>
                <div><Label className="text-xs">Actual Qty</Label><Input type="number" value={form.actual_qty} onChange={(e) => setForm({ ...form, actual_qty: parseFloat(e.target.value) })} className="h-9" /></div>
              </div>
              <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <Button className="w-full" onClick={() => create.mutate(form)}>Log</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">All Exceptions</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-center">Severity</th>
              <th className="p-2 text-left">WH / Item</th>
              <th className="p-2 text-right">Variance</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2"></th>
            </tr></thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No exceptions</td></tr>}
              {data.map((e: any) => (
                <tr key={e.id} className="border-b">
                  <td className="p-2 text-xs">{format(new Date(e.created_at), 'MMM d HH:mm')}</td>
                  <td className="p-2"><Badge variant="outline">{e.exception_type}</Badge></td>
                  <td className="p-2 text-center"><Badge className={severityColor[e.severity]}>{e.severity}</Badge></td>
                  <td className="p-2 text-xs">{e.warehouse_code} / {e.item_code}</td>
                  <td className="p-2 text-right text-xs">{e.actual_qty} of {e.expected_qty}</td>
                  <td className="p-2 text-xs max-w-xs truncate">{e.description}</td>
                  <td className="p-2 text-center"><Badge className={statusColor[e.status]}>{e.status}</Badge></td>
                  <td className="p-2">{e.status !== 'resolved' && <Button size="sm" variant="outline" onClick={() => setResolving(e)}>Resolve</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!resolving} onOpenChange={(o) => !o && setResolving(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Exception</DialogTitle></DialogHeader>
          <Label className="text-xs">Resolution notes</Label>
          <Textarea value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} rows={4} />
          <Button onClick={() => { resolve.mutate({ id: resolving.id, resolution_notes: resolveNotes }); setResolving(null); setResolveNotes(''); }}>Mark Resolved</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
