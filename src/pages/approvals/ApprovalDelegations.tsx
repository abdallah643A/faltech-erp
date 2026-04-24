import { useState } from 'react';
import { useApprovalDelegations } from '@/hooks/useApprovalDelegations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { UserCog, Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ApprovalDelegations() {
  const { data: delegations = [], create, update, remove } = useApprovalDelegations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    delegate_user_id: '',
    scope: 'all',
    document_type: '',
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: '',
    reason: '',
    is_active: true,
  });

  const submit = async () => {
    if (!form.delegate_user_id || !form.ends_at) return;
    await create.mutateAsync({
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      document_type: form.scope === 'document_type' ? form.document_type : null,
    });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCog className="h-6 w-6" /> Approval Delegations</h1>
          <p className="text-sm text-muted-foreground">Delegate your approval authority while you're out of office.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Delegation</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create delegation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Delegate user ID</Label><Input value={form.delegate_user_id} onChange={e => setForm({ ...form, delegate_user_id: e.target.value })} placeholder="uuid" /></div>
              <div>
                <Label>Scope</Label>
                <Select value={form.scope} onValueChange={v => setForm({ ...form, scope: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All approvals</SelectItem>
                    <SelectItem value="document_type">Specific document type</SelectItem>
                    <SelectItem value="template">Specific template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.scope === 'document_type' && (
                <div><Label>Document type</Label><Input value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })} placeholder="purchase_order" /></div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></div>
                <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} /></div>
              </div>
              <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Out of office" /></div>
              <Button onClick={submit} disabled={create.isPending} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Active & Past Delegations</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr className="border-b">
              <th className="text-left px-4 py-2">Delegate</th>
              <th className="text-left px-4 py-2">Scope</th>
              <th className="text-left px-4 py-2">Window</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr></thead>
            <tbody>
              {delegations.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No delegations yet</td></tr>
              ) : delegations.map(d => {
                const now = new Date();
                const active = d.is_active && new Date(d.starts_at) <= now && new Date(d.ends_at) >= now;
                return (
                  <tr key={d.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs">{d.delegate_user_id?.slice(0, 8)}…</td>
                    <td className="px-4 py-2">{d.scope}{d.document_type ? `: ${d.document_type}` : ''}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground"><Calendar className="h-3 w-3 inline mr-1" />{format(new Date(d.starts_at), 'MMM d')} → {format(new Date(d.ends_at), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-2"><Badge variant={active ? 'default' : 'outline'}>{active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-2 flex items-center gap-2">
                      <Switch checked={d.is_active} onCheckedChange={v => update.mutate({ id: d.id, is_active: v })} />
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
