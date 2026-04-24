import { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls, usePagination } from '@/components/ui/pagination-controls';
import { TableSkeleton } from '@/components/ui/skeleton-loaders';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Plus, Search, DollarSign, Filter, Pencil, Trash2,
  CalendarIcon, Receipt, CheckCircle2, AlertTriangle, Package, Users, Wrench, ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORIES = ['materials', 'labor', 'equipment', 'subcontractor', 'permits', 'other'] as const;
const PAYMENT_METHODS = ['cash', 'check', 'credit_card', 'ach', 'other'] as const;

const categoryColors: Record<string, string> = {
  materials: 'bg-blue-100 text-blue-800',
  labor: 'bg-green-100 text-green-800',
  equipment: 'bg-purple-100 text-purple-800',
  subcontractor: 'bg-orange-100 text-orange-800',
  permits: 'bg-yellow-100 text-yellow-800',
  other: 'bg-muted text-muted-foreground',
};

const categoryIcons: Record<string, React.ElementType> = {
  materials: Package,
  labor: Users,
  equipment: Wrench,
  subcontractor: ClipboardList,
  permits: Receipt,
  other: DollarSign,
};

interface Expense {
  id: string;
  expense_date: string;
  vendor_name: string;
  project_id: string | null;
  cost_code: string | null;
  category: string;
  description: string | null;
  amount: number;
  receipt_url: string | null;
  payment_method: string;
  paid: boolean;
  notes: string | null;
  created_at: string;
}

const emptyForm = {
  expense_date: format(new Date(), 'yyyy-MM-dd'),
  vendor_name: '',
  project_id: '',
  cost_code: '',
  category: 'other',
  description: '',
  amount: '',
  payment_method: 'other',
  paid: false,
  notes: '',
};

export default function CPMSExpenses() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterPaid, setFilterPaid] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();

  const loadData = async () => {
    setLoading(true);
    const [expRes, projRes] = await Promise.all([
      supabase.from('cpms_expenses' as any).select('*').order('expense_date', { ascending: false }),
      supabase.from('cpms_projects').select('id, name, project_number, code'),
    ]);
    setExpenses((expRes.data || []) as any);
    setProjects(projRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Check if navigated from project detail
    const state = location.state as any;
    if (state?.fromProject && state?.projectId) {
      setForm({ ...emptyForm, project_id: state.projectId });
      setShowForm(true);
      window.history.replaceState({}, '');
    }
  }, []);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (search) {
        const s = search.toLowerCase();
        if (!e.vendor_name.toLowerCase().includes(s) && !(e.description || '').toLowerCase().includes(s)) return false;
      }
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (filterProject !== 'all' && e.project_id !== filterProject) return false;
      if (filterPaid === 'paid' && !e.paid) return false;
      if (filterPaid === 'unpaid' && e.paid) return false;
      if (filterDateFrom && new Date(e.expense_date) < filterDateFrom) return false;
      if (filterDateTo && new Date(e.expense_date) > filterDateTo) return false;
      return true;
    });
  }, [expenses, search, filterCategory, filterProject, filterPaid, filterDateFrom, filterDateTo]);

  const totalUnpaid = useMemo(() => filtered.filter(e => !e.paid).reduce((s, e) => s + e.amount, 0), [filtered]);
  const totalAmount = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const { paginatedItems, currentPage, totalPages, totalItems, handlePageChange, handlePageSizeChange, pageSize } = usePagination(filtered, 25);

  const projectMap = useMemo(() => {
    const m: Record<string, any> = {};
    projects.forEach(p => { m[p.id] = p; });
    return m;
  }, [projects]);

  const handleSave = async () => {
    if (!form.vendor_name || !form.amount) {
      toast({ title: 'Error', description: 'Vendor and amount required', variant: 'destructive' });
      return;
    }
    const payload: any = {
      expense_date: form.expense_date,
      vendor_name: form.vendor_name.trim(),
      project_id: form.project_id || null,
      cost_code: form.cost_code || null,
      category: form.category,
      description: form.description || null,
      amount: parseFloat(form.amount as string) || 0,
      payment_method: form.payment_method,
      paid: form.paid,
      notes: form.notes || null,
      company_id: activeCompanyId,
    };

    if (editingId) {
      const { error } = await supabase.from('cpms_expenses' as any).update(payload).eq('id', editingId);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Expense updated' });
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from('cpms_expenses' as any).insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Expense added' });
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    loadData();
  };

  const handleEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setForm({
      expense_date: exp.expense_date,
      vendor_name: exp.vendor_name,
      project_id: exp.project_id || '',
      cost_code: exp.cost_code || '',
      category: exp.category,
      description: exp.description || '',
      amount: String(exp.amount),
      payment_method: exp.payment_method,
      paid: exp.paid,
      notes: exp.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    await supabase.from('cpms_expenses' as any).delete().eq('id', id);
    toast({ title: 'Deleted' });
    loadData();
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Track and manage project expenses</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Expense
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold">${totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-destructive" /> Total Unpaid
            </p>
            <p className="text-xl font-bold text-destructive">${totalUnpaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-xl font-bold text-green-600">{filtered.filter(e => e.paid).length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Records</p>
            <p className="text-xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search vendor, description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_number || p.code} - {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPaid} onValueChange={setFilterPaid}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>{t('common.description')}</TableHead>
                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      No expenses found
                    </TableCell></TableRow>
                  ) : paginatedItems.map((exp: Expense) => {
                    const proj = exp.project_id ? projectMap[exp.project_id] : null;
                    const CatIcon = categoryIcons[exp.category] || DollarSign;
                    return (
                      <TableRow key={exp.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(exp.expense_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="font-medium">{exp.vendor_name}</TableCell>
                        <TableCell>
                          {proj ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-300 cursor-pointer"
                              onClick={() => navigate(`/cpms/project/${exp.project_id}`)}>
                              {proj.project_number || proj.code}
                            </Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge className={categoryColors[exp.category]}>
                            <CatIcon className="h-3 w-3 mr-1" />
                            {exp.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{exp.description || '—'}</TableCell>
                        <TableCell className="text-right font-semibold">${exp.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {exp.paid ? (
                            <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" /> Unpaid</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(exp)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(exp.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="p-4 border-t">
                  <PaginationControls currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
            </div>
            {/* Vendor */}
            <div className="space-y-2">
              <Label>Vendor Name *</Label>
              <Input value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} placeholder="Enter vendor name" />
            </div>
            {/* Project */}
            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select value={form.project_id || 'none'} onValueChange={v => setForm({ ...form, project_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_number || p.code} - {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Category */}
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="pl-9" placeholder="0.00" />
              </div>
            </div>
            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Cost Code */}
            <div className="space-y-2">
              <Label>Cost Code</Label>
              <Input value={form.cost_code} onChange={e => setForm({ ...form, cost_code: e.target.value })} placeholder="e.g. 03-100" />
            </div>
            {/* Paid */}
            <div className="space-y-2 flex items-end gap-2">
              <div className="flex items-center gap-2 h-10">
                <Checkbox checked={form.paid} onCheckedChange={v => setForm({ ...form, paid: !!v })} id="paid-check" />
                <Label htmlFor="paid-check" className="cursor-pointer">Mark as Paid</Label>
              </div>
            </div>
            {/* Description */}
            <div className="col-span-2 space-y-2">
              <Label>{t('common.description')}</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Expense description..." rows={2} />
            </div>
            {/* Notes */}
            <div className="col-span-2 space-y-2">
              <Label>{t('common.notes')}</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600 text-white">
              {editingId ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
