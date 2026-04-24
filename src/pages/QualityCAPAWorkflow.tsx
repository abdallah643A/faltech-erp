import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ShieldCheck, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const STATUSES = ['open', 'investigating', 'action_taken', 'verification', 'closed'];
const COLORS = ['hsl(0 84% 60%)', 'hsl(45 93% 47%)', 'hsl(var(--primary))', 'hsl(262 83% 58%)', 'hsl(142 76% 36%)'];

export default function QualityCAPAWorkflow() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({ title: '', source_type: 'quality_test', source_ref: '', root_cause: '', corrective_action: '', preventive_action: '', owner_name: '', due_date: '', severity: 'medium', verification_step: '' });

  const { data: capas = [] } = useQuery({
    queryKey: ['capa-actions', activeCompanyId, statusFilter],
    queryFn: async () => {
      let q = supabase.from('capa_actions' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const addCapa = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const num = `CAPA-${Date.now().toString().slice(-6)}`;
      const { error } = await (supabase.from('capa_actions' as any).insert({
        ...form, capa_number: num, created_by: user?.id, owner_id: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['capa-actions'] }); setShowAdd(false); toast.success('CAPA created'); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'closed') {
        const { data: { user } } = await supabase.auth.getUser();
        updates.closure_approved_by = user?.id;
        updates.closure_approved_at = new Date().toISOString();
      }
      if (status === 'verification') {
        const { data: { user } } = await supabase.auth.getUser();
        updates.verified_by = user?.id;
        updates.verified_at = new Date().toISOString();
      }
      await (supabase.from('capa_actions' as any).update(updates).eq('id', id) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['capa-actions'] }); toast.success('Status updated'); },
  });

  const byStatus = STATUSES.map((s, i) => ({ name: s, value: capas.filter((c: any) => c.status === s).length, color: COLORS[i] })).filter(d => d.value > 0);
  const openCount = capas.filter((c: any) => c.status !== 'closed').length;
  const overdueCount = capas.filter((c: any) => c.status !== 'closed' && c.due_date && new Date(c.due_date) < new Date()).length;

  const statusColor = (s: string) => s === 'open' ? 'destructive' : s === 'closed' ? 'default' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Quality CAPA Workflow</h1><p className="text-muted-foreground">Corrective and preventive actions tracking</p></div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New CAPA</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create CAPA</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Source Type</Label><Select value={form.source_type} onValueChange={v => setForm(p => ({ ...p, source_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quality_test">Quality Test</SelectItem><SelectItem value="customer_complaint">Customer Complaint</SelectItem><SelectItem value="audit">Audit</SelectItem><SelectItem value="supplier">Supplier Issue</SelectItem><SelectItem value="production">Production</SelectItem></SelectContent></Select></div>
                <div><Label>Severity</Label><Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              </div>
              <div><Label>Source Reference</Label><Input value={form.source_ref} onChange={e => setForm(p => ({ ...p, source_ref: e.target.value }))} /></div>
              <div><Label>Root Cause</Label><Textarea value={form.root_cause} onChange={e => setForm(p => ({ ...p, root_cause: e.target.value }))} /></div>
              <div><Label>Corrective Action</Label><Textarea value={form.corrective_action} onChange={e => setForm(p => ({ ...p, corrective_action: e.target.value }))} /></div>
              <div><Label>Preventive Action</Label><Textarea value={form.preventive_action} onChange={e => setForm(p => ({ ...p, preventive_action: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Owner</Label><Input value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} /></div>
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              </div>
              <div><Label>Verification Step</Label><Input value={form.verification_step} onChange={e => setForm(p => ({ ...p, verification_step: e.target.value }))} placeholder="How to verify the fix..." /></div>
              <Button className="w-full" onClick={() => addCapa.mutate()} disabled={!form.title}>Create CAPA</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><ShieldCheck className="h-8 w-8 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{capas.length}</p><p className="text-xs text-muted-foreground">Total CAPAs</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><AlertTriangle className="h-8 w-8 mx-auto text-orange-500 mb-2" /><p className="text-2xl font-bold">{openCount}</p><p className="text-xs text-muted-foreground">Open</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Clock className="h-8 w-8 mx-auto text-red-500 mb-2" /><p className="text-2xl font-bold">{overdueCount}</p><p className="text-xs text-muted-foreground">Overdue</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" /><p className="text-2xl font-bold">{capas.filter((c: any) => c.status === 'closed').length}</p><p className="text-xs text-muted-foreground">Closed</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>By Status</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{byStatus.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        </CardContent></Card>
        <div className="md:col-span-2">
          <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>CAPA List</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Title</TableHead><TableHead>Source</TableHead><TableHead>Severity</TableHead><TableHead>Owner</TableHead><TableHead>Due</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
              <TableBody>{capas.slice(0, 30).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.capa_number}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{c.title}</TableCell>
                  <TableCell><Badge variant="outline">{c.source_type}</Badge></TableCell>
                  <TableCell><Badge variant={c.severity === 'critical' || c.severity === 'high' ? 'destructive' : 'secondary'}>{c.severity}</Badge></TableCell>
                  <TableCell>{c.owner_name || '-'}</TableCell>
                  <TableCell className={c.due_date && new Date(c.due_date) < new Date() && c.status !== 'closed' ? 'text-red-600 font-bold' : ''}>{c.due_date || '-'}</TableCell>
                  <TableCell><Badge variant={statusColor(c.status) as any}>{c.status}</Badge></TableCell>
                  <TableCell>
                    {c.status !== 'closed' && (
                      <Select onValueChange={v => updateStatus.mutate({ id: c.id, status: v })}>
                        <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue placeholder="Move to..." /></SelectTrigger>
                        <SelectContent>{STATUSES.filter(s => s !== c.status).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
