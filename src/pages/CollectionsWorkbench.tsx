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
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import {
  DollarSign, Clock, AlertTriangle, Phone, Mail, MessageSquare, Plus, CheckCircle2,
  Search, Users, Calendar, MapPin, TrendingUp, TrendingDown, Target, Eye,
  ArrowUpRight, Shield, BarChart3, UserCheck, XCircle, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

const fmt = (n: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(n);

export default function CollectionsWorkbench() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('queue');
  const [search, setSearch] = useState('');
  const [promiseDialog, setPromiseDialog] = useState(false);
  const [commDialog, setCommDialog] = useState(false);
  const [visitDialog, setVisitDialog] = useState(false);
  const [disputeDialog, setDisputeDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Forms
  const [promiseForm, setPromiseForm] = useState({ promised_amount: 0, promised_date: '', invoice_number: '', follow_up_notes: '' });
  const [commForm, setCommForm] = useState({ communication_type: 'phone', subject: '', body: '', outcome: '', contact_person: '' });
  const [visitForm, setVisitForm] = useState({ visit_date: '', location: '', purpose: 'collection', visit_time: '' });
  const [disputeForm, setDisputeForm] = useState({ invoice_number: '', dispute_amount: 0, dispute_reason: '', dispute_category: 'pricing' });

  // Queries
  const { data: invoices = [] } = useQuery({
    queryKey: ['cw-invoices', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('*').in('status', ['open', 'overdue', 'partially_paid']).order('doc_due_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: promises = [] } = useQuery({
    queryKey: ['cw-promises', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('collection_promises' as any).select('*').order('promised_date') as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['cw-comms', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('collection_communications' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['cw-visits', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('collection_visits' as any).select('*').order('visit_date') as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: disputes = [] } = useQuery({
    queryKey: ['cw-disputes', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('collection_disputes' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  // Mutations
  const addPromise = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await (supabase.from('collection_promises' as any).insert(p) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cw-promises'] }); setPromiseDialog(false); toast({ title: 'Promise recorded' }); },
  });

  const addComm = useMutation({
    mutationFn: async (c: any) => {
      const { error } = await (supabase.from('collection_communications' as any).insert(c) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cw-comms'] }); setCommDialog(false); toast({ title: 'Communication logged' }); },
  });

  const addVisit = useMutation({
    mutationFn: async (v: any) => {
      const { error } = await (supabase.from('collection_visits' as any).insert(v) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cw-visits'] }); setVisitDialog(false); toast({ title: 'Visit scheduled' }); },
  });

  const addDispute = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await (supabase.from('collection_disputes' as any).insert(d) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cw-disputes'] }); setDisputeDialog(false); toast({ title: 'Dispute recorded' }); },
  });

  const updatePromiseStatus = useMutation({
    mutationFn: async ({ id, status, broken_reason }: any) => {
      const upd: any = { status };
      if (status === 'kept') { upd.actual_date = new Date().toISOString().split('T')[0]; }
      if (broken_reason) upd.broken_reason = broken_reason;
      const { error } = await (supabase.from('collection_promises' as any).update(upd).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cw-promises'] }),
  });

  // Computed
  const customerQueue = useMemo(() => {
    const grouped: Record<string, { name: string; code: string; id: string; invoices: any[]; total: number; oldest: number; promiseCount: number; keptCount: number }> = {};
    invoices.forEach((inv: any) => {
      const key = inv.customer_code || inv.customer_name;
      if (!grouped[key]) grouped[key] = { name: inv.customer_name, code: inv.customer_code, id: inv.customer_id, invoices: [], total: 0, oldest: 0, promiseCount: 0, keptCount: 0 };
      grouped[key].invoices.push(inv);
      grouped[key].total += Number(inv.balance_due || inv.total || 0);
      const days = inv.doc_due_date ? differenceInDays(new Date(), new Date(inv.doc_due_date)) : 0;
      if (days > grouped[key].oldest) grouped[key].oldest = days;
    });
    // Add promise reliability
    promises.forEach((p: any) => {
      const key = p.customer_name;
      if (grouped[key]) {
        grouped[key].promiseCount++;
        if (p.status === 'kept') grouped[key].keptCount++;
      }
    });
    return Object.values(grouped)
      .map(g => ({ ...g, reliability: g.promiseCount > 0 ? Math.round((g.keptCount / g.promiseCount) * 100) : -1, priority: g.total > 500000 ? 'critical' : g.oldest > 90 ? 'high' : g.oldest > 60 ? 'medium' : 'low' }))
      .sort((a, b) => b.total - a.total)
      .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.code?.toLowerCase().includes(search.toLowerCase()));
  }, [invoices, promises, search]);

  const totalOutstanding = customerQueue.reduce((s, c) => s + c.total, 0);
  const overdueCount = invoices.filter((i: any) => i.status === 'overdue').length;
  const pendingPromises = promises.filter((p: any) => p.status === 'pending');
  const brokenPromises = promises.filter((p: any) => p.status === 'broken');
  const thisWeekStart = startOfWeek(new Date());
  const thisWeekEnd = endOfWeek(new Date());
  const weekCashForecast = pendingPromises.filter((p: any) => {
    try { return isWithinInterval(new Date(p.promised_date), { start: thisWeekStart, end: thisWeekEnd }); } catch { return false; }
  }).reduce((s: number, p: any) => s + Number(p.promised_amount || 0), 0);

  const openDisputes = disputes.filter((d: any) => d.status === 'open');

  const priorityColor = (p: string) => p === 'critical' ? 'destructive' : p === 'high' ? 'default' : p === 'medium' ? 'secondary' : 'outline';
  const statusColor = (s: string) => s === 'kept' ? 'default' : s === 'broken' ? 'destructive' : 'secondary';

  // Collector performance
  const collectorStats = useMemo(() => {
    const stats: Record<string, { name: string; calls: number; visits: number; promisesGot: number; amountCollected: number }> = {};
    communications.forEach((c: any) => {
      const n = c.collector_name || 'Unassigned';
      if (!stats[n]) stats[n] = { name: n, calls: 0, visits: 0, promisesGot: 0, amountCollected: 0 };
      stats[n].calls++;
    });
    visits.forEach((v: any) => {
      const n = v.collector_name || 'Unassigned';
      if (!stats[n]) stats[n] = { name: n, calls: 0, visits: 0, promisesGot: 0, amountCollected: 0 };
      stats[n].visits++;
      stats[n].amountCollected += Number(v.amount_collected || 0);
    });
    promises.forEach((p: any) => {
      const n = p.collector_name || 'Unassigned';
      if (!stats[n]) stats[n] = { name: n, calls: 0, visits: 0, promisesGot: 0, amountCollected: 0 };
      stats[n].promisesGot++;
    });
    return Object.values(stats);
  }, [communications, visits, promises]);

  const openDialog = (type: string, customer?: any) => {
    setSelectedCustomer(customer || null);
    if (type === 'promise') { setPromiseForm({ promised_amount: 0, promised_date: '', invoice_number: '', follow_up_notes: '' }); setPromiseDialog(true); }
    if (type === 'comm') { setCommForm({ communication_type: 'phone', subject: '', body: '', outcome: '', contact_person: '' }); setCommDialog(true); }
    if (type === 'visit') { setVisitForm({ visit_date: '', location: '', purpose: 'collection', visit_time: '' }); setVisitDialog(true); }
    if (type === 'dispute') { setDisputeForm({ invoice_number: '', dispute_amount: 0, dispute_reason: '', dispute_category: 'pricing' }); setDisputeDialog(true); }
  };

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6" /> Collections Workbench</h1>
          <p className="text-sm text-muted-foreground">Full operational workspace for AR collection teams</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
          <div className="text-lg font-bold">{fmt(totalOutstanding)}</div>
          <div className="text-xs text-muted-foreground">Total Outstanding</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1" />
          <div className="text-lg font-bold">{overdueCount}</div>
          <div className="text-xs text-muted-foreground">Overdue Invoices</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <ThumbsUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
          <div className="text-lg font-bold">{pendingPromises.length}</div>
          <div className="text-xs text-muted-foreground">Pending Promises</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <div className="text-lg font-bold">{fmt(weekCashForecast)}</div>
          <div className="text-xs text-muted-foreground">Cash Forecast This Week</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <XCircle className="h-5 w-5 mx-auto text-orange-500 mb-1" />
          <div className="text-lg font-bold">{openDisputes.length}</div>
          <div className="text-xs text-muted-foreground">Open Disputes</div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="queue">Collector Queue</TabsTrigger>
          <TabsTrigger value="risk">Customer Risk</TabsTrigger>
          <TabsTrigger value="promises">Promises to Pay</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="visits">Visit Planner</TabsTrigger>
          <TabsTrigger value="timeline">Communication</TabsTrigger>
          <TabsTrigger value="forecast">Cash Forecast</TabsTrigger>
          <TabsTrigger value="broken">Broken Promises</TabsTrigger>
          <TabsTrigger value="performance">Collector Performance</TabsTrigger>
        </TabsList>

        {/* COLLECTOR QUEUE */}
        <TabsContent value="queue" className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          </div>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Outstanding</TableHead><TableHead>Oldest (Days)</TableHead>
                <TableHead>Priority</TableHead><TableHead>Promise Reliability</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {customerQueue.map(c => (
                  <TableRow key={c.code || c.name}>
                    <TableCell><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.code} · {c.invoices.length} invoices</div></TableCell>
                    <TableCell className="font-bold">{fmt(c.total)}</TableCell>
                    <TableCell><Badge variant={c.oldest > 90 ? 'destructive' : c.oldest > 60 ? 'default' : 'secondary'}>{c.oldest}d</Badge></TableCell>
                    <TableCell><Badge variant={priorityColor(c.priority) as any}>{c.priority}</Badge></TableCell>
                    <TableCell>{c.reliability >= 0 ? <div className="flex items-center gap-1"><Progress value={c.reliability} className="w-16 h-2" /><span className="text-xs">{c.reliability}%</span></div> : <span className="text-xs text-muted-foreground">No history</span>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openDialog('comm', c)} title="Log Call"><Phone className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openDialog('promise', c)} title="Record Promise"><DollarSign className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openDialog('visit', c)} title="Schedule Visit"><MapPin className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openDialog('dispute', c)} title="Log Dispute"><AlertTriangle className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* CUSTOMER RISK VIEW */}
        <TabsContent value="risk" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customerQueue.slice(0, 12).map(c => (
              <Card key={c.code || c.name} className={`border-l-4 ${c.priority === 'critical' ? 'border-l-red-500' : c.priority === 'high' ? 'border-l-orange-500' : c.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div><div className="font-semibold">{c.name}</div><div className="text-xs text-muted-foreground">{c.code}</div></div>
                    <Badge variant={priorityColor(c.priority) as any}>{c.priority}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div><div className="font-bold">{fmt(c.total)}</div><div className="text-xs text-muted-foreground">Outstanding</div></div>
                    <div><div className="font-bold">{c.oldest}d</div><div className="text-xs text-muted-foreground">Oldest</div></div>
                    <div><div className="font-bold">{c.reliability >= 0 ? `${c.reliability}%` : 'N/A'}</div><div className="text-xs text-muted-foreground">Reliability</div></div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openDialog('comm', c)}><Phone className="h-3 w-3 mr-1" /> Call</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openDialog('promise', c)}><DollarSign className="h-3 w-3 mr-1" /> Promise</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* PROMISES TO PAY */}
        <TabsContent value="promises" className="space-y-3">
          <div className="flex justify-between"><h3 className="font-semibold">Active Promises</h3><Button size="sm" onClick={() => openDialog('promise')}><Plus className="h-4 w-4 mr-1" /> New Promise</Button></div>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Invoice</TableHead><TableHead>Amount</TableHead>
                <TableHead>Promised Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {promises.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.customer_name}</TableCell>
                    <TableCell>{p.invoice_number || '-'}</TableCell>
                    <TableCell className="font-bold">{fmt(Number(p.promised_amount))}</TableCell>
                    <TableCell>{p.promised_date}</TableCell>
                    <TableCell><Badge variant={statusColor(p.status) as any}>{p.status}</Badge></TableCell>
                    <TableCell>
                      {p.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => updatePromiseStatus.mutate({ id: p.id, status: 'kept' })}><CheckCircle2 className="h-3 w-3 mr-1" /> Kept</Button>
                          <Button size="sm" variant="destructive" onClick={() => updatePromiseStatus.mutate({ id: p.id, status: 'broken', broken_reason: 'Did not pay on promised date' })}><XCircle className="h-3 w-3 mr-1" /> Broken</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {promises.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No promises recorded</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* DISPUTES */}
        <TabsContent value="disputes" className="space-y-3">
          <div className="flex justify-between"><h3 className="font-semibold">Invoice Disputes</h3><Button size="sm" onClick={() => openDialog('dispute')}><Plus className="h-4 w-4 mr-1" /> New Dispute</Button></div>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Invoice</TableHead><TableHead>Amount</TableHead>
                <TableHead>Category</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {disputes.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.customer_name}</TableCell>
                    <TableCell>{d.invoice_number || '-'}</TableCell>
                    <TableCell className="font-bold text-red-600">{fmt(Number(d.dispute_amount))}</TableCell>
                    <TableCell><Badge variant="outline">{d.dispute_category}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{d.dispute_reason}</TableCell>
                    <TableCell><Badge variant={d.status === 'open' ? 'destructive' : d.status === 'resolved' ? 'default' : 'secondary'}>{d.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {disputes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No disputes</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* VISIT PLANNER */}
        <TabsContent value="visits" className="space-y-3">
          <div className="flex justify-between"><h3 className="font-semibold">Collection Visits</h3><Button size="sm" onClick={() => openDialog('visit')}><Plus className="h-4 w-4 mr-1" /> Schedule Visit</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visits.map((v: any) => (
              <Card key={v.id} className={v.status === 'completed' ? 'opacity-60' : ''}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between"><span className="font-semibold">{v.customer_name}</span><Badge variant={v.status === 'planned' ? 'secondary' : v.status === 'completed' ? 'default' : 'outline'}>{v.status}</Badge></div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-3 w-3" />{v.visit_date} {v.visit_time && `@ ${v.visit_time}`}</div>
                  {v.location && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{v.location}</div>}
                  {v.purpose && <div className="text-sm">{v.purpose}</div>}
                  {v.amount_collected > 0 && <div className="text-sm font-bold text-green-600">Collected: {fmt(Number(v.amount_collected))}</div>}
                </CardContent>
              </Card>
            ))}
            {visits.length === 0 && <div className="col-span-3 text-center text-muted-foreground py-8">No visits scheduled</div>}
          </div>
        </TabsContent>

        {/* COMMUNICATION TIMELINE */}
        <TabsContent value="timeline" className="space-y-3">
          <div className="flex justify-between"><h3 className="font-semibold">Communication Timeline</h3><Button size="sm" onClick={() => openDialog('comm')}><Plus className="h-4 w-4 mr-1" /> Log Communication</Button></div>
          <div className="space-y-2">
            {communications.slice(0, 50).map((c: any) => (
              <Card key={c.id}>
                <CardContent className="py-3 flex items-start gap-3">
                  <div className={`p-2 rounded-full ${c.communication_type === 'phone' ? 'bg-blue-100 text-blue-600' : c.communication_type === 'email' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                    {c.communication_type === 'phone' ? <Phone className="h-4 w-4" /> : c.communication_type === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between"><span className="font-medium">{c.customer_name}</span><span className="text-xs text-muted-foreground">{c.created_at ? format(new Date(c.created_at), 'dd MMM yyyy HH:mm') : ''}</span></div>
                    {c.subject && <div className="text-sm font-medium">{c.subject}</div>}
                    {c.body && <div className="text-sm text-muted-foreground">{c.body}</div>}
                    {c.outcome && <div className="text-sm mt-1"><Badge variant="outline">{c.outcome}</Badge></div>}
                    {c.promised_amount > 0 && <div className="text-sm text-green-600 mt-1">Promise: {fmt(Number(c.promised_amount))} by {c.promised_date}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {communications.length === 0 && <div className="text-center text-muted-foreground py-8">No communications logged</div>}
          </div>
        </TabsContent>

        {/* CASH FORECAST THIS WEEK */}
        <TabsContent value="forecast" className="space-y-3">
          <h3 className="font-semibold">Cash Forecast This Week</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-600">{fmt(weekCashForecast)}</div>
              <div className="text-sm text-muted-foreground">Promised Cash This Week</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{pendingPromises.filter((p: any) => { try { return isWithinInterval(new Date(p.promised_date), { start: thisWeekStart, end: thisWeekEnd }); } catch { return false; } }).length}</div>
              <div className="text-sm text-muted-foreground">Promises Due This Week</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{visits.filter((v: any) => { try { return v.status === 'planned' && isWithinInterval(new Date(v.visit_date), { start: thisWeekStart, end: thisWeekEnd }); } catch { return false; } }).length}</div>
              <div className="text-sm text-muted-foreground">Visits This Week</div>
            </CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Promises Due by Day</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Array.from({ length: 7 }, (_, i) => {
                  const d = addDays(thisWeekStart, i);
                  const ds = format(d, 'yyyy-MM-dd');
                  const amt = pendingPromises.filter((p: any) => p.promised_date === ds).reduce((s: number, p: any) => s + Number(p.promised_amount || 0), 0);
                  return { day: format(d, 'EEE'), amount: amt };
                })}>
                  <XAxis dataKey="day" /><YAxis /><RTooltip />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BROKEN PROMISE REPORT */}
        <TabsContent value="broken" className="space-y-3">
          <h3 className="font-semibold">Broken Promise Report</h3>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Invoice</TableHead><TableHead>Promised Amount</TableHead>
                <TableHead>Promised Date</TableHead><TableHead>Reason</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {brokenPromises.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.customer_name}</TableCell>
                    <TableCell>{p.invoice_number || '-'}</TableCell>
                    <TableCell className="font-bold text-red-600">{fmt(Number(p.promised_amount))}</TableCell>
                    <TableCell>{p.promised_date}</TableCell>
                    <TableCell>{p.broken_reason || '-'}</TableCell>
                  </TableRow>
                ))}
                {brokenPromises.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No broken promises</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* COLLECTOR PERFORMANCE */}
        <TabsContent value="performance" className="space-y-3">
          <h3 className="font-semibold">Collector Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {collectorStats.map(cs => (
              <Card key={cs.name}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /><span className="font-semibold">{cs.name}</span></div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {cs.calls} Calls</div>
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {cs.visits} Visits</div>
                    <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {cs.promisesGot} Promises</div>
                    <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {fmt(cs.amountCollected)} Collected</div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {collectorStats.length === 0 && <div className="col-span-3 text-center text-muted-foreground py-8">No collector activity yet</div>}
          </div>
        </TabsContent>
      </Tabs>

      {/* PROMISE DIALOG */}
      <Dialog open={promiseDialog} onOpenChange={setPromiseDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Promise to Pay</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Customer</Label><Input value={selectedCustomer?.name || ''} disabled /></div>
            <div><Label>Invoice #</Label><Input value={promiseForm.invoice_number} onChange={e => setPromiseForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
            <div><Label>Promised Amount</Label><Input type="number" value={promiseForm.promised_amount} onChange={e => setPromiseForm(p => ({ ...p, promised_amount: Number(e.target.value) }))} /></div>
            <div><Label>Promised Date</Label><Input type="date" value={promiseForm.promised_date} onChange={e => setPromiseForm(p => ({ ...p, promised_date: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={promiseForm.follow_up_notes} onChange={e => setPromiseForm(p => ({ ...p, follow_up_notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => addPromise.mutate({ ...promiseForm, customer_name: selectedCustomer?.name, customer_id: selectedCustomer?.id, company_id: activeCompanyId, collector_name: profile?.full_name, collector_user_id: user?.id })} disabled={addPromise.isPending}>Save Promise</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMMUNICATION DIALOG */}
      <Dialog open={commDialog} onOpenChange={setCommDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Customer</Label><Input value={selectedCustomer?.name || ''} disabled /></div>
            <div><Label>Type</Label>
              <Select value={commForm.communication_type} onValueChange={v => setCommForm(p => ({ ...p, communication_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="phone">Phone</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="visit">Visit</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Contact Person</Label><Input value={commForm.contact_person} onChange={e => setCommForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
            <div><Label>Subject</Label><Input value={commForm.subject} onChange={e => setCommForm(p => ({ ...p, subject: e.target.value }))} /></div>
            <div><Label>Details</Label><Textarea value={commForm.body} onChange={e => setCommForm(p => ({ ...p, body: e.target.value }))} /></div>
            <div><Label>Outcome</Label>
              <Select value={commForm.outcome} onValueChange={v => setCommForm(p => ({ ...p, outcome: v }))}>
                <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent><SelectItem value="promised_to_pay">Promised to Pay</SelectItem><SelectItem value="no_answer">No Answer</SelectItem><SelectItem value="callback_requested">Callback Requested</SelectItem><SelectItem value="dispute_raised">Dispute Raised</SelectItem><SelectItem value="escalated">Escalated</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addComm.mutate({ ...commForm, customer_name: selectedCustomer?.name, customer_id: selectedCustomer?.id, company_id: activeCompanyId, collector_name: profile?.full_name, collector_user_id: user?.id })} disabled={addComm.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VISIT DIALOG */}
      <Dialog open={visitDialog} onOpenChange={setVisitDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Collection Visit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Customer</Label><Input value={selectedCustomer?.name || ''} disabled /></div>
            <div><Label>Visit Date</Label><Input type="date" value={visitForm.visit_date} onChange={e => setVisitForm(p => ({ ...p, visit_date: e.target.value }))} /></div>
            <div><Label>Time</Label><Input type="time" value={visitForm.visit_time} onChange={e => setVisitForm(p => ({ ...p, visit_time: e.target.value }))} /></div>
            <div><Label>Location</Label><Input value={visitForm.location} onChange={e => setVisitForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div><Label>Purpose</Label><Input value={visitForm.purpose} onChange={e => setVisitForm(p => ({ ...p, purpose: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => addVisit.mutate({ ...visitForm, customer_name: selectedCustomer?.name, customer_id: selectedCustomer?.id, company_id: activeCompanyId, collector_name: profile?.full_name, collector_user_id: user?.id })} disabled={addVisit.isPending}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DISPUTE DIALOG */}
      <Dialog open={disputeDialog} onOpenChange={setDisputeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Invoice Dispute</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Customer</Label><Input value={selectedCustomer?.name || ''} disabled /></div>
            <div><Label>Invoice #</Label><Input value={disputeForm.invoice_number} onChange={e => setDisputeForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
            <div><Label>Dispute Amount</Label><Input type="number" value={disputeForm.dispute_amount} onChange={e => setDisputeForm(p => ({ ...p, dispute_amount: Number(e.target.value) }))} /></div>
            <div><Label>Category</Label>
              <Select value={disputeForm.dispute_category} onValueChange={v => setDisputeForm(p => ({ ...p, dispute_category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pricing">Pricing</SelectItem><SelectItem value="quality">Quality</SelectItem><SelectItem value="delivery">Delivery</SelectItem><SelectItem value="quantity">Quantity</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Reason</Label><Textarea value={disputeForm.dispute_reason} onChange={e => setDisputeForm(p => ({ ...p, dispute_reason: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => addDispute.mutate({ ...disputeForm, customer_name: selectedCustomer?.name, customer_id: selectedCustomer?.id, company_id: activeCompanyId })} disabled={addDispute.isPending}>Save Dispute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
