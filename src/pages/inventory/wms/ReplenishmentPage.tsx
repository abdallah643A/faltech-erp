import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReplenishmentSuggestions } from '@/hooks/useWMS';
import { Check, X } from 'lucide-react';

const priorityColor: Record<string, string> = { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', normal: 'bg-blue-100 text-blue-800', low: 'bg-gray-100 text-gray-800' };

export default function ReplenishmentPage() {
  const { data = [], create, update } = useReplenishmentSuggestions();
  const [form, setForm] = useState<any>({ item_code: '', warehouse_code: '', current_qty: 0, min_qty: 0, max_qty: 0, suggested_qty: 0, source_type: 'transfer', priority: 'normal' });

  const pending = data.filter((s: any) => s.status === 'pending');
  const totalSuggested = pending.reduce((sum: number, s: any) => sum + Number(s.suggested_qty), 0);

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Replenishment Suggestions</h1>
        <p className="text-xs text-blue-100">System-generated reorder & transfer recommendations</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Pending</div><div className="text-2xl font-bold">{pending.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Total Qty Needed</div><div className="text-2xl font-bold">{totalSuggested.toFixed(0)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Critical</div><div className="text-2xl font-bold text-red-600">{pending.filter((s: any) => s.priority === 'critical').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Approved Today</div><div className="text-2xl font-bold text-green-600">{data.filter((s: any) => s.status === 'approved').length}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader><CardTitle className="text-sm">Suggestions</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">WH</th>
                <th className="p-2 text-right">Current</th>
                <th className="p-2 text-right">Min/Max</th>
                <th className="p-2 text-right">Suggested</th>
                <th className="p-2 text-left">Source</th>
                <th className="p-2 text-center">Priority</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2"></th>
              </tr></thead>
              <tbody>
                {data.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">No suggestions</td></tr>}
                {data.map((s: any) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{s.item_code}</td>
                    <td className="p-2">{s.warehouse_code}</td>
                    <td className="p-2 text-right font-mono">{s.current_qty}</td>
                    <td className="p-2 text-right text-xs">{s.min_qty} / {s.max_qty}</td>
                    <td className="p-2 text-right font-mono font-semibold">{s.suggested_qty}</td>
                    <td className="p-2 text-xs">{s.source_type}{s.source_warehouse ? ` (${s.source_warehouse})` : ''}</td>
                    <td className="p-2 text-center"><Badge className={priorityColor[s.priority]}>{s.priority}</Badge></td>
                    <td className="p-2 text-center"><Badge variant="outline">{s.status}</Badge></td>
                    <td className="p-2">
                      {s.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: s.id, status: 'approved' })}><Check className="h-3 w-3 text-green-600" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: s.id, status: 'rejected' })}><X className="h-3 w-3 text-red-600" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Add Suggestion</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label className="text-xs">Item Code</Label><Input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} className="h-8" /></div>
            <div><Label className="text-xs">Warehouse</Label><Input value={form.warehouse_code} onChange={(e) => setForm({ ...form, warehouse_code: e.target.value })} className="h-8" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Current</Label><Input type="number" value={form.current_qty} onChange={(e) => setForm({ ...form, current_qty: parseFloat(e.target.value) })} className="h-8" /></div>
              <div><Label className="text-xs">Suggested</Label><Input type="number" value={form.suggested_qty} onChange={(e) => setForm({ ...form, suggested_qty: parseFloat(e.target.value) })} className="h-8" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Min</Label><Input type="number" value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: parseFloat(e.target.value) })} className="h-8" /></div>
              <div><Label className="text-xs">Max</Label><Input type="number" value={form.max_qty} onChange={(e) => setForm({ ...form, max_qty: parseFloat(e.target.value) })} className="h-8" /></div>
            </div>
            <div><Label className="text-xs">Source</Label>
              <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="transfer">Transfer</SelectItem><SelectItem value="purchase">Purchase</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
              </Select>
            </div>
            <Button size="sm" className="w-full" onClick={() => create.mutate(form)}>Save</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
