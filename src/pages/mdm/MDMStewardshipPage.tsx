import { useState } from 'react';
import { useStewardshipOwners, useAssignSteward } from '@/hooks/useMDMSuite';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Plus } from 'lucide-react';

export default function MDMStewardshipPage() {
  const list = useStewardshipOwners();
  const assign = useAssignSteward();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ domain: 'general' });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" />Stewardship & Ownership</h1>
          <p className="text-muted-foreground">Assign data stewards per BP and per domain. Mirrors into the governance inbox.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Assign Steward</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>BP</TableHead><TableHead>Domain</TableHead><TableHead>Steward</TableHead>
              <TableHead>Backup</TableHead><TableHead>Assigned</TableHead><TableHead>Notes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(list.data ?? []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.bp_id}</TableCell>
                  <TableCell><Badge variant="secondary">{s.domain}</Badge></TableCell>
                  <TableCell>{s.steward_name ?? s.steward_user_id}</TableCell>
                  <TableCell className="text-sm">{s.backup_user_id ?? '—'}</TableCell>
                  <TableCell className="text-sm">{new Date(s.assigned_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.notes ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Steward</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>BP ID</Label><Input value={form.bp_id ?? ''} onChange={(e) => setForm({ ...form, bp_id: e.target.value })} /></div>
            <div><Label>Steward User ID</Label><Input value={form.steward_user_id ?? ''} onChange={(e) => setForm({ ...form, steward_user_id: e.target.value })} /></div>
            <div><Label>Steward Name</Label><Input value={form.steward_name ?? ''} onChange={(e) => setForm({ ...form, steward_name: e.target.value })} /></div>
            <div><Label>Backup User ID</Label><Input value={form.backup_user_id ?? ''} onChange={(e) => setForm({ ...form, backup_user_id: e.target.value })} /></div>
            <div>
              <Label>Domain</Label>
              <Select value={form.domain} onValueChange={(v) => setForm({ ...form, domain: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['general','finance','tax','credit','contacts','addresses','compliance'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await assign.mutateAsync(form); setOpen(false); }} disabled={assign.isPending}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
