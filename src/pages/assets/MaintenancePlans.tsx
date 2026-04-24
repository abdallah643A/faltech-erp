import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CalendarClock } from 'lucide-react';
import { useMaintenancePlans } from '@/hooks/useAssetEnhanced';

export default function MaintenancePlans() {
  const { data: plans = [], upsert } = useMaintenancePlans();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ plan_type: 'time_based', frequency_unit: 'months', frequency_value: 3, priority: 'medium', is_active: true });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="h-6 w-6 text-primary" />Maintenance Plans</h1>
          <p className="text-muted-foreground">Time-based, meter-based, condition-based & predictive PM</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Plan</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Plan</TableHead><TableHead>Type</TableHead><TableHead>Frequency</TableHead>
              <TableHead>Next Due</TableHead><TableHead>Priority</TableHead><TableHead>Cost</TableHead><TableHead>Active</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {plans.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.plan_name}</TableCell>
                  <TableCell><Badge variant="outline">{p.plan_type}</Badge></TableCell>
                  <TableCell className="text-xs">{p.frequency_value} {p.frequency_unit}</TableCell>
                  <TableCell className="text-xs">{p.next_due_date || '—'}</TableCell>
                  <TableCell><Badge variant={p.priority === 'high' ? 'destructive' : 'secondary'}>{p.priority}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{p.estimated_cost || '—'}</TableCell>
                  <TableCell><Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Yes' : 'No'}</Badge></TableCell>
                </TableRow>
              ))}
              {plans.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No plans</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Maintenance Plan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Plan Name</Label><Input value={draft.plan_name || ''} onChange={(e) => setDraft({ ...draft, plan_name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={draft.plan_type} onValueChange={(v) => setDraft({ ...draft, plan_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['time_based', 'meter_based', 'condition_based', 'predictive'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['low', 'medium', 'high', 'critical'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Frequency Value</Label><Input type="number" value={draft.frequency_value} onChange={(e) => setDraft({ ...draft, frequency_value: Number(e.target.value) })} /></div>
            <div>
              <Label>Frequency Unit</Label>
              <Select value={draft.frequency_unit} onValueChange={(v) => setDraft({ ...draft, frequency_unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['days', 'weeks', 'months', 'hours', 'kilometers', 'cycles'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Next Due Date</Label><Input type="date" value={draft.next_due_date || ''} onChange={(e) => setDraft({ ...draft, next_due_date: e.target.value })} /></div>
            <div><Label>Meter Threshold</Label><Input type="number" value={draft.meter_threshold || ''} onChange={(e) => setDraft({ ...draft, meter_threshold: Number(e.target.value) })} /></div>
            <div><Label>Est. Duration (h)</Label><Input type="number" value={draft.estimated_duration_hours || ''} onChange={(e) => setDraft({ ...draft, estimated_duration_hours: Number(e.target.value) })} /></div>
            <div><Label>Est. Cost (SAR)</Label><Input type="number" value={draft.estimated_cost || ''} onChange={(e) => setDraft({ ...draft, estimated_cost: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={!draft.plan_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
