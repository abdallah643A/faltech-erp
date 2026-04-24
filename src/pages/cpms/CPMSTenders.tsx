import { useState, useEffect, useMemo } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import {
  Plus, FileText, RefreshCw, Pencil, Trash2, ArrowRight, Search,
  Clock, CheckCircle2, XCircle, Eye, Columns, SlidersHorizontal,
} from 'lucide-react';
import TenderBOQPanel from '@/components/cpms/TenderBOQPanel';
import { format, differenceInDays } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  draft: { color: 'bg-muted text-muted-foreground', icon: Clock },
  submitted: { color: 'bg-blue-100 text-blue-800', icon: FileText },
  under_review: { color: 'bg-yellow-100 text-yellow-800', icon: Eye },
  won: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  lost: { color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

const goNogoConfig: Record<string, string> = {
  go: 'bg-green-100 text-green-800',
  nogo: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

const submissionStatusConfig: Record<string, string> = {
  not_submitted: 'bg-muted text-muted-foreground',
  preparing: 'bg-blue-100 text-blue-800',
  submitted: 'bg-green-100 text-green-800',
  late: 'bg-red-100 text-red-800',
};

const projectTypes = ['Building', 'Infrastructure', 'Industrial', 'Residential', 'Commercial', 'MEP', 'Roads', 'Bridges', 'Other'];
const contractTypes = ['Lump Sum', 'Unit Price', 'Cost Plus', 'Design Build', 'EPC', 'BOT', 'PPP', 'Other'];
const projectSizes = ['Small', 'Medium', 'Large', 'Mega'];
const clientTypes = ['Government', 'Semi-Government', 'Private', 'International', 'NGO'];
const regions = ['Riyadh', 'Jeddah', 'Eastern Province', 'Makkah', 'Madinah', 'Tabuk', 'Asir', 'Qassim', 'Hail', 'Northern Borders', 'Jazan', 'Najran', 'Al Baha', 'Al Jouf'];

interface Tender {
  id: string;
  tender_number: string;
  title: string;
  description?: string;
  client_name?: string;
  client_id?: string;
  project_id?: string;
  status: string;
  submission_deadline?: string;
  opening_date?: string;
  estimated_value: number;
  submitted_value: number;
  bond_required: boolean;
  bond_amount: number;
  notes?: string;
  created_at: string;
  project_type?: string;
  contract_type?: string;
  duration_months?: number;
  city?: string;
  region?: string;
  received_date?: string;
  submission_date?: string;
  project_size?: string;
  go_nogo?: string;
  tech_pass?: boolean;
  tech_fail_reasons?: string;
  jv_information?: string;
  client_type?: string;
  submission_status?: string;
  remaining_days?: number;
  document_data?: string;
}

type ColumnKey = 'tender_number' | 'title' | 'project_type' | 'contract_type' | 'duration_months' | 'city' | 'region' |
  'estimated_value' | 'submission_status' | 'notes' | 'client_name' | 'client_type' | 'received_date' |
  'remaining_days' | 'document_data' | 'project_size' | 'go_nogo' | 'status' | 'tech_pass' |
  'tech_fail_reasons' | 'submission_date' | 'submission_deadline' | 'jv_information' | 'submitted_value' | 'actions';

const allColumns: { key: ColumnKey; label: string; labelAr?: string; defaultVisible: boolean }[] = [
  { key: 'tender_number', label: 'Tender #', defaultVisible: true },
  { key: 'title', label: 'Title', defaultVisible: true },
  { key: 'project_type', label: 'Project Type', defaultVisible: true },
  { key: 'contract_type', label: 'Contract Type', defaultVisible: true },
  { key: 'duration_months', label: 'Duration (M)', defaultVisible: true },
  { key: 'city', label: 'City', defaultVisible: true },
  { key: 'estimated_value', label: 'Project Value', defaultVisible: true },
  { key: 'submission_status', label: 'Submission Status', defaultVisible: true },
  { key: 'notes', label: 'Notes', defaultVisible: false },
  { key: 'client_name', label: 'Client', defaultVisible: true },
  { key: 'client_type', label: 'Client Type', defaultVisible: false },
  { key: 'received_date', label: 'Received Date', defaultVisible: true },
  { key: 'remaining_days', label: 'Remaining Days', defaultVisible: true },
  { key: 'document_data', label: 'Document Data', defaultVisible: false },
  { key: 'project_size', label: 'حجم المشروع', defaultVisible: true },
  { key: 'go_nogo', label: 'Go/NOGO', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'tech_pass', label: 'Tech. Pass', defaultVisible: true },
  { key: 'tech_fail_reasons', label: 'Technical Fail Reasons', defaultVisible: false },
  { key: 'submission_date', label: 'Submission Date', defaultVisible: true },
  { key: 'submission_deadline', label: 'Deadline', defaultVisible: false },
  { key: 'jv_information', label: 'JV Information', defaultVisible: false },
  { key: 'submitted_value', label: 'Submitted Value', defaultVisible: false },
  { key: 'region', label: 'Region', defaultVisible: false },
  { key: 'actions', label: '', defaultVisible: true },
];

const tenderSchema = z.object({
  tender_number: z.string().min(1, 'Tender Number is required'),
  title: z.string().min(1, 'Tender Name is required'),
  client_name: z.string().min(1, 'Client is required'),
  submission_deadline: z.string().min(1, 'Submission Deadline is required'),
  estimated_value: z.number().min(1, 'Bid Value must be greater than 0'),
  project_type: z.string().min(1, 'Project Type is required'),
});

type TenderFormValues = z.infer<typeof tenderSchema>;

const emptyForm = {
  tender_number: '', title: '', description: '', client_name: '', client_id: '',
  status: 'draft', estimated_value: 0, submitted_value: 0,
  submission_deadline: '', opening_date: '', bond_required: false, bond_amount: 0, notes: '',
  project_type: '', contract_type: '', duration_months: 0, city: '', region: '',
  received_date: '', submission_date: '', project_size: '', go_nogo: 'pending',
  tech_pass: false, tech_fail_reasons: '', jv_information: '', client_type: '',
  submission_status: 'not_submitted', document_data: '',
};

export default function CPMSTenders() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTender, setEditTender] = useState<Tender | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() =>
    new Set(allColumns.filter(c => c.defaultVisible).map(c => c.key))
  );

  const fetchTenders = async () => {
    setLoading(true);
    const [tendersRes, clientsRes] = await Promise.all([
      supabase.from('cpms_tenders' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('cpms_clients' as any).select('id, name'),
    ]);
    const data = ((tendersRes.data || []) as any[]).map(t => ({
      ...t,
      remaining_days: t.submission_deadline
        ? differenceInDays(new Date(t.submission_deadline), new Date())
        : null,
    }));
    setTenders(data);
    setClients((clientsRes.data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchTenders(); }, []);

  const handleSave = async () => {
    // Validate with Zod
    const result = tenderSchema.safeParse({
      tender_number: form.tender_number,
      title: form.title,
      client_name: form.client_name,
      submission_deadline: form.submission_deadline,
      estimated_value: form.estimated_value,
      project_type: form.project_type,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
      setValidationErrors(errs);
      return;
    }
    setValidationErrors({});
    const { remaining_days, ...raw } = { ...form, created_by: user?.id };
    // Convert empty strings to null for UUID / numeric / date fields to avoid Postgres type errors
    const payload = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === '' ? null : v])
    );
    if (editTender?.id) {
      const { error } = await supabase.from('cpms_tenders' as any).update(payload).eq('id', editTender.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Tender updated' });
    } else {
      const { error } = await supabase.from('cpms_tenders' as any).insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Tender created' });
    }
    setShowForm(false);
    setEditTender(null);
    fetchTenders();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tender?')) return;
    await supabase.from('cpms_tenders' as any).delete().eq('id', id);
    toast({ title: 'Tender deleted' });
    fetchTenders();
  };

  const handleConvertToProject = async (tender: Tender) => {
    const { data, error } = await supabase.from('cpms_projects' as any).insert({
      code: `PRJ-${tender.tender_number}`,
      name: tender.title,
      type: tender.project_type || 'building',
      status: 'planning',
      contract_value: tender.submitted_value || tender.estimated_value,
      client_name: tender.client_name,
      client_id: tender.client_id,
      description: tender.description,
      city: tender.city,
      created_by: user?.id,
    }).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('cpms_tenders' as any).update({ project_id: (data as any).id, status: 'won' }).eq('id', tender.id);
    toast({ title: 'Project created from tender!' });
    fetchTenders();
  };

  const filtered = tenders.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.tender_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: tenders.length,
    draft: tenders.filter(t => t.status === 'draft').length,
    submitted: tenders.filter(t => t.status === 'submitted' || t.status === 'under_review').length,
    won: tenders.filter(t => t.status === 'won').length,
    lost: tenders.filter(t => t.status === 'lost').length,
    totalValue: tenders.reduce((s, t) => s + (t.estimated_value || 0), 0),
  };
  const winRate = stats.won + stats.lost > 0 ? ((stats.won / (stats.won + stats.lost)) * 100).toFixed(0) : '0';

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const renderCellValue = (tender: Tender, key: ColumnKey) => {
    switch (key) {
      case 'tender_number': return <span className="font-mono font-medium">{tender.tender_number}</span>;
      case 'title': return <span className="font-medium max-w-[180px] truncate block">{tender.title}</span>;
      case 'project_type': return tender.project_type || '-';
      case 'contract_type': return tender.contract_type || '-';
      case 'duration_months': return tender.duration_months ? `${tender.duration_months}` : '-';
      case 'city': return tender.city || '-';
      case 'region': return tender.region || '-';
      case 'estimated_value': return <span className="text-right block">{(tender.estimated_value || 0).toLocaleString()}</span>;
      case 'submitted_value': return <span className="text-right block">{(tender.submitted_value || 0).toLocaleString()}</span>;
      case 'submission_status': {
        const ss = tender.submission_status || 'not_submitted';
        return <Badge className={submissionStatusConfig[ss] || 'bg-muted'}>{ss.replace('_', ' ')}</Badge>;
      }
      case 'notes': return <span className="max-w-[150px] truncate block text-muted-foreground">{tender.notes || '-'}</span>;
      case 'client_name': return tender.client_name || '-';
      case 'client_type': return tender.client_type || '-';
      case 'received_date': return tender.received_date ? format(new Date(tender.received_date), 'dd MMM yyyy') : '-';
      case 'remaining_days': {
        const rd = tender.remaining_days;
        if (rd == null) return '-';
        return <Badge className={rd < 0 ? 'bg-red-100 text-red-800' : rd <= 7 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>{rd}d</Badge>;
      }
      case 'document_data': return <span className="max-w-[120px] truncate block">{tender.document_data || '-'}</span>;
      case 'project_size': return tender.project_size ? <Badge variant="outline">{tender.project_size}</Badge> : '-';
      case 'go_nogo': {
        const gn = tender.go_nogo || 'pending';
        return <Badge className={goNogoConfig[gn] || 'bg-muted'}>{gn.toUpperCase()}</Badge>;
      }
      case 'status': {
        const cfg = statusConfig[tender.status] || statusConfig.draft;
        return <Badge className={cfg.color}>{tender.status.replace('_', ' ')}</Badge>;
      }
      case 'tech_pass': return tender.tech_pass === true ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : tender.tech_pass === false ? <XCircle className="h-4 w-4 text-red-500" /> : '-';
      case 'tech_fail_reasons': return <span className="max-w-[150px] truncate block text-muted-foreground">{tender.tech_fail_reasons || '-'}</span>;
      case 'submission_date': return tender.submission_date ? format(new Date(tender.submission_date), 'dd MMM yyyy') : '-';
      case 'submission_deadline': return tender.submission_deadline ? format(new Date(tender.submission_deadline), 'dd MMM yyyy') : '-';
      case 'jv_information': return <span className="max-w-[150px] truncate block">{tender.jv_information || '-'}</span>;
      case 'actions': return (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => { setEditTender(tender); setForm({ ...tender }); setShowForm(true); }}><Pencil className="h-3 w-3" /></Button>
          {tender.status !== 'won' && tender.status !== 'cancelled' && (
            <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handleConvertToProject(tender)} title="Convert to Project"><ArrowRight className="h-3 w-3" /></Button>
          )}
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(tender.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      );
      default: return '-';
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Tender Management
          </h1>
          <p className="text-sm text-muted-foreground">إدارة المناقصات</p>
        </div>
      <div className="flex gap-2">
          <ExportImportButtons
            data={filtered}
            columns={[
              { key: 'tender_number', header: 'Tender #' }, { key: 'title', header: 'Title' },
              { key: 'project_type', header: 'Project Type' }, { key: 'contract_type', header: 'Contract Type' },
              { key: 'duration_months', header: 'Duration (M)' }, { key: 'city', header: 'City' },
              { key: 'region', header: 'Region' }, { key: 'estimated_value', header: 'Est. Value' },
              { key: 'submitted_value', header: 'Submitted Value' }, { key: 'client_name', header: 'Client' },
              { key: 'client_type', header: 'Client Type' }, { key: 'status', header: 'Status' },
              { key: 'submission_status', header: 'Submission Status' }, { key: 'go_nogo', header: 'Go/NOGO' },
              { key: 'project_size', header: 'Project Size' }, { key: 'received_date', header: 'Received Date' },
              { key: 'submission_date', header: 'Submission Date' }, { key: 'jv_information', header: 'JV Info' },
              { key: 'notes', header: 'Notes' },
            ]}
            filename="cpms-tenders"
            title="CPMS Tenders"
            onImport={async (rows) => {
              const mapped = rows.map((r: any) => ({
                tender_number: r['Tender #'] || r.tender_number || '',
                title: r['Title'] || r.title || '',
                project_type: r['Project Type'] || r.project_type || null,
                contract_type: r['Contract Type'] || r.contract_type || null,
                duration_months: parseInt(r['Duration (M)'] || r.duration_months) || null,
                city: r['City'] || r.city || null,
                region: r['Region'] || r.region || null,
                estimated_value: parseFloat(r['Est. Value'] || r.estimated_value) || 0,
                submitted_value: parseFloat(r['Submitted Value'] || r.submitted_value) || 0,
                client_name: r['Client'] || r.client_name || null,
                client_type: r['Client Type'] || r.client_type || null,
                status: r['Status'] || r.status || 'draft',
                submission_status: r['Submission Status'] || r.submission_status || 'not_submitted',
                go_nogo: r['Go/NOGO'] || r.go_nogo || 'pending',
                project_size: r['Project Size'] || r.project_size || null,
                received_date: r['Received Date'] || r.received_date || null,
                submission_date: r['Submission Date'] || r.submission_date || null,
                jv_information: r['JV Info'] || r.jv_information || null,
                notes: r['Notes'] || r.notes || null,
                created_by: user?.id,
              })).filter((r: any) => r.tender_number && r.title);
              if (mapped.length > 0) {
                const { error } = await supabase.from('cpms_tenders' as any).insert(mapped);
                if (error) throw error;
              }
              fetchTenders();
            }}
          />
          <Button onClick={() => { setEditTender(null); setForm({ ...emptyForm }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Tender
          </Button>
          <Button variant="outline" onClick={fetchTenders}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-primary"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Tenders</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active/Submitted</p><p className="text-2xl font-bold">{stats.submitted}</p></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Won</p><p className="text-2xl font-bold">{stats.won}</p></CardContent></Card>
        <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Win Rate</p><p className="text-2xl font-bold">{winRate}%</p></CardContent></Card>
        <Card className="border-l-4 border-l-orange-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pipeline Value</p><p className="text-2xl font-bold">{(stats.totalValue / 1000000).toFixed(1)}M</p></CardContent></Card>
      </div>

      {/* Filters + Column Picker */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search tenders..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.keys(statusConfig).map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm"><Columns className="h-4 w-4 mr-1" /> Columns</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <ScrollArea className="h-80 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Toggle Columns</p>
              {allColumns.filter(c => c.key !== 'actions').map(col => (
                <label key={col.key} className="flex items-center gap-2 py-1.5 px-1 hover:bg-muted/50 rounded cursor-pointer">
                  <Checkbox checked={visibleColumns.has(col.key)} onCheckedChange={() => toggleColumn(col.key)} />
                  <span className="text-sm">{col.label}</span>
                </label>
              ))}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tenders Table */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {allColumns.filter(c => visibleColumns.has(c.key)).map(col => (
                    <TableHead key={col.key} className={col.key === 'estimated_value' || col.key === 'submitted_value' ? 'text-right' : ''}>
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={visibleColumns.size} className="text-center py-8"><RefreshCw className="animate-spin h-5 w-5 mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={visibleColumns.size} className="text-center py-8 text-muted-foreground">No tenders found</TableCell></TableRow>
                ) : filtered.map(t => (
                  <TableRow key={t.id}>
                    {allColumns.filter(c => visibleColumns.has(c.key)).map(col => (
                      <TableCell key={col.key}>{renderCellValue(t, col.key)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTender ? 'Edit Tender' : 'New Tender'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            {/* Row 1: Core - with validation */}
            <div className="space-y-2">
              <Label>Tender Number *</Label>
              <Input value={form.tender_number} onChange={e => setForm((f: any) => ({ ...f, tender_number: e.target.value }))} placeholder="TND-001" className={validationErrors.tender_number ? 'border-destructive' : ''} />
              {validationErrors.tender_number && <p className="text-xs text-destructive">{validationErrors.tender_number}</p>}
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="Tender title" className={validationErrors.title ? 'border-destructive' : ''} />
              {validationErrors.title && <p className="text-xs text-destructive">{validationErrors.title}</p>}
            </div>
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={form.client_id || 'none'} onValueChange={v => { const c = clients.find((c: any) => c.id === v); setForm((f: any) => ({ ...f, client_id: v === 'none' ? '' : v, client_name: c?.name || '' })); }}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              {validationErrors.client_name && <p className="text-xs text-destructive">{validationErrors.client_name}</p>}
            </div>

            {/* Row 2 */}
            <div className="space-y-2">
              <Label>Project Type *</Label>
              <Select value={form.project_type || 'none'} onValueChange={v => setForm((f: any) => ({ ...f, project_type: v === 'none' ? '' : v }))}>
                <SelectTrigger className={validationErrors.project_type ? 'border-destructive' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{projectTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              {validationErrors.project_type && <p className="text-xs text-destructive">{validationErrors.project_type}</p>}
            </div>
            <div className="space-y-2">
              <Label>Contract Type</Label>
              <Select value={form.contract_type || 'none'} onValueChange={v => setForm((f: any) => ({ ...f, contract_type: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{contractTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client Type</Label>
              <Select value={form.client_type || 'none'} onValueChange={v => setForm((f: any) => ({ ...f, client_type: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{clientTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Row 3 */}
            <div className="space-y-2"><Label>Duration (Months)</Label><Input type="number" value={form.duration_months || ''} onChange={e => setForm((f: any) => ({ ...f, duration_months: parseInt(e.target.value) || 0 }))} /></div>
            <div className="space-y-2"><Label>City</Label><Input value={form.city || ''} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={form.region || 'none'} onValueChange={v => setForm((f: any) => ({ ...f, region: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Row 4: Values */}
            <div className="space-y-2">
              <Label>Estimated Value (SAR) *</Label>
              <Input type="number" value={form.estimated_value} onChange={e => setForm((f: any) => ({ ...f, estimated_value: parseFloat(e.target.value) || 0 }))} className={validationErrors.estimated_value ? 'border-destructive' : ''} />
              {validationErrors.estimated_value && <p className="text-xs text-destructive">{validationErrors.estimated_value}</p>}
            </div>
            <div className="space-y-2"><Label>Submitted Value (SAR)</Label><Input type="number" value={form.submitted_value} onChange={e => setForm((f: any) => ({ ...f, submitted_value: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-2">
              <Label>Project Size (حجم المشروع)</Label>
              <Select value={form.project_size || 'none'} onValueChange={v => setForm((f: any) => ({ ...f, project_size: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{projectSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Row 5: Dates */}
            <div className="space-y-2"><Label>Received Date</Label><Input type="date" value={form.received_date || ''} onChange={e => setForm((f: any) => ({ ...f, received_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Submission Date</Label><Input type="date" value={form.submission_date || ''} onChange={e => setForm((f: any) => ({ ...f, submission_date: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Submission Deadline *</Label>
              <Input type="datetime-local" value={form.submission_deadline?.slice(0, 16) || ''} onChange={e => setForm((f: any) => ({ ...f, submission_deadline: e.target.value }))} className={validationErrors.submission_deadline ? 'border-destructive' : ''} />
              {validationErrors.submission_deadline && <p className="text-xs text-destructive">{validationErrors.submission_deadline}</p>}
            </div>

            {/* Row 6: Status fields */}
            <div className="space-y-2">
              <Label>{t('common.status')}</Label>
              <Select value={form.status} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(statusConfig).map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Submission Status</Label>
              <Select value={form.submission_status || 'not_submitted'} onValueChange={v => setForm((f: any) => ({ ...f, submission_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_submitted">Not Submitted</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Go/NOGO</Label>
              <Select value={form.go_nogo || 'pending'} onValueChange={v => setForm((f: any) => ({ ...f, go_nogo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('common.pending')}</SelectItem>
                  <SelectItem value="go">GO</SelectItem>
                  <SelectItem value="nogo">NO GO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 7: Technical */}
            <div className="space-y-2 flex items-end gap-2">
              <div className="flex-1">
                <Label>Tech. Pass</Label>
                <Select value={form.tech_pass === true ? 'yes' : form.tech_pass === false ? 'no' : 'none'} onValueChange={v => setForm((f: any) => ({ ...f, tech_pass: v === 'yes' ? true : v === 'no' ? false : null }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">N/A</SelectItem><SelectItem value="yes">Pass</SelectItem><SelectItem value="no">Fail</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 col-span-2"><Label>Technical Fail Reasons</Label><Input value={form.tech_fail_reasons || ''} onChange={e => setForm((f: any) => ({ ...f, tech_fail_reasons: e.target.value }))} placeholder="Reasons for technical failure" /></div>

            {/* Row 8 */}
            <div className="space-y-2 col-span-2"><Label>JV Information</Label><Input value={form.jv_information || ''} onChange={e => setForm((f: any) => ({ ...f, jv_information: e.target.value }))} placeholder="Joint venture partner details" /></div>
            <div className="space-y-2"><Label>Document Data</Label><Input value={form.document_data || ''} onChange={e => setForm((f: any) => ({ ...f, document_data: e.target.value }))} placeholder="Document ref" /></div>

            {/* Row 9 */}
            <div className="space-y-2 col-span-3"><Label>{t('common.description')}</Label><Textarea value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-2 col-span-3"><Label>{t('common.notes')}</Label><Textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          {Object.keys(validationErrors).length > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">Please fix the following errors:</p>
              <ul className="text-xs text-destructive mt-1 list-disc list-inside">
                {Object.values(validationErrors).map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowForm(false); setValidationErrors({}); }}>{t('common.cancel')}</Button>
            <Button onClick={handleSave}>{t('common.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <TenderBOQPanel />
    </div>
  );
}
