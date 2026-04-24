import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  ShieldCheck, Users, Package, Building2, FolderKanban, AlertTriangle,
  Plus, CheckCircle2, XCircle, Search, Clock, UserCheck, Settings,
  FileText, Lock, Unlock, BarChart3, Edit, Trash2, Eye
} from 'lucide-react';

const ENTITY_TYPES = [
  { key: 'customer', label: 'Customers', icon: Users },
  { key: 'vendor', label: 'Vendors', icon: Building2 },
  { key: 'item', label: 'Items', icon: Package },
  { key: 'employee', label: 'Employees', icon: Users },
  { key: 'project', label: 'Projects', icon: FolderKanban },
  { key: 'asset', label: 'Assets', icon: Settings },
  { key: 'coa', label: 'Chart of Accounts', icon: BarChart3 },
];

const fmt = (n: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(n);

export default function MasterDataGovernanceCenter() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [crDialog, setCrDialog] = useState(false);
  const [stewardDialog, setStewardDialog] = useState(false);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [blockDialog, setBlockDialog] = useState(false);

  // Forms
  const [crForm, setCrForm] = useState({ entity_type: 'customer', entity_name: '', change_type: 'update', justification: '', impact_analysis: '', field_changes: '[]', priority: 'normal' });
  const [stewardForm, setStewardForm] = useState({ entity_type: 'customer', steward_name: '', steward_email: '', is_primary: false });
  const [ruleForm, setRuleForm] = useState({ entity_type: 'customer', rule_name: '', rule_type: 'mandatory_field', field_name: '', validation_pattern: '', error_message: '', severity: 'warning' });
  const [blockForm, setBlockForm] = useState({ entity_type: 'customer', entity_name: '', entity_id: '', block_reason: '' });

  // Queries
  const { data: changeRequests = [] } = useQuery({
    queryKey: ['mdg-cr', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('mdg_change_requests' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: stewards = [] } = useQuery({
    queryKey: ['mdg-stewards', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('mdg_stewards' as any).select('*').order('entity_type') as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['mdg-rules', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('mdg_quality_rules' as any).select('*').order('entity_type') as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: blockedRecords = [] } = useQuery({
    queryKey: ['mdg-blocked', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('mdg_blocked_records' as any).select('*').eq('is_blocked', true).order('blocked_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  // Mutations
  const addCR = useMutation({
    mutationFn: async (cr: any) => {
      const { error } = await (supabase.from('mdg_change_requests' as any).insert(cr) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mdg-cr'] }); setCrDialog(false); toast({ title: 'Change request submitted' }); },
  });

  const updateCR = useMutation({
    mutationFn: async ({ id, status, review_notes }: any) => {
      const { error } = await (supabase.from('mdg_change_requests' as any).update({ status, review_notes, reviewed_at: new Date().toISOString(), reviewer_id: user?.id, reviewer_name: profile?.full_name }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mdg-cr'] }); toast({ title: 'Change request updated' }); },
  });

  const addSteward = useMutation({
    mutationFn: async (s: any) => {
      const { error } = await (supabase.from('mdg_stewards' as any).insert(s) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mdg-stewards'] }); setStewardDialog(false); toast({ title: 'Steward assigned' }); },
  });

  const addRule = useMutation({
    mutationFn: async (r: any) => {
      const { error } = await (supabase.from('mdg_quality_rules' as any).insert(r) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mdg-rules'] }); setRuleDialog(false); toast({ title: 'Rule created' }); },
  });

  const addBlock = useMutation({
    mutationFn: async (b: any) => {
      const { error } = await (supabase.from('mdg_blocked_records' as any).insert(b) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mdg-blocked'] }); setBlockDialog(false); toast({ title: 'Record blocked' }); },
  });

  const unblock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('mdg_blocked_records' as any).update({ is_blocked: false, unblocked_by: user?.id, unblocked_by_name: profile?.full_name, unblocked_at: new Date().toISOString() }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mdg-blocked'] }); toast({ title: 'Record unblocked' }); },
  });

  // Computed
  const pendingCRs = changeRequests.filter((cr: any) => cr.status === 'pending');
  const approvedCRs = changeRequests.filter((cr: any) => cr.status === 'approved');
  const rejectedCRs = changeRequests.filter((cr: any) => cr.status === 'rejected');

  const stewardWorkload = useMemo(() => {
    const load: Record<string, { name: string; entities: string[]; pendingCRs: number }> = {};
    stewards.forEach((s: any) => {
      if (!load[s.steward_name]) load[s.steward_name] = { name: s.steward_name, entities: [], pendingCRs: 0 };
      load[s.steward_name].entities.push(s.entity_type);
    });
    pendingCRs.forEach((cr: any) => {
      const steward = stewards.find((s: any) => s.entity_type === cr.entity_type && s.is_primary);
      if (steward && load[steward.steward_name]) load[steward.steward_name].pendingCRs++;
    });
    return Object.values(load);
  }, [stewards, pendingCRs]);

  const entityStats = useMemo(() => {
    return ENTITY_TYPES.map(et => ({
      ...et,
      rules: rules.filter((r: any) => r.entity_type === et.key).length,
      stewards: stewards.filter((s: any) => s.entity_type === et.key).length,
      pendingCRs: pendingCRs.filter((cr: any) => cr.entity_type === et.key).length,
      blocked: blockedRecords.filter((b: any) => b.entity_type === et.key).length,
    }));
  }, [rules, stewards, pendingCRs, blockedRecords]);

  const filteredCRs = entityFilter === 'all' ? changeRequests : changeRequests.filter((cr: any) => cr.entity_type === entityFilter);

  const statusColor = (s: string) => s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : s === 'pending' ? 'secondary' : 'outline';
  const severityColor = (s: string) => s === 'error' ? 'destructive' : s === 'warning' ? 'default' : 'secondary';

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Master Data Governance Center</h1>
        <p className="text-sm text-muted-foreground">Enforce data quality, manage changes, and maintain master data integrity</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
          <div className="text-lg font-bold">{pendingCRs.length}</div>
          <div className="text-xs text-muted-foreground">Pending Changes</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
          <div className="text-lg font-bold">{approvedCRs.length}</div>
          <div className="text-xs text-muted-foreground">Approved This Month</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
          <div className="text-lg font-bold">{rejectedCRs.length}</div>
          <div className="text-xs text-muted-foreground">Rejected</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Lock className="h-5 w-5 mx-auto text-orange-500 mb-1" />
          <div className="text-lg font-bold">{blockedRecords.length}</div>
          <div className="text-xs text-muted-foreground">Blocked Records</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Settings className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <div className="text-lg font-bold">{rules.filter((r: any) => r.is_active).length}</div>
          <div className="text-xs text-muted-foreground">Active Rules</div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="changes">Pending Changes</TabsTrigger>
          <TabsTrigger value="stewards">Steward Workload</TabsTrigger>
          <TabsTrigger value="blocked">Blocked Records</TabsTrigger>
          <TabsTrigger value="rules">Rule Configuration</TabsTrigger>
          <TabsTrigger value="scorecards">Data Quality</TabsTrigger>
          <TabsTrigger value="history">Audit History</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {entityStats.map(es => {
              const Icon = es.icon;
              return (
                <Card key={es.key}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><span className="font-semibold">{es.label}</span></div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1"><Settings className="h-3 w-3" /> {es.rules} Rules</div>
                      <div className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {es.stewards} Stewards</div>
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" /> {es.pendingCRs} Pending</div>
                      <div className="flex items-center gap-1"><Lock className="h-3 w-3 text-red-500" /> {es.blocked} Blocked</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* PENDING CHANGES */}
        <TabsContent value="changes" className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Entities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {ENTITY_TYPES.map(et => <SelectItem key={et.key} value={et.key}>{et.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setCrDialog(true)}><Plus className="h-4 w-4 mr-1" /> New Change Request</Button>
          </div>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Entity</TableHead><TableHead>Name</TableHead><TableHead>Change Type</TableHead>
                <TableHead>Requester</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredCRs.map((cr: any) => (
                  <TableRow key={cr.id}>
                    <TableCell><Badge variant="outline">{cr.entity_type}</Badge></TableCell>
                    <TableCell className="font-medium">{cr.entity_name}</TableCell>
                    <TableCell>{cr.change_type}</TableCell>
                    <TableCell>{cr.requester_name}</TableCell>
                    <TableCell><Badge variant={cr.priority === 'high' ? 'destructive' : cr.priority === 'normal' ? 'secondary' : 'outline'}>{cr.priority}</Badge></TableCell>
                    <TableCell><Badge variant={statusColor(cr.status) as any}>{cr.status}</Badge></TableCell>
                    <TableCell>
                      {cr.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => updateCR.mutate({ id: cr.id, status: 'approved' })}><CheckCircle2 className="h-3 w-3 mr-1" /> Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateCR.mutate({ id: cr.id, status: 'rejected', review_notes: 'Rejected by reviewer' })}><XCircle className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCRs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No change requests</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* STEWARD WORKLOAD */}
        <TabsContent value="stewards" className="space-y-3">
          <div className="flex justify-between"><h3 className="font-semibold">Data Stewards</h3><Button size="sm" onClick={() => setStewardDialog(true)}><Plus className="h-4 w-4 mr-1" /> Assign Steward</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stewardWorkload.map(sw => (
              <Card key={sw.name}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /><span className="font-semibold">{sw.name}</span></div>
                  <div className="flex flex-wrap gap-1">{sw.entities.map(e => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}</div>
                  <div className="text-sm"><Clock className="h-3 w-3 inline mr-1" />{sw.pendingCRs} pending reviews</div>
                </CardContent>
              </Card>
            ))}
            {stewardWorkload.length === 0 && <div className="col-span-3 text-center text-muted-foreground py-8">No stewards assigned</div>}
          </div>
          <h4 className="font-semibold mt-4">All Steward Assignments</h4>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Entity Type</TableHead><TableHead>Steward</TableHead><TableHead>Email</TableHead><TableHead>Primary</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>
                {stewards.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell><Badge variant="outline">{s.entity_type}</Badge></TableCell>
                    <TableCell className="font-medium">{s.steward_name}</TableCell>
                    <TableCell>{s.steward_email || '-'}</TableCell>
                    <TableCell>{s.is_primary ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : '-'}</TableCell>
                    <TableCell>{s.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* BLOCKED RECORDS */}
        <TabsContent value="blocked" className="space-y-3">
          <div className="flex justify-between"><h3 className="font-semibold">Blocked Records</h3><Button size="sm" onClick={() => setBlockDialog(true)}><Plus className="h-4 w-4 mr-1" /> Block Record</Button></div>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Entity Type</TableHead><TableHead>Name</TableHead><TableHead>Reason</TableHead>
                <TableHead>Blocked By</TableHead><TableHead>Blocked At</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {blockedRecords.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell><Badge variant="outline">{b.entity_type}</Badge></TableCell>
                    <TableCell className="font-medium">{b.entity_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{b.block_reason}</TableCell>
                    <TableCell>{b.blocked_by_name}</TableCell>
                    <TableCell className="text-sm">{b.blocked_at ? new Date(b.blocked_at).toLocaleDateString() : ''}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => unblock.mutate(b.id)}><Unlock className="h-3 w-3 mr-1" /> Unblock</Button></TableCell>
                  </TableRow>
                ))}
                {blockedRecords.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No blocked records</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* RULE CONFIGURATION */}
        <TabsContent value="rules" className="space-y-3">
          <div className="flex justify-between"><h3 className="font-semibold">Quality Rules</h3><Button size="sm" onClick={() => setRuleDialog(true)}><Plus className="h-4 w-4 mr-1" /> Add Rule</Button></div>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Entity</TableHead><TableHead>Rule Name</TableHead><TableHead>Type</TableHead>
                <TableHead>Field</TableHead><TableHead>Severity</TableHead><TableHead>Active</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.entity_type}</Badge></TableCell>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell>{r.rule_type}</TableCell>
                    <TableCell>{r.field_name || '-'}</TableCell>
                    <TableCell><Badge variant={severityColor(r.severity) as any}>{r.severity}</Badge></TableCell>
                    <TableCell>{r.is_active ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No rules configured</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* DATA QUALITY SCORECARDS */}
        <TabsContent value="scorecards" className="space-y-3">
          <h3 className="font-semibold">Data Quality Scorecards</h3>
          <p className="text-sm text-muted-foreground">For detailed data quality analysis including duplicate detection and format validation, visit the <a href="/data-quality" className="text-primary underline">Data Quality Center</a>.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {entityStats.map(es => {
              const Icon = es.icon;
              const score = es.rules > 0 ? Math.min(100, Math.round((1 - (es.blocked / Math.max(1, es.rules * 10))) * 100)) : 85;
              return (
                <Card key={es.key}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><span className="font-semibold">{es.label}</span></div><span className={`text-xl font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{score}%</span></div>
                    <Progress value={score} className="h-2" />
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <div>{es.rules} quality rules</div>
                      <div>{es.blocked} blocked</div>
                      <div>{es.pendingCRs} pending changes</div>
                      <div>{es.stewards} stewards</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* AUDIT HISTORY */}
        <TabsContent value="history" className="space-y-3">
          <h3 className="font-semibold">Change Request History</h3>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Entity</TableHead><TableHead>Name</TableHead>
                <TableHead>Type</TableHead><TableHead>Requester</TableHead><TableHead>Reviewer</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {changeRequests.filter((cr: any) => cr.status !== 'pending').map((cr: any) => (
                  <TableRow key={cr.id}>
                    <TableCell className="text-sm">{cr.reviewed_at ? new Date(cr.reviewed_at).toLocaleDateString() : new Date(cr.created_at).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="outline">{cr.entity_type}</Badge></TableCell>
                    <TableCell>{cr.entity_name}</TableCell>
                    <TableCell>{cr.change_type}</TableCell>
                    <TableCell>{cr.requester_name}</TableCell>
                    <TableCell>{cr.reviewer_name || '-'}</TableCell>
                    <TableCell><Badge variant={statusColor(cr.status) as any}>{cr.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* CHANGE REQUEST DIALOG */}
      <Dialog open={crDialog} onOpenChange={setCrDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Change Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Entity Type</Label>
              <Select value={crForm.entity_type} onValueChange={v => setCrForm(p => ({ ...p, entity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(et => <SelectItem key={et.key} value={et.key}>{et.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Record Name</Label><Input value={crForm.entity_name} onChange={e => setCrForm(p => ({ ...p, entity_name: e.target.value }))} /></div>
            <div><Label>Change Type</Label>
              <Select value={crForm.change_type} onValueChange={v => setCrForm(p => ({ ...p, change_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="create">Create</SelectItem><SelectItem value="update">Update</SelectItem><SelectItem value="delete">Delete</SelectItem><SelectItem value="merge">Merge</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Priority</Label>
              <Select value={crForm.priority} onValueChange={v => setCrForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Justification</Label><Textarea value={crForm.justification} onChange={e => setCrForm(p => ({ ...p, justification: e.target.value }))} /></div>
            <div><Label>Impact Analysis</Label><Textarea value={crForm.impact_analysis} onChange={e => setCrForm(p => ({ ...p, impact_analysis: e.target.value }))} placeholder="Describe the impact on related records..." /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => addCR.mutate({ ...crForm, company_id: activeCompanyId, requester_id: user?.id, requester_name: profile?.full_name })} disabled={addCR.isPending}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STEWARD DIALOG */}
      <Dialog open={stewardDialog} onOpenChange={setStewardDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Data Steward</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Entity Type</Label>
              <Select value={stewardForm.entity_type} onValueChange={v => setStewardForm(p => ({ ...p, entity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(et => <SelectItem key={et.key} value={et.key}>{et.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Steward Name</Label><Input value={stewardForm.steward_name} onChange={e => setStewardForm(p => ({ ...p, steward_name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={stewardForm.steward_email} onChange={e => setStewardForm(p => ({ ...p, steward_email: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={stewardForm.is_primary} onCheckedChange={v => setStewardForm(p => ({ ...p, is_primary: v }))} /><Label>Primary Steward</Label></div>
          </div>
          <DialogFooter>
            <Button onClick={() => addSteward.mutate({ ...stewardForm, company_id: activeCompanyId, steward_user_id: user?.id })} disabled={addSteward.isPending}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RULE DIALOG */}
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Quality Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Entity Type</Label>
              <Select value={ruleForm.entity_type} onValueChange={v => setRuleForm(p => ({ ...p, entity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(et => <SelectItem key={et.key} value={et.key}>{et.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Rule Name</Label><Input value={ruleForm.rule_name} onChange={e => setRuleForm(p => ({ ...p, rule_name: e.target.value }))} /></div>
            <div><Label>Rule Type</Label>
              <Select value={ruleForm.rule_type} onValueChange={v => setRuleForm(p => ({ ...p, rule_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="mandatory_field">Mandatory Field</SelectItem><SelectItem value="format_validation">Format Validation</SelectItem><SelectItem value="completeness">Completeness</SelectItem><SelectItem value="uniqueness">Uniqueness</SelectItem><SelectItem value="reference">Reference Integrity</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Field Name</Label><Input value={ruleForm.field_name} onChange={e => setRuleForm(p => ({ ...p, field_name: e.target.value }))} placeholder="e.g. email, phone, tax_id" /></div>
            <div><Label>Validation Pattern (regex)</Label><Input value={ruleForm.validation_pattern} onChange={e => setRuleForm(p => ({ ...p, validation_pattern: e.target.value }))} placeholder="e.g. ^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$" /></div>
            <div><Label>Error Message</Label><Input value={ruleForm.error_message} onChange={e => setRuleForm(p => ({ ...p, error_message: e.target.value }))} /></div>
            <div><Label>Severity</Label>
              <Select value={ruleForm.severity} onValueChange={v => setRuleForm(p => ({ ...p, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="error">Error (Blocking)</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addRule.mutate({ ...ruleForm, company_id: activeCompanyId })} disabled={addRule.isPending}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BLOCK RECORD DIALOG */}
      <Dialog open={blockDialog} onOpenChange={setBlockDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Block Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Entity Type</Label>
              <Select value={blockForm.entity_type} onValueChange={v => setBlockForm(p => ({ ...p, entity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(et => <SelectItem key={et.key} value={et.key}>{et.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Record Name</Label><Input value={blockForm.entity_name} onChange={e => setBlockForm(p => ({ ...p, entity_name: e.target.value }))} /></div>
            <div><Label>Block Reason</Label><Textarea value={blockForm.block_reason} onChange={e => setBlockForm(p => ({ ...p, block_reason: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => addBlock.mutate({ ...blockForm, entity_id: blockForm.entity_id || crypto.randomUUID(), company_id: activeCompanyId, blocked_by: user?.id, blocked_by_name: profile?.full_name })} disabled={addBlock.isPending}>Block</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
