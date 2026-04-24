import { useState } from 'react';
import { useContactRoles, useUpsertContact } from '@/hooks/useMDMSuite';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Plus } from 'lucide-react';

const ROLES = ['AP','AR','Technical','Decision Maker','Procurement','Finance','Operations','Legal','HR'];

export default function MDMContactsPage() {
  const list = useContactRoles();
  const upsert = useUpsertContact();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ role: 'AP', is_active: true });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" />Contact Roles</h1>
          <p className="text-muted-foreground">Role-based contacts per business partner.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Contact</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BP</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead>
                <TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Decision</TableHead><TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.bp_id}</TableCell>
                  <TableCell>{c.contact_name}{c.is_primary && ' ★'}</TableCell>
                  <TableCell><Badge variant="secondary">{c.role}</Badge></TableCell>
                  <TableCell className="text-sm">{c.email ?? '—'}</TableCell>
                  <TableCell className="text-sm">{c.phone ?? '—'}</TableCell>
                  <TableCell>{c.is_decision_maker ? '✓' : '—'}</TableCell>
                  <TableCell>{c.is_active ? '✓' : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Contact</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>BP ID</Label><Input value={form.bp_id ?? ''} onChange={(e) => setForm({ ...form, bp_id: e.target.value })} /></div>
            <div><Label>Name</Label><Input value={form.contact_name ?? ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Department</Label><Input value={form.department ?? ''} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={!!form.is_primary} onCheckedChange={(v) => setForm({ ...form, is_primary: v })} /><Label>Primary</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!form.is_decision_maker} onCheckedChange={(v) => setForm({ ...form, is_decision_maker: v })} /><Label>Decision Maker</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(form); setOpen(false); }} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
