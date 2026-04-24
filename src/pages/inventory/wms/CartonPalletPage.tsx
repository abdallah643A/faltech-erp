import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCartonPallets } from '@/hooks/useWMS';
import { Package, Box, Layers } from 'lucide-react';

export default function CartonPalletPage() {
  const { data = [], create } = useCartonPallets();
  const [form, setForm] = useState<any>({ level: 'pallet', warehouse_code: '', item_code: '', quantity: 0, uom: 'EA', weight_kg: 0 });

  const icon = (level: string) => level === 'pallet' ? <Layers className="h-4 w-4" /> : level === 'carton' ? <Box className="h-4 w-4" /> : <Package className="h-4 w-4" />;

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Carton & Pallet Hierarchy</h1>
        <p className="text-xs text-blue-100">SSCC-based packaging structure (Pallet → Carton → Inner Pack → Unit)</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader><CardTitle className="text-sm">Pack Units ({data.length})</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="p-2 text-left">SSCC</th>
                <th className="p-2 text-left">Level</th>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">WH / Bin</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Weight</th>
                <th className="p-2 text-center">Status</th>
              </tr></thead>
              <tbody>
                {data.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No pack units yet</td></tr>}
                {data.map((p: any) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{p.sscc}</td>
                    <td className="p-2"><span className="flex items-center gap-1">{icon(p.level)} {p.level}</span></td>
                    <td className="p-2 font-mono text-xs">{p.item_code || '—'}</td>
                    <td className="p-2 text-xs">{p.warehouse_code} / {p.bin_code || '—'}</td>
                    <td className="p-2 text-right">{p.quantity} {p.uom}</td>
                    <td className="p-2 text-right">{p.weight_kg} kg</td>
                    <td className="p-2 text-center"><Badge variant="outline">{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">New Pack Unit</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label className="text-xs">Level</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pallet">Pallet</SelectItem>
                  <SelectItem value="carton">Carton</SelectItem>
                  <SelectItem value="inner_pack">Inner Pack</SelectItem>
                  <SelectItem value="unit">Unit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Warehouse</Label><Input value={form.warehouse_code} onChange={(e) => setForm({ ...form, warehouse_code: e.target.value })} className="h-8" /></div>
            <div><Label className="text-xs">Item Code</Label><Input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} className="h-8" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Qty</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) })} className="h-8" /></div>
              <div><Label className="text-xs">UoM</Label><Input value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} className="h-8" /></div>
            </div>
            <div><Label className="text-xs">Weight (kg)</Label><Input type="number" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: parseFloat(e.target.value) })} className="h-8" /></div>
            <Button size="sm" className="w-full" onClick={() => create.mutate(form)}>Generate SSCC</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
