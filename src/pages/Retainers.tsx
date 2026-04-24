import { useState, useCallback } from 'react';
import { CustomerSelector, SelectedCustomer } from '@/components/customers/CustomerSelector';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { PaginationControls, usePagination } from '@/components/ui/pagination-controls';
import { KPISkeleton, TableSkeleton } from '@/components/ui/skeleton-loaders';
import {
  RefreshCw, Plus, DollarSign, Calendar, Clock, TrendingUp, Pause, Play,
  XCircle, MoreVertical, Users, BarChart3, Zap,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, differenceInDays, addMonths, addWeeks, addQuarters, addYears } from 'date-fns';

interface Retainer {
  id: string;
  customer_name: string;
  customer_code: string | null;
  customer_id: string | null;
  amount: number;
  currency: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  next_invoice_date: string | null;
  description: string | null;
  status: string;
  hours_included: number | null;
  hours_used: number | null;
  auto_send: boolean;
  send_channel: string;
  created_at: string;
}

const emptyForm = {
  customer_name: '', customer_code: '', amount: 0, currency: 'SAR',
  frequency: 'monthly', start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: '', description: '', hours_included: '', hours_used: 0,
  auto_send: false, send_channel: 'email',
};

export default function Retainers() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: retainers = [], isLoading } = useQuery({
    queryKey: ['retainers', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('retainers').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Retainer[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload: any = {
        customer_name: values.customer_name,
        customer_code: values.customer_code || null,
        amount: Number(values.amount),
        currency: values.currency,
        frequency: values.frequency,
        start_date: values.start_date,
        end_date: values.end_date || null,
        description: values.description || null,
        hours_included: values.hours_included ? Number(values.hours_included) : null,
        hours_used: Number(values.hours_used) || 0,
        auto_send: values.auto_send,
        send_channel: values.send_channel,
        company_id: activeCompanyId,
        created_by: user?.id,
      };
      // Calculate next invoice date
      const start = new Date(values.start_date);
      const nextFn = { weekly: addWeeks, monthly: addMonths, quarterly: addQuarters, yearly: addYears };
      payload.next_invoice_date = format(
        (nextFn as any)[values.frequency]?.(start, 1) || addMonths(start, 1),
        'yyyy-MM-dd'
      );

      if (editId) {
        const { error } = await supabase.from('retainers').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('retainers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retainers'] });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
      toast({ title: editId ? 'Retainer updated' : 'Retainer created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('retainers').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retainers'] });
      toast({ title: 'Status updated' });
    },
  });

  const activeRetainers = retainers.filter(r => r.status === 'active');
  const monthlyRevenue = activeRetainers.reduce((s, r) => {
    const multiplier = { weekly: 4.33, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
    return s + r.amount * ((multiplier as any)[r.frequency] || 1);
  }, 0);
  const yearlyForecast = monthlyRevenue * 12;

  const filtered = retainers.filter(r =>
    r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.customer_code || '').toLowerCase().includes(search.toLowerCase())
  );
  const { paginatedItems, currentPage, pageSize, totalItems, handlePageChange, handlePageSizeChange } = usePagination(filtered, 25);

  const openEdit = (r: Retainer) => {
    setEditId(r.id);
    setForm({
      customer_name: r.customer_name,
      customer_code: r.customer_code || '',
      amount: r.amount,
      currency: r.currency,
      frequency: r.frequency,
      start_date: r.start_date,
      end_date: r.end_date || '',
      description: r.description || '',
      hours_included: r.hours_included?.toString() || '',
      hours_used: r.hours_used || 0,
      auto_send: r.auto_send,
      send_channel: r.send_channel,
    });
    setDialogOpen(true);
  };

  const getDaysUntilNext = (date: string | null) => {
    if (!date) return null;
    return differenceInDays(new Date(date), new Date());
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'paused': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'completed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return '';
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-primary" />
            {language === 'ar' ? 'الاشتراكات والتوكيلات' : 'Retainer & Subscription Billing'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'إدارة الفواتير المتكررة للعملاء' : 'Manage recurring client billing with auto-invoicing'}
          </p>
        </div>
        <Button onClick={() => { setEditId(null); setForm(emptyForm); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Retainer
        </Button>
      </div>

      {/* KPI Cards */}
      {isLoading ? <KPISkeleton count={4} /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Active Retainers</p>
                  <p className="text-2xl font-bold">{activeRetainers.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(monthlyRevenue)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Annual Forecast</p>
                  <p className="text-2xl font-bold">{formatCurrency(yearlyForecast)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Retainers</p>
                  <p className="text-2xl font-bold">{retainers.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">All Retainers</CardTitle>
            <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)}
              className="max-w-xs h-8 text-sm" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <TableSkeleton rows={6} cols={8} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Invoice</TableHead>
                  <TableHead>Days Until</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No retainers yet. Click "New Retainer" to create one.
                  </TableCell></TableRow>
                ) : paginatedItems.map(r => {
                  const daysUntil = getDaysUntilNext(r.next_invoice_date);
                  return (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(r)}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{r.customer_name}</p>
                          {r.customer_code && <p className="text-xs text-muted-foreground">{r.customer_code}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(r.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">{r.frequency}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.next_invoice_date ? format(new Date(r.next_invoice_date), 'MMM dd, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        {daysUntil !== null ? (
                          <Badge className={daysUntil <= 3 ? 'bg-destructive/10 text-destructive border-destructive/20' : daysUntil <= 7 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'} variant="outline">
                            {daysUntil} days
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.hours_included ? (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{r.hours_used || 0}</span>
                            <span className="text-muted-foreground">/ {r.hours_included}h</span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.auto_send && <Zap className="h-4 w-4 text-amber-500" />}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(r)}>Edit</DropdownMenuItem>
                            {r.status === 'active' && (
                              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: r.id, status: 'paused' })}>
                                <Pause className="h-4 w-4 mr-2" /> Pause
                              </DropdownMenuItem>
                            )}
                            {r.status === 'paused' && (
                              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: r.id, status: 'active' })}>
                                <Play className="h-4 w-4 mr-2" /> Resume
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => statusMutation.mutate({ id: r.id, status: 'cancelled' })} className="text-destructive">
                              <XCircle className="h-4 w-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <PaginationControls currentPage={currentPage} totalItems={totalItems} pageSize={pageSize}
            onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Retainer' : 'Create New Retainer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Client (Business Partner) *</Label>
                <CustomerSelector
                  value={form.customer_name ? {
                    id: null,
                    code: form.customer_code || '',
                    name: form.customer_name,
                    phone: '',
                    type: 'business_partner',
                  } : null}
                  onChange={(c) => {
                    if (c) {
                      setForm({ ...form, customer_name: c.name, customer_code: c.code });
                    } else {
                      setForm({ ...form, customer_name: '', customer_code: '' });
                    }
                  }}
                  required
                />
              </div>
              <div>
                <Label>Amount *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Frequency *</Label>
                <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div>
                <Label>Hours Included</Label>
                <Input type="number" value={form.hours_included} onChange={e => setForm({ ...form, hours_included: e.target.value })} placeholder="e.g. 40" />
              </div>
              <div>
                <Label>Send Channel</Label>
                <Select value={form.send_channel} onValueChange={v => setForm({ ...form, send_channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch checked={form.auto_send} onCheckedChange={v => setForm({ ...form, auto_send: v })} />
                <Label>Auto-generate & send invoice on schedule</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.customer_name || !form.amount || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
