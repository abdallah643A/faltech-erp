import { useState } from 'react';
import { FlaskConical, Plus } from 'lucide-react';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHospLabOrders, useCreateLabOrder, useUpdateLabOrder, useHospEncounters } from '@/hooks/useHospital';

export default function HospitalLab() {
  const [tab, setTab] = useState('ordered');
  const { data: orders = [], isLoading } = useHospLabOrders({ status: tab });
  const { data: encounters = [] } = useHospEncounters({});
  const create = useCreateLabOrder();
  const update = useUpdateLabOrder();

  const [openNew, setOpenNew] = useState(false);
  const [openResult, setOpenResult] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [result, setResult] = useState<any>({});

  const submit = () => {
    const enc = encounters.find((e: any) => e.id === form.encounter_id);
    if (!enc || !form.test_name) return;
    create.mutate({ ...form, patient_id: enc.patient?.id }, { onSuccess: () => { setOpenNew(false); setForm({}); } });
  };

  const saveResult = () => {
    if (!openResult) return;
    update.mutate({ id: openResult.id, ...result, status: 'completed' }, { onSuccess: () => { setOpenResult(null); setResult({}); } });
  };

  return (
    <HospitalShell
      title="Laboratory"
      subtitle="Lab orders, results & critical alerts"
      icon={<FlaskConical className="h-5 w-5" />}
      actions={<Button size="sm" onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> New Order</Button>}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ordered">Ordered</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-2">
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && orders.length === 0 && <div className="text-sm text-muted-foreground p-6 text-center border rounded-md">No orders</div>}
          {orders.map((o: any) => (
            <Card key={o.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium text-sm flex items-center gap-2">
                  {o.test_name}
                  {o.is_critical && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">CRITICAL</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{o.order_no} • {o.patient?.first_name} {o.patient?.last_name} ({o.patient?.mrn})</div>
                {o.result_text && <div className="text-xs mt-1"><span className="font-medium">Result:</span> {o.result_value} {o.result_text}</div>}
              </div>
              <Badge variant="outline" className={statusColor(o.status)}>{o.status}</Badge>
              {o.status !== 'completed' && (
                <Button size="sm" variant="outline" onClick={() => { setOpenResult(o); setResult({}); }}>Enter Result</Button>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Lab Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Encounter</Label>
              <Select value={form.encounter_id} onValueChange={v => setForm({ ...form, encounter_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select encounter" /></SelectTrigger>
                <SelectContent>
                  {encounters.slice(0, 50).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.encounter_no} — {e.patient?.first_name} {e.patient?.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Test Name</Label><Input value={form.test_name || ''} onChange={e => setForm({ ...form, test_name: e.target.value })} /></div>
              <div><Label>Test Code</Label><Input value={form.test_code || ''} onChange={e => setForm({ ...form, test_code: e.target.value })} /></div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority || 'routine'} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Unit Price</Label><Input type="number" value={form.unit_price || ''} onChange={e => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openResult} onOpenChange={() => setOpenResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enter Result — {openResult?.test_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Value</Label><Input value={result.result_value || ''} onChange={e => setResult({ ...result, result_value: e.target.value })} placeholder="e.g. 5.2" /></div>
            <div><Label>Notes / Interpretation</Label><Textarea value={result.result_text || ''} onChange={e => setResult({ ...result, result_text: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!result.is_critical} onChange={e => setResult({ ...result, is_critical: e.target.checked })} />
              Mark as critical value
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenResult(null)}>Cancel</Button>
            <Button onClick={saveResult} disabled={update.isPending}>Save Result</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
