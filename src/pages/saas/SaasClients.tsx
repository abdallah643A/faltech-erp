import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaasTenants, useCreateTenant, useUpdateTenant } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Building2, Eye, Ban, CheckCircle, Download } from 'lucide-react';
import { format } from 'date-fns';

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trial: 'bg-blue-100 text-blue-800',
  suspended: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

export default function SaasClients() {
  const navigate = useNavigate();
  const { data: tenants = [], isLoading } = useSaasTenants();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ tenant_name: '', tenant_slug: '', contact_name: '', contact_email: '', contact_phone: '', status: 'trial' });

  const filtered = tenants.filter((t: any) => {
    const matchSearch = !search || t.tenant_name?.toLowerCase().includes(search.toLowerCase()) || t.contact_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    if (!form.tenant_name || !form.tenant_slug) return;
    await createTenant.mutateAsync(form);
    setShowCreate(false);
    setForm({ tenant_name: '', tenant_slug: '', contact_name: '', contact_email: '', contact_phone: '', status: 'trial' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Management</h1>
          <p className="text-muted-foreground">Manage all tenant client accounts</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Client</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Client Name</Label><Input value={form.tenant_name} onChange={e => setForm(f => ({ ...f, tenant_name: e.target.value }))} /></div>
              <div><Label>Slug (URL identifier)</Label><Input value={form.tenant_slug} onChange={e => setForm(f => ({ ...f, tenant_slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} /></div>
              <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
              <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
              <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
              <div>
                <Label>Initial Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={createTenant.isPending} className="w-full">Create Client</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t: any) => {
                const sub = t.saas_tenant_subscriptions?.[0];
                return (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{t.tenant_name}</p>
                        <p className="text-xs text-muted-foreground">{t.contact_email}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={statusColor[t.status] || ''}>{t.status}</Badge></TableCell>
                    <TableCell>{sub?.saas_subscription_plans?.plan_name || '—'}</TableCell>
                    <TableCell>{t.saas_seat_licenses?.[0]?.count || 0}</TableCell>
                    <TableCell>{t.saas_tenant_modules?.[0]?.count || 0}</TableCell>
                    <TableCell>{t.saas_tenant_companies?.[0]?.count || 0}</TableCell>
                    <TableCell className="text-xs">{format(new Date(t.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/saas/clients/${t.id}`)}><Eye className="h-4 w-4" /></Button>
                        {t.status === 'active' && (
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => updateTenant.mutate({ id: t.id, status: 'suspended' })}><Ban className="h-4 w-4" /></Button>
                        )}
                        {t.status === 'suspended' && (
                          <Button size="sm" variant="ghost" className="text-green-600" onClick={() => updateTenant.mutate({ id: t.id, status: 'active' })}><CheckCircle className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No clients found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
