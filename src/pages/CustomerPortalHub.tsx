import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Plus, MessageSquare, FileText, DollarSign, CheckCircle2, Clock, Search } from 'lucide-react';

const INTERACTION_TYPES = ['order_inquiry', 'invoice_query', 'payment_status', 'service_request', 'milestone_approval', 'document_exchange', 'complaint', 'feedback'];

export default function CustomerPortalHub() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ customer_name: '', interaction_type: 'service_request', subject: '', description: '', priority: 'medium' });

  const { data: interactions = [] } = useQuery({
    queryKey: ['customer-portal-interactions', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('customer_portal_interactions' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createInteraction = useMutation({
    mutationFn: async (i: any) => {
      const { error } = await (supabase.from('customer_portal_interactions' as any).insert({ ...i, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-portal-interactions'] }); toast.success('Interaction created'); setShowCreate(false); },
  });

  const resolveInteraction = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await (supabase.from('customer_portal_interactions' as any).update({ status: 'resolved', resolved_at: new Date().toISOString(), resolution_notes: notes || 'Resolved' }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-portal-interactions'] }); toast.success('Resolved'); },
  });

  const open = interactions.filter((i: any) => i.status === 'open');
  const filtered = interactions.filter((i: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return i.customer_name?.toLowerCase().includes(s) || i.subject?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" />Customer Portal & Service Hub</h1>
          <p className="text-muted-foreground">Customer self-service and interaction management</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Interaction</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Interaction</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Customer</Label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.interaction_type} onValueChange={v => setForm({ ...form, interaction_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INTERACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createInteraction.mutate(form)} disabled={!form.subject || !form.customer_name}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{interactions.length}</p><p className="text-xs text-muted-foreground">Total Interactions</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-amber-600">{open.length}</p><p className="text-xs text-muted-foreground">Open</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">{interactions.filter((i: any) => i.status === 'resolved').length}</p><p className="text-xs text-muted-foreground">Resolved</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{[...new Set(interactions.map((i: any) => i.customer_name))].length}</p><p className="text-xs text-muted-foreground">Customers</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="requests">Service Requests</TabsTrigger>
          <TabsTrigger value="statements">Account Statements</TabsTrigger>
          <TabsTrigger value="milestones">Milestone Approvals</TabsTrigger>
          <TabsTrigger value="documents">Shared Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">By Interaction Type</CardTitle></CardHeader>
              <CardContent>
                {INTERACTION_TYPES.map(t => {
                  const count = interactions.filter((i: any) => i.interaction_type === t).length;
                  if (count === 0) return null;
                  return (
                    <div key={t} className="flex items-center justify-between py-1.5">
                      <span className="text-sm capitalize">{t.replace(/_/g, ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Open Interactions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {open.slice(0, 5).map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{i.subject}</p>
                      <p className="text-xs text-muted-foreground">{i.customer_name}</p>
                    </div>
                    <Badge variant={i.priority === 'critical' ? 'destructive' : 'secondary'}>{i.priority}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search interactions..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            {filtered.map((i: any) => (
              <Card key={i.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.subject}</p>
                    <p className="text-sm text-muted-foreground">{i.customer_name} • {i.interaction_type.replace(/_/g, ' ')} • {new Date(i.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant={i.priority === 'critical' ? 'destructive' : i.priority === 'high' ? 'destructive' : 'secondary'}>{i.priority}</Badge>
                    <Badge variant={i.status === 'resolved' ? 'default' : 'secondary'}>{i.status}</Badge>
                    {i.status === 'open' && <Button size="sm" variant="outline" onClick={() => resolveInteraction.mutate({ id: i.id })}><CheckCircle2 className="h-4 w-4" /></Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="statements">
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Customer account statements are generated from AR Invoices and Incoming Payments modules</p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="milestones">
          <div className="space-y-3">
            {interactions.filter((i: any) => i.interaction_type === 'milestone_approval').map((i: any) => (
              <Card key={i.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.subject}</p>
                    <p className="text-sm text-muted-foreground">{i.customer_name}</p>
                  </div>
                  <Badge variant={i.status === 'resolved' ? 'default' : 'secondary'}>{i.status}</Badge>
                </CardContent>
              </Card>
            ))}
            {interactions.filter((i: any) => i.interaction_type === 'milestone_approval').length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No milestone approvals</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="space-y-3">
            {interactions.filter((i: any) => i.interaction_type === 'document_exchange').map((i: any) => (
              <Card key={i.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.subject}</p>
                    <p className="text-sm text-muted-foreground">{i.customer_name}</p>
                  </div>
                  <Badge variant={i.status === 'resolved' ? 'default' : 'secondary'}>{i.status}</Badge>
                </CardContent>
              </Card>
            ))}
            {interactions.filter((i: any) => i.interaction_type === 'document_exchange').length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No document exchanges</CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
