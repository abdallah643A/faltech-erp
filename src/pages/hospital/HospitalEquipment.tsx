import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Plus, AlertTriangle, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { HospitalShell } from '@/components/hospital/HospitalShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useHospEquipment,
  useUpsertEquipment,
  useReportDowntime,
  useResolveDowntime,
  useActiveDowntime,
} from '@/hooks/useHospitalEquipment';

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  in_use: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  down: 'bg-destructive/15 text-destructive',
  retired: 'bg-muted text-muted-foreground',
};

export default function HospitalEquipment() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const filters = tab === 'all' ? undefined : { category: tab };
  const { data: equipment = [], isLoading } = useHospEquipment(filters);
  const { data: active = [] } = useActiveDowntime();
  const upsert = useUpsertEquipment();
  const reportDowntime = useReportDowntime();
  const resolveDowntime = useResolveDowntime();

  const [eqDialog, setEqDialog] = useState(false);
  const [eqForm, setEqForm] = useState<any>({ category: 'or', status: 'available' });
  const [downDialog, setDownDialog] = useState<any>(null);
  const [downForm, setDownForm] = useState<any>({ reason: 'maintenance', severity: 'planned' });

  const counts = {
    available: equipment.filter((e) => e.status === 'available').length,
    down: equipment.filter((e) => e.status === 'down').length,
    maintenance: equipment.filter((e) => e.status === 'maintenance').length,
    total: equipment.length,
  };

  return (
    <HospitalShell
      title="Medical Equipment"
      subtitle="Availability, maintenance, and downtime tracking"
      icon={<Wrench className="h-5 w-5" />}
      actions={
        <Button size="sm" onClick={() => { setEqForm({ category: 'or', status: 'available' }); setEqDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Equipment
        </Button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-semibold">{counts.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Available</p><p className="text-2xl font-semibold text-emerald-600">{counts.available}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Maintenance</p><p className="text-2xl font-semibold text-amber-600">{counts.maintenance}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Down</p><p className="text-2xl font-semibold text-destructive">{counts.down}</p></CardContent></Card>
      </div>

      {active.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Active downtime ({active.length})
            </div>
            <div className="space-y-1.5">
              {active.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{d.equipment?.name}</span>
                    <span className="text-muted-foreground"> — {d.reason}</span>
                    {d.description && <span className="text-muted-foreground"> · {d.description}</span>}
                  </div>
                  <Badge variant="outline" className={d.severity === 'critical' ? 'border-destructive/40 text-destructive' : ''}>{d.severity}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => resolveDowntime.mutate({ id: d.id })}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="or">OR</TabsTrigger>
          <TabsTrigger value="radiology">Radiology</TabsTrigger>
          <TabsTrigger value="icu">ICU</TabsTrigger>
          <TabsTrigger value="lab">Lab</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <Card><CardContent className="pt-6">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : equipment.length === 0 ? (
              <div className="text-sm text-muted-foreground p-6 text-center">No equipment yet. Click "Add Equipment".</div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Asset</TableHead><TableHead>Category</TableHead><TableHead>Modality</TableHead>
                  <TableHead>Status</TableHead><TableHead>Maintenance Due</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {equipment.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="font-medium">{e.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{e.asset_code || e.serial_number || '—'}</div>
                      </TableCell>
                      <TableCell className="uppercase text-xs">{e.category}</TableCell>
                      <TableCell className="text-xs">{e.modality || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLES[e.status] || ''}>{e.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.next_maintenance_due ? new Date(e.next_maintenance_due).toLocaleDateString() : '—'}
                        {e.next_maintenance_due && new Date(e.next_maintenance_due) < new Date() && (
                          <Badge variant="outline" className="ml-2 text-destructive border-destructive/40">overdue</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => { setDownDialog(e); setDownForm({ reason: 'maintenance', severity: 'planned' }); }}>
                          <XCircle className="h-3 w-3 mr-1" /> Report Downtime
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Add equipment */}
      <Dialog open={eqDialog} onOpenChange={setEqDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Equipment</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={eqForm.name || ''} onChange={(e) => setEqForm({ ...eqForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Asset Code</Label><Input value={eqForm.asset_code || ''} onChange={(e) => setEqForm({ ...eqForm, asset_code: e.target.value })} /></div>
              <div><Label>Serial #</Label><Input value={eqForm.serial_number || ''} onChange={(e) => setEqForm({ ...eqForm, serial_number: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Category</Label>
                <Select value={eqForm.category} onValueChange={(v) => setEqForm({ ...eqForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="or">OR</SelectItem>
                    <SelectItem value="radiology">Radiology</SelectItem>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Modality</Label><Input placeholder="CT / MRI / Anesthesia" value={eqForm.modality || ''} onChange={(e) => setEqForm({ ...eqForm, modality: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Manufacturer</Label><Input value={eqForm.manufacturer || ''} onChange={(e) => setEqForm({ ...eqForm, manufacturer: e.target.value })} /></div>
              <div><Label>Model</Label><Input value={eqForm.model || ''} onChange={(e) => setEqForm({ ...eqForm, model: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Next Maintenance</Label><Input type="date" value={eqForm.next_maintenance_due?.slice(0, 10) || ''} onChange={(e) => setEqForm({ ...eqForm, next_maintenance_due: e.target.value || null })} /></div>
              <div><Label>Calibration Due</Label><Input type="date" value={eqForm.calibration_due?.slice(0, 10) || ''} onChange={(e) => setEqForm({ ...eqForm, calibration_due: e.target.value || null })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEqDialog(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(eqForm); setEqDialog(false); }} disabled={!eqForm.name}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report downtime */}
      <Dialog open={!!downDialog} onOpenChange={(o) => !o && setDownDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report Downtime — {downDialog?.name}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Reason</Label>
                <Select value={downForm.reason} onValueChange={(v) => setDownForm({ ...downForm, reason: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="breakdown">Breakdown</SelectItem>
                    <SelectItem value="calibration">Calibration</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={downForm.severity} onValueChange={(v) => setDownForm({ ...downForm, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="unplanned">Unplanned</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Starts</Label><Input type="datetime-local" value={downForm.starts_at || ''} onChange={(e) => setDownForm({ ...downForm, starts_at: e.target.value })} /></div>
              <div><Label>Estimated End</Label><Input type="datetime-local" value={downForm.ends_at || ''} onChange={(e) => setDownForm({ ...downForm, ends_at: e.target.value || null })} /></div>
            </div>
            <div><Label>Description</Label><Textarea rows={3} value={downForm.description || ''} onChange={(e) => setDownForm({ ...downForm, description: e.target.value })} /></div>
            <div><Label>Work Order Reference</Label><Input value={downForm.work_order_ref || ''} onChange={(e) => setDownForm({ ...downForm, work_order_ref: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownDialog(null)}>Cancel</Button>
            <Button onClick={async () => {
              await reportDowntime.mutateAsync({ ...downForm, equipment_id: downDialog.id });
              setDownDialog(null);
            }}>
              <Activity className="h-4 w-4 mr-1" /> Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
