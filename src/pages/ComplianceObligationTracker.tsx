import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ClipboardCheck, Plus, AlertTriangle, Calendar, CheckCircle2, Clock, Shield, ArrowUpCircle } from 'lucide-react';

const OB_TYPES = ['license', 'certification', 'insurance', 'tax_filing', 'labor_compliance', 'safety', 'vendor_compliance'];

export default function ComplianceObligationTracker() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState('register');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ obligation_type: 'license', title: '', description: '', entity_name: '', due_date: '', frequency: 'annual', owner_name: '', severity: 'medium', reminder_days: 30 });

  const { data: obligations = [] } = useQuery({
    queryKey: ['compliance-obligations', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('compliance_obligations' as any).select('*').order('due_date') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createOb = useMutation({
    mutationFn: async (o: any) => {
      const { error } = await (supabase.from('compliance_obligations' as any).insert({ ...o, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compliance-obligations'] }); toast.success('Obligation created'); setShowCreate(false); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const upd: any = { status };
      if (status === 'completed') upd.last_completed_at = new Date().toISOString();
      const { error } = await (supabase.from('compliance_obligations' as any).update(upd).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compliance-obligations'] }); toast.success('Updated'); },
  });

  const now = new Date();
  const overdue = obligations.filter((o: any) => o.due_date && new Date(o.due_date) < now && o.status !== 'completed');
  const upcoming = obligations.filter((o: any) => {
    if (!o.due_date || o.status === 'completed') return false;
    const d = new Date(o.due_date);
    return d >= now && d <= new Date(now.getTime() + 30 * 86400000);
  });

  const severityColor = (s: string) => s === 'critical' ? 'destructive' : s === 'high' ? 'destructive' : s === 'medium' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6" />Compliance Obligation Tracker</h1>
          <p className="text-muted-foreground">Track compliance obligations across HR, finance, projects, and suppliers</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Obligation</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Compliance Obligation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Type</Label>
                <Select value={form.obligation_type} onValueChange={v => setForm({ ...form, obligation_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OB_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Entity / Owner</Label><Input value={form.entity_name} onChange={e => setForm({ ...form, entity_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                <div><Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="one_time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createOb.mutate(form)} disabled={!form.title}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{obligations.length}</p><p className="text-xs text-muted-foreground">Total Obligations</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-destructive">{overdue.length}</p><p className="text-xs text-muted-foreground">Overdue</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-amber-600">{upcoming.length}</p><p className="text-xs text-muted-foreground">Due in 30 Days</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">{obligations.filter((o: any) => o.status === 'completed').length}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="register">Obligation Register</TabsTrigger>
          <TabsTrigger value="calendar">Compliance Calendar</TabsTrigger>
          <TabsTrigger value="expiry">Expiry Dashboard</TabsTrigger>
          <TabsTrigger value="remediation">Remediation Tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <div className="space-y-3">
            {obligations.map((o: any) => (
              <Card key={o.id} className={overdue.includes(o) ? 'border-destructive/50' : ''}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{o.title}</p>
                    <p className="text-sm text-muted-foreground">{o.obligation_type.replace(/_/g, ' ')} • {o.entity_name || '—'} • Due: {o.due_date ? new Date(o.due_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant={severityColor(o.severity)}>{o.severity}</Badge>
                    <Badge variant={o.status === 'completed' ? 'default' : 'secondary'}>{o.status}</Badge>
                    {o.status !== 'completed' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: o.id, status: 'completed' })}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base text-destructive">Overdue</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {overdue.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between text-sm">
                    <span>{o.title}</span>
                    <span className="text-destructive">{new Date(o.due_date).toLocaleDateString()}</span>
                  </div>
                ))}
                {overdue.length === 0 && <p className="text-sm text-muted-foreground">None overdue</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base text-amber-600">Upcoming (30 days)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {upcoming.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between text-sm">
                    <span>{o.title}</span>
                    <span className="text-amber-600">{new Date(o.due_date).toLocaleDateString()}</span>
                  </div>
                ))}
                {upcoming.length === 0 && <p className="text-sm text-muted-foreground">None upcoming</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expiry">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {OB_TYPES.map(t => {
              const typeObs = obligations.filter((o: any) => o.obligation_type === t);
              const typeOverdue = typeObs.filter((o: any) => o.due_date && new Date(o.due_date) < now && o.status !== 'completed');
              return (
                <Card key={t}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm capitalize">{t.replace(/_/g, ' ')}</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold">{typeObs.length} total</p>
                    {typeOverdue.length > 0 && <Badge variant="destructive">{typeOverdue.length} overdue</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="remediation">
          <div className="space-y-3">
            {overdue.map((o: any) => (
              <Card key={o.id} className="border-destructive/50">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{o.title}</p>
                    <p className="text-sm text-destructive">Overdue by {Math.ceil((now.getTime() - new Date(o.due_date).getTime()) / 86400000)} days</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: o.id, status: 'in_progress' })}>Start Remediation</Button>
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: o.id, status: 'completed' })}>Complete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {overdue.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No overdue obligations requiring remediation</CardContent></Card>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
