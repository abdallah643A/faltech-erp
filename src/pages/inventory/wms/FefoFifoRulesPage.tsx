import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFefoFifoRules } from '@/hooks/useWMS';
import { Trash2 } from 'lucide-react';

const strategyDesc: Record<string, string> = {
  fefo: 'First Expired, First Out — best for perishables, pharma',
  fifo: 'First In, First Out — standard rotation',
  lifo: 'Last In, First Out — bulk commodities',
  manual: 'Manual selection — special cases',
};

export default function FefoFifoRulesPage() {
  const { data = [], create, remove } = useFefoFifoRules();
  const [form, setForm] = useState<any>({ warehouse_code: '', item_code: '', item_group: '', strategy: 'fefo', priority: 100, is_active: true });

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">FEFO / FIFO Picking Rules</h1>
        <p className="text-xs text-blue-100">Per-warehouse / per-item picking strategy engine</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader><CardTitle className="text-sm">Active Rules ({data.length})</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="p-2 text-left">Priority</th>
                <th className="p-2 text-left">Warehouse</th>
                <th className="p-2 text-left">Item / Group</th>
                <th className="p-2 text-center">Strategy</th>
                <th className="p-2 text-center">Active</th>
                <th className="p-2"></th>
              </tr></thead>
              <tbody>
                {data.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No rules — system uses FIFO by default</td></tr>}
                {data.map((r: any) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-2 font-mono">{r.priority}</td>
                    <td className="p-2">{r.warehouse_code || 'ALL'}</td>
                    <td className="p-2 text-xs">{r.item_code || r.item_group || 'ALL'}</td>
                    <td className="p-2 text-center"><Badge className="bg-blue-100 text-blue-800">{r.strategy?.toUpperCase()}</Badge></td>
                    <td className="p-2 text-center">{r.is_active ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <Badge variant="outline">No</Badge>}</td>
                    <td className="p-2"><Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">New Rule</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div><Label className="text-xs">Warehouse (blank=all)</Label><Input value={form.warehouse_code} onChange={(e) => setForm({ ...form, warehouse_code: e.target.value })} className="h-8" /></div>
              <div><Label className="text-xs">Item Code (blank=all)</Label><Input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} className="h-8" /></div>
              <div><Label className="text-xs">Item Group</Label><Input value={form.item_group} onChange={(e) => setForm({ ...form, item_group: e.target.value })} className="h-8" /></div>
              <div><Label className="text-xs">Strategy</Label>
                <Select value={form.strategy} onValueChange={(v) => setForm({ ...form, strategy: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fefo">FEFO</SelectItem>
                    <SelectItem value="fifo">FIFO</SelectItem>
                    <SelectItem value="lifo">LIFO</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground mt-1">{strategyDesc[form.strategy]}</div>
              </div>
              <div><Label className="text-xs">Priority (lower=higher)</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })} className="h-8" /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label className="text-xs">Active</Label></div>
              <Button size="sm" className="w-full" onClick={() => create.mutate({ ...form, item_code: form.item_code || null, item_group: form.item_group || null, warehouse_code: form.warehouse_code || null })}>Save</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
