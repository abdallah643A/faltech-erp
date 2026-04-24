import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSLAPolicies, useUpsertSLAPolicy } from '@/hooks/useServiceITSM';
import { Plus } from 'lucide-react';

export default function ITSMSLAPoliciesPage() {
  const { data: policies = [] } = useSLAPolicies();
  const upsert = useUpsertSLAPolicy();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ priority: 'medium', first_response_minutes: 60, resolution_minutes: 480, business_hours_only: true, is_active: true });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">SLA Policies</h1><p className="text-sm text-muted-foreground">Response and resolution targets by priority.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Policy</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>SLA Policy</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.policy_name || ''} onChange={(e) => setForm({ ...form, policy_name: e.target.value })} /></div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['low', 'medium', 'high', 'critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First response (min)</Label><Input type="number" value={form.first_response_minutes} onChange={(e) => setForm({ ...form, first_response_minutes: +e.target.value })} /></div>
                <div><Label>Resolution (min)</Label><Input type="number" value={form.resolution_minutes} onChange={(e) => setForm({ ...form, resolution_minutes: +e.target.value })} /></div>
              </div>
              <Button onClick={() => upsert.mutate(form, { onSuccess: () => { setOpen(false); setForm({ priority: 'medium', first_response_minutes: 60, resolution_minutes: 480, business_hours_only: true, is_active: true }); } })} disabled={!form.policy_name}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Priority</TableHead><TableHead>First Resp</TableHead><TableHead>Resolution</TableHead><TableHead>Business hrs</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
            <TableBody>
              {policies.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.policy_name}</TableCell>
                  <TableCell>{p.priority}</TableCell>
                  <TableCell>{p.first_response_minutes}m</TableCell>
                  <TableCell>{p.resolution_minutes}m</TableCell>
                  <TableCell>{p.business_hours_only ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{p.is_active ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
              {policies.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No policies</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
