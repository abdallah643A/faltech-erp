import { useState } from 'react';
import { useBPHierarchies, useUpsertHierarchy } from '@/hooks/useMDMSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Network, Plus } from 'lucide-react';

export default function MDMHierarchiesPage() {
  const list = useBPHierarchies();
  const upsert = useUpsertHierarchy();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ relationship_type: 'subsidiary', ownership_pct: 100 });

  const submit = async () => {
    if (!form.parent_bp_id || !form.child_bp_id) return;
    await upsert.mutateAsync(form);
    setOpen(false);
    setForm({ relationship_type: 'subsidiary', ownership_pct: 100 });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Network className="h-6 w-6" />Account Hierarchies</h1>
          <p className="text-muted-foreground">Parent / child relationships across business partners.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Link</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Relationships</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent BP</TableHead>
                <TableHead>Child BP</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ownership %</TableHead>
                <TableHead>Effective</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono text-xs">{h.parent_bp_id}</TableCell>
                  <TableCell className="font-mono text-xs">{h.child_bp_id}</TableCell>
                  <TableCell><Badge variant="secondary">{h.relationship_type}</Badge></TableCell>
                  <TableCell>{h.ownership_pct ?? '—'}</TableCell>
                  <TableCell className="text-sm">{h.effective_from ?? '—'}</TableCell>
                </TableRow>
              ))}
              {(list.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No hierarchies yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Hierarchy Link</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Parent BP ID</Label><Input value={form.parent_bp_id ?? ''} onChange={(e) => setForm({ ...form, parent_bp_id: e.target.value })} /></div>
            <div><Label>Child BP ID</Label><Input value={form.child_bp_id ?? ''} onChange={(e) => setForm({ ...form, child_bp_id: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.relationship_type} onValueChange={(v) => setForm({ ...form, relationship_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="subsidiary">Subsidiary</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                  <SelectItem value="billto">Bill-to</SelectItem>
                  <SelectItem value="shipto">Ship-to</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Ownership %</Label><Input type="number" value={form.ownership_pct ?? ''} onChange={(e) => setForm({ ...form, ownership_pct: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
