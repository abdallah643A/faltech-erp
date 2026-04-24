import { useState } from 'react';
import { useSegments, useUpsertSegment, useAssignSegment } from '@/hooks/useMDMSuite';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Layers, Plus, UserPlus } from 'lucide-react';

export default function MDMSegmentsPage() {
  const list = useSegments();
  const upsertSeg = useUpsertSegment();
  const assign = useAssignSegment();
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [form, setForm] = useState<any>({ segment_type: 'customer', dimension: 'tier', is_active: true });
  const [assignForm, setAssignForm] = useState<any>({});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6" />Customer / Vendor Segmentation</h1>
          <p className="text-muted-foreground">Define and assign segmentation dimensions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAssignOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Assign BP</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Segment</Button>
        </div>
      </div>

      <Tabs defaultValue="customer">
        <TabsList>
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="vendor">Vendor</TabsTrigger>
        </TabsList>
        {(['customer','vendor'] as const).map(seg => (
          <TabsContent key={seg} value={seg}>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead><TableHead>Dimension</TableHead><TableHead>Description</TableHead><TableHead>Active</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(list.data ?? []).filter((s: any) => s.segment_type === seg).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.segment_name}</TableCell>
                        <TableCell><Badge variant="secondary">{s.dimension}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.description ?? '—'}</TableCell>
                        <TableCell>{s.is_active ? '✓' : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Segment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.segment_name ?? ''} onChange={(e) => setForm({ ...form, segment_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.segment_type} onValueChange={(v) => setForm({ ...form, segment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="customer">Customer</SelectItem><SelectItem value="vendor">Vendor</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dimension</Label>
                <Select value={form.dimension} onValueChange={(v) => setForm({ ...form, dimension: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['tier','industry','region','behavior','strategic','revenue'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsertSeg.mutateAsync(form); setOpen(false); }} disabled={upsertSeg.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign BP to Segment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>BP ID</Label><Input value={assignForm.bp_id ?? ''} onChange={(e) => setAssignForm({ ...assignForm, bp_id: e.target.value })} /></div>
            <div>
              <Label>Segment</Label>
              <Select value={assignForm.segment_id ?? ''} onValueChange={(v) => setAssignForm({ ...assignForm, segment_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                <SelectContent>{(list.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.segment_name} ({s.segment_type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await assign.mutateAsync(assignForm); setAssignOpen(false); }} disabled={assign.isPending}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
