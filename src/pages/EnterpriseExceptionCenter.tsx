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
import { AlertOctagon, Plus, CheckCircle2, Search, UserPlus, Clock, TrendingUp, Shield, BookOpen, BarChart3, Bell, ArrowUpRight, Timer } from 'lucide-react';
import { format, differenceInHours, isPast, addHours } from 'date-fns';

const MODULES = ['sync','master_data','approvals','posting','inventory','payroll','billing','procurement','finance','hr','projects','compliance','maintenance','delivery','integration'];
const SEVERITIES = ['critical','high','medium','low'];
const ROOT_CAUSES = ['data_quality','system_error','configuration','user_error','integration','business_rule','process_gap','unknown'];
const EXCEPTION_TYPES = ['overdue_approval','blocked_invoice','unmatched_bank','margin_erosion','stock_out_risk','delayed_delivery','attendance_anomaly','overdue_maintenance','compliance_expiry','subcontract_billing_delay','failed_integration','missing_data','posting_error'];

export default function EnterpriseExceptionCenter() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [filterModule, setFilterModule] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [assignDialog, setAssignDialog] = useState<any>(null);
  const [assignName, setAssignName] = useState('');
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [playbookDialog, setPlaybookDialog] = useState(false);
  const [escalationDialog, setEscalationDialog] = useState(false);

  // Fetch exceptions
  const { data: exceptions = [] } = useQuery({
    queryKey: ['enterprise-exceptions', activeCompanyId, filterModule, filterSeverity, filterStatus],
    queryFn: async () => {
      let q = (supabase.from('erp_exceptions' as any).select('*') as any).order('created_at', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filterModule !== 'all') q = q.eq('module', filterModule);
      if (filterSeverity !== 'all') q = q.eq('severity', filterSeverity);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  // Fetch escalation rules
  const { data: escalationRules = [] } = useQuery({
    queryKey: ['escalation-rules', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('exception_escalation_rules' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  // Fetch playbooks
  const { data: playbooks = [] } = useQuery({
    queryKey: ['exception-playbooks', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('exception_playbooks' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  // Fetch SLA configs
  const { data: slaConfigs = [] } = useQuery({
    queryKey: ['exception-sla-configs', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('exception_sla_configs' as any).select('*') as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const [form, setForm] = useState({ module: '', exception_type: '', severity: 'medium', title: '', description: '', source_document_number: '', root_cause_category: '' });

  const createException = useMutation({
    mutationFn: async (data: any) => {
      const sla = slaConfigs.find((s: any) => s.severity === data.severity && (!s.module || s.module === data.module));
      const sla_due_at = sla ? addHours(new Date(), sla.target_resolution_hours).toISOString() : null;
      await (supabase.from('erp_exceptions' as any).insert({ ...data, company_id: activeCompanyId, created_by: user?.id, sla_due_at }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enterprise-exceptions'] }); setCreateDialog(false); toast({ title: 'Exception Logged' }); },
  });

  const resolveException = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      await (supabase.from('erp_exceptions' as any).update({ status: 'resolved', resolution_notes: notes, resolved_by: user?.id, resolved_at: new Date().toISOString() }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enterprise-exceptions'] }); setResolveDialog(null); toast({ title: 'Resolved' }); },
  });

  const assignException = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await (supabase.from('erp_exceptions' as any).update({ owner_name: name, owner_id: user?.id, assigned_at: new Date().toISOString(), status: 'investigating' }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enterprise-exceptions'] }); setAssignDialog(null); toast({ title: 'Assigned' }); },
  });

  const escalateException = useMutation({
    mutationFn: async (id: string) => {
      const exc = exceptions.find((e: any) => e.id === id);
      await (supabase.from('erp_exceptions' as any).update({ escalation_level: (exc?.escalation_level || 0) + 1, escalated_at: new Date().toISOString(), status: 'escalated' }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enterprise-exceptions'] }); toast({ title: 'Escalated' }); },
  });

  // Playbook CRUD
  const [pbForm, setPbForm] = useState({ title: '', exception_type: '', module: '', severity: '', steps: '', estimated_resolution_minutes: 30 });
  const createPlaybook = useMutation({
    mutationFn: async (data: any) => {
      const steps = data.steps.split('\n').filter(Boolean).map((s: string, i: number) => ({ step: i + 1, instruction: s.trim() }));
      await (supabase.from('exception_playbooks' as any).insert({ ...data, steps: JSON.stringify(steps), company_id: activeCompanyId, created_by: user?.id }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exception-playbooks'] }); setPlaybookDialog(false); toast({ title: 'Playbook Created' }); },
  });

  // Escalation rule CRUD
  const [erForm, setErForm] = useState({ rule_name: '', severity: 'high', module: '', time_limit_hours: 24, escalation_target_role: '' });
  const createEscalationRule = useMutation({
    mutationFn: async (data: any) => {
      await (supabase.from('exception_escalation_rules' as any).insert({ ...data, company_id: activeCompanyId, created_by: user?.id }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escalation-rules'] }); setEscalationDialog(false); toast({ title: 'Rule Created' }); },
  });

  const filtered = exceptions.filter((e: any) => !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase()));

  // Analytics
  const stats = useMemo(() => {
    const open = exceptions.filter((e: any) => e.status === 'open' || e.status === 'investigating' || e.status === 'escalated');
    const critical = open.filter((e: any) => e.severity === 'critical');
    const breached = open.filter((e: any) => e.sla_due_at && isPast(new Date(e.sla_due_at)));
    const byModule: Record<string, number> = {};
    const byRootCause: Record<string, number> = {};
    const byType: Record<string, number> = {};
    exceptions.forEach((e: any) => {
      byModule[e.module] = (byModule[e.module] || 0) + 1;
      if (e.root_cause_category) byRootCause[e.root_cause_category] = (byRootCause[e.root_cause_category] || 0) + 1;
      if (e.exception_type) byType[e.exception_type] = (byType[e.exception_type] || 0) + 1;
    });
    return { open: open.length, critical: critical.length, breached: breached.length, resolved: exceptions.filter((e: any) => e.status === 'resolved').length, byModule, byRootCause, byType };
  }, [exceptions]);

  const sevColor = (s: string) => s === 'critical' ? 'destructive' : s === 'high' ? 'destructive' : s === 'medium' ? 'secondary' : 'outline';
  const statusColor = (s: string) => s === 'open' ? 'destructive' : s === 'escalated' ? 'destructive' : s === 'investigating' ? 'secondary' : s === 'resolved' ? 'default' : 'outline';

  const getSlaStatus = (e: any) => {
    if (!e.sla_due_at) return null;
    const due = new Date(e.sla_due_at);
    if (e.status === 'resolved') return <Badge variant="default" className="text-[10px]">Met</Badge>;
    if (isPast(due)) return <Badge variant="destructive" className="text-[10px]">Breached</Badge>;
    const hrs = differenceInHours(due, new Date());
    if (hrs <= 4) return <Badge variant="secondary" className="text-[10px]">Due {hrs}h</Badge>;
    return <Badge variant="outline" className="text-[10px]">{hrs}h left</Badge>;
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><AlertOctagon className="h-6 w-6 text-destructive" /> Enterprise Exception Center</h1>
          <p className="text-muted-foreground text-sm">Consolidated triage workspace for all operational issues</p>
        </div>
        <Button onClick={() => setCreateDialog(true)}><Plus className="h-4 w-4 mr-2" /> Log Exception</Button>
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="queue" className="gap-1.5"><AlertOctagon className="h-3.5 w-3.5" /> Exception Queue</TabsTrigger>
          <TabsTrigger value="severity" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Severity Dashboard</TabsTrigger>
          <TabsTrigger value="sla" className="gap-1.5"><Timer className="h-3.5 w-3.5" /> SLA Tracker</TabsTrigger>
          <TabsTrigger value="rootcause" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Root Causes</TabsTrigger>
          <TabsTrigger value="escalation" className="gap-1.5"><ArrowUpRight className="h-3.5 w-3.5" /> Escalation Rules</TabsTrigger>
          <TabsTrigger value="digest" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Executive Digest</TabsTrigger>
          <TabsTrigger value="playbooks" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Playbooks</TabsTrigger>
        </TabsList>

        {/* ── Exception Queue ── */}
        <TabsContent value="queue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Open</div><div className="text-2xl font-bold">{stats.open}</div></CardContent></Card>
            <Card className="border-destructive"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Critical</div><div className="text-2xl font-bold text-destructive">{stats.critical}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">SLA Breached</div><div className="text-2xl font-bold text-orange-600">{stats.breached}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Resolved</div><div className="text-2xl font-bold text-green-600">{stats.resolved}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{exceptions.length}</div></CardContent></Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search exceptions..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={filterModule} onValueChange={setFilterModule}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Modules</SelectItem>{MODULES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent></Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Severity</SelectItem>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="escalated">Escalated</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent></Select>
          </div>

          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Severity</TableHead><TableHead>Module</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Owner</TableHead><TableHead>SLA</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((e: any) => (
                  <TableRow key={e.id} className="cursor-pointer" onDoubleClick={() => setDetailDialog(e)}>
                    <TableCell><Badge variant={sevColor(e.severity) as any}>{e.severity}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{e.module?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><p className="font-medium text-sm truncate max-w-[250px]">{e.title}</p></TableCell>
                    <TableCell className="text-xs">{e.exception_type?.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-xs">{e.owner_name || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell>{getSlaStatus(e)}</TableCell>
                    <TableCell><Badge variant={statusColor(e.status) as any}>{e.status}</Badge></TableCell>
                    <TableCell className="text-xs">{e.created_at ? format(new Date(e.created_at), 'MMM dd') : ''}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(e.status === 'open' || e.status === 'investigating') && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setAssignDialog(e); setAssignName(e.owner_name || ''); }}><UserPlus className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setResolveDialog(e); setResolveNotes(''); }}><CheckCircle2 className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => escalateException.mutate(e.id)}><ArrowUpRight className="h-3 w-3" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No exceptions found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Severity Dashboard ── */}
        <TabsContent value="severity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-sm">By Module</CardTitle></CardHeader><CardContent>
              {Object.entries(stats.byModule).sort(([,a],[,b]) => b - a).map(([mod, cnt]) => (
                <div key={mod} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm capitalize">{mod.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2"><Progress value={(cnt / Math.max(exceptions.length, 1)) * 100} className="w-24 h-2" /><span className="text-sm font-bold w-8 text-right">{cnt}</span></div>
                </div>
              ))}
              {Object.keys(stats.byModule).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No data</p>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">By Severity</CardTitle></CardHeader><CardContent>
              {SEVERITIES.map(sev => {
                const cnt = exceptions.filter((e: any) => e.severity === sev).length;
                return (
                  <div key={sev} className="flex items-center justify-between py-2 border-b last:border-0">
                    <Badge variant={sevColor(sev) as any}>{sev}</Badge>
                    <div className="flex items-center gap-2"><Progress value={(cnt / Math.max(exceptions.length, 1)) * 100} className="w-24 h-2" /><span className="text-sm font-bold w-8 text-right">{cnt}</span></div>
                  </div>
                );
              })}
            </CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-sm">By Exception Type</CardTitle></CardHeader><CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.byType).sort(([,a],[,b]) => b - a).map(([typ, cnt]) => (
                <div key={typ} className="border rounded-lg p-3 text-center">
                  <div className="text-lg font-bold">{cnt}</div>
                  <div className="text-xs text-muted-foreground capitalize">{typ.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* ── SLA Tracker ── */}
        <TabsContent value="sla" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-destructive"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">SLA Breached</div><div className="text-3xl font-bold text-destructive">{stats.breached}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Within SLA</div><div className="text-3xl font-bold text-green-600">{exceptions.filter((e: any) => e.sla_due_at && !isPast(new Date(e.sla_due_at)) && e.status !== 'resolved').length}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">No SLA Set</div><div className="text-3xl font-bold text-muted-foreground">{exceptions.filter((e: any) => !e.sla_due_at && e.status !== 'resolved').length}</div></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-sm">SLA Configuration</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Severity</TableHead><TableHead>Module</TableHead><TableHead>Response (hrs)</TableHead><TableHead>Resolution (hrs)</TableHead></TableRow></TableHeader>
              <TableBody>
                {slaConfigs.map((s: any) => (
                  <TableRow key={s.id}><TableCell><Badge variant={sevColor(s.severity) as any}>{s.severity}</Badge></TableCell><TableCell>{s.module || 'All'}</TableCell><TableCell>{s.target_response_hours}h</TableCell><TableCell>{s.target_resolution_hours}h</TableCell></TableRow>
                ))}
                {slaConfigs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No SLA configs. Critical=4h, High=8h, Medium=24h, Low=72h recommended.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Breached Exceptions</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Module</TableHead><TableHead>Severity</TableHead><TableHead>Due</TableHead><TableHead>Overdue By</TableHead><TableHead>Owner</TableHead></TableRow></TableHeader>
              <TableBody>
                {exceptions.filter((e: any) => e.sla_due_at && isPast(new Date(e.sla_due_at)) && e.status !== 'resolved').map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm font-medium">{e.title}</TableCell>
                    <TableCell><Badge variant="outline">{e.module}</Badge></TableCell>
                    <TableCell><Badge variant={sevColor(e.severity) as any}>{e.severity}</Badge></TableCell>
                    <TableCell className="text-xs">{format(new Date(e.sla_due_at), 'MMM dd HH:mm')}</TableCell>
                    <TableCell className="text-xs text-destructive font-bold">{differenceInHours(new Date(), new Date(e.sla_due_at))}h</TableCell>
                    <TableCell className="text-xs">{e.owner_name || 'Unassigned'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Recurring Root Causes ── */}
        <TabsContent value="rootcause" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-sm">Root Cause Distribution</CardTitle></CardHeader><CardContent>
              {Object.entries(stats.byRootCause).sort(([,a],[,b]) => b - a).map(([rc, cnt]) => (
                <div key={rc} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm capitalize">{rc.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2"><Progress value={(cnt / Math.max(exceptions.length, 1)) * 100} className="w-32 h-2" /><span className="font-bold text-sm w-8 text-right">{cnt}</span></div>
                </div>
              ))}
              {Object.keys(stats.byRootCause).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No root causes tagged yet</p>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Recurring Patterns</CardTitle></CardHeader><CardContent>
              {exceptions.filter((e: any) => (e.recurrence_count || 0) > 1).length > 0 ? exceptions.filter((e: any) => (e.recurrence_count || 0) > 1).sort((a: any, b: any) => b.recurrence_count - a.recurrence_count).slice(0, 10).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div><p className="text-sm font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{e.module} · {e.root_cause_category?.replace(/_/g, ' ')}</p></div>
                  <Badge variant="destructive">{e.recurrence_count}x</Badge>
                </div>
              )) : <p className="text-sm text-muted-foreground py-4 text-center">No recurring exceptions detected</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        {/* ── Escalation Rules ── */}
        <TabsContent value="escalation" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setEscalationDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Rule</Button></div>
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Rule Name</TableHead><TableHead>Severity</TableHead><TableHead>Module</TableHead><TableHead>Time Limit</TableHead><TableHead>Target Role</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>
                {escalationRules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.rule_name}</TableCell>
                    <TableCell><Badge variant={sevColor(r.severity) as any}>{r.severity}</Badge></TableCell>
                    <TableCell>{r.module || 'All'}</TableCell>
                    <TableCell>{r.time_limit_hours}h</TableCell>
                    <TableCell>{r.escalation_target_role || '-'}</TableCell>
                    <TableCell><Badge variant={r.is_active ? 'default' : 'outline'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  </TableRow>
                ))}
                {escalationRules.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No escalation rules configured</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Executive Digest ── */}
        <TabsContent value="digest" className="space-y-4">
          <Card><CardHeader><CardTitle>Weekly Executive Digest</CardTitle></CardHeader><CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4 text-center"><div className="text-3xl font-bold">{stats.open}</div><div className="text-xs text-muted-foreground">Open Issues</div></div>
              <div className="border rounded-lg p-4 text-center border-destructive"><div className="text-3xl font-bold text-destructive">{stats.critical}</div><div className="text-xs text-muted-foreground">Critical</div></div>
              <div className="border rounded-lg p-4 text-center"><div className="text-3xl font-bold text-orange-600">{stats.breached}</div><div className="text-xs text-muted-foreground">SLA Breached</div></div>
              <div className="border rounded-lg p-4 text-center"><div className="text-3xl font-bold text-green-600">{stats.resolved}</div><div className="text-xs text-muted-foreground">Resolved</div></div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Top Issues by Module</h3>
              {Object.entries(stats.byModule).sort(([,a],[,b]) => b - a).slice(0, 5).map(([mod, cnt]) => (
                <div key={mod} className="flex items-center justify-between py-1.5">
                  <span className="text-sm capitalize">{mod.replace(/_/g, ' ')}</span>
                  <span className="font-bold">{cnt}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Top Root Causes</h3>
              {Object.entries(stats.byRootCause).sort(([,a],[,b]) => b - a).slice(0, 5).map(([rc, cnt]) => (
                <div key={rc} className="flex items-center justify-between py-1.5">
                  <span className="text-sm capitalize">{rc.replace(/_/g, ' ')}</span>
                  <span className="font-bold">{cnt}</span>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* ── Resolution Playbooks ── */}
        <TabsContent value="playbooks" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setPlaybookDialog(true)}><Plus className="h-4 w-4 mr-2" /> Create Playbook</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playbooks.map((pb: any) => {
              let steps: any[] = [];
              try { steps = typeof pb.steps === 'string' ? JSON.parse(pb.steps) : (pb.steps || []); } catch { steps = []; }
              return (
                <Card key={pb.id}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{pb.title}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      <Badge variant="outline">{pb.exception_type?.replace(/_/g, ' ')}</Badge>
                      {pb.module && <Badge variant="outline">{pb.module}</Badge>}
                      {pb.severity && <Badge variant={sevColor(pb.severity) as any}>{pb.severity}</Badge>}
                    </div>
                    <div className="space-y-1">
                      {steps.slice(0, 5).map((s: any, i: number) => (
                        <div key={i} className="flex gap-2 text-xs"><span className="text-muted-foreground font-mono w-5">{s.step || i + 1}.</span><span>{s.instruction}</span></div>
                      ))}
                      {steps.length > 5 && <p className="text-xs text-muted-foreground">+{steps.length - 5} more steps</p>}
                    </div>
                    {pb.estimated_resolution_minutes && <p className="text-xs text-muted-foreground mt-2"><Clock className="h-3 w-3 inline mr-1" />Est. {pb.estimated_resolution_minutes} min</p>}
                  </CardContent>
                </Card>
              );
            })}
            {playbooks.length === 0 && <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">No playbooks created yet</CardContent></Card>}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Create Dialog ── */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Log Exception</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Module *</Label><Select value={form.module} onValueChange={v => setForm({ ...form, module: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Severity</Label><Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Exception Type</Label><Select value={form.exception_type} onValueChange={v => setForm({ ...form, exception_type: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{EXCEPTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Source Document #</Label><Input value={form.source_document_number} onChange={e => setForm({ ...form, source_document_number: e.target.value })} /></div>
            <div><Label>Root Cause</Label><Select value={form.root_cause_category} onValueChange={v => setForm({ ...form, root_cause_category: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{ROOT_CAUSES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button><Button onClick={() => createException.mutate(form)} disabled={!form.title || !form.module}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Resolve Dialog ── */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Exception</DialogTitle></DialogHeader>
          <p className="text-sm font-medium">{resolveDialog?.title}</p>
          <div><Label>Resolution Notes</Label><Textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} placeholder="Describe resolution" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setResolveDialog(null)}>Cancel</Button><Button onClick={() => resolveException.mutate({ id: resolveDialog.id, notes: resolveNotes })}>Resolve</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Dialog ── */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Exception</DialogTitle></DialogHeader>
          <p className="text-sm">{assignDialog?.title}</p>
          <div><Label>Assign To</Label><Input value={assignName} onChange={e => setAssignName(e.target.value)} placeholder="Owner name" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button><Button onClick={() => assignException.mutate({ id: assignDialog.id, name: assignName })} disabled={!assignName}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detailDialog?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2"><Badge variant={sevColor(detailDialog?.severity) as any}>{detailDialog?.severity}</Badge><Badge variant="outline">{detailDialog?.module}</Badge><Badge variant={statusColor(detailDialog?.status) as any}>{detailDialog?.status}</Badge></div>
            {detailDialog?.description && <p className="text-muted-foreground">{detailDialog.description}</p>}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Type:</span> {detailDialog?.exception_type?.replace(/_/g, ' ')}</div>
              <div><span className="text-muted-foreground">Document:</span> {detailDialog?.source_document_number || '-'}</div>
              <div><span className="text-muted-foreground">Owner:</span> {detailDialog?.owner_name || 'Unassigned'}</div>
              <div><span className="text-muted-foreground">Root Cause:</span> {detailDialog?.root_cause_category?.replace(/_/g, ' ') || '-'}</div>
              <div><span className="text-muted-foreground">Escalation Level:</span> {detailDialog?.escalation_level || 0}</div>
              <div><span className="text-muted-foreground">Recurrence:</span> {detailDialog?.recurrence_count || 0}x</div>
              <div><span className="text-muted-foreground">Created:</span> {detailDialog?.created_at ? format(new Date(detailDialog.created_at), 'yyyy-MM-dd HH:mm') : ''}</div>
              <div><span className="text-muted-foreground">SLA Due:</span> {detailDialog?.sla_due_at ? format(new Date(detailDialog.sla_due_at), 'yyyy-MM-dd HH:mm') : 'Not set'}</div>
            </div>
            {detailDialog?.resolution_notes && <div><span className="text-muted-foreground text-xs">Resolution:</span><p className="text-sm mt-1">{detailDialog.resolution_notes}</p></div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Playbook Dialog ── */}
      <Dialog open={playbookDialog} onOpenChange={setPlaybookDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Resolution Playbook</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={pbForm.title} onChange={e => setPbForm({ ...pbForm, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Exception Type</Label><Select value={pbForm.exception_type} onValueChange={v => setPbForm({ ...pbForm, exception_type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{EXCEPTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Module</Label><Select value={pbForm.module} onValueChange={v => setPbForm({ ...pbForm, module: v })}><SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger><SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Steps (one per line)</Label><Textarea rows={6} value={pbForm.steps} onChange={e => setPbForm({ ...pbForm, steps: e.target.value })} placeholder="1. Check the source document&#10;2. Verify data quality&#10;3. Apply correction" /></div>
            <div><Label>Est. Resolution (minutes)</Label><Input type="number" value={pbForm.estimated_resolution_minutes} onChange={e => setPbForm({ ...pbForm, estimated_resolution_minutes: parseInt(e.target.value) || 30 })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPlaybookDialog(false)}>Cancel</Button><Button onClick={() => createPlaybook.mutate(pbForm)} disabled={!pbForm.title || !pbForm.exception_type}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Escalation Rule Dialog ── */}
      <Dialog open={escalationDialog} onOpenChange={setEscalationDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Escalation Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Rule Name *</Label><Input value={erForm.rule_name} onChange={e => setErForm({ ...erForm, rule_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Severity</Label><Select value={erForm.severity} onValueChange={v => setErForm({ ...erForm, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Module</Label><Select value={erForm.module} onValueChange={v => setErForm({ ...erForm, module: v })}><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Time Limit (hours)</Label><Input type="number" value={erForm.time_limit_hours} onChange={e => setErForm({ ...erForm, time_limit_hours: parseInt(e.target.value) || 24 })} /></div>
            <div><Label>Escalation Target Role</Label><Input value={erForm.escalation_target_role} onChange={e => setErForm({ ...erForm, escalation_target_role: e.target.value })} placeholder="e.g. CFO, COO, Department Head" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEscalationDialog(false)}>Cancel</Button><Button onClick={() => createEscalationRule.mutate(erForm)} disabled={!erForm.rule_name}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
