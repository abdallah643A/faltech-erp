import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useECOs, useECOLines } from '@/hooks/useMfgEnhanced';
import { format } from 'date-fns';

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  implemented: 'bg-blue-100 text-blue-800',
};

export default function EngineeringChangeOrdersPage() {
  const { data = [], create, update, approve } = useECOs();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const { data: lines = [], create: createLine } = useECOLines(selectedId);
  const selected = data.find((e: any) => e.id === selectedId);
  const [form, setForm] = useState<any>({ title: '', change_type: 'design', priority: 'medium', description: '', estimated_cost_impact: 0 });
  const [lineForm, setLineForm] = useState<any>({ affected_type: 'bom', affected_code: '', change_action: 'modify', notes: '' });

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Engineering Change Orders (ECO)</h1>
        <p className="text-xs text-blue-100">Controlled change management for BOMs, routings, and items</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Draft</div><div className="text-2xl font-bold">{data.filter((e: any) => e.status === 'draft').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">In Review</div><div className="text-2xl font-bold text-yellow-600">{data.filter((e: any) => e.status === 'review').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Approved</div><div className="text-2xl font-bold text-green-600">{data.filter((e: any) => e.status === 'approved').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Implemented</div><div className="text-2xl font-bold text-blue-600">{data.filter((e: any) => e.status === 'implemented').length}</div></CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button size="sm">New ECO</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Engineering Change Order</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-9" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Type</Label>
                  <Select value={form.change_type} onValueChange={(v) => setForm({ ...form, change_type: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="process">Process</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div><Label className="text-xs">Est Cost Impact (SAR)</Label><Input type="number" value={form.estimated_cost_impact} onChange={(e) => setForm({ ...form, estimated_cost_impact: parseFloat(e.target.value) })} className="h-9" /></div>
              <Button className="w-full" onClick={() => create.mutate(form)}>Create ECO</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">ECO List ({data.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-auto">
            {data.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">No ECOs yet</div>}
            {data.map((e: any) => (
              <div key={e.id} onClick={() => setSelectedId(e.id)} className={`p-2 border rounded cursor-pointer ${selectedId === e.id ? 'border-primary bg-accent' : 'hover:bg-accent/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs">{e.eco_number}</div>
                  <Badge className={statusColor[e.status]}>{e.status}</Badge>
                </div>
                <div className="text-sm font-medium">{e.title}</div>
                <div className="text-xs text-muted-foreground">{e.change_type} · {e.priority} · {format(new Date(e.created_at), 'MMM d')}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{selected ? `${selected.eco_number} — Affected Items (${lines.length})` : 'Select an ECO'}</CardTitle>
            {selected && (
              <div className="flex gap-1">
                {selected.status === 'draft' && <Button size="sm" variant="outline" onClick={() => update.mutate({ id: selected.id, status: 'review' })}>Submit Review</Button>}
                {selected.status === 'review' && <Button size="sm" onClick={() => approve.mutate(selected.id)}>Approve</Button>}
                {selected.status === 'approved' && <Button size="sm" variant="outline" onClick={() => update.mutate({ id: selected.id, status: 'implemented', implemented_at: new Date().toISOString() })}>Mark Implemented</Button>}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selected && <div className="text-center text-muted-foreground py-8">No ECO selected</div>}
            {selected && (
              <>
                <div className="grid grid-cols-4 gap-2 mb-3 p-2 bg-muted rounded">
                  <Input placeholder="Type" value={lineForm.affected_type} onChange={(e) => setLineForm({ ...lineForm, affected_type: e.target.value })} className="h-8" />
                  <Input placeholder="Code" value={lineForm.affected_code} onChange={(e) => setLineForm({ ...lineForm, affected_code: e.target.value })} className="h-8" />
                  <Input placeholder="Action" value={lineForm.change_action} onChange={(e) => setLineForm({ ...lineForm, change_action: e.target.value })} className="h-8" />
                  <Button size="sm" onClick={() => createLine.mutate({ ...lineForm, eco_id: selected.id })}>+ Add</Button>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Code</th>
                    <th className="p-2 text-left">Action</th>
                    <th className="p-2 text-left">Notes</th>
                  </tr></thead>
                  <tbody>
                    {lines.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No affected items yet</td></tr>}
                    {lines.map((l: any) => (
                      <tr key={l.id} className="border-b">
                        <td className="p-2"><Badge variant="outline">{l.affected_type}</Badge></td>
                        <td className="p-2 font-mono text-xs">{l.affected_code}</td>
                        <td className="p-2 text-xs">{l.change_action}</td>
                        <td className="p-2 text-xs">{l.notes}</td>
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
