import { useState } from 'react';
import { useFleetAccidents, useFleetAccidentMutations } from '@/hooks/useFleetEnhanced';
import { useFleetAssets, useFleetDrivers } from '@/hooks/useFleetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, Plus, MapPin } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { format } from 'date-fns';
import { formatSAR } from '@/lib/currency';

const sevColors: Record<string, string> = {
  minor: 'bg-yellow-500/15 text-yellow-700',
  moderate: 'bg-orange-500/15 text-orange-700',
  major: 'bg-red-500/15 text-red-700',
  fatal: 'bg-black text-white',
};

export default function FleetAccidents() {
  const { data: accidents = [], isLoading } = useFleetAccidents();
  const { data: assets = [] } = useFleetAssets();
  const { data: drivers = [] } = useFleetDrivers();
  const { upsert } = useFleetAccidentMutations();
  const geo = useGeolocation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    asset_id: '', driver_id: '', accident_date: new Date().toISOString().slice(0, 16),
    accident_type: 'collision', severity: 'minor', location: '', description: '',
    police_report_no: '', insurance_claim_no: '', estimated_repair_cost: 0,
    fault_party: 'own_driver', latitude: null, longitude: null, status: 'reported',
    insurance_claim_status: 'not_filed',
  });

  const captureLocation = async () => {
    const p = await geo.capture();
    if (p) setForm({ ...form, latitude: p.lat, longitude: p.lng });
  };

  const submit = async () => {
    if (!form.asset_id || !form.accident_date) return;
    await upsert.mutateAsync(form);
    setOpen(false);
    setForm({ ...form, asset_id: '', description: '', location: '' });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /> Accident Cases</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Report Accident</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Report Accident Case</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vehicle *</Label>
                <Select value={form.asset_id} onValueChange={v => setForm({ ...form, asset_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Driver</Label>
                <Select value={form.driver_id} onValueChange={v => setForm({ ...form, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date / Time *</Label>
                <Input type="datetime-local" value={form.accident_date} onChange={e => setForm({ ...form, accident_date: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.accident_type} onValueChange={v => setForm({ ...form, accident_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['collision','rollover','rear_end','sideswipe','pedestrian','single_vehicle','theft','vandalism','other'].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['minor','moderate','major','fatal'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fault Party</Label>
                <Select value={form.fault_party} onValueChange={v => setForm({ ...form, fault_party: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['own_driver','third_party','shared','unknown'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Location</Label>
                <div className="flex gap-2">
                  <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Street / area" />
                  <Button type="button" variant="outline" size="sm" onClick={captureLocation} disabled={geo.loading}>
                    <MapPin className="h-4 w-4 mr-1" />{form.latitude ? `${form.latitude.toFixed(4)}` : 'GPS'}
                  </Button>
                </div>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Police Report #</Label>
                <Input value={form.police_report_no} onChange={e => setForm({ ...form, police_report_no: e.target.value })} />
              </div>
              <div>
                <Label>Insurance Claim #</Label>
                <Input value={form.insurance_claim_no} onChange={e => setForm({ ...form, insurance_claim_no: e.target.value })} />
              </div>
              <div>
                <Label>Estimated Repair Cost</Label>
                <Input type="number" value={form.estimated_repair_cost} onChange={e => setForm({ ...form, estimated_repair_cost: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Claim Status</Label>
                <Select value={form.insurance_claim_status} onValueChange={v => setForm({ ...form, insurance_claim_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['not_filed','filed','under_review','approved','rejected','settled'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={upsert.isPending}>Save Case</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">All accident cases — full lifecycle tracking</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Case #</TableHead><TableHead>Date</TableHead><TableHead>Vehicle</TableHead>
              <TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Claim</TableHead>
              <TableHead className="text-right">Repair Cost</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
                accidents.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No accidents</TableCell></TableRow> :
                accidents.map((a: any) => {
                  const asset = assets.find((x: any) => x.id === a.asset_id);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs font-mono">{a.case_number}</TableCell>
                      <TableCell className="text-xs">{format(new Date(a.accident_date), 'PP')}</TableCell>
                      <TableCell className="text-xs">{asset?.asset_name || '—'}</TableCell>
                      <TableCell className="text-xs capitalize">{a.accident_type?.replace(/_/g,' ')}</TableCell>
                      <TableCell><Badge className={`text-[10px] ${sevColors[a.severity] || ''}`}>{a.severity}</Badge></TableCell>
                      <TableCell className="text-xs">{a.insurance_claim_no || '—'} <span className="text-muted-foreground">({a.insurance_claim_status?.replace(/_/g,' ')})</span></TableCell>
                      <TableCell className="text-xs text-right">{formatSAR(a.actual_repair_cost || a.estimated_repair_cost)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{a.status?.replace(/_/g,' ')}</Badge></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
