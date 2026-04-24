import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCrossWarehouseReservations } from '@/hooks/useWMS';
import { format } from 'date-fns';

const statusColor: Record<string, string> = { active: 'bg-blue-100 text-blue-800', partial: 'bg-yellow-100 text-yellow-800', fulfilled: 'bg-green-100 text-green-800', cancelled: 'bg-gray-100 text-gray-800', expired: 'bg-red-100 text-red-800' };

export default function CrossWarehouseReservationsPage() {
  const { data = [], create, update } = useCrossWarehouseReservations();
  const [form, setForm] = useState<any>({ customer_code: '', customer_name: '', item_code: '', total_qty: 0, priority: 100, warehouse_allocations: [{ warehouse: '', bin: '', batch: '', qty: 0 }] });

  const addAlloc = () => setForm({ ...form, warehouse_allocations: [...form.warehouse_allocations, { warehouse: '', bin: '', batch: '', qty: 0 }] });
  const updAlloc = (idx: number, key: string, val: any) => {
    const a = [...form.warehouse_allocations]; a[idx] = { ...a[idx], [key]: val }; setForm({ ...form, warehouse_allocations: a });
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Cross-Warehouse Reservations</h1>
        <p className="text-xs text-blue-100">Multi-warehouse stock allocation with priority management</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-bold">{data.filter((r: any) => r.status === 'active').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Partial</div><div className="text-2xl font-bold text-yellow-600">{data.filter((r: any) => r.status === 'partial').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Fulfilled</div><div className="text-2xl font-bold text-green-600">{data.filter((r: any) => r.status === 'fulfilled').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Total Qty Reserved</div><div className="text-2xl font-bold">{data.reduce((s: number, r: any) => s + Number(r.reserved_qty || 0), 0).toFixed(0)}</div></CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button size="sm">New Reservation</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Cross-Warehouse Reservation</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Customer Code</Label><Input value={form.customer_code} onChange={(e) => setForm({ ...form, customer_code: e.target.value })} className="h-9" /></div>
                <div><Label className="text-xs">Customer Name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Item Code</Label><Input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} className="h-9" /></div>
                <div><Label className="text-xs">Total Qty</Label><Input type="number" value={form.total_qty} onChange={(e) => setForm({ ...form, total_qty: parseFloat(e.target.value) })} className="h-9" /></div>
                <div><Label className="text-xs">Priority</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })} className="h-9" /></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1"><Label className="text-xs">Warehouse Allocations</Label><Button size="sm" variant="outline" onClick={addAlloc}>+ Add</Button></div>
                {form.warehouse_allocations.map((a: any, i: number) => (
                  <div key={i} className="grid grid-cols-4 gap-1 mb-1">
                    <Input placeholder="WH" value={a.warehouse} onChange={(e) => updAlloc(i, 'warehouse', e.target.value)} className="h-8" />
                    <Input placeholder="Bin" value={a.bin} onChange={(e) => updAlloc(i, 'bin', e.target.value)} className="h-8" />
                    <Input placeholder="Batch" value={a.batch} onChange={(e) => updAlloc(i, 'batch', e.target.value)} className="h-8" />
                    <Input type="number" placeholder="Qty" value={a.qty} onChange={(e) => updAlloc(i, 'qty', parseFloat(e.target.value))} className="h-8" />
                  </div>
                ))}
              </div>

              <Button className="w-full" onClick={() => {
                const reserved = form.warehouse_allocations.reduce((s: number, a: any) => s + Number(a.qty || 0), 0);
                create.mutate({ ...form, reserved_qty: reserved, status: reserved >= form.total_qty ? 'active' : 'partial' });
              }}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="p-2 text-left">Reservation #</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-right">Total / Reserved</th>
              <th className="p-2 text-left">Allocations</th>
              <th className="p-2 text-center">Priority</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2"></th>
            </tr></thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No reservations</td></tr>}
              {data.map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2 font-mono text-xs">{r.reservation_number}</td>
                  <td className="p-2 text-xs">{r.customer_name || r.customer_code}</td>
                  <td className="p-2 font-mono text-xs">{r.item_code}</td>
                  <td className="p-2 text-right">{r.reserved_qty} / {r.total_qty}</td>
                  <td className="p-2 text-xs">{(r.warehouse_allocations as any[])?.map?.((a: any) => `${a.warehouse}:${a.qty}`).join(', ') || '—'}</td>
                  <td className="p-2 text-center">{r.priority}</td>
                  <td className="p-2 text-center"><Badge className={statusColor[r.status]}>{r.status}</Badge></td>
                  <td className="p-2">{r.status === 'active' && <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, status: 'fulfilled' })}>Fulfill</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
