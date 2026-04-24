import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Mail, Search, Clock, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'tracking', header: 'Tracking #' },
  { key: 'subject', header: 'Subject' },
  { key: 'from', header: 'From' },
  { key: 'priority', header: 'Priority' },
  { key: 'status', header: 'Status' },
  { key: 'department', header: 'Department' },
  { key: 'received', header: 'Received' },
  { key: 'due', header: 'Due' },
];


const STATUS_COLORS: Record<string, string> = {
  received: 'bg-blue-100 text-blue-800', assigned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-amber-100 text-amber-800', replied: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800', low: 'bg-gray-100 text-gray-800',
};

export default function ECMCorrespondenceIncoming() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ subject: '', from_entity: '', reference_number: '', priority: 'normal', body: '', assigned_department: '', due_date: '' });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['ecm-incoming'],
    queryFn: async () => {
      let q = supabase.from('ecm_correspondences').select('*').eq('correspondence_type', 'incoming').order('created_at', { ascending: false });
      if (search) q = q.or(`subject.ilike.%${search}%,tracking_number.ilike.%${search}%,from_entity.ilike.%${search}%`);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ecm_correspondences').insert({
        correspondence_type: 'incoming',
        subject: form.subject,
        from_entity: form.from_entity,
        reference_number: form.reference_number || null,
        priority: form.priority,
        body: form.body || null,
        assigned_department: form.assigned_department || null,
        due_date: form.due_date || null,
        received_date: new Date().toISOString().split('T')[0],
        status: 'received',
        tracking_number: '',
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecm-incoming'] });
      toast.success('Incoming correspondence registered');
      setShowNew(false);
      setForm({ subject: '', from_entity: '', reference_number: '', priority: 'normal', body: '', assigned_department: '', due_date: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incoming Correspondence</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="ecmcorrespondence-incoming" title="E C M Correspondence Incoming" />
          <p className="text-sm text-muted-foreground">Register and track incoming letters and communications</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> Register Incoming</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search by subject, tracking number, sender..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="border-b">
                <th className="text-left px-4 py-2 font-medium">Tracking #</th>
                <th className="text-left px-4 py-2 font-medium">Subject</th>
                <th className="text-left px-4 py-2 font-medium">From</th>
                <th className="text-left px-4 py-2 font-medium">Priority</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Department</th>
                <th className="text-left px-4 py-2 font-medium">Received</th>
                <th className="text-left px-4 py-2 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No incoming correspondence found</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-2 font-mono text-xs">{item.tracking_number}</td>
                  <td className="px-4 py-2 font-medium">{item.subject}</td>
                  <td className="px-4 py-2">{item.from_entity || '—'}</td>
                  <td className="px-4 py-2"><Badge variant="outline" className={PRIORITY_COLORS[item.priority || 'normal']}>{item.priority}</Badge></td>
                  <td className="px-4 py-2"><Badge variant="outline" className={STATUS_COLORS[item.status || 'received']}>{(item.status || '').replace(/_/g, ' ')}</Badge></td>
                  <td className="px-4 py-2">{item.assigned_department || '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{item.received_date ? new Date(item.received_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Register Incoming Correspondence</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From (Organization/Person)</Label><Input value={form.from_entity} onChange={e => setForm(p => ({ ...p, from_entity: e.target.value }))} /></div>
              <div><Label>Reference Number</Label><Input value={form.reference_number} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['urgent', 'high', 'normal', 'low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign to Department</Label>
                <Select value={form.assigned_department} onValueChange={v => setForm(p => ({ ...p, assigned_department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['Finance', 'HR', 'Legal', 'Procurement', 'Projects', 'Administration'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={3} /></div>
            <Button className="w-full" onClick={() => create.mutate()} disabled={!form.subject}>Register</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
