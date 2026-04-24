import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useCorrTypes, useCorrCategories, useCreateCorrespondence } from '@/hooks/useCorrespondence';
import type { CorrDirection } from '@/integrations/supabase/correspondence-tables';

interface Props {
  direction: CorrDirection;
}

export function CorrespondenceForm({ direction }: Props) {
  const navigate = useNavigate();
  const { data: types = [] } = useCorrTypes(direction);
  const { data: categories = [] } = useCorrCategories();
  const create = useCreateCorrespondence();
  const [form, setForm] = useState<any>({
    direction,
    subject: '',
    summary: '',
    priority: 'normal',
    confidentiality: 'internal',
    channel: direction === 'incoming' ? 'email' : 'email',
    correspondence_date: new Date().toISOString().slice(0, 10),
    received_date: direction === 'incoming' ? new Date().toISOString().slice(0, 10) : null,
    language: 'en',
  });

  const update = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));

  const submit = async (asDraft: boolean) => {
    const payload = { ...form, status: asDraft ? 'draft' : 'registered' };
    const created = await create.mutateAsync(payload);
    navigate(`/correspondence/${created.id}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">New {direction === 'incoming' ? 'Incoming' : 'Outgoing'} Correspondence</h1>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type *</Label>
              <Select value={form.type_id ?? ''} onValueChange={(v) => update('type_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {types.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name_en} — {t.name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category_id ?? ''} onValueChange={(v) => update('category_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name_en} — {c.name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Subject *</Label>
            <Input value={form.subject} onChange={(e) => update('subject', e.target.value)} placeholder="Brief subject of correspondence" />
          </div>

          <div>
            <Label>Summary</Label>
            <Textarea value={form.summary ?? ''} onChange={(e) => update('summary', e.target.value)} rows={4} />
          </div>

          {direction === 'incoming' ? (
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Sender Name</Label><Input value={form.sender_name ?? ''} onChange={(e) => update('sender_name', e.target.value)} /></div>
              <div><Label>Sender Organization</Label><Input value={form.sender_org ?? ''} onChange={(e) => update('sender_org', e.target.value)} /></div>
              <div><Label>Sender Email</Label><Input type="email" value={form.sender_email ?? ''} onChange={(e) => update('sender_email', e.target.value)} /></div>
              <div><Label>External Reference</Label><Input value={form.external_reference ?? ''} onChange={(e) => update('external_reference', e.target.value)} /></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Recipient Name</Label><Input value={form.recipient_name ?? ''} onChange={(e) => update('recipient_name', e.target.value)} /></div>
              <div><Label>Recipient Organization</Label><Input value={form.recipient_org ?? ''} onChange={(e) => update('recipient_org', e.target.value)} /></div>
              <div><Label>Recipient Email</Label><Input type="email" value={form.recipient_email ?? ''} onChange={(e) => update('recipient_email', e.target.value)} /></div>
              <div><Label>Recipient Phone</Label><Input value={form.recipient_phone ?? ''} onChange={(e) => update('recipient_phone', e.target.value)} /></div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => update('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['low','normal','high','urgent','critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Confidentiality</Label>
              <Select value={form.confidentiality} onValueChange={(v) => update('confidentiality', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['public','internal','confidential','restricted','top_secret'].map(p => <SelectItem key={p} value={p}>{p.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => update('channel', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['email','courier','hand_delivery','portal','system_integration','fax','print','whatsapp','other'].map(p => <SelectItem key={p} value={p}>{p.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><Label>Correspondence Date</Label><Input type="date" value={form.correspondence_date ?? ''} onChange={(e) => update('correspondence_date', e.target.value)} /></div>
            {direction === 'incoming' && <div><Label>Received Date</Label><Input type="date" value={form.received_date ?? ''} onChange={(e) => update('received_date', e.target.value)} /></div>}
            <div><Label>Due Date</Label><Input type="date" value={form.due_date ?? ''} onChange={(e) => update('due_date', e.target.value || null)} /></div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="secondary" onClick={() => submit(true)} disabled={!form.subject || create.isPending}>Save Draft</Button>
            <Button onClick={() => submit(false)} disabled={!form.subject || !form.type_id || create.isPending}>Register</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
