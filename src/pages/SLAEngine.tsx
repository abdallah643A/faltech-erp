import { useState } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Timer, Plus, Edit, Trash2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const SLA_MODULES = ['leads','quotes','purchase_requests','approvals','leave_requests','incidents','project_tasks','sales_orders','support_tickets'];

export default function SLAEngine() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: definitions = [] } = useQuery({
    queryKey: ['sla-definitions', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('sla_definitions' as any).select('*') as any).order('module');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: tracking = [] } = useQuery({
    queryKey: ['sla-tracking', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('sla_tracking' as any).select('*') as any).order('started_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const [defDialog, setDefDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ module: '', priority: 'medium', target_response_hours: 24, target_completion_hours: 72, escalation_hours: 48, escalation_to_role: '', is_active: true });

  const saveDef = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, company_id: activeCompanyId, created_by: user?.id };
      if (editId) { await (supabase.from('sla_definitions' as any).update(payload) as any).eq('id', editId); }
      else { await (supabase.from('sla_definitions' as any).insert(payload) as any); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sla-definitions'] }); setDefDialog(false); toast({ title: 'Saved' }); },
  });

  const deleteDef = useMutation({
    mutationFn: async (id: string) => { await supabase.from('sla_definitions' as any).delete().eq('id', id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sla-definitions'] }),
  });

  // Calculate SLA stats
  const breached = tracking.filter((t: any) => t.completion_status === 'breached').length;
  const met = tracking.filter((t: any) => t.completion_status === 'met').length;
  const pending = tracking.filter((t: any) => t.completion_status === 'pending').length;

  // Module heatmap data
  const moduleStats = SLA_MODULES.map(m => {
    const items = tracking.filter((t: any) => t.module === m);
    const b = items.filter((t: any) => t.completion_status === 'breached').length;
    return { module: m, total: items.length, breached: b, rate: items.length > 0 ? Math.round((b / items.length) * 100) : 0 };
  }).filter(m => m.total > 0);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Timer className="h-6 w-6" /> SLA & Overdue Engine</h1>
          <p className="text-muted-foreground text-sm">Configure and track service level agreements across modules</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm({ module: '', priority: 'medium', target_response_hours: 24, target_completion_hours: 72, escalation_hours: 48, escalation_to_role: '', is_active: true }); setDefDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New SLA
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Active SLAs</div><div className="text-2xl font-bold">{definitions.filter((d: any) => d.is_active).length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Met</div><div className="text-2xl font-bold text-primary">{met}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Breached</div><div className="text-2xl font-bold text-destructive">{breached}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">{t('common.pending')}</div><div className="text-2xl font-bold">{pending}</div></CardContent></Card>
      </div>

      {/* Module Heatmap */}
      {moduleStats.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Breach Rate by Module</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {moduleStats.map(m => (
                <div key={m.module} className={`p-3 rounded-lg border ${m.rate > 50 ? 'border-destructive bg-destructive/5' : m.rate > 20 ? 'border-amber-500 bg-amber-50/50' : 'border-border'}`}>
                  <p className="text-sm font-medium">{m.module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                  <p className="text-lg font-bold">{m.rate}% breached</p>
                  <p className="text-xs text-muted-foreground">{m.breached}/{m.total} tracked</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="definitions">
        <TabsList>
          <TabsTrigger value="definitions">SLA Definitions ({definitions.length})</TabsTrigger>
          <TabsTrigger value="tracking">Tracking ({tracking.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="definitions">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Priority</TableHead><TableHead>Response (hrs)</TableHead><TableHead>Completion (hrs)</TableHead><TableHead>Escalation (hrs)</TableHead><TableHead>{t('common.active')}</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {definitions.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell><Badge variant="secondary">{d.module?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><Badge variant={d.priority === 'high' ? 'destructive' : d.priority === 'low' ? 'outline' : 'secondary'}>{d.priority}</Badge></TableCell>
                    <TableCell className="font-mono">{d.target_response_hours}h</TableCell>
                    <TableCell className="font-mono">{d.target_completion_hours}h</TableCell>
                    <TableCell className="font-mono">{d.escalation_hours || '-'}h</TableCell>
                    <TableCell><Badge variant={d.is_active ? 'default' : 'secondary'}>{d.is_active ? 'Active' : 'Off'}</Badge></TableCell>
                    <TableCell><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => { setEditId(d.id); setForm(d); setDefDialog(true); }}><Edit className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => deleteDef.mutate(d.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                ))}
                {definitions.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No SLAs defined</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tracking">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Record</TableHead><TableHead>Priority</TableHead><TableHead>Response</TableHead><TableHead>Completion</TableHead><TableHead>Elapsed</TableHead></TableRow></TableHeader>
              <TableBody>
                {tracking.map((t: any) => {
                  const elapsed = differenceInHours(new Date(), new Date(t.started_at));
                  return (
                    <TableRow key={t.id}>
                      <TableCell><Badge variant="outline">{t.module?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-sm">{t.record_number || '-'}</TableCell>
                      <TableCell><Badge variant={t.priority === 'high' ? 'destructive' : 'secondary'}>{t.priority}</Badge></TableCell>
                      <TableCell>{t.response_status === 'met' ? <CheckCircle2 className="h-4 w-4 text-primary" /> : t.response_status === 'breached' ? <XCircle className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-muted-foreground" />}</TableCell>
                      <TableCell>{t.completion_status === 'met' ? <CheckCircle2 className="h-4 w-4 text-primary" /> : t.completion_status === 'breached' ? <XCircle className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-muted-foreground" />}</TableCell>
                      <TableCell className="font-mono">{elapsed}h</TableCell>
                    </TableRow>
                  );
                })}
                {tracking.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No SLA tracking data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={defDialog} onOpenChange={setDefDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Create'} SLA Definition</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Module</Label><Select value={form.module} onValueChange={v => setForm({ ...form, module: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SLA_MODULES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Response (hrs)</Label><Input type="number" value={form.target_response_hours} onChange={e => setForm({ ...form, target_response_hours: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Completion (hrs)</Label><Input type="number" value={form.target_completion_hours} onChange={e => setForm({ ...form, target_completion_hours: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Escalation (hrs)</Label><Input type="number" value={form.escalation_hours || ''} onChange={e => setForm({ ...form, escalation_hours: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Escalate To Role</Label><Input value={form.escalation_to_role} onChange={e => setForm({ ...form, escalation_to_role: e.target.value })} placeholder="e.g. manager" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDefDialog(false)}>{t('common.cancel')}</Button><Button onClick={() => saveDef.mutate(form)} disabled={!form.module}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
