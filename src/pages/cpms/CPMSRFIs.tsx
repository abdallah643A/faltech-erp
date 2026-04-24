import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCPMS } from '@/hooks/useCPMS';
import { formatSAR } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Search, Filter, AlertTriangle, Clock, CheckCircle2, MessageSquare,
  Send, FileText, Calendar, DollarSign, ArrowLeft, Eye, Pencil, Trash2,
  RefreshCw, Bell,
} from 'lucide-react';
import { differenceInDays, format, addDays } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface RFI {
  id: string;
  rfi_number: string;
  project_id: string;
  from_company: string | null;
  from_person: string | null;
  to_company: string | null;
  to_person: string | null;
  subject: string;
  description: string | null;
  question: string | null;
  response: string | null;
  responded_by: string | null;
  responded_date: string | null;
  cost_impact: number | null;
  schedule_impact_days: number | null;
  priority: string | null;
  status: string | null;
  date_submitted: string | null;
  response_due_date: string | null;
  date_answered: string | null;
  raised_by: string | null;
  raised_by_name: string | null;
  raised_date: string | null;
  assigned_to: string | null;
  due_date: string | null;
  discipline: string | null;
  attachments: any[] | null;
  created_at: string | null;
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
const STATUSES = ['Open', 'Awaiting Response', 'Answered', 'Closed'] as const;

const priorityColors: Record<string, string> = {
  Low: 'bg-muted text-muted-foreground',
  Medium: 'bg-blue-100 text-blue-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
};

const statusColors: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-800',
  'Awaiting Response': 'bg-yellow-100 text-yellow-800',
  Answered: 'bg-green-100 text-green-800',
  Closed: 'bg-muted text-muted-foreground',
};

function getDueStatus(dueDate: string | null, status: string | null) {
  if (!dueDate || status === 'Answered' || status === 'Closed') return null;
  const days = differenceInDays(new Date(dueDate), new Date());
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'text-destructive font-bold' };
  if (days <= 3) return { label: `${days}d remaining`, color: 'text-yellow-600 font-medium' };
  return { label: `${days}d remaining`, color: 'text-muted-foreground' };
}

