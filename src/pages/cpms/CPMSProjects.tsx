import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls, usePagination } from '@/components/ui/pagination-controls';
import { TableSkeleton } from '@/components/ui/skeleton-loaders';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Search, Building2, Eye, Pencil, Trash2, Filter,
  DollarSign, Calendar, MapPin, HardHat, ArrowUpDown, Download,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface CPMSProjectRow {
  id: string;
  project_number: string | null;
  code: string;
  name: string;
  type: string;
  status: string;
  contract_value: number;
  budgeted_cost: number;
  actual_cost: number;
  start_date: string | null;
  target_completion_date: string | null;
  end_date: string | null;
  client_name: string | null;
  city: string | null;
  site_address: string | null;
  site_state: string | null;
  site_zip: string | null;
  country: string | null;
  project_manager_name: string | null;
  notes: string | null;
  description: string | null;
  total_budget: number;
  progress: number;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'bid', label: 'Bid', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'awarded', label: 'Awarded', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'completed', label: 'Complete', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' },
  // legacy statuses
  { value: 'planning', label: 'Planning', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800 border-green-200' },
];

const TYPE_OPTIONS = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'building', label: 'Building' },
  { value: 'civil', label: 'Civil' },
  { value: 'mep', label: 'MEP' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'other', label: 'Other' },
];

const getStatusBadge = (status: string) => {
  const s = STATUS_OPTIONS.find(o => o.value === status);
  return <Badge variant="outline" className={s?.color || 'bg-muted text-muted-foreground'}>{s?.label || status}</Badge>;
};

const emptyForm = {
  name: '', code: '', type: 'commercial', status: 'bid',
  contract_value: 0, budgeted_cost: 0,
  start_date: '', target_completion_date: '',
  client_name: '', project_manager_name: '',
  site_address: '', city: '', site_state: '', site_zip: '', country: 'Saudi Arabia',
  notes: '', description: '',
};

