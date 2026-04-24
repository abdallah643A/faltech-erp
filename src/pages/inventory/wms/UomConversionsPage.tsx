import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useUomConversions, convertUom } from '@/hooks/useWMS';
import { Trash2 } from 'lucide-react';

export default function UomConversionsPage() {
  const { data = [], create, remove } = useUomConversions();
  const [form, setForm] = useState<any>({ from_uom: '', to_uom: '', factor: 1, is_global: true, item_code: '' });
  const [calc, setCalc] = useState<any>({ qty: 1, factor: 1 });

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">International UoM Conversions</h1>
        <p className="text-xs text-blue-100">Define conversion factors between units (CASE, PALLET, KG, LB, etc.)</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader><CardTitle className="text-sm">Conversion Rules ({data.length})</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">From</th>
                <th className="p-2 text-center">→</th>
                <th className="p-2 text-left">To</th>
                <th className="p-2 text-right">Factor</th>
                <th className="p-2 text-center">Scope</th>
                <th className="p-2"></th>
              </tr></thead>
              <tbody>
                {data.map((c: any) => (
                  <tr key={c.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{c.item_code || 'ALL'}</td>
                    <td className="p-2 font-semibold">{c.from_uom}</td>
                    <td className="p-2 text-center">→</td>
                    <td className="p-2 font-semibold">{c.to_uom}</td>
                    <td className="p-2 text-right font-mono">{c.factor}</td>
                    <td className="p-2 text-center">{c.is_global ? <Badge variant="secondary">Global</Badge> : <Badge>Item</Badge>}</td>
                    <td className="p-2"><Button size="sm" variant="ghost" onClick={() => remove.mutate(c.id)}><Trash2 className="h-3 w-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Add Conversion</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div><Label className="text-xs">Item Code (blank=global)</Label><Input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} className="h-8" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">From UoM</Label><Input value={form.from_uom} onChange={(e) => setForm({ ...form, from_uom: e.target.value.toUpperCase() })} className="h-8" /></div>
                <div><Label className="text-xs">To UoM</Label><Input value={form.to_uom} onChange={(e) => setForm({ ...form, to_uom: e.target.value.toUpperCase() })} className="h-8" /></div>
              </div>
              <div><Label className="text-xs">Factor</Label><Input type="number" step="0.0001" value={form.factor} onChange={(e) => setForm({ ...form, factor: parseFloat(e.target.value) })} className="h-8" /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_global} onCheckedChange={(v) => setForm({ ...form, is_global: v })} /><Label className="text-xs">Global rule</Label></div>
              <Button size="sm" className="w-full" onClick={() => create.mutate({ ...form, item_code: form.item_code || null })}>Save</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Quick Calculator</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div><Label className="text-xs">Quantity</Label><Input type="number" value={calc.qty} onChange={(e) => setCalc({ ...calc, qty: parseFloat(e.target.value) || 0 })} className="h-8" /></div>
              <div><Label className="text-xs">Factor</Label><Input type="number" step="0.0001" value={calc.factor} onChange={(e) => setCalc({ ...calc, factor: parseFloat(e.target.value) || 1 })} className="h-8" /></div>
              <div className="text-center bg-muted p-2 rounded font-mono">= {convertUom(calc.qty, calc.factor).toFixed(4)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
