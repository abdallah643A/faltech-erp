import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Users } from 'lucide-react';
import { useCustodyChain } from '@/hooks/useAssetEnhanced';

const CONDITION_COLOR: any = { excellent: 'default', good: 'secondary', fair: 'outline', poor: 'destructive', damaged: 'destructive' };

export default function CustodyChainPage() {
  const { data: chain = [], handover } = useCustodyChain();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ handover_date: new Date().toISOString(), condition_at_handover: 'good', reason: 'assignment' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />Custody Chain</h1>
          <p className="text-muted-foreground">Audit trail of every holder, handover & condition</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Handover</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>To</TableHead>
              <TableHead>Department</TableHead><TableHead>Condition</TableHead><TableHead>Reason</TableHead>
              <TableHead>Acknowledged</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {chain.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{new Date(c.handover_date).toLocaleString()}</TableCell>
                  <TableCell>{c.from_holder_name || '—'}</TableCell>
                  <TableCell className="font-medium">{c.to_holder_name}</TableCell>
                  <TableCell className="text-xs">{c.to_department}</TableCell>
                  <TableCell><Badge variant={CONDITION_COLOR[c.condition_at_handover]}>{c.condition_at_handover}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{c.reason}</Badge></TableCell>
                  <TableCell>{c.acknowledged_by_recipient ? '✓' : '—'}</TableCell>
                </TableRow>
              ))}
              {chain.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No custody records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Record Handover</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>From Holder</Label><Input value={draft.from_holder_name || ''} onChange={(e) => setDraft({ ...draft, from_holder_name: e.target.value })} /></div>
            <div><Label>To Holder *</Label><Input value={draft.to_holder_name || ''} onChange={(e) => setDraft({ ...draft, to_holder_name: e.target.value })} /></div>
            <div><Label>To Department</Label><Input value={draft.to_department || ''} onChange={(e) => setDraft({ ...draft, to_department: e.target.value })} /></div>
            <div><Label>To Location</Label><Input value={draft.to_location || ''} onChange={(e) => setDraft({ ...draft, to_location: e.target.value })} /></div>
            <div>
              <Label>Condition</Label>
              <Select value={draft.condition_at_handover} onValueChange={(v) => setDraft({ ...draft, condition_at_handover: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['excellent', 'good', 'fair', 'poor', 'damaged'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={draft.reason} onValueChange={(v) => setDraft({ ...draft, reason: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['assignment', 'transfer', 'return', 'repair', 'audit', 'disposal'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Condition Notes</Label><Textarea rows={2} value={draft.condition_notes || ''} onChange={(e) => setDraft({ ...draft, condition_notes: e.target.value })} /></div>
            <div className="col-span-2"><Label>Reference Doc</Label><Input value={draft.reference_doc || ''} onChange={(e) => setDraft({ ...draft, reference_doc: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await handover.mutateAsync(draft); setOpen(false); }} disabled={!draft.to_holder_name}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
