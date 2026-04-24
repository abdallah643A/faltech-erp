import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Network } from 'lucide-react';
import { useInteropEndpoints } from '@/hooks/useHISEnhanced';

export default function InteropEndpointsPage() {
  const { data: endpoints = [], upsert } = useInteropEndpoints();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ endpoint_type: 'fhir_r4', direction: 'bidirectional', auth_type: 'oauth2', is_active: true });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Network className="h-6 w-6 text-primary" />Interoperability Endpoints</h1>
          <p className="text-muted-foreground">HL7 v2 / FHIR R4 / DICOM / NPHIES / Wasfaty / Seha</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Endpoint</Button>
      </div>

      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Direction</TableHead>
            <TableHead>Auth</TableHead><TableHead>Last Sync</TableHead><TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Received</TableHead><TableHead>Active</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {endpoints.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.endpoint_name}</TableCell>
                <TableCell><Badge variant="outline">{e.endpoint_type}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{e.direction}</Badge></TableCell>
                <TableCell className="text-xs">{e.auth_type || '—'}</TableCell>
                <TableCell className="text-xs">{e.last_sync_at ? new Date(e.last_sync_at).toLocaleString() : '—'}</TableCell>
                <TableCell className="text-right font-mono">{e.total_messages_sent || 0}</TableCell>
                <TableCell className="text-right font-mono">{e.total_messages_received || 0}</TableCell>
                <TableCell><Badge variant={e.is_active ? 'default' : 'outline'}>{e.is_active ? 'Yes' : 'No'}</Badge></TableCell>
              </TableRow>
            ))}
            {endpoints.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No endpoints</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Interop Endpoint</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Endpoint Name</Label><Input value={draft.endpoint_name || ''} onChange={(e) => setDraft({ ...draft, endpoint_name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={draft.endpoint_type} onValueChange={(v) => setDraft({ ...draft, endpoint_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['hl7v2', 'fhir_r4', 'dicom', 'device', 'nphies', 'wasfaty', 'seha', 'custom'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Direction</Label>
              <Select value={draft.direction} onValueChange={(v) => setDraft({ ...draft, direction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['inbound', 'outbound', 'bidirectional'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Base URL</Label><Input value={draft.base_url || ''} onChange={(e) => setDraft({ ...draft, base_url: e.target.value })} placeholder="https://api.nphies.sa/r4" /></div>
            <div>
              <Label>Auth Type</Label>
              <Select value={draft.auth_type} onValueChange={(v) => setDraft({ ...draft, auth_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['none', 'basic', 'bearer', 'oauth2', 'mutual_tls'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} /><Label>Active</Label></div>
            <div className="col-span-2"><Label>Resource Types (comma)</Label><Input value={(draft.resource_types || []).join(',')} onChange={(e) => setDraft({ ...draft, resource_types: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Patient, Observation, MedicationRequest" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={!draft.endpoint_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
