import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { usePickLists, usePickListLines } from '@/hooks/usePickPack';
import { Package, ScanLine, CheckCircle2, Truck } from 'lucide-react';
import { format } from 'date-fns';

const statusColor: Record<string, string> = {
  open: 'bg-gray-100 text-gray-800',
  picking: 'bg-blue-100 text-blue-800',
  picked: 'bg-yellow-100 text-yellow-800',
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-green-100 text-green-800',
};

export default function PickPackManagerPage() {
  const { pickLists = [], createPickList, updatePickList } = usePickLists();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const { lines = [], updateLine } = usePickListLines(selectedId);
  const selected = pickLists.find((p: any) => p.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> Pick · Pack · Ship Orchestration</h1>
          <p className="text-xs text-blue-100">End-to-end fulfillment workflow</p>
        </div>
        <ExportImportButtons data={pickLists} columns={[
          { key: 'pick_number', header: 'Pick #' },
          { key: 'warehouse_code', header: 'Warehouse' },
          { key: 'status', header: 'Status' },
        ]} filename="pick-lists" title="Pick Lists" />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Open</div><div className="text-2xl font-bold">{pickLists.filter((p: any) => p.status === 'open').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Picking</div><div className="text-2xl font-bold text-blue-600">{pickLists.filter((p: any) => p.status === 'picking').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Packed</div><div className="text-2xl font-bold text-purple-600">{pickLists.filter((p: any) => p.status === 'packed').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Shipped Today</div><div className="text-2xl font-bold text-green-600">{pickLists.filter((p: any) => p.status === 'shipped').length}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">Pick Lists</CardTitle>
            <Button size="sm" onClick={() => createPickList.mutate({ status: 'open', warehouse_code: 'WH01' })}>+ Create</Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-auto">
            {pickLists.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">No pick lists</div>}
            {pickLists.map((pl: any) => (
              <div key={pl.id} onClick={() => setSelectedId(pl.id)} className={`p-2 border rounded cursor-pointer ${selectedId === pl.id ? 'border-primary bg-accent' : 'hover:bg-accent/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs">{pl.pick_number}</div>
                  <Badge className={statusColor[pl.status] || ''}>{pl.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{pl.warehouse_code} · {pl.created_at && format(new Date(pl.created_at), 'MMM d HH:mm')}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{selected ? `${selected.pick_number} — ${selected.status}` : 'Select a pick list'}</CardTitle>
            {selected && (
              <div className="flex gap-1">
                {selected.status === 'open' && <Button size="sm" variant="outline" onClick={() => updatePickList.mutate({ id: selected.id, status: 'picking' })}><ScanLine className="h-3 w-3 mr-1" /> Start Pick</Button>}
                {selected.status === 'picking' && <Button size="sm" variant="outline" onClick={() => updatePickList.mutate({ id: selected.id, status: 'picked' })}><CheckCircle2 className="h-3 w-3 mr-1" /> Complete Pick</Button>}
                {selected.status === 'picked' && <Button size="sm" variant="outline" onClick={() => updatePickList.mutate({ id: selected.id, status: 'packed' })}>Pack</Button>}
                {selected.status === 'packed' && <Button size="sm" onClick={() => updatePickList.mutate({ id: selected.id, status: 'shipped' })}><Truck className="h-3 w-3 mr-1" /> Ship</Button>}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selected && <div className="text-center text-muted-foreground py-8">No pick list selected</div>}
            {selected && (
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr>
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-right">Required</th>
                  <th className="p-2 text-right">Picked</th>
                  <th className="p-2 text-left">Bin</th>
                  <th className="p-2 text-left">Batch</th>
                  <th className="p-2 text-center">Status</th>
                </tr></thead>
                <tbody>
                  {lines.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No lines (add via sales order)</td></tr>}
                  {lines.map((l: any) => (
                    <tr key={l.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{l.item_code}</td>
                      <td className="p-2 text-right">{l.required_qty}</td>
                      <td className="p-2 text-right"><Input type="number" defaultValue={l.picked_qty || 0} onBlur={(e) => updateLine.mutate({ id: l.id, picked_qty: parseFloat(e.target.value) })} className="h-7 w-20 ml-auto" /></td>
                      <td className="p-2 text-xs">{l.bin_code || '—'}</td>
                      <td className="p-2 text-xs">{l.batch_number || '—'}</td>
                      <td className="p-2 text-center"><Badge variant="outline">{l.status || 'pending'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
