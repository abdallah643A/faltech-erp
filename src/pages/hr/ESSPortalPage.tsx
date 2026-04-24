import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserCircle } from 'lucide-react';
import { useESSRequests } from '@/hooks/useHREnhanced';

export default function ESSPortalPage() {
  const { data: requests = [], submit, decide } = useESSRequests();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ request_type: 'leave', priority: 'normal' });
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary" />Employee Self-Service</h1>
          <p className="text-muted-foreground">Submit & track requests; manager + HR approval</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Request</Button>
      </div>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Number</TableHead><TableHead>Type</TableHead><TableHead>Subject</TableHead>
            <TableHead>Priority</TableHead><TableHead>Manager</TableHead><TableHead>HR</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {requests.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.request_number}</TableCell>
                <TableCell><Badge variant="outline">{r.request_type}</Badge></TableCell>
                <TableCell className="text-sm">{r.subject}</TableCell>
                <TableCell><Badge variant={r.priority === 'urgent' ? 'destructive' : 'secondary'}>{r.priority}</Badge></TableCell>
                <TableCell>{r.manager_decision ? <Badge variant={r.manager_decision === 'approved' ? 'default' : 'destructive'}>{r.manager_decision}</Badge> : '—'}</TableCell>
                <TableCell>{r.hr_decision ? <Badge variant={r.hr_decision === 'approved' ? 'default' : 'destructive'}>{r.hr_decision}</Badge> : '—'}</TableCell>
                <TableCell><Badge>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {!r.manager_decision && <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: r.id, role: 'manager', decision: 'approved' })}>MgrOK</Button>}
                    {r.manager_decision === 'approved' && !r.hr_decision && <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: r.id, role: 'hr', decision: 'approved' })}>HR OK</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No requests</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Request</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={draft.request_type} onValueChange={(v) => setDraft({ ...draft, request_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['leave', 'expense', 'certificate', 'info_update', 'loan', 'overtime', 'training', 'transfer', 'other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['low', 'normal', 'high', 'urgent'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Subject</Label><Input value={draft.subject || ''} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></div>
            <div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await submit.mutateAsync(draft); setOpen(false); }} disabled={!draft.subject}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