export default function CPMSRFIs() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { projects } = useCPMS();

  const [rfis, setRfis] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<RFI | null>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [editingRfi, setEditingRfi] = useState<RFI | null>(null);

  const emptyForm = {
    project_id: '', from_company: '', from_person: '', to_company: '', to_person: '',
    subject: '', question: '', priority: 'Medium', status: 'Open',
    response_due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    cost_impact: 0, schedule_impact_days: 0, discipline: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [responseText, setResponseText] = useState('');

  const fetchRFIs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('cpms_rfis').select('*').order('created_at', { ascending: false });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    setRfis((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchRFIs(); }, []);

  const handleCreate = async () => {
    if (!form.subject || !form.project_id) { toast({ title: 'Subject and Project required', variant: 'destructive' }); return; }
    const payload: any = {

      ...form, rfi_number: '', raised_by: user?.id,
      date_submitted: new Date().toISOString().split('T')[0],
      cost_impact: form.cost_impact || 0,
      schedule_impact_days: form.schedule_impact_days || 0,
    };
    if (editingRfi) {
      const { error } = await supabase.from('cpms_rfis').update(payload).eq('id', editingRfi.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'RFI updated' });
    } else {
      const { error } = await supabase.from('cpms_rfis').insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'RFI created' });
    }
    setShowForm(false);
    setEditingRfi(null);
    setForm(emptyForm);
    fetchRFIs();
  };

  const handleRespond = async () => {
    if (!showDetail || !responseText) return;
    const { error } = await supabase.from('cpms_rfis').update({
      response: responseText, status: 'Answered',
      responded_by: user?.id, responded_date: new Date().toISOString().split('T')[0],
      date_answered: new Date().toISOString().split('T')[0],
    } as any).eq('id', showDetail.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Response submitted' });
    setShowResponse(false);
    setResponseText('');
    setShowDetail(null);
    fetchRFIs();
  };

  const handleClose = async (id: string) => {
    const { error } = await supabase.from('cpms_rfis').update({ status: 'Closed' } as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'RFI closed' });
    setShowDetail(null);
    fetchRFIs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this RFI?')) return;
    const { error } = await supabase.from('cpms_rfis').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'RFI deleted' });
    fetchRFIs();
  };

  const openEdit = (rfi: RFI) => {
    setEditingRfi(rfi);
    setForm({
      project_id: rfi.project_id, from_company: rfi.from_company || '', from_person: rfi.from_person || '',
      to_company: rfi.to_company || '', to_person: rfi.to_person || '', subject: rfi.subject,
      question: rfi.question || rfi.description || '', priority: rfi.priority || 'Medium',
      status: rfi.status || 'Open', response_due_date: rfi.response_due_date || rfi.due_date || '',
      cost_impact: rfi.cost_impact || 0, schedule_impact_days: rfi.schedule_impact_days || 0,
      discipline: rfi.discipline || '',
    });
    setShowForm(true);
  };

  // Filtering
  const filtered = rfis.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
    if (filterProject !== 'all' && r.project_id !== filterProject) return false;
    if (search) {
      const s = search.toLowerCase();
      return r.rfi_number?.toLowerCase().includes(s) || r.subject?.toLowerCase().includes(s) ||
        r.to_company?.toLowerCase().includes(s) || r.from_company?.toLowerCase().includes(s);
    }
    return true;
  });

  // Stats
  const openCount = rfis.filter(r => r.status === 'Open' || r.status === 'Awaiting Response').length;
  const overdueCount = rfis.filter(r => {
    const due = r.response_due_date || r.due_date;
    return due && r.status !== 'Answered' && r.status !== 'Closed' && differenceInDays(new Date(due), new Date()) < 0;
  }).length;
  const answeredCount = rfis.filter(r => r.status === 'Answered').length;
  const avgResponseDays = (() => {
    const answered = rfis.filter(r => r.date_answered && r.date_submitted);
    if (answered.length === 0) return 0;
    const total = answered.reduce((s, r) => s + differenceInDays(new Date(r.date_answered!), new Date(r.date_submitted!)), 0);
    return Math.round(total / answered.length);
  })();

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin h-8 w-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RFI Management</h1>
          <p className="text-muted-foreground">Requests for Information</p>
        </div>
        <Button onClick={() => { setEditingRfi(null); setForm(emptyForm); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Create RFI
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><MessageSquare className="h-8 w-8 text-blue-500" /><div><p className="text-xs text-muted-foreground">Total RFIs</p><p className="text-2xl font-bold">{rfis.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-yellow-500" /><div><p className="text-xs text-muted-foreground">Open</p><p className="text-2xl font-bold">{openCount}</p></div></div></CardContent></Card>
        <Card className={overdueCount > 0 ? 'border-destructive' : ''}>
          <CardContent className="p-4"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-xs text-muted-foreground">Overdue</p><p className="text-2xl font-bold text-destructive">{overdueCount}</p></div></div></CardContent>
        </Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle2 className="h-8 w-8 text-green-500" /><div><p className="text-xs text-muted-foreground">Answered</p><p className="text-2xl font-bold">{answeredCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Calendar className="h-8 w-8 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Avg Response</p><p className="text-2xl font-bold">{avgResponseDays}d</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search RFIs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} - {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFI #</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No RFIs found</TableCell></TableRow>
              ) : filtered.map(rfi => {
                const due = rfi.response_due_date || rfi.due_date;
                const dueInfo = getDueStatus(due, rfi.status);
                return (
                  <TableRow key={rfi.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setShowDetail(rfi)}>
                    <TableCell className="font-mono font-medium">{rfi.rfi_number}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{rfi.subject}</TableCell>
                    <TableCell className="text-sm">{rfi.to_company || '-'}<br /><span className="text-muted-foreground text-xs">{rfi.to_person || ''}</span></TableCell>
                    <TableCell><Badge className={priorityColors[rfi.priority || 'Medium']}>{rfi.priority}</Badge></TableCell>
                    <TableCell><Badge className={statusColors[rfi.status || 'Open']}>{rfi.status}</Badge></TableCell>
                    <TableCell className="text-sm">{rfi.date_submitted || rfi.raised_date || '-'}</TableCell>
                    <TableCell>
                      {due ? (
                        <div>
                          <span className="text-sm">{due}</span>
                          {dueInfo && <p className={`text-xs ${dueInfo.color}`}>{dueInfo.label}</p>}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetail(rfi)}><Eye className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rfi)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(rfi.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditingRfi(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingRfi ? 'Edit RFI' : 'Create RFI'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Project *</Label>
                <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} - {p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From Company</Label><Input value={form.from_company} onChange={e => setForm(f => ({ ...f, from_company: e.target.value }))} /></div>
              <div><Label>From Person</Label><Input value={form.from_person} onChange={e => setForm(f => ({ ...f, from_person: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>To Company</Label><Input value={form.to_company} onChange={e => setForm(f => ({ ...f, to_company: e.target.value }))} placeholder="Consultant, Client, etc." /></div>
              <div><Label>To Person</Label><Input value={form.to_person} onChange={e => setForm(f => ({ ...f, to_person: e.target.value }))} /></div>
            </div>
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
            <div><Label>Question / Description</Label><Textarea value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} rows={4} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Response Due Date</Label><Input type="date" value={form.response_due_date} onChange={e => setForm(f => ({ ...f, response_due_date: e.target.value }))} /></div>
              <div><Label>Cost Impact (SAR)</Label><Input type="number" value={form.cost_impact} onChange={e => setForm(f => ({ ...f, cost_impact: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Schedule Impact (days)</Label><Input type="number" value={form.schedule_impact_days} onChange={e => setForm(f => ({ ...f, schedule_impact_days: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div><Label>Discipline</Label><Input value={form.discipline} onChange={e => setForm(f => ({ ...f, discipline: e.target.value }))} placeholder="Structural, MEP, Architectural..." /></div>
            <Button onClick={handleCreate} className="w-full">{editingRfi ? 'Update RFI' : 'Submit RFI'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={v => { if (!v) setShowDetail(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {showDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <DialogTitle>{showDetail.rfi_number}</DialogTitle>
                  <Badge className={statusColors[showDetail.status || 'Open']}>{showDetail.status}</Badge>
                  <Badge className={priorityColors[showDetail.priority || 'Medium']}>{showDetail.priority}</Badge>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{showDetail.subject}</h3>

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-medium">{showDetail.from_company || '-'}</p>
                    <p className="text-sm text-muted-foreground">{showDetail.from_person || showDetail.raised_by_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="font-medium">{showDetail.to_company || '-'}</p>
                    <p className="text-sm text-muted-foreground">{showDetail.to_person || showDetail.assigned_to || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p>{showDetail.date_submitted || showDetail.raised_date || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    {(() => {
                      const due = showDetail.response_due_date || showDetail.due_date;
                      const dueInfo = getDueStatus(due, showDetail.status);
                      return (
                        <div>
                          <p>{due || '-'}</p>
                          {dueInfo && <p className={`text-xs ${dueInfo.color}`}>{dueInfo.label}</p>}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {(showDetail.cost_impact || showDetail.schedule_impact_days) ? (
                  <div className="flex gap-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    {showDetail.cost_impact ? <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-yellow-600" /><span className="text-sm">Cost Impact: <strong>{formatSAR(showDetail.cost_impact)} SAR</strong></span></div> : null}
                    {showDetail.schedule_impact_days ? <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-yellow-600" /><span className="text-sm">Schedule Impact: <strong>{showDetail.schedule_impact_days} days</strong></span></div> : null}
                  </div>
                ) : null}

                <Card>
                  <CardHeader><CardTitle className="text-sm">Question</CardTitle></CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{showDetail.question || showDetail.description || 'No question provided'}</p>
                  </CardContent>
                </Card>

                <Card className={showDetail.response ? 'border-green-200' : 'border-dashed'}>
                  <CardHeader><CardTitle className="text-sm">{showDetail.response ? 'Response' : 'Awaiting Response'}</CardTitle></CardHeader>
                  <CardContent>
                    {showDetail.response ? (
                      <div>
                        <p className="whitespace-pre-wrap">{showDetail.response}</p>
                        <div className="mt-3 text-xs text-muted-foreground">
                          Answered on {showDetail.date_answered || showDetail.responded_date || '-'}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">No response yet</p>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  {showDetail.status !== 'Answered' && showDetail.status !== 'Closed' && (
                    <Button onClick={() => setShowResponse(true)} className="flex-1"><Send className="h-4 w-4 mr-1" /> Add Response</Button>
                  )}
                  {showDetail.status !== 'Closed' && (
                    <Button variant="outline" onClick={() => handleClose(showDetail.id)}>Mark Closed</Button>
                  )}
                  <Button variant="outline" onClick={() => { setShowDetail(null); openEdit(showDetail); }}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={showResponse} onOpenChange={setShowResponse}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Response to {showDetail?.rfi_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Response *</Label><Textarea value={responseText} onChange={e => setResponseText(e.target.value)} rows={6} placeholder="Enter your response..." /></div>
            <Button onClick={handleRespond} className="w-full" disabled={!responseText}>Submit Response</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
