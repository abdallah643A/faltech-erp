import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileWarning } from 'lucide-react';
import { useDocumentExpiry } from '@/hooks/useHREnhanced';

export default function DocumentExpiryPage() {
  const { data: docs = [], upsert } = useDocumentExpiry();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ document_type: 'iqama', renewal_status: 'active' });
  const expColor = (d: number) => d < 0 ? 'destructive' : d < 30 ? 'destructive' : d < 60 ? 'secondary' : 'default';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileWarning className="h-6 w-6 text-primary" />Document Expiry</h1>
          <p className="text-muted-foreground">Iqama, Passport, Saudi ID, Work Permit, Medical, GOSI Card</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Document</Button>
      </div>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Type</TableHead><TableHead>Number</TableHead><TableHead>Issuing Authority</TableHead>
            <TableHead>Expiry</TableHead><TableHead>Days Left</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {docs.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell><Badge variant="outline">{d.document_type}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{d.document_number || '—'}</TableCell>
                <TableCell className="text-xs">{d.issuing_authority || '—'}</TableCell>
                <TableCell className="text-xs">{d.expiry_date}</TableCell>
                <TableCell><Badge variant={expColor(d.days_until_expiry)}>{d.days_until_expiry}d</Badge></TableCell>
                <TableCell><Badge>{d.renewal_status}</Badge></TableCell>
              </TableRow>
            ))}
            {docs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No documents</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={draft.document_type} onValueChange={(v) => setDraft({ ...draft, document_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['iqama', 'passport', 'saudi_id', 'driving_license', 'work_permit', 'medical_insurance', 'gosi_card', 'visa'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Number</Label><Input value={draft.document_number || ''} onChange={(e) => setDraft({ ...draft, document_number: e.target.value })} /></div>
            <div><Label>Issuing Authority</Label><Input value={draft.issuing_authority || ''} onChange={(e) => setDraft({ ...draft, issuing_authority: e.target.value })} /></div>
            <div><Label>Issue Date</Label><Input type="date" value={draft.issue_date || ''} onChange={(e) => setDraft({ ...draft, issue_date: e.target.value })} /></div>
            <div><Label>Expiry Date *</Label><Input type="date" value={draft.expiry_date || ''} onChange={(e) => setDraft({ ...draft, expiry_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={!draft.expiry_date}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
