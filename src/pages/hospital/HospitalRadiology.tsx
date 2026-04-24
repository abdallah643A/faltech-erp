import { useState } from 'react';
import { ScanLine, Plus } from 'lucide-react';
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
import { useHospRadiologyOrders, useCreateRadiologyOrder, useUpdateRadiologyOrder, useHospEncounters } from '@/hooks/useHospital';
import { EquipmentAvailabilityBanner } from '@/components/hospital/EquipmentAvailabilityBanner';
import { useNavigate } from 'react-router-dom';

export default function HospitalRadiology() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('ordered');
  const { data: orders = [], isLoading } = useHospRadiologyOrders({ status: tab });
  const { data: encounters = [] } = useHospEncounters({});
  const create = useCreateRadiologyOrder();
  const update = useUpdateRadiologyOrder();

  const [openNew, setOpenNew] = useState(false);
  const [openReport, setOpenReport] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [report, setReport] = useState('');

  const submit = () => {
    const enc = encounters.find((e: any) => e.id === form.encounter_id);
    if (!enc || !form.exam_name) return;
    create.mutate({ ...form, patient_id: enc.patient?.id }, { onSuccess: () => { setOpenNew(false); setForm({}); } });
  };

  return (
    <HospitalShell
      title="Radiology"
      subtitle="Imaging orders & radiologist reports"
      icon={<ScanLine className="h-5 w-5" />}
      actions={<Button size="sm" onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> New Order</Button>}
    >
      <EquipmentAvailabilityBanner category="radiology" onManage={() => navigate('/hospital/equipment')} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ordered">Ordered</TabsTrigger>
          <TabsTrigger value="performed">Performed</TabsTrigger>
          <TabsTrigger value="reported">Reported</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-2">
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && orders.length === 0 && <div className="text-sm text-muted-foreground p-6 text-center border rounded-md">No orders</div>}
          {orders.map((o: any) => (
            <Card key={o.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium text-sm">{o.exam_name} <span className="text-xs text-muted-foreground">({o.modality || 'N/A'})</span></div>
                <div className="text-xs text-muted-foreground">{o.order_no} • {o.patient?.first_name} {o.patient?.last_name} ({o.patient?.mrn})</div>
                {o.report_text && <div className="text-xs mt-1 line-clamp-2"><span className="font-medium">Report:</span> {o.report_text}</div>}
              </div>
              <Badge variant="outline" className={statusColor(o.status)}>{o.status}</Badge>
              {o.status === 'ordered' && (
                <Button size="sm" variant="outline" onClick={() => update.mutate({ id: o.id, status: 'performed' })}>Mark Performed</Button>
              )}
              {o.status !== 'reported' && (
                <Button size="sm" onClick={() => { setOpenReport(o); setReport(o.report_text || ''); }}>Write Report</Button>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Radiology Order</DialogTitle></DialogHeader>
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
              <div><Label>Exam</Label><Input value={form.exam_name || ''} onChange={e => setForm({ ...form, exam_name: e.target.value })} placeholder="Chest X-Ray" /></div>
              <div>
                <Label>Modality</Label>
                <Select value={form.modality} onValueChange={v => setForm({ ...form, modality: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['XR','CT','MRI','US','MAMMO','FLUORO','NM'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
            <div><Label>Clinical Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openReport} onOpenChange={() => setOpenReport(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Radiologist Report — {openReport?.exam_name}</DialogTitle></DialogHeader>
          <Textarea value={report} onChange={e => setReport(e.target.value)} rows={8} placeholder="Findings, impression…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReport(null)}>Cancel</Button>
            <Button onClick={() => { update.mutate({ id: openReport.id, report_text: report, status: 'reported' }, { onSuccess: () => setOpenReport(null) }); }} disabled={update.isPending}>Save Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
