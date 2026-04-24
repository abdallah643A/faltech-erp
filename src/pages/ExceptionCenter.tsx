import { useState } from 'react';
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
import { AlertOctagon, Plus, CheckCircle2, Search, Filter, Eye, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

const MODULES = ['sync','master_data','approvals','posting','inventory','payroll','billing','procurement','finance','hr','projects'];
const SEVERITIES = ['critical','high','medium','low'];
const ROOT_CAUSES = ['data_quality','system_error','configuration','user_error','integration','business_rule','unknown'];

export default function ExceptionCenter() {
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

  const { data: exceptions = [], isLoading } = useQuery({
    queryKey: ['erp-exceptions', activeCompanyId, filterModule, filterSeverity, filterStatus],
    queryFn: async () => {
      let q = (supabase.from('erp_exceptions' as any).select('*') as any).order('created_at', { ascending: false }).limit(300);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filterModule !== 'all') q = q.eq('module', filterModule);
      if (filterSeverity !== 'all') q = q.eq('severity', filterSeverity);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const [form, setForm] = useState({ module: '', exception_type: '', severity: 'medium', title: '', description: '', source_document_number: '', root_cause_category: '' });

  const createException = useMutation({
    mutationFn: async (data: any) => {
      await (supabase.from('erp_exceptions' as any).insert({ ...data, company_id: activeCompanyId, created_by: user?.id }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['erp-exceptions'] }); setCreateDialog(false); toast({ title: 'Exception Logged' }); },
  });

  const resolveException = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      await (supabase.from('erp_exceptions' as any).update({ status: 'resolved', resolution_notes: notes, resolved_by: user?.id, resolved_at: new Date().toISOString() }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['erp-exceptions'] }); setResolveDialog(null); toast({ title: 'Resolved' }); },
  });

  const filtered = exceptions.filter((e: any) => !search || e.title?.toLowerCase().includes(search.toLowerCase()));
  const severityColors: Record<string, string> = { critical: 'destructive', high: 'destructive', medium: 'secondary', low: 'outline' };

  const counts = { open: exceptions.filter((e: any) => e.status === 'open').length, critical: exceptions.filter((e: any) => e.severity === 'critical' && e.status === 'open').length };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><AlertOctagon className="h-6 w-6" /> Exception Management Center</h1>
          <p className="text-muted-foreground text-sm">Track and resolve ERP exceptions across all modules</p>
        </div>
        <Button onClick={() => setCreateDialog(true)}><Plus className="h-4 w-4 mr-2" /> Log Exception</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Open Exceptions</div><div className="text-2xl font-bold">{counts.open}</div></CardContent></Card>
        <Card className="border-destructive"><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Critical</div><div className="text-2xl font-bold text-destructive">{counts.critical}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total This Period</div><div className="text-2xl font-bold">{exceptions.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Resolved</div><div className="text-2xl font-bold">{exceptions.filter((e: any) => e.status === 'resolved').length}</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={filterModule} onValueChange={setFilterModule}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Modules</SelectItem>{MODULES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent></Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Severity</SelectItem>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="ignored">Ignored</SelectItem></SelectContent></Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead>Severity</TableHead><TableHead>Module</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Document</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell><Badge variant={severityColors[e.severity] as any}>{e.severity}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{e.module}</Badge></TableCell>
                  <TableCell><div><p className="font-medium text-sm">{e.title}</p>{e.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{e.description}</p>}</div></TableCell>
                  <TableCell className="text-xs">{e.exception_type}</TableCell>
                  <TableCell className="text-xs">{e.source_document_number || '-'}</TableCell>
                  <TableCell><Badge variant={e.status === 'open' ? 'destructive' : e.status === 'resolved' ? 'default' : 'secondary'}>{e.status}</Badge></TableCell>
                  <TableCell className="text-xs">{e.created_at ? format(new Date(e.created_at), 'yyyy-MM-dd') : ''}</TableCell>
                  <TableCell>{e.status === 'open' && <Button size="sm" variant="outline" onClick={() => { setResolveDialog(e); setResolveNotes(''); }}><CheckCircle2 className="h-3 w-3 mr-1" /> Resolve</Button>}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No exceptions found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Exception</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Module</Label><Select value={form.module} onValueChange={v => setForm({ ...form, module: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Severity</Label><Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Type</Label><Input value={form.exception_type} onChange={e => setForm({ ...form, exception_type: e.target.value })} placeholder="e.g. sync_failure, missing_data" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Source Document #</Label><Input value={form.source_document_number} onChange={e => setForm({ ...form, source_document_number: e.target.value })} /></div>
            <div><Label>Root Cause</Label><Select value={form.root_cause_category} onValueChange={v => setForm({ ...form, root_cause_category: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{ROOT_CAUSES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button><Button onClick={() => createException.mutate(form)} disabled={!form.title || !form.module}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Exception</DialogTitle></DialogHeader>
          <p className="text-sm font-medium">{resolveDialog?.title}</p>
          <div><Label>Resolution Notes</Label><Textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} placeholder="Describe how this was resolved" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setResolveDialog(null)}>Cancel</Button><Button onClick={() => resolveException.mutate({ id: resolveDialog.id, notes: resolveNotes })}>Resolve</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
