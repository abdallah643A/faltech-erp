import { useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Clock, AlertTriangle, Phone, Mail, MessageSquare, Plus, CheckCircle2, Search } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const AGING_BUCKETS = [
  { key: 'current', label: 'Current', min: 0, max: 30, color: 'hsl(var(--primary))' },
  { key: '31-60', label: '31-60', min: 31, max: 60, color: 'hsl(142 76% 36%)' },
  { key: '61-90', label: '61-90', min: 61, max: 90, color: 'hsl(48 96% 53%)' },
  { key: '91-120', label: '91-120', min: 91, max: 120, color: 'hsl(25 95% 53%)' },
  { key: '120+', label: '120+', min: 121, max: Infinity, color: 'hsl(0 84% 60%)' },
];

export default function ARCollections() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState<string>('all');
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; invoiceId: string }>({ open: false, invoiceId: '' });
  const [noteForm, setNoteForm] = useState({ note: '', contact_method: 'phone', promised_payment_date: '', is_disputed: false });

  const { data: invoices = [] } = useQuery({
    queryKey: ['ar-collections', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('*').in('status', ['open', 'overdue', 'partially_paid']).order('doc_due_date', { ascending: true });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['collection-notes', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('collection_notes' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['collection-tasks', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('collection_tasks' as any).select('*').order('due_date') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const addNote = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('collection_notes' as any).insert({
        ...data,
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-notes'] });
      toast({ title: 'Collection note added' });
      setNoteDialog({ open: false, invoiceId: '' });
      setNoteForm({ note: '', contact_method: 'phone', promised_payment_date: '', is_disputed: false });
    },
  });

  const addTask = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await (supabase.from('collection_tasks' as any).insert({
        invoice_id: invoiceId,
        assigned_to: user?.id,
        assigned_to_name: (profile as any)?.full_name,
        task_type: 'follow_up',
        description: 'Follow up on payment',
        due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        status: 'pending',
        priority: 'medium',
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-tasks'] });
      toast({ title: 'Follow-up task created' });
    },
  });

  const enriched = useMemo(() => invoices.map(inv => {
    const dueDate = inv.doc_due_date ? new Date(inv.doc_due_date) : new Date();
    const daysOverdue = Math.max(0, differenceInDays(new Date(), dueDate));
    const bucket = AGING_BUCKETS.find(b => daysOverdue >= b.min && daysOverdue <= b.max) || AGING_BUCKETS[4];
    const invoiceNotes = notes.filter((n: any) => n.invoice_id === inv.id);
    const lastContact = invoiceNotes[0]?.created_at;
    const promisedDate = invoiceNotes.find((n: any) => n.promised_payment_date)?.promised_payment_date;
    const isDisputed = invoiceNotes.some((n: any) => n.is_disputed);
    return { ...inv, daysOverdue, bucket, lastContact, promisedDate, isDisputed, noteCount: invoiceNotes.length };
  }), [invoices, notes]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (search) list = list.filter(i => i.customer_name?.toLowerCase().includes(search.toLowerCase()) || String(i.doc_num).includes(search));
    if (bucketFilter !== 'all') list = list.filter(i => i.bucket.key === bucketFilter);
    return list;
  }, [enriched, search, bucketFilter]);

  const agingData = AGING_BUCKETS.map(b => ({
    name: b.label,
    amount: enriched.filter(i => i.bucket.key === b.key).reduce((s, i) => s + (i.balance_due || 0), 0),
    count: enriched.filter(i => i.bucket.key === b.key).length,
    color: b.color,
  }));

  const totalOverdue = enriched.filter(i => i.daysOverdue > 0).reduce((s, i) => s + (i.balance_due || 0), 0);
  const totalOpen = enriched.reduce((s, i) => s + (i.balance_due || 0), 0);
  const disputedCount = enriched.filter(i => i.isDisputed).length;
  const pendingTasks = tasks.filter((t: any) => t.status === 'pending').length;

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">AR Collections Workbench</h1>
        <p className="text-sm text-muted-foreground">Manage receivables follow-up and collection efforts</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Open AR</p><p className="text-2xl font-bold">SAR {totalOpen.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Overdue Amount</p><p className="text-2xl font-bold text-destructive">SAR {totalOverdue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Disputed</p><p className="text-2xl font-bold">{disputedCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Tasks</p><p className="text-2xl font-bold">{pendingTasks}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Aging Buckets</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agingData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `SAR ${v.toLocaleString()}`} />
                <Bar dataKey="amount">{agingData.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Distribution by Bucket</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={agingData.filter(d => d.amount > 0)} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} label={({ name, count }: any) => `${name} (${count})`}>
                  {agingData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `SAR ${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices ({filtered.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search customer or invoice..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={bucketFilter} onValueChange={setBucketFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buckets</SelectItem>
                {AGING_BUCKETS.map(b => <SelectItem key={b.key} value={b.key}>{b.label} days</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead>Promised</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(inv => (
                  <TableRow key={inv.id} className={inv.isDisputed ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">{inv.doc_num}</TableCell>
                    <TableCell>{inv.customer_name}</TableCell>
                    <TableCell className="text-right font-medium">SAR {(inv.balance_due || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{inv.doc_due_date ? format(new Date(inv.doc_due_date), 'PP') : '—'}</TableCell>
                    <TableCell>
                      {inv.daysOverdue > 0 ? <Badge variant="destructive" className="text-xs">{inv.daysOverdue}d</Badge> : <Badge variant="secondary" className="text-xs">Current</Badge>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{inv.bucket.label}</Badge></TableCell>
                    <TableCell className="text-xs">{inv.lastContact ? format(new Date(inv.lastContact), 'PP') : '—'}</TableCell>
                    <TableCell className="text-xs">{inv.promisedDate ? format(new Date(inv.promisedDate), 'PP') : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setNoteDialog({ open: true, invoiceId: inv.id })} title="Add note">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => addTask.mutate(inv.id)} title="Create task">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.description}</TableCell>
                    <TableCell className="text-sm">{t.assigned_to_name || '—'}</TableCell>
                    <TableCell className="text-sm">{t.due_date ? format(new Date(t.due_date), 'PP') : '—'}</TableCell>
                    <TableCell><Badge variant={t.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">{t.priority}</Badge></TableCell>
                    <TableCell><Badge variant={t.status === 'completed' ? 'default' : 'outline'} className="text-xs">{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={noteDialog.open} onOpenChange={open => setNoteDialog(d => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Collection Note</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Note *</Label><Textarea value={noteForm.note} onChange={e => setNoteForm(f => ({ ...f, note: e.target.value }))} placeholder="Describe the contact..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Method</Label>
                <Select value={noteForm.contact_method} onValueChange={v => setNoteForm(f => ({ ...f, contact_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone"><Phone className="h-3 w-3 inline mr-1" />{t('common.phone')}</SelectItem>
                    <SelectItem value="email"><Mail className="h-3 w-3 inline mr-1" />{t('common.email')}</SelectItem>
                    <SelectItem value="whatsapp"><MessageSquare className="h-3 w-3 inline mr-1" />WhatsApp</SelectItem>
                    <SelectItem value="visit">Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Promised Payment Date</Label>
                <Input type="date" value={noteForm.promised_payment_date} onChange={e => setNoteForm(f => ({ ...f, promised_payment_date: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={noteForm.is_disputed} onChange={e => setNoteForm(f => ({ ...f, is_disputed: e.target.checked }))} />
              Mark as disputed
            </label>
            <Button className="w-full" onClick={() => addNote.mutate({ invoice_id: noteDialog.invoiceId, ...noteForm })} disabled={!noteForm.note}>
              Save Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
