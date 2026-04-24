import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useScrapRework } from '@/hooks/useMfgEnhanced';
import { format } from 'date-fns';

export default function ScrapReworkPage() {
  const { data = [], create } = useScrapRework();
  const [form, setForm] = useState<any>({ event_type: 'scrap', wo_number: '', item_code: '', quantity: 0, reason_code: '', reason_description: '', reason_description_ar: '', disposition: 'scrap_out', cost_impact: 0, currency: 'SAR' });

  const totalScrapCost = data.filter((e: any) => e.event_type === 'scrap').reduce((s: number, e: any) => s + Number(e.cost_impact || 0), 0);
  const totalReworkCost = data.filter((e: any) => e.event_type === 'rework').reduce((s: number, e: any) => s + Number(e.cost_impact || 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Scrap & Rework Tracking</h1>
        <p className="text-xs text-blue-100">Quality losses with reason codes and cost impact (SAR)</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Scrap Events</div><div className="text-2xl font-bold text-red-600">{data.filter((e: any) => e.event_type === 'scrap').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Rework Events</div><div className="text-2xl font-bold text-yellow-600">{data.filter((e: any) => e.event_type === 'rework').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Scrap Cost</div><div className="text-2xl font-bold">{totalScrapCost.toFixed(0)} SAR</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Rework Cost</div><div className="text-2xl font-bold">{totalReworkCost.toFixed(0)} SAR</div></CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button size="sm">Log Event</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Scrap / Rework Event</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Type</Label>
                  <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="scrap">Scrap</SelectItem><SelectItem value="rework">Rework</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">WO #</Label><Input value={form.wo_number} onChange={(e) => setForm({ ...form, wo_number: e.target.value })} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Item Code</Label><Input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} className="h-9" /></div>
                <div><Label className="text-xs">Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) })} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Reason Code</Label><Input value={form.reason_code} onChange={(e) => setForm({ ...form, reason_code: e.target.value })} className="h-9" /></div>
                <div><Label className="text-xs">Disposition</Label>
                  <Select value={form.disposition} onValueChange={(v) => setForm({ ...form, disposition: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scrap_out">Scrap Out</SelectItem>
                      <SelectItem value="rework_inline">Rework Inline</SelectItem>
                      <SelectItem value="return_to_vendor">Return to Vendor</SelectItem>
                      <SelectItem value="hold">Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-xs">Reason (EN)</Label><Textarea value={form.reason_description} onChange={(e) => setForm({ ...form, reason_description: e.target.value })} rows={2} /></div>
              <div><Label className="text-xs">السبب (AR)</Label><Textarea dir="rtl" value={form.reason_description_ar} onChange={(e) => setForm({ ...form, reason_description_ar: e.target.value })} rows={2} /></div>
              <div><Label className="text-xs">Cost Impact (SAR)</Label><Input type="number" value={form.cost_impact} onChange={(e) => setForm({ ...form, cost_impact: parseFloat(e.target.value) })} className="h-9" /></div>
              <Button className="w-full" onClick={() => create.mutate(form)}>Log</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Events</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="p-2 text-left">Date</th><th className="p-2 text-left">Event #</th><th className="p-2 text-center">Type</th>
              <th className="p-2 text-left">WO / Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-left">Reason</th>
              <th className="p-2 text-left">Disposition</th><th className="p-2 text-right">Cost</th>
            </tr></thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No events</td></tr>}
              {data.map((e: any) => (
                <tr key={e.id} className="border-b">
                  <td className="p-2 text-xs">{format(new Date(e.reported_at), 'MMM d HH:mm')}</td>
                  <td className="p-2 font-mono text-xs">{e.event_number}</td>
                  <td className="p-2 text-center"><Badge className={e.event_type === 'scrap' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>{e.event_type}</Badge></td>
                  <td className="p-2 text-xs">{e.wo_number} / {e.item_code}</td>
                  <td className="p-2 text-right">{e.quantity} {e.uom}</td>
                  <td className="p-2 text-xs">{e.reason_code} — {e.reason_description}</td>
                  <td className="p-2 text-xs"><Badge variant="outline">{e.disposition}</Badge></td>
                  <td className="p-2 text-right">{Number(e.cost_impact).toFixed(2)} {e.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
