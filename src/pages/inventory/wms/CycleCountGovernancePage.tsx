import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCycleCountPlans, useCycleCountLines } from '@/hooks/useWMS';

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  posted: 'bg-purple-100 text-purple-800',
};

export default function CycleCountGovernancePage() {
  const { data = [], create, update } = useCycleCountPlans();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const { data: lines = [], update: updateLine } = useCycleCountLines(selectedId);
  const [form, setForm] = useState<any>({ plan_name: '', warehouse_code: '', count_method: 'abc', scheduled_date: '', variance_tolerance_pct: 2 });

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Cycle Count Governance</h1>
        <p className="text-xs text-blue-100">ABC-classified counting plans with variance approval workflow</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Plans ({data.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-auto">
            {data.map((p: any) => (
              <div key={p.id} onClick={() => setSelectedId(p.id)} className={`p-2 border rounded cursor-pointer ${selectedId === p.id ? 'border-primary bg-accent' : 'hover:bg-accent/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs">{p.plan_code}</div>
                  <Badge className={statusColor[p.status]}>{p.status}</Badge>
                </div>
                <div className="text-sm">{p.plan_name}</div>
                <div className="text-xs text-muted-foreground">{p.warehouse_code} • {p.count_method?.toUpperCase()}</div>
              </div>
            ))}
            {data.length === 0 && <div className="text-center text-muted-foreground text-sm py-4">No plans</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">New Plan</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label className="text-xs">Plan Name</Label><Input value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} className="h-8" /></div>
            <div><Label className="text-xs">Warehouse</Label><Input value={form.warehouse_code} onChange={(e) => setForm({ ...form, warehouse_code: e.target.value })} className="h-8" /></div>
            <div><Label className="text-xs">Method</Label>
              <Select value={form.count_method} onValueChange={(v) => setForm({ ...form, count_method: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="abc">ABC Classification</SelectItem>
                  <SelectItem value="random">Random Sample</SelectItem>
                  <SelectItem value="full">Full Count</SelectItem>
                  <SelectItem value="location">By Location</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Scheduled</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className="h-8" /></div>
            <div><Label className="text-xs">Tolerance %</Label><Input type="number" step="0.1" value={form.variance_tolerance_pct} onChange={(e) => setForm({ ...form, variance_tolerance_pct: parseFloat(e.target.value) })} className="h-8" /></div>
            <Button size="sm" className="w-full" onClick={() => create.mutate(form)}>Create Plan</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Plan Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!selectedId && <div className="text-sm text-muted-foreground">Select a plan</div>}
            {selectedId && (
              <>
                <Button size="sm" className="w-full" variant="outline" onClick={() => update.mutate({ id: selectedId, status: 'in_progress' })}>Start Counting</Button>
                <Button size="sm" className="w-full" variant="outline" onClick={() => update.mutate({ id: selectedId, status: 'pending_approval' })}>Submit for Approval</Button>
                <Button size="sm" className="w-full" onClick={() => update.mutate({ id: selectedId, status: 'approved' })}>Approve & Post</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedId && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Count Lines ({lines.length})</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">Bin</th>
                <th className="p-2 text-right">System Qty</th>
                <th className="p-2 text-right">Counted</th>
                <th className="p-2 text-right">Variance</th>
                <th className="p-2 text-center">Status</th>
              </tr></thead>
              <tbody>
                {lines.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No lines yet — add items via items master</td></tr>}
                {lines.map((l: any) => (
                  <tr key={l.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{l.item_code}</td>
                    <td className="p-2">{l.bin_code || '—'}</td>
                    <td className="p-2 text-right">{l.system_qty}</td>
                    <td className="p-2 text-right"><Input type="number" defaultValue={l.counted_qty || ''} onBlur={(e) => updateLine.mutate({ id: l.id, counted_qty: parseFloat(e.target.value), system_qty: l.system_qty, status: 'counted' })} className="h-7 w-20 ml-auto" /></td>
                    <td className={`p-2 text-right font-mono ${l.variance_qty != null && Math.abs(l.variance_pct || 0) > 2 ? 'text-red-600' : ''}`}>{l.variance_qty != null ? l.variance_qty : '—'} {l.variance_pct != null && `(${Number(l.variance_pct).toFixed(1)}%)`}</td>
                    <td className="p-2 text-center"><Badge variant="outline">{l.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
