import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSubcontractOrders, useSubcontractComponents } from '@/hooks/useMfgEnhanced';

const statusColor: Record<string, string> = {
  open: 'bg-gray-100 text-gray-800',
  materials_issued: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  closed: 'bg-purple-100 text-purple-800',
};

export default function SubcontractManufacturingPage() {
  const { data = [], create, update } = useSubcontractOrders();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const { data: comps = [], create: createComp } = useSubcontractComponents(selectedId);
  const selected = data.find((s: any) => s.id === selectedId);
  const [form, setForm] = useState<any>({ vendor_code: '', vendor_name: '', finished_item_code: '', finished_item_description: '', ordered_qty: 0, service_cost_per_unit: 0, currency: 'SAR', promised_date: '' });
  const [comp, setComp] = useState<any>({ component_code: '', component_description: '', required_qty: 0, unit_cost: 0 });

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Subcontract Manufacturing</h1>
        <p className="text-xs text-blue-100">External vendor production with free-issue components (SAR)</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Open</div><div className="text-2xl font-bold">{data.filter((s: any) => s.status === 'open').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">In Progress</div><div className="text-2xl font-bold text-yellow-600">{data.filter((s: any) => ['materials_issued','in_progress'].includes(s.status)).length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Received</div><div className="text-2xl font-bold text-green-600">{data.filter((s: any) => s.status === 'received').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Total Service Cost</div><div className="text-2xl font-bold">{data.reduce((s: number, o: any) => s + (Number(o.service_cost_per_unit) * Number(o.ordered_qty)), 0).toFixed(0)} SAR</div></CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button size="sm">New Subcontract Order</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Subcontract Order</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Vendor Code</Label><Input value={form.vendor_code} onChange={(e) => setForm({ ...form, vendor_code: e.target.value })} className="h-9" /></div>
                <div><Label className="text-xs">Vendor Name</Label><Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} className="h-9" /></div>
              </div>
              <div><Label className="text-xs">Finished Item Code</Label><Input value={form.finished_item_code} onChange={(e) => setForm({ ...form, finished_item_code: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">Description</Label><Input value={form.finished_item_description} onChange={(e) => setForm({ ...form, finished_item_description: e.target.value })} className="h-9" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Ordered Qty</Label><Input type="number" value={form.ordered_qty} onChange={(e) => setForm({ ...form, ordered_qty: parseFloat(e.target.value) })} className="h-9" /></div>
                <div><Label className="text-xs">Service / Unit</Label><Input type="number" value={form.service_cost_per_unit} onChange={(e) => setForm({ ...form, service_cost_per_unit: parseFloat(e.target.value) })} className="h-9" /></div>
                <div><Label className="text-xs">Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="h-9" /></div>
              </div>
              <div><Label className="text-xs">Promised Date</Label><Input type="date" value={form.promised_date} onChange={(e) => setForm({ ...form, promised_date: e.target.value })} className="h-9" /></div>
              <Button className="w-full" onClick={() => create.mutate(form)}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">SCO List</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-auto">
            {data.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">No SCOs</div>}
            {data.map((o: any) => (
              <div key={o.id} onClick={() => setSelectedId(o.id)} className={`p-2 border rounded cursor-pointer ${selectedId === o.id ? 'border-primary bg-accent' : 'hover:bg-accent/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs">{o.sco_number}</div>
                  <Badge className={statusColor[o.status]}>{o.status}</Badge>
                </div>
                <div className="text-sm">{o.vendor_name}</div>
                <div className="text-xs text-muted-foreground">{o.finished_item_code} · {o.ordered_qty} {o.uom}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{selected ? `${selected.sco_number} — Components` : 'Select an SCO'}</CardTitle>
            {selected && (
              <Select value={selected.status} onValueChange={(v) => update.mutate({ id: selected.id, status: v })}>
                <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="materials_issued">Materials Issued</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent>
            {!selected && <div className="text-center text-muted-foreground py-8">No SCO selected</div>}
            {selected && (
              <>
                <div className="grid grid-cols-5 gap-2 mb-3 p-2 bg-muted rounded">
                  <Input placeholder="Code" value={comp.component_code} onChange={(e) => setComp({ ...comp, component_code: e.target.value })} className="h-8" />
                  <Input placeholder="Description" value={comp.component_description} onChange={(e) => setComp({ ...comp, component_description: e.target.value })} className="h-8 col-span-2" />
                  <Input type="number" placeholder="Qty" value={comp.required_qty} onChange={(e) => setComp({ ...comp, required_qty: parseFloat(e.target.value) })} className="h-8" />
                  <Button size="sm" onClick={() => createComp.mutate({ ...comp, sco_id: selected.id })}>+ Add</Button>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr>
                    <th className="p-2 text-left">Code</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Required</th>
                    <th className="p-2 text-right">Issued</th>
                    <th className="p-2 text-right">Cost</th>
                    <th className="p-2 text-center">Status</th>
                  </tr></thead>
                  <tbody>
                    {comps.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No components</td></tr>}
                    {comps.map((c: any) => (
                      <tr key={c.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{c.component_code}</td>
                        <td className="p-2 text-xs">{c.component_description}</td>
                        <td className="p-2 text-right">{c.required_qty}</td>
                        <td className="p-2 text-right">{c.issued_qty}</td>
                        <td className="p-2 text-right">{(c.unit_cost * c.required_qty).toFixed(2)}</td>
                        <td className="p-2 text-center"><Badge variant="outline">{c.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
