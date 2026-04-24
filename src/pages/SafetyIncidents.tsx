import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Shield, Plus, Search, HardHat, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const SEVERITY_COLORS: Record<string, string> = { low: 'hsl(142 76% 36%)', medium: 'hsl(48 96% 53%)', high: 'hsl(25 95% 53%)', critical: 'hsl(0 84% 60%)' };

export default function SafetyIncidents() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', incident_type: 'incident', severity: 'medium', description: '', location: '', root_cause: '', corrective_actions: '' });

  const { data: incidents = [] } = useQuery({
    queryKey: ['safety-incidents', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('safety_incidents' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: ppeChecks = [] } = useQuery({
    queryKey: ['ppe-checks', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ppe_compliance_checks' as any).select('*').order('created_at', { ascending: false }).limit(50) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const createIncident = useMutation({
    mutationFn: async (data: any) => {
      const incNumber = 'INC-' + Date.now().toString().slice(-6);
      const { error } = await (supabase.from('safety_incidents' as any).insert({
        ...data, incident_number: incNumber, reported_by: user?.id,
        reported_by_name: (profile as any)?.full_name, status: 'reported',
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-incidents'] });
      toast({ title: 'Incident reported' });
      setShowNew(false);
      setForm({ title: '', incident_type: 'incident', severity: 'medium', description: '', location: '', root_cause: '', corrective_actions: '' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = incidents.filter((i: any) => !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.incident_number?.includes(search));
  const openCount = incidents.filter((i: any) => !['closed', 'resolved'].includes(i.status)).length;
  const criticalCount = incidents.filter((i: any) => i.severity === 'critical' && i.status !== 'closed').length;

  const byType = [
    { name: 'Incident', count: incidents.filter((i: any) => i.incident_type === 'incident').length },
    { name: 'Near Miss', count: incidents.filter((i: any) => i.incident_type === 'near_miss').length },
    { name: 'Unsafe Act', count: incidents.filter((i: any) => i.incident_type === 'unsafe_act').length },
    { name: 'Unsafe Condition', count: incidents.filter((i: any) => i.incident_type === 'unsafe_condition').length },
  ];

  const bySeverity = Object.entries(SEVERITY_COLORS).map(([sev, color]) => ({
    name: sev, count: incidents.filter((i: any) => i.severity === sev).length, color,
  }));

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> Safety & Incident Management</h1>
          <p className="text-sm text-muted-foreground">Report incidents, track corrective actions, and manage PPE compliance</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Report Incident</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Report Safety Incident</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t('common.type')}</Label>
                  <Select value={form.incident_type} onValueChange={v => setForm(f => ({ ...f, incident_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incident">Incident</SelectItem>
                      <SelectItem value="near_miss">Near Miss</SelectItem>
                      <SelectItem value="unsafe_act">Unsafe Act</SelectItem>
                      <SelectItem value="unsafe_condition">Unsafe Condition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Severity</Label>
                  <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location of incident" /></div>
              <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
              <div><Label>Root Cause</Label><Textarea value={form.root_cause} onChange={e => setForm(f => ({ ...f, root_cause: e.target.value }))} rows={2} /></div>
              <div><Label>Corrective Actions</Label><Textarea value={form.corrective_actions} onChange={e => setForm(f => ({ ...f, corrective_actions: e.target.value }))} rows={2} /></div>
              <Button className="w-full" onClick={() => createIncident.mutate(form)} disabled={!form.title}>Submit Report</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Incidents</p><p className="text-2xl font-bold">{incidents.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open</p><p className="text-2xl font-bold text-warning">{openCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Critical Open</p><p className="text-2xl font-bold text-destructive">{criticalCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">PPE Checks</p><p className="text-2xl font-bold">{ppeChecks.length}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">By Type</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={200}>
            <BarChart data={byType}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">By Severity</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={bySeverity.filter(d => d.count > 0)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
              {bySeverity.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer></CardContent></Card>
      </div>

      <Tabs defaultValue="incidents">
        <TabsList><TabsTrigger value="incidents">Incidents</TabsTrigger><TabsTrigger value="ppe">PPE Checks</TabsTrigger></TabsList>
        <TabsContent value="incidents" className="space-y-3">
          <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t('common.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <div className="border rounded-lg overflow-auto">
            <Table><TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Severity</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Location</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>Reported By</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((inc: any) => (
                <TableRow key={inc.id}>
                  <TableCell className="font-mono text-xs">{inc.incident_number}</TableCell>
                  <TableCell className="font-medium text-sm">{inc.title}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{inc.incident_type?.replace('_', ' ')}</Badge></TableCell>
                  <TableCell><Badge variant={inc.severity === 'critical' ? 'destructive' : inc.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs capitalize">{inc.severity}</Badge></TableCell>
                  <TableCell><Badge variant={inc.status === 'closed' ? 'default' : 'outline'} className="text-xs capitalize">{inc.status}</Badge></TableCell>
                  <TableCell className="text-sm">{inc.location || '—'}</TableCell>
                  <TableCell className="text-xs">{inc.incident_date ? format(new Date(inc.incident_date), 'PP') : '—'}</TableCell>
                  <TableCell className="text-sm">{inc.reported_by_name || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </div>
        </TabsContent>
        <TabsContent value="ppe">
          <div className="border rounded-lg overflow-auto">
            <Table><TableHeader><TableRow>
              <TableHead>{t('hr.employee')}</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>Compliant</TableHead><TableHead>Checked By</TableHead><TableHead>{t('common.notes')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {ppeChecks.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{c.employee_name || '—'}</TableCell>
                  <TableCell className="text-sm">{c.check_date ? format(new Date(c.check_date), 'PP') : '—'}</TableCell>
                  <TableCell>{c.is_compliant ? <Badge className="text-xs">Compliant</Badge> : <Badge variant="destructive" className="text-xs">Non-Compliant</Badge>}</TableCell>
                  <TableCell className="text-sm">{c.checked_by_name || '—'}</TableCell>
                  <TableCell className="text-sm truncate max-w-[200px]">{c.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
