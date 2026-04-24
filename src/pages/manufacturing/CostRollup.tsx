import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCostRollups } from '@/hooks/useMfgEnhanced';
import { format } from 'date-fns';

export default function CostRollupPage() {
  const { data = [], create } = useCostRollups();
  const [form, setForm] = useState<any>({ product_code: '', product_name: '', bom_version: '1', plant_code: 'PLANT01', material_cost: 0, labor_cost: 0, overhead_cost: 0, subcontract_cost: 0, currency: 'SAR', rollup_date: new Date().toISOString().slice(0, 10) });
  const total = Number(form.material_cost) + Number(form.labor_cost) + Number(form.overhead_cost) + Number(form.subcontract_cost);

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Cost Roll-Up by Version & Plant</h1>
        <p className="text-xs text-blue-100">Multi-level cost calculation snapshots (SAR)</p>
      </div>

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button size="sm">New Roll-Up</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cost Roll-Up</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Product Code</Label><Input value={form.product_code} onChange={(e) => setForm({ ...form, product_code: e.target.value })} className="h-9" /></div>
                <div><Label className="text-xs">Product Name</Label><Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">BOM Version</Label><Input value={form.bom_version} onChange={(e) => setForm({ ...form, bom_version: e.target.value })} className="h-9" /></div>
                <div><Label className="text-xs">Plant</Label><Input value={form.plant_code} onChange={(e) => setForm({ ...form, plant_code: e.target.value })} className="h-9" /></div>
                <div><Label className="text-xs">Date</Label><Input type="date" value={form.rollup_date} onChange={(e) => setForm({ ...form, rollup_date: e.target.value })} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Material</Label><Input type="number" value={form.material_cost} onChange={(e) => setForm({ ...form, material_cost: parseFloat(e.target.value) })} className="h-9" /></div>
                <div><Label className="text-xs">Labor</Label><Input type="number" value={form.labor_cost} onChange={(e) => setForm({ ...form, labor_cost: parseFloat(e.target.value) })} className="h-9" /></div>
                <div><Label className="text-xs">Overhead</Label><Input type="number" value={form.overhead_cost} onChange={(e) => setForm({ ...form, overhead_cost: parseFloat(e.target.value) })} className="h-9" /></div>
                <div><Label className="text-xs">Subcontract</Label><Input type="number" value={form.subcontract_cost} onChange={(e) => setForm({ ...form, subcontract_cost: parseFloat(e.target.value) })} className="h-9" /></div>
              </div>
              <div className="bg-muted p-2 rounded text-center">Total: <strong>{total.toFixed(2)} SAR</strong></div>
              <Button className="w-full" onClick={() => create.mutate(form)}>Save Roll-Up</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Roll-Up History ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-left">Version</th>
              <th className="p-2 text-left">Plant</th>
              <th className="p-2 text-right">Material</th>
              <th className="p-2 text-right">Labor</th>
              <th className="p-2 text-right">Overhead</th>
              <th className="p-2 text-right">Subcontract</th>
              <th className="p-2 text-right">Total</th>
            </tr></thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">No roll-ups yet</td></tr>}
              {data.map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2 text-xs">{format(new Date(r.rollup_date), 'MMM d, yyyy')}</td>
                  <td className="p-2 font-mono text-xs">{r.product_code}</td>
                  <td className="p-2">{r.bom_version}</td>
                  <td className="p-2">{r.plant_code}</td>
                  <td className="p-2 text-right">{Number(r.material_cost).toFixed(2)}</td>
                  <td className="p-2 text-right">{Number(r.labor_cost).toFixed(2)}</td>
                  <td className="p-2 text-right">{Number(r.overhead_cost).toFixed(2)}</td>
                  <td className="p-2 text-right">{Number(r.subcontract_cost).toFixed(2)}</td>
                  <td className="p-2 text-right font-semibold">{Number(r.total_cost).toFixed(2)} {r.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
