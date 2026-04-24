import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Receipt, Plus, CheckCircle2, Settings, Calendar, FileText, AlertTriangle, Link2 } from 'lucide-react';
import { format } from 'date-fns';

const METHODS = ['milestone', 'percentage_of_completion', 'delivery', 'deferred', 'manual'];
const DOC_TYPES = ['sales_order', 'ar_invoice', 'contract', 'service_order'];

export default function RevenueRecognitionEngine() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['rev-rec-rules', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('revenue_recognition_rules' as any).select('*') as any).order('priority');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['rev-rec-schedules', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('revenue_recognition_schedules' as any).select('*') as any).order('schedule_period', { ascending: false }).limit(300);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['rev-contract-mappings', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('revenue_contract_mappings' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: exceptions = [] } = useQuery({
    queryKey: ['rev-rec-exceptions', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('revenue_recognition_exceptions' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  // Dialogs
  const [ruleDialog, setRuleDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [mappingDialog, setMappingDialog] = useState(false);

  const [ruleForm, setRuleForm] = useState({ rule_name: '', recognition_method: 'milestone', document_type: '', revenue_account: '', deferred_revenue_account: '', description: '' });
  const [schedForm, setSchedForm] = useState({ document_number: '', customer_name: '', total_contract_value: 0, scheduled_amount: 0, schedule_period: '', milestone_name: '', completion_percentage: 0, rule_id: '' });
  const [mapForm, setMapForm] = useState({ document_number: '', customer_name: '', contract_value: 0, rule_id: '', recognition_method: 'milestone', start_date: '', end_date: '', retention_percentage: 0 });

  const createRule = useMutation({
    mutationFn: async (d: any) => { await (supabase.from('revenue_recognition_rules' as any).insert({ ...d, company_id: activeCompanyId, created_by: user?.id }) as any); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-rec-rules'] }); setRuleDialog(false); toast({ title: 'Rule Created' }); },
  });

  const createSchedule = useMutation({
    mutationFn: async (d: any) => { await (supabase.from('revenue_recognition_schedules' as any).insert({ ...d, company_id: activeCompanyId, created_by: user?.id }) as any); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-rec-schedules'] }); setScheduleDialog(false); toast({ title: 'Schedule Created' }); },
  });

  const createMapping = useMutation({
    mutationFn: async (d: any) => { await (supabase.from('revenue_contract_mappings' as any).insert({ ...d, company_id: activeCompanyId, created_by: user?.id }) as any); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-contract-mappings'] }); setMappingDialog(false); toast({ title: 'Mapping Created' }); },
  });

  const recognizeSchedule = useMutation({
    mutationFn: async (id: string) => {
      const sched = schedules.find((s: any) => s.id === id);
      await (supabase.from('revenue_recognition_schedules' as any).update({ status: 'recognized', actual_recognized: sched?.scheduled_amount, recognition_date: new Date().toISOString().split('T')[0] }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-rec-schedules'] }); toast({ title: 'Revenue Recognized' }); },
  });

  const resolveException = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from('revenue_recognition_exceptions' as any).update({ status: 'resolved', resolved_by: user?.id, resolved_at: new Date().toISOString() }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-rec-exceptions'] }); toast({ title: 'Exception Resolved' }); },
  });

  const stats = useMemo(() => ({
    totalScheduled: schedules.filter((s: any) => s.status === 'scheduled').reduce((a: number, s: any) => a + Number(s.scheduled_amount || 0), 0),
    totalRecognized: schedules.filter((s: any) => s.status === 'recognized' || s.status === 'posted').reduce((a: number, s: any) => a + Number(s.actual_recognized || s.scheduled_amount || 0), 0),
    totalDeferred: schedules.reduce((a: number, s: any) => a + Number(s.deferred_balance || 0), 0),
    openExceptions: exceptions.filter((e: any) => e.status === 'open').length,
    activeContracts: mappings.filter((m: any) => m.status === 'active').length,
  }), [schedules, exceptions, mappings]);

  const methodLabel = (m: string) => m?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" /> Revenue Recognition Engine</h1>
          <p className="text-sm text-muted-foreground">Manage recognition rules, schedules, and contract-based revenue treatment</p>
        </div>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="rules" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Recognition Rules</TabsTrigger>
          <TabsTrigger value="schedules" className="gap-1.5"><Calendar className="h-3.5 w-3.5" /> Schedule Review</TabsTrigger>
          <TabsTrigger value="mappings" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Contract Mapping</TabsTrigger>
          <TabsTrigger value="posting" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Posting Review</TabsTrigger>
          <TabsTrigger value="exceptions" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Exception Queue</TabsTrigger>
        </TabsList>

        {/* ── Recognition Rules ── */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setRuleDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Rule</Button></div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Rule Name</TableHead><TableHead>Method</TableHead><TableHead>Document Type</TableHead><TableHead>Revenue Acct</TableHead><TableHead>Deferred Acct</TableHead><TableHead>Priority</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.rule_name}</TableCell>
                    <TableCell><Badge variant="outline">{methodLabel(r.recognition_method)}</Badge></TableCell>
                    <TableCell className="text-xs">{r.document_type || 'All'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.revenue_account || '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.deferred_revenue_account || '-'}</TableCell>
                    <TableCell>{r.priority}</TableCell>
                    <TableCell><Badge variant={r.is_active ? 'default' : 'outline'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No recognition rules configured</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Schedule Review ── */}
        <TabsContent value="schedules" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Scheduled</div><div className="text-xl font-bold">{stats.totalScheduled.toLocaleString()} SAR</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Recognized</div><div className="text-xl font-bold text-green-600">{stats.totalRecognized.toLocaleString()} SAR</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Deferred Balance</div><div className="text-xl font-bold">{stats.totalDeferred.toLocaleString()} SAR</div></CardContent></Card>
            <Card className="border-destructive"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Exceptions</div><div className="text-xl font-bold text-destructive">{stats.openExceptions}</div></CardContent></Card>
          </div>
          <div className="flex justify-end"><Button onClick={() => setScheduleDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Schedule</Button></div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Document</TableHead><TableHead>Customer</TableHead><TableHead>Contract Value</TableHead><TableHead>Scheduled</TableHead><TableHead>Recognized</TableHead><TableHead>Milestone / %</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {schedules.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs font-medium">{s.schedule_period}</TableCell>
                    <TableCell className="text-xs">{s.document_number || '-'}</TableCell>
                    <TableCell className="text-xs">{s.customer_name || '-'}</TableCell>
                    <TableCell className="text-xs">{Number(s.total_contract_value || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-bold">{Number(s.scheduled_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{Number(s.actual_recognized || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{s.milestone_name || (s.completion_percentage ? `${s.completion_percentage}%` : '-')}</TableCell>
                    <TableCell><Badge variant={s.status === 'recognized' || s.status === 'posted' ? 'default' : s.status === 'exception' ? 'destructive' : 'secondary'}>{s.status}</Badge></TableCell>
                    <TableCell>{s.status === 'scheduled' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => recognizeSchedule.mutate(s.id)}><CheckCircle2 className="h-3 w-3 mr-1" /> Recognize</Button>}</TableCell>
                  </TableRow>
                ))}
                {schedules.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No schedules</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Contract Mapping ── */}
        <TabsContent value="mappings" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{stats.activeContracts} active contract mappings</p>
            <Button onClick={() => setMappingDialog(true)}><Plus className="h-4 w-4 mr-2" /> Map Contract</Button>
          </div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Document #</TableHead><TableHead>Customer</TableHead><TableHead>Value</TableHead><TableHead>Method</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Retention %</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {mappings.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm font-medium">{m.document_number || '-'}</TableCell>
                    <TableCell className="text-xs">{m.customer_name}</TableCell>
                    <TableCell className="text-sm font-bold">{Number(m.contract_value || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{methodLabel(m.recognition_method)}</Badge></TableCell>
                    <TableCell className="text-xs">{m.start_date || '-'}</TableCell>
                    <TableCell className="text-xs">{m.end_date || '-'}</TableCell>
                    <TableCell className="text-xs">{m.retention_percentage || 0}%</TableCell>
                    <TableCell><Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {mappings.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No contract mappings</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Posting Review ── */}
        <TabsContent value="posting" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">Recognized Revenue Awaiting Posting</CardTitle></CardHeader><CardContent className="overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Document</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Recognition Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {schedules.filter((s: any) => s.status === 'recognized').map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{s.schedule_period}</TableCell>
                    <TableCell className="text-xs">{s.document_number}</TableCell>
                    <TableCell className="text-xs">{s.customer_name}</TableCell>
                    <TableCell className="text-sm font-bold">{Number(s.actual_recognized || s.scheduled_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{s.recognition_date || '-'}</TableCell>
                    <TableCell><Badge variant="secondary">Awaiting Post</Badge></TableCell>
                  </TableRow>
                ))}
                {schedules.filter((s: any) => s.status === 'recognized').length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No entries awaiting posting</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Exception Queue ── */}
        <TabsContent value="exceptions" className="space-y-4">
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>Amount</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Assigned</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {exceptions.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{e.exception_type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-sm font-medium">{e.title}</TableCell>
                    <TableCell className="text-sm">{Number(e.amount || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={e.severity === 'high' || e.severity === 'critical' ? 'destructive' : 'secondary'}>{e.severity}</Badge></TableCell>
                    <TableCell><Badge variant={e.status === 'open' ? 'destructive' : 'default'}>{e.status}</Badge></TableCell>
                    <TableCell className="text-xs">{e.assigned_to || '-'}</TableCell>
                    <TableCell>{e.status === 'open' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resolveException.mutate(e.id)}>Resolve</Button>}</TableCell>
                  </TableRow>
                ))}
                {exceptions.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No exceptions</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent><DialogHeader><DialogTitle>Create Recognition Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Rule Name *</Label><Input value={ruleForm.rule_name} onChange={e => setRuleForm({ ...ruleForm, rule_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Method *</Label><Select value={ruleForm.recognition_method} onValueChange={v => setRuleForm({ ...ruleForm, recognition_method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{methodLabel(m)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Document Type</Label><Select value={ruleForm.document_type} onValueChange={v => setRuleForm({ ...ruleForm, document_type: v })}><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent>{DOC_TYPES.map(d => <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Revenue Account</Label><Input value={ruleForm.revenue_account} onChange={e => setRuleForm({ ...ruleForm, revenue_account: e.target.value })} /></div>
              <div><Label>Deferred Revenue Acct</Label><Input value={ruleForm.deferred_revenue_account} onChange={e => setRuleForm({ ...ruleForm, deferred_revenue_account: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={ruleForm.description} onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRuleDialog(false)}>Cancel</Button><Button onClick={() => createRule.mutate(ruleForm)} disabled={!ruleForm.rule_name}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Recognition Schedule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Document #</Label><Input value={schedForm.document_number} onChange={e => setSchedForm({ ...schedForm, document_number: e.target.value })} /></div>
              <div><Label>Customer</Label><Input value={schedForm.customer_name} onChange={e => setSchedForm({ ...schedForm, customer_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contract Value</Label><Input type="number" value={schedForm.total_contract_value} onChange={e => setSchedForm({ ...schedForm, total_contract_value: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Scheduled Amount *</Label><Input type="number" value={schedForm.scheduled_amount} onChange={e => setSchedForm({ ...schedForm, scheduled_amount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Period *</Label><Input value={schedForm.schedule_period} onChange={e => setSchedForm({ ...schedForm, schedule_period: e.target.value })} placeholder="e.g. 2026-04" /></div>
              <div><Label>Milestone</Label><Input value={schedForm.milestone_name} onChange={e => setSchedForm({ ...schedForm, milestone_name: e.target.value })} /></div>
            </div>
            <div><Label>Completion %</Label><Input type="number" value={schedForm.completion_percentage} onChange={e => setSchedForm({ ...schedForm, completion_percentage: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setScheduleDialog(false)}>Cancel</Button><Button onClick={() => createSchedule.mutate(schedForm)} disabled={!schedForm.scheduled_amount || !schedForm.schedule_period}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Dialog */}
      <Dialog open={mappingDialog} onOpenChange={setMappingDialog}>
        <DialogContent><DialogHeader><DialogTitle>Map Contract to Recognition Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Document #</Label><Input value={mapForm.document_number} onChange={e => setMapForm({ ...mapForm, document_number: e.target.value })} /></div>
              <div><Label>Customer</Label><Input value={mapForm.customer_name} onChange={e => setMapForm({ ...mapForm, customer_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contract Value</Label><Input type="number" value={mapForm.contract_value} onChange={e => setMapForm({ ...mapForm, contract_value: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Method</Label><Select value={mapForm.recognition_method} onValueChange={v => setMapForm({ ...mapForm, recognition_method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{methodLabel(m)}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={mapForm.start_date} onChange={e => setMapForm({ ...mapForm, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={mapForm.end_date} onChange={e => setMapForm({ ...mapForm, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Retention %</Label><Input type="number" value={mapForm.retention_percentage} onChange={e => setMapForm({ ...mapForm, retention_percentage: parseFloat(e.target.value) || 0 })} /></div>
            {rules.length > 0 && <div><Label>Link to Rule</Label><Select value={mapForm.rule_id} onValueChange={v => setMapForm({ ...mapForm, rule_id: v })}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{rules.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.rule_name}</SelectItem>)}</SelectContent></Select></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMappingDialog(false)}>Cancel</Button><Button onClick={() => createMapping.mutate(mapForm)} disabled={!mapForm.document_number}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
