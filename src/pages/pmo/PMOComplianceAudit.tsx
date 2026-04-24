import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Shield, FileText, Plus, CheckCircle2, XCircle, Clock, Search,
  AlertTriangle, History, Filter
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const RECORD_TYPES = ['change_log', 'approval', 'governance_review', 'compliance_check', 'policy_update', 'audit_finding'];
const COMPLIANCE_CATEGORIES = ['process', 'quality', 'regulatory', 'financial', 'safety', 'security'];
const STATUS_COLORS: Record<string, string> = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', in_review: '#3b82f6' };

export default function PMOComplianceAudit() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { profile } = useAuth();
  const { projects = [] } = useProjects();
  const [activeTab, setActiveTab] = useState('records');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', record_type: 'change_log', compliance_category: '', project_id: '', reference_number: '' });

  const { data: records = [] } = useQuery({
    queryKey: ['pmo-compliance', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pmo_compliance_records').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createRecord = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('pmo_compliance_records').insert({
        ...data,
        project_id: data.project_id || null,
        company_id: activeCompanyId,
        created_by: profile?.user_id,
        created_by_name: profile?.full_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-compliance'] });
      toast({ title: 'Record created' });
      setCreateDialog(false);
      setForm({ title: '', description: '', record_type: 'change_log', compliance_category: '', project_id: '', reference_number: '' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const approveRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pmo_compliance_records').update({
        approval_status: 'approved', approved_by: profile?.full_name, approved_by_id: profile?.user_id, approved_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-compliance'] });
      toast({ title: 'Record approved' });
    },
  });

  const rejectRecord = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.from('pmo_compliance_records').update({
        approval_status: 'rejected', approved_by: profile?.full_name, approved_by_id: profile?.user_id, approved_at: new Date().toISOString(), rejection_reason: reason,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-compliance'] });
      toast({ title: 'Record rejected' });
    },
  });

  const filtered = records.filter(r =>
    (typeFilter === 'all' || r.record_type === typeFilter) &&
    (r.title?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const pending = records.filter(r => r.approval_status === 'pending').length;
  const approved = records.filter(r => r.approval_status === 'approved').length;
  const rejected = records.filter(r => r.approval_status === 'rejected').length;

  const statusData = [
    { name: 'Pending', value: pending, fill: '#f59e0b' },
    { name: 'Approved', value: approved, fill: '#10b981' },
    { name: 'Rejected', value: rejected, fill: '#ef4444' },
  ].filter(d => d.value > 0);

  const typeData = RECORD_TYPES.map(t => ({ type: t.replace(/_/g, ' '), count: records.filter(r => r.record_type === t).length })).filter(d => d.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance & Audit Trail</h1>
          <p className="text-muted-foreground">Change logs, approval workflows, and audit-ready documentation</p>
        </div>
        <Button size="sm" onClick={() => setCreateDialog(true)}><Plus className="h-4 w-4 mr-1" /> New Record</Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Total Records</span></div>
          <p className="text-2xl font-bold">{records.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground">Pending Approval</span></div>
          <p className="text-2xl font-bold text-warning">{pending}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Approved</span></div>
          <p className="text-2xl font-bold text-green-600">{approved}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><XCircle className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Rejected</span></div>
          <p className="text-2xl font-bold text-destructive">{rejected}</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records"><FileText className="h-4 w-4 mr-1" /> Records</TabsTrigger>
          <TabsTrigger value="analytics"><Shield className="h-4 w-4 mr-1" /> Analytics</TabsTrigger>
          <TabsTrigger value="timeline"><History className="h-4 w-4 mr-1" /> Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" /></div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {RECORD_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell><Badge variant="outline">{r.record_type?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-xs">{r.compliance_category || '-'}</TableCell>
                      <TableCell className="text-xs">{projects.find(p => p.id === r.project_id)?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={r.approval_status === 'approved' ? 'default' : r.approval_status === 'rejected' ? 'destructive' : 'secondary'}>
                          {r.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.created_by_name || '-'}</TableCell>
                      <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {r.approval_status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => approveRecord.mutate(r.id)}><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => rejectRecord.mutate({ id: r.id, reason: 'Rejected by reviewer' })}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No compliance records found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Status Distribution</CardTitle></CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                        {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-12 text-sm">No data</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Records by Type</CardTitle></CardHeader>
              <CardContent>
                {typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={typeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" fontSize={10} angle={-20} textAnchor="end" height={50} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-12 text-sm">No data</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {records.slice(0, 30).map(r => (
                  <div key={r.id} className="flex gap-3 p-3 rounded border">
                    <div className="mt-1">
                      {r.approval_status === 'approved' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                       r.approval_status === 'rejected' ? <XCircle className="h-4 w-4 text-destructive" /> :
                       <Clock className="h-4 w-4 text-warning" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{r.title}</span>
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.record_type?.replace(/_/g, ' ')} • {r.created_by_name || 'System'}</p>
                      {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    </div>
                  </div>
                ))}
                {records.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No audit trail entries</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Compliance Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <div><Label>Record Type</Label>
              <Select value={form.record_type} onValueChange={v => setForm(p => ({ ...p, record_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RECORD_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Compliance Category</Label>
              <Select value={form.compliance_category} onValueChange={v => setForm(p => ({ ...p, compliance_category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{COMPLIANCE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Project (optional)</Label>
              <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Reference Number</Label><Input value={form.reference_number} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => createRecord.mutate(form)} disabled={!form.title}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
