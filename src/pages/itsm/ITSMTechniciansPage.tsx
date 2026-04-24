import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTechnicians, useUpsertTechnician } from '@/hooks/useServiceITSM';
import { Plus, Wrench } from 'lucide-react';

export default function ITSMTechniciansPage() {
  const { data: techs = [] } = useTechnicians();
  const upsert = useUpsertTechnician();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ is_active: true, daily_capacity_hours: 8 });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" />Technicians</h1><p className="text-sm text-muted-foreground">Skills, zones, and capacity for dispatch.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Technician</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Technician</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.technician_name || ''} onChange={(e) => setForm({ ...form, technician_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div><Label>Skills (comma)</Label><Input placeholder="hvac, plumbing, electrical" onChange={(e) => setForm({ ...form, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></div>
              <div><Label>Zones (comma)</Label><Input placeholder="riyadh, jeddah" onChange={(e) => setForm({ ...form, zones: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></div>
              <div><Label>Daily capacity (hrs)</Label><Input type="number" step="0.5" value={form.daily_capacity_hours} onChange={(e) => setForm({ ...form, daily_capacity_hours: +e.target.value })} /></div>
              <Button onClick={() => upsert.mutate(form, { onSuccess: () => { setOpen(false); setForm({ is_active: true, daily_capacity_hours: 8 }); } })} disabled={!form.technician_name}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Skills</TableHead><TableHead>Zones</TableHead><TableHead>Capacity</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
            <TableBody>
              {techs.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.technician_name}</TableCell>
                  <TableCell><div className="flex gap-1 flex-wrap">{(t.skills || []).map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div></TableCell>
                  <TableCell><div className="flex gap-1 flex-wrap">{(t.zones || []).map((z: string) => <Badge key={z} variant="outline" className="text-xs">{z}</Badge>)}</div></TableCell>
                  <TableCell>{t.daily_capacity_hours}h</TableCell>
                  <TableCell>{t.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                </TableRow>
              ))}
              {techs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No technicians</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
