import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLotGenealogy } from '@/hooks/useMfgEnhanced';
import { format } from 'date-fns';

export default function LotTraceabilityPage() {
  const [searchLot, setSearchLot] = useState('');
  const { data = [], create } = useLotGenealogy(searchLot || undefined);
  const [form, setForm] = useState<any>({ parent_lot: '', parent_item_code: '', child_lot: '', child_item_code: '', wo_number: '', consumed_qty: 0, produced_qty: 0, uom: 'EA' });

  const upstream = data.filter((g: any) => g.child_lot === searchLot);
  const downstream = data.filter((g: any) => g.parent_lot === searchLot);

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Lot Traceability & Genealogy</h1>
        <p className="text-xs text-blue-100">Forward & backward lot tracing for recalls and quality investigations</p>
      </div>

      <Card>
        <CardContent className="pt-4 flex gap-3 items-end">
          <div className="flex-1"><Label className="text-xs">Trace Lot Number</Label><Input value={searchLot} onChange={(e) => setSearchLot(e.target.value)} placeholder="Enter lot number…" className="h-9" /></div>
          <Dialog>
            <DialogTrigger asChild><Button size="sm">Add Genealogy Link</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Lot Genealogy Link</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Parent Lot (consumed)</Label><Input value={form.parent_lot} onChange={(e) => setForm({ ...form, parent_lot: e.target.value })} className="h-9" /></div>
                  <div><Label className="text-xs">Parent Item</Label><Input value={form.parent_item_code} onChange={(e) => setForm({ ...form, parent_item_code: e.target.value })} className="h-9" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Child Lot (produced)</Label><Input value={form.child_lot} onChange={(e) => setForm({ ...form, child_lot: e.target.value })} className="h-9" /></div>
                  <div><Label className="text-xs">Child Item</Label><Input value={form.child_item_code} onChange={(e) => setForm({ ...form, child_item_code: e.target.value })} className="h-9" /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">WO #</Label><Input value={form.wo_number} onChange={(e) => setForm({ ...form, wo_number: e.target.value })} className="h-9" /></div>
                  <div><Label className="text-xs">Consumed</Label><Input type="number" value={form.consumed_qty} onChange={(e) => setForm({ ...form, consumed_qty: parseFloat(e.target.value) })} className="h-9" /></div>
                  <div><Label className="text-xs">Produced</Label><Input type="number" value={form.produced_qty} onChange={(e) => setForm({ ...form, produced_qty: parseFloat(e.target.value) })} className="h-9" /></div>
                </div>
                <Button className="w-full" onClick={() => create.mutate(form)}>Link</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {searchLot && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm text-blue-700">⬆ Upstream (where used)</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr>
                  <th className="p-2 text-left">Parent Lot</th><th className="p-2 text-left">Parent Item</th><th className="p-2 text-right">Consumed</th><th className="p-2 text-left">WO</th>
                </tr></thead>
                <tbody>
                  {upstream.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No upstream links</td></tr>}
                  {upstream.map((g: any) => (
                    <tr key={g.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{g.parent_lot}</td>
                      <td className="p-2 text-xs">{g.parent_item_code}</td>
                      <td className="p-2 text-right">{g.consumed_qty}</td>
                      <td className="p-2 text-xs">{g.wo_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm text-green-700">⬇ Downstream (used in)</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr>
                  <th className="p-2 text-left">Child Lot</th><th className="p-2 text-left">Child Item</th><th className="p-2 text-right">Produced</th><th className="p-2 text-left">WO</th>
                </tr></thead>
                <tbody>
                  {downstream.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No downstream links</td></tr>}
                  {downstream.map((g: any) => (
                    <tr key={g.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{g.child_lot}</td>
                      <td className="p-2 text-xs">{g.child_item_code}</td>
                      <td className="p-2 text-right">{g.produced_qty}</td>
                      <td className="p-2 text-xs">{g.wo_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">All Genealogy Links ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="p-2 text-left">Date</th><th className="p-2 text-left">Parent Lot</th><th className="p-2 text-left">→ Child Lot</th>
              <th className="p-2 text-right">Consumed</th><th className="p-2 text-right">Produced</th><th className="p-2 text-left">WO</th>
            </tr></thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No links</td></tr>}
              {data.map((g: any) => (
                <tr key={g.id} className="border-b">
                  <td className="p-2 text-xs">{format(new Date(g.link_date), 'MMM d HH:mm')}</td>
                  <td className="p-2 font-mono text-xs">{g.parent_lot} ({g.parent_item_code})</td>
                  <td className="p-2 font-mono text-xs">{g.child_lot} ({g.child_item_code})</td>
                  <td className="p-2 text-right">{g.consumed_qty}</td>
                  <td className="p-2 text-right">{g.produced_qty}</td>
                  <td className="p-2 text-xs">{g.wo_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
