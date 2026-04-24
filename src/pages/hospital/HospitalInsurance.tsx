import { useState } from 'react';
import { Shield, Plus, ArrowRight, AlertTriangle } from 'lucide-react';
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
import { useHospInsuranceApprovals, useCreateInsuranceRequest, useHospEncounters } from '@/hooks/useHospital';
import { InsuranceWorkflowDrawer } from '@/components/hospital/InsuranceWorkflowDrawer';
import { InsuranceStageStepper } from '@/components/hospital/InsuranceStageStepper';

const TABS = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'partial', label: 'Partial' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'appealed', label: 'Appealed' },
];

export default function HospitalInsurance() {
  const [tab, setTab] = useState('in_progress');
  // "in_progress" is virtual: anything not terminal
  const filterStatus = tab === 'in_progress' ? undefined : tab;
  const { data: rawItems = [], isLoading } = useHospInsuranceApprovals(filterStatus);
  const items = tab === 'in_progress'
    ? rawItems.filter((i: any) => !['approved', 'partial', 'rejected', 'expired', 'cancelled'].includes(i.status))
    : rawItems;

  const { data: encounters = [] } = useHospEncounters({});
  const create = useCreateInsuranceRequest();

  const [openNew, setOpenNew] = useState(false);
  const [openDrawer, setOpenDrawer] = useState<any>(null);
  const [form, setForm] = useState<any>({ priority: 'routine' });

  const submit = () => {
    const enc = encounters.find((e: any) => e.id === form.encounter_id);
    if (!enc || !form.payer) return;
    create.mutate(
      {
        ...form,
        patient_id: enc.patient?.id,
        requested_amount: parseFloat(form.requested_amount || 0),
        status: 'draft',
        stage: 'draft',
      },
      { onSuccess: () => { setOpenNew(false); setForm({ priority: 'routine' }); } }
    );
  };

  return (
    <HospitalShell
      title="Insurance & Claims"
      subtitle="Multi-stage pre-authorizations and approval workflow"
      icon={<Shield className="h-5 w-5" />}
      actions={<Button size="sm" onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> New Request</Button>}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-2">
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && items.length === 0 && (
            <div className="text-sm text-muted-foreground p-6 text-center border rounded-md">No items</div>
          )}
          {items.map((i: any) => {
            const slaOverdue = i.sla_due_at && new Date(i.sla_due_at) < new Date() && !i.responded_at;
            return (
              <Card key={i.id} className="p-3 space-y-2 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setOpenDrawer(i)}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {i.payer}
                      {i.policy_no && <span className="text-xs text-muted-foreground">• Policy {i.policy_no}</span>}
                      <Badge variant="outline" className="text-xs">{i.priority}</Badge>
                      {i.appeal_count > 0 && (
                        <Badge variant="outline" className="text-xs border-violet-500/40 text-violet-700">
                          Appeal #{i.appeal_count}
                        </Badge>
                      )}
                      {slaOverdue && (
                        <Badge variant="outline" className="text-xs border-destructive/40 text-destructive">
                          <AlertTriangle className="h-3 w-3 mr-0.5" /> SLA overdue
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {i.patient?.first_name} {i.patient?.last_name} ({i.patient?.mrn})
                      {i.encounter?.encounter_no && <> • Enc {i.encounter.encounter_no}</>}
                    </div>
                    <div className="text-xs mt-1">
                      Requested: <span className="font-medium">{Number(i.requested_amount || 0).toFixed(2)}</span>
                      {i.approved_amount != null && (
                        <> • Approved: <span className="font-medium text-emerald-600">{Number(i.approved_amount).toFixed(2)}</span></>
                      )}
                      {i.approval_no && <> • #{i.approval_no}</>}
                    </div>
                  </div>
                  <Badge variant="outline" className={statusColor(i.status)}>{i.status.replace(/_/g, ' ')}</Badge>
                  <Button size="sm" variant="ghost">
                    <ArrowRight className="h-3 w-3 mr-1" /> Manage
                  </Button>
                </div>
                <InsuranceStageStepper current={i.status} />
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* New request */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Insurance Pre-Authorization</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Encounter</Label>
              <Select value={form.encounter_id} onValueChange={(v) => setForm({ ...form, encounter_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {encounters.slice(0, 50).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.encounter_no} — {e.patient?.first_name} {e.patient?.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Payer</Label><Input value={form.payer || ''} onChange={(e) => setForm({ ...form, payer: e.target.value })} /></div>
              <div><Label>Policy No.</Label><Input value={form.policy_no || ''} onChange={(e) => setForm({ ...form, policy_no: e.target.value })} /></div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Requested Amount</Label><Input type="number" value={form.requested_amount || ''} onChange={(e) => setForm({ ...form, requested_amount: e.target.value })} /></div>
              <div><Label>Service Category</Label><Input placeholder="e.g. Surgery, Imaging" value={form.service_category || ''} onChange={(e) => setForm({ ...form, service_category: e.target.value })} /></div>
              <div><Label>Expected Service Date</Label><Input type="date" value={form.expected_service_date || ''} onChange={(e) => setForm({ ...form, expected_service_date: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending}>Create as Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InsuranceWorkflowDrawer open={!!openDrawer} onOpenChange={(o) => !o && setOpenDrawer(null)} approval={openDrawer} />
    </HospitalShell>
  );
}
