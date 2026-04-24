import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, MessageSquare } from 'lucide-react';
import { usePatientCommunications, usePatients } from '@/hooks/useHISEnhanced';

export default function PatientCommunicationsPage() {
  const { data: comms = [], upsert } = usePatientCommunications();
  const { data: patients = [] } = usePatients();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ channel: 'sms', language: 'en', status: 'queued', direction: 'outbound' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6 text-primary" />Patient Communications</h1>
          <p className="text-muted-foreground">Multilingual SMS / Email / WhatsApp engagement log</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Message</Button>
      </div>

      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Patient</TableHead><TableHead>Channel</TableHead>
            <TableHead>Lang</TableHead><TableHead>Subject / Body</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {comms.map((c: any) => {
              const p = patients.find((x: any) => x.id === c.patient_id);
              return (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{new Date(c.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{p ? `${p.mrn} — ${p.first_name}` : '—'}</TableCell>
                  <TableCell><Badge variant="outline">{c.channel}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{c.language?.toUpperCase()}</Badge></TableCell>
                  <TableCell className="text-xs max-w-md truncate">{c.subject ? `${c.subject}: ` : ''}{c.message_body}</TableCell>
                  <TableCell><Badge variant={c.status === 'delivered' || c.status === 'read' ? 'default' : c.status === 'failed' ? 'destructive' : 'secondary'}>{c.status}</Badge></TableCell>
                </TableRow>
              );
            })}
            {comms.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No messages</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Patient Message</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Patient</Label>
              <Select value={draft.patient_id || ''} onValueChange={(v) => setDraft({ ...draft, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.mrn} — {p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={draft.channel} onValueChange={(v) => setDraft({ ...draft, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['sms', 'email', 'whatsapp', 'call', 'letter'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={draft.language} onValueChange={(v) => setDraft({ ...draft, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['en', 'ar', 'ur', 'hi'].map(l => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Subject (optional)</Label><Input value={draft.subject || ''} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></div>
            <div className="col-span-2"><Label>Message</Label><Textarea rows={4} value={draft.message_body || ''} onChange={(e) => setDraft({ ...draft, message_body: e.target.value })} /></div>
            <div><Label>Template Code</Label><Input value={draft.template_code || ''} onChange={(e) => setDraft({ ...draft, template_code: e.target.value })} placeholder="appt_reminder, lab_ready…" /></div>
            <div><Label>Scheduled At</Label><Input type="datetime-local" value={draft.scheduled_at || ''} onChange={(e) => setDraft({ ...draft, scheduled_at: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); setDraft({ channel: 'sms', language: 'en', status: 'queued', direction: 'outbound' }); }} disabled={!draft.patient_id || !draft.message_body}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
