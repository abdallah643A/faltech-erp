import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, Send } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'tracking', header: 'Tracking #' },
  { key: 'subject', header: 'Subject' },
  { key: 'to', header: 'To' },
  { key: 'status', header: 'Status' },
  { key: 'method', header: 'Method' },
  { key: 'created', header: 'Created' },
];


export default function ECMCorrespondenceOutgoing() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ subject: '', to_entity: '', reference_number: '', priority: 'normal', body: '', delivery_method: 'email' });

  const { data: items = [] } = useQuery({
    queryKey: ['ecm-outgoing', search],
    queryFn: async () => {
      let q = supabase.from('ecm_correspondences').select('*').eq('correspondence_type', 'outgoing').order('created_at', { ascending: false });
      if (search) q = q.or(`subject.ilike.%${search}%,tracking_number.ilike.%${search}%,to_entity.ilike.%${search}%`);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ecm_correspondences').insert({
        correspondence_type: 'outgoing',
        subject: form.subject,
        to_entity: form.to_entity,
        reference_number: form.reference_number || null,
        priority: form.priority,
        body: form.body || null,
        delivery_method: form.delivery_method,
        status: 'draft',
        tracking_number: '',
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecm-outgoing'] });
      toast.success('Outgoing correspondence created');
      setShowNew(false);
      setForm({ subject: '', to_entity: '', reference_number: '', priority: 'normal', body: '', delivery_method: 'email' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800', pending_approval: 'bg-amber-100 text-amber-800',
    sent: 'bg-green-100 text-green-800', closed: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Outgoing Correspondence</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="ecmcorrespondence-outgoing" title="E C M Correspondence Outgoing" />
          <p className="text-sm text-muted-foreground">Create and send outgoing letters and communications</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> New Outgoing</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left px-4 py-2 font-medium">Tracking #</th>
                <th className="text-left px-4 py-2 font-medium">Subject</th>
                <th className="text-left px-4 py-2 font-medium">To</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Method</th>
                <th className="text-left px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No outgoing correspondence</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-b hover:bg-muted/30 cursor-pointer">
                  <td className="px-4 py-2 font-mono text-xs">{item.tracking_number}</td>
                  <td className="px-4 py-2 font-medium">{item.subject}</td>
                  <td className="px-4 py-2">{item.to_entity || '—'}</td>
                  <td className="px-4 py-2"><Badge variant="outline" className={STATUS_COLORS[item.status || 'draft']}>{(item.status || '').replace(/_/g, ' ')}</Badge></td>
                  <td className="px-4 py-2 capitalize">{item.delivery_method || '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Outgoing Correspondence</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></div>
            <div><Label>To (Recipient)</Label><Input value={form.to_entity} onChange={e => setForm(p => ({ ...p, to_entity: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['urgent', 'high', 'normal', 'low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delivery Method</Label>
                <Select value={form.delivery_method} onValueChange={v => setForm(p => ({ ...p, delivery_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['email', 'courier', 'hand_delivery', 'fax', 'registered_mail'].map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Reference Number</Label><Input value={form.reference_number} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} /></div>
            <div><Label>Body</Label><Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={5} /></div>
            <Button className="w-full" onClick={() => create.mutate()} disabled={!form.subject}><Send className="h-4 w-4 mr-2" /> Create as Draft</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
