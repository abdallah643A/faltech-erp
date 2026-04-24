import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useServiceTickets, useCreateTicket, useSLAPolicies, useTechnicians } from '@/hooks/useServiceITSM';
import { Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function ITSMTicketsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ priority: 'medium', ticket_type: 'incident' });

  const { data: tickets = [] } = useServiceTickets(statusFilter ? { status: statusFilter as any } : {});
  const { data: policies = [] } = useSLAPolicies();
  const { data: techs = [] } = useTechnicians();
  const create = useCreateTicket();

  const filtered = tickets.filter((t: any) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.ticket_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Tickets</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} tickets</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Ticket</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Service Ticket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.ticket_type} onValueChange={(v) => setForm({ ...form, ticket_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['incident', 'request', 'problem', 'change', 'field_service'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['low', 'medium', 'high', 'critical'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Customer</Label><Input value={form.customer_name || ''} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
                <div><Label>Asset code</Label><Input value={form.asset_code || ''} onChange={(e) => setForm({ ...form, asset_code: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>SLA Policy</Label>
                  <Select value={form.sla_policy_id || ''} onValueChange={(v) => setForm({ ...form, sla_policy_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{policies.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.policy_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Assignee</Label>
                  <Select value={form.assigned_technician_id || ''} onValueChange={(v) => setForm({ ...form, assigned_technician_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{techs.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.technician_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => create.mutate(form, { onSuccess: () => { setOpen(false); setForm({ priority: 'medium', ticket_type: 'incident' }); } })} disabled={!form.title}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input placeholder="Search tickets..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {['new', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead><TableHead>Title</TableHead><TableHead>Priority</TableHead>
                <TableHead>Status</TableHead><TableHead>Assignee</TableHead><TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer">
                  <TableCell className="font-mono text-xs"><Link to={`/itsm/tickets/${t.id}`}>{t.ticket_number}</Link></TableCell>
                  <TableCell><Link to={`/itsm/tickets/${t.id}`}>{t.title}</Link></TableCell>
                  <TableCell><Badge variant={t.priority === 'critical' ? 'destructive' : 'secondary'}>{t.priority}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{t.status}</Badge>{t.is_breached && <Badge variant="destructive" className="ml-1">SLA</Badge>}</TableCell>
                  <TableCell className="text-sm">{t.svc_technicians?.technician_name || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.due_resolution_at ? formatDistanceToNow(new Date(t.due_resolution_at), { addSuffix: true }) : '—'}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No tickets</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
