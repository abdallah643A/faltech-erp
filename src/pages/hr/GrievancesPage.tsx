import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, MessageSquareWarning } from 'lucide-react';
import { useGrievances } from '@/hooks/useHREnhanced';

export default function GrievancesPage() {
  const { data: items = [], file } = useGrievances();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ category: 'workplace', severity: 'medium', is_anonymous: false, confidential: true });
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquareWarning className="h-6 w-6 text-primary" />Grievances</h1>
          <p className="text-muted-foreground">Confidential complaint workflow with HR/Legal escalation</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />File Grievance</Button>
      </div>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Number</TableHead><TableHead>Subject</TableHead><TableHead>Category</TableHead>
            <TableHead>Severity</TableHead><TableHead>Filed</TableHead><TableHead>Status</TableHead><TableHead>Confidential</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map((g: any) => (
              <TableRow key={g.id}>
                <TableCell className="font-mono text-xs">{g.grievance_number}</TableCell>
                <TableCell><div className="font-medium">{g.subject}</div>{g.is_anonymous && <Badge variant="outline" className="text-[10px]">Anonymous</Badge>}</TableCell>
                <TableCell><Badge variant="outline">{g.category}</Badge></TableCell>
                <TableCell><Badge variant={g.severity === 'critical' ? 'destructive' : g.severity === 'high' ? 'destructive' : 'secondary'}>{g.severity}</Badge></TableCell>
                <TableCell className="text-xs">{g.filed_date}</TableCell>
                <TableCell><Badge variant={g.status === 'resolved' ? 'default' : 'secondary'}>{g.status}</Badge></TableCell>
                <TableCell>{g.confidential ? '🔒' : '—'}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No grievances</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>File Grievance</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Subject</Label><Input value={draft.subject || ''} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['workplace', 'harassment', 'discrimination', 'salary', 'safety', 'management', 'other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={draft.severity} onValueChange={(v) => setDraft({ ...draft, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['low', 'medium', 'high', 'critical'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Description</Label><Textarea rows={4} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={draft.is_anonymous} onCheckedChange={(v) => setDraft({ ...draft, is_anonymous: v })} /><Label>Anonymous</Label></div>
            <div className="flex items-center gap-2"><Switch checked={draft.confidential} onCheckedChange={(v) => setDraft({ ...draft, confidential: v })} /><Label>Confidential</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await file.mutateAsync(draft); setOpen(false); }} disabled={!draft.subject}>File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