export default function CPMSProjects() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();

  const [projects, setProjects] = useState<CPMSProjectRow[]>([]);
  const [expenseTotals, setExpenseTotals] = useState<Record<string, number>>({});
  const [invoiceTotals, setInvoiceTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const fetchProjects = async () => {
    setLoading(true);
    let q = supabase.from('cpms_projects').select('*').order('created_at', { ascending: false });
    if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
    const [{ data, error }, expRes, invRes] = await Promise.all([
      q,
      supabase.from('cpms_expenses' as any).select('project_id, amount'),
      supabase.from('ar_invoices').select('cpms_project_id, total, status').not('cpms_project_id', 'is', null),
    ]);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    setProjects((data || []) as any);
    // Aggregate expense totals per project
    const eTotals: Record<string, number> = {};
    ((expRes.data || []) as any[]).forEach((e: any) => {
      if (e.project_id) eTotals[e.project_id] = (eTotals[e.project_id] || 0) + (e.amount || 0);
    });
    setExpenseTotals(eTotals);
    // Aggregate invoice totals per project
    const iTotals: Record<string, number> = {};
    ((invRes.data || []) as any[]).forEach((i: any) => {
      if (i.cpms_project_id) iTotals[i.cpms_project_id] = (iTotals[i.cpms_project_id] || 0) + (i.total || 0);
    });
    setInvoiceTotals(iTotals);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, [activeCompanyId]);

  // Auto-open add form when navigated with ?action=add
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      setEditingId(null);
      setForm(emptyForm);
      setShowForm(true);
      // Clean up URL
      navigate('/cpms/projects', { replace: true });
    }
  }, [location.search]);

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
      || (p.project_number || '').toLowerCase().includes(search.toLowerCase())
      || (p.client_name || '').toLowerCase().includes(search.toLowerCase())
      || p.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchType = filterType === 'all' || p.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const { paginatedItems, currentPage, pageSize, totalItems, totalPages, handlePageChange, handlePageSizeChange } = usePagination(filtered, 25);

  const handleSave = async () => {
    if (!form.name) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    try {
      if (editingId) {
        const { error } = await supabase.from('cpms_projects').update({
          name: form.name, code: form.code || form.name.substring(0, 10).toUpperCase(),
          type: form.type, status: form.status,
          contract_value: form.contract_value, budgeted_cost: form.budgeted_cost,
          start_date: form.start_date || null, target_completion_date: form.target_completion_date || null,
          client_name: form.client_name || null, project_manager_name: form.project_manager_name || null,
          site_address: form.site_address || null, city: form.city || null,
          site_state: form.site_state || null, site_zip: form.site_zip || null,
          country: form.country || null, notes: form.notes || null, description: form.description || null,
        } as any).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Project updated' });
      } else {
        const { error } = await supabase.from('cpms_projects').insert({
          name: form.name, code: form.code || form.name.substring(0, 10).toUpperCase().replace(/\s/g, '-'),
          type: form.type, status: form.status,
          contract_value: form.contract_value, budgeted_cost: form.budgeted_cost,
          start_date: form.start_date || null, target_completion_date: form.target_completion_date || null,
          client_name: form.client_name || null, project_manager_name: form.project_manager_name || null,
          site_address: form.site_address || null, city: form.city || null,
          site_state: form.site_state || null, site_zip: form.site_zip || null,
          country: form.country || null, notes: form.notes || null, description: form.description || null,
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        } as any).select().single();
        if (error) throw error;
        toast({ title: 'Project created' });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchProjects();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleEdit = (p: CPMSProjectRow) => {
    setEditingId(p.id);
    setForm({
      name: p.name, code: p.code, type: p.type, status: p.status,
      contract_value: p.contract_value || 0, budgeted_cost: p.budgeted_cost || 0,
      start_date: p.start_date || '', target_completion_date: p.target_completion_date || '',
      client_name: p.client_name || '', project_manager_name: p.project_manager_name || '',
      site_address: p.site_address || '', city: p.city || '',
      site_state: p.site_state || '', site_zip: p.site_zip || '',
      country: p.country || 'Saudi Arabia', notes: p.notes || '', description: p.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    const { error } = await supabase.from('cpms_projects').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Project deleted' });
    fetchProjects();
  };

  // Stats
  const totalContract = projects.reduce((s, p) => s + (p.contract_value || 0), 0);
  const totalBudget = projects.reduce((s, p) => s + (p.budgeted_cost || p.total_budget || 0), 0);
  const activeCount = projects.filter(p => ['in_progress', 'active'].includes(p.status)).length;
  const bidCount = projects.filter(p => p.status === 'bid').length;
  const overBudgetCount = projects.filter(p => {
    const spent = expenseTotals[p.id] || 0;
    const budget = p.budgeted_cost || 0;
    return budget > 0 && spent > budget;
  }).length;

  const handleExportCSV = () => {
  const { t } = useLanguage();

    const headers = ['Project #', 'Name', 'Customer', 'Type', 'Status', 'Contract', 'Budget', 'Actual', '% Complete', 'Budget Health', 'Days Active', 'Profit Margin'];
    const rows = filtered.map(p => {
      const actual = expenseTotals[p.id] || 0;
      const billed = invoiceTotals[p.id] || 0;
      const pctComplete = p.contract_value > 0 ? (billed / p.contract_value * 100) : 0;
      const budget = p.budgeted_cost || 0;
      const budgetPct = budget > 0 ? (actual / budget * 100) : 0;
      const daysActive = p.start_date ? differenceInDays(new Date(), new Date(p.start_date)) : 0;
      const margin = p.contract_value > 0 ? ((p.contract_value - actual) / p.contract_value * 100) : 0;
      return [p.project_number || p.code, p.name, p.client_name || '', p.type, p.status, p.contract_value, budget, actual, pctComplete.toFixed(0), budgetPct < 90 ? 'Green' : budgetPct <= 100 ? 'Yellow' : 'Red', daysActive, margin.toFixed(1)];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cpms-projects.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-orange-100">
            <HardHat className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Construction Projects</h1>
            <p className="text-sm text-muted-foreground">{projects.length} projects • {activeCount} active</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }}
            className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Project
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium">Total Projects</p>
            <p className="text-2xl font-bold text-foreground">{projects.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{bidCount} in bidding</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium">Active Projects</p>
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
            <p className="text-xs text-green-600 mt-1">In progress</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium">Total Contract Value</p>
            <p className="text-2xl font-bold text-foreground">{(totalContract / 1e6).toFixed(1)}M</p>
            <p className="text-xs text-muted-foreground mt-1">All projects</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground font-medium">Total Budget</p>
            <p className="text-2xl font-bold text-foreground">{(totalBudget / 1e6).toFixed(1)}M</p>
            <p className="text-xs text-muted-foreground mt-1">Budgeted cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search projects, customers, codes..."
                  className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]"><Building2 className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={8} cols={8} /> : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Project #</TableHead>
                      <TableHead className="font-semibold">{t('common.name')}</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">{t('common.status')}</TableHead>
                      <TableHead className="font-semibold text-right">Contract</TableHead>
                      <TableHead className="font-semibold text-right">% Complete</TableHead>
                      <TableHead className="font-semibold text-center">Budget Health</TableHead>
                      <TableHead className="font-semibold text-right">Days Active</TableHead>
                      <TableHead className="font-semibold text-right">Profit Margin</TableHead>
                      <TableHead className="font-semibold text-center">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                          <HardHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No projects found</p>
                          <p className="text-sm">Create your first construction project</p>
                        </TableCell>
                      </TableRow>
                    ) : paginatedItems.map(p => {
                      const actual = expenseTotals[p.id] || 0;
                      const billed = invoiceTotals[p.id] || 0;
                      const pctComplete = p.contract_value > 0 ? Math.min((billed / p.contract_value * 100), 100) : 0;
                      const budget = p.budgeted_cost || 0;
                      const budgetPct = budget > 0 ? (actual / budget * 100) : 0;
                      const budgetHealth = budgetPct < 90 ? 'green' : budgetPct <= 100 ? 'yellow' : 'red';
                      const daysActive = p.start_date ? differenceInDays(new Date(), new Date(p.start_date)) : 0;
                      const margin = p.contract_value > 0 ? ((p.contract_value - actual) / p.contract_value * 100) : 0;
                      return (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-orange-50/50 transition-colors"
                        onClick={() => navigate(`/cpms/project/${p.id}`)}>
                        <TableCell className="font-mono text-sm font-medium text-orange-600">
                          {p.project_number || p.code}
                        </TableCell>
                        <TableCell className="font-medium max-w-[180px] truncate">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{p.client_name || '—'}</TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {(p.contract_value || 0).toLocaleString('en', { minimumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Progress value={pctComplete} className="h-2 w-16" />
                            <span className="text-xs font-medium w-10 text-right">{pctComplete.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={
                            budgetHealth === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                            budgetHealth === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-red-100 text-red-800 border-red-200'
                          }>
                            {budgetPct.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{daysActive}d</TableCell>
                        <TableCell className={`text-right font-medium text-sm ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {margin.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1 justify-center">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="View"
                              onClick={() => navigate(`/cpms/project/${p.id}`)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit"
                              onClick={() => handleEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete"
                              onClick={() => handleDelete(p.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="p-3 border-t">
                  <PaginationControls currentPage={currentPage} totalItems={totalItems}
                    pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-orange-500" />
              {editingId ? 'Edit Project' : 'New Construction Project'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <Label>Project Name *</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tower A Construction" />
                  </div>
                  <div>
                    <Label>Project Code</Label>
                    <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Auto-generated if empty" />
                  </div>
                  <div>
                    <Label>Project Type</Label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Customer / Client</Label>
                    <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Client name" />
                  </div>
                  <div>
                    <Label>Project Manager</Label>
                    <Input value={form.project_manager_name} onChange={e => setForm({ ...form, project_manager_name: e.target.value })} placeholder="Manager name" />
                  </div>
                  <div>
                    <Label>{t('common.status')}</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.filter(s => !['planning', 'active'].includes(s.value)).map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Financial */}
              <div>
                <h3 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" /> Financial
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contract Amount</Label>
                    <Input type="number" value={form.contract_value} onChange={e => setForm({ ...form, contract_value: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Budgeted Cost</Label>
                    <Input type="number" value={form.budgeted_cost} onChange={e => setForm({ ...form, budgeted_cost: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h3 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Dates
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Target Completion</Label>
                    <Input type="date" value={form.target_completion_date} onChange={e => setForm({ ...form, target_completion_date: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Site Address */}
              <div>
                <h3 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> Site Location
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input value={form.site_address} onChange={e => setForm({ ...form, site_address: e.target.value })} placeholder="Street address" />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div>
                    <Label>State / Province</Label>
                    <Input value={form.site_state} onChange={e => setForm({ ...form, site_state: e.target.value })} />
                  </div>
                  <div>
                    <Label>ZIP / Postal Code</Label>
                    <Input value={form.site_zip} onChange={e => setForm({ ...form, site_zip: e.target.value })} />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Description / Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3} placeholder="Project notes, scope, special requirements..." />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>{t('common.cancel')}</Button>
                <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600 text-white">
                  {editingId ? 'Update Project' : 'Create Project'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
