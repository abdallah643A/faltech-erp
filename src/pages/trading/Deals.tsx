import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { formatSAR } from '@/lib/currency';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeftRight, Plus, Search, Eye, Edit, Trash2, TrendingUp, TrendingDown,
  AlertTriangle, Package, ArrowRight, Ship, FileText, ShoppingCart, DollarSign,
  BarChart3, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';

const DEAL_STATUSES = ['Quote', 'Active', 'Shipped', 'Complete'];
const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'CNY', 'JPY', 'INR'];

interface DealForm {
  purchase_order_id: string;
  sales_order_id: string;
  shipment_id: string;
  product_name: string;
  quantity: number;
  buy_price: number;
  buy_currency: string;
  buy_exchange_rate: number;
  sell_price: number;
  sell_currency: string;
  sell_exchange_rate: number;
  status: string;
  supplier_name: string;
  customer_name: string;
}

const emptyForm: DealForm = {
  purchase_order_id: '', sales_order_id: '', shipment_id: '',
  product_name: '', quantity: 0, buy_price: 0, buy_currency: 'SAR', buy_exchange_rate: 1,
  sell_price: 0, sell_currency: 'SAR', sell_exchange_rate: 1,
  status: 'Active', supplier_name: '', customer_name: '',
};

export default function Deals() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DealForm>(emptyForm);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reportView, setReportView] = useState(false);

  // Fetch deals
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('deals').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Fetch POs, SOs, Shipments for dropdowns
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['po-dropdown-deals', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('purchase_orders').select('id, po_number, vendor_name, total, currency').order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['so-dropdown-deals', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('sales_orders').select('id, doc_num, customer_name, total, currency').order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipment-dropdown-deals', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('shipments').select('id, shipment_number, status').order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  // Save deal
  const saveMutation = useMutation({
    mutationFn: async (data: DealForm) => {
      const payload: any = {
        ...data,
        purchase_order_id: data.purchase_order_id || null,
        sales_order_id: data.sales_order_id || null,
        shipment_id: data.shipment_id || null,
        company_id: activeCompanyId,
      };
      if (editId) {
        const { error } = await supabase.from('deals').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from('deals').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success(editId ? 'Deal updated' : 'Deal created');
      setFormOpen(false); setEditId(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('deals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal deleted'); setDetailId(null);
    },
  });

  // Auto-fill from PO/SO selection
  const handlePOChange = (poId: string) => {
    setForm(f => ({ ...f, purchase_order_id: poId }));
    const po = purchaseOrders.find((p: any) => p.id === poId);
    if (po) {
      setForm(f => ({
        ...f, supplier_name: po.vendor_name || '', buy_price: po.total || 0,
        buy_currency: po.currency || 'SAR',
      }));
    }
  };

  const handleSOChange = (soId: string) => {
    setForm(f => ({ ...f, sales_order_id: soId }));
    const so = salesOrders.find((s: any) => s.id === soId);
    if (so) {
      setForm(f => ({
        ...f, customer_name: so.customer_name || '', sell_price: so.total || 0,
        sell_currency: so.currency || 'SAR',
      }));
    }
  };

  const openEdit = (d: any) => {
    setForm({
      purchase_order_id: d.purchase_order_id || '', sales_order_id: d.sales_order_id || '',
      shipment_id: d.shipment_id || '', product_name: d.product_name || '',
      quantity: d.quantity || 0, buy_price: d.buy_price || 0,
      buy_currency: d.buy_currency || 'SAR', buy_exchange_rate: d.buy_exchange_rate || 1,
      sell_price: d.sell_price || 0, sell_currency: d.sell_currency || 'SAR',
      sell_exchange_rate: d.sell_exchange_rate || 1, status: d.status || 'Active',
      supplier_name: d.supplier_name || '', customer_name: d.customer_name || '',
    });
    setEditId(d.id);
    setFormOpen(true);
  };

  // Computed
  const filtered = useMemo(() => {
    return deals.filter((d: any) => {
      const matchSearch = !search || [d.deal_number, d.product_name, d.customer_name, d.supplier_name]
        .filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [deals, search, statusFilter]);

  const selectedDeal = detailId ? deals.find((d: any) => d.id === detailId) : null;

  const formMargin = (form.sell_price * form.sell_exchange_rate) - (form.buy_price * form.buy_exchange_rate);
  const formMarginPct = (form.sell_price * form.sell_exchange_rate) > 0
    ? (formMargin / (form.sell_price * form.sell_exchange_rate)) * 100 : 0;

  // Stats
  const totalRevenue = deals.reduce((s: number, d: any) => s + (d.sell_price * (d.sell_exchange_rate || 1)), 0);
  const totalCost = deals.reduce((s: number, d: any) => s + (d.buy_price * (d.buy_exchange_rate || 1)), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = deals.length > 0 ? deals.reduce((s: number, d: any) => s + (d.margin_percentage || 0), 0) / deals.length : 0;

  // Report data
  const profitByProduct = useMemo(() => {
    const map: Record<string, { product: string; profit: number; revenue: number }> = {};
    deals.forEach((d: any) => {
      const name = d.product_name || 'Unknown';
      if (!map[name]) map[name] = { product: name, profit: 0, revenue: 0 };
      map[name].profit += d.actual_margin || d.preliminary_margin || 0;
      map[name].revenue += (d.sell_price || 0) * (d.sell_exchange_rate || 1);
    });
    return Object.values(map).sort((a, b) => b.profit - a.profit).slice(0, 10);
  }, [deals]);

  const marginTrend = useMemo(() => {
    return deals.slice().reverse().map((d: any) => ({
      deal: d.deal_number,
      margin: d.margin_percentage || 0,
    })).slice(-20);
  }, [deals]);

  const exportExcel = () => {
    const rows = filtered.map((d: any) => ({
      'Deal #': d.deal_number,
      'Product': d.product_name,
      'Qty': d.quantity,
      'Customer': d.customer_name,
      'Supplier': d.supplier_name,
      'Buy Price': d.buy_price,
      'Buy Cur': d.buy_currency,
      'Sell Price': d.sell_price,
      'Sell Cur': d.sell_currency,
      'Revenue (SAR)': (d.sell_price || 0) * (d.sell_exchange_rate || 1),
      'Cost (SAR)': (d.buy_price || 0) * (d.buy_exchange_rate || 1),
      'Landed Cost': d.landed_cost || 0,
      'Gross Profit': d.actual_margin || d.preliminary_margin || 0,
      'Margin %': (d.margin_percentage || 0).toFixed(2),
      'Status': d.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Deals');
    XLSX.writeFile(wb, `Deals_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const getMarginColor = (pct: number) => {
    if (pct >= 15) return 'text-green-600';
    if (pct >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMarginBadge = (pct: number) => {
    if (pct >= 15) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (pct >= 5) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="h-8 w-8 text-blue-500" /> Back-to-Back Deals
          </h1>
          <p className="text-muted-foreground">Manage PO ↔ SO deals with full margin tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReportView(!reportView)}>
            <BarChart3 className="h-4 w-4 mr-2" /> {reportView ? 'List View' : 'Report'}
          </Button>
          <Button variant="outline" onClick={exportExcel}>Export Excel</Button>
          <Button onClick={() => { setForm(emptyForm); setEditId(null); setFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> Create Deal
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold">{formatSAR(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground">SAR</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold">{formatSAR(totalCost)}</p>
          <p className="text-xs text-muted-foreground">SAR</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total Profit</p>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatSAR(totalProfit)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Avg Margin</p>
          <p className={`text-2xl font-bold ${getMarginColor(avgMargin)}`}>{avgMargin.toFixed(1)}%</p>
        </CardContent></Card>
      </div>

      {reportView ? (
        /* ========= REPORT VIEW ========= */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Profit by Product (Top 10)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profitByProduct}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => formatSAR(v)} />
                  <RTooltip formatter={(v: number) => formatSAR(v) + ' SAR'} />
                  <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Margin Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={marginTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="deal" tick={{ fontSize: 10 }} />
                  <YAxis unit="%" />
                  <RTooltip formatter={(v: number) => v.toFixed(2) + '%'} />
                  <Line type="monotone" dataKey="margin" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ========= LIST VIEW ========= */
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search deal, product, customer, supplier..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {DEAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Buy</TableHead>
                    <TableHead className="text-right">Sell</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No deals found</TableCell></TableRow>
                  ) : filtered.map((d: any) => {
                    const margin = d.actual_margin || d.preliminary_margin || 0;
                    const pct = d.margin_percentage || 0;
                    return (
                      <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailId(d.id)}>
                        <TableCell className="font-medium">{d.deal_number}</TableCell>
                        <TableCell className="max-w-[140px] truncate">{d.product_name || '—'}</TableCell>
                        <TableCell>{d.customer_name || '—'}</TableCell>
                        <TableCell>{d.supplier_name || '—'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatSAR(d.buy_price)} {d.buy_currency !== 'SAR' && <span className="text-xs text-muted-foreground ml-1">{d.buy_currency}</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatSAR(d.sell_price)} {d.sell_currency !== 'SAR' && <span className="text-xs text-muted-foreground ml-1">{d.sell_currency}</span>}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatSAR(margin)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={getMarginBadge(pct)}>{pct.toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(d.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* ========= CREATE / EDIT DIALOG ========= */}
      <Dialog open={formOpen} onOpenChange={o => { if (!o) { setFormOpen(false); setEditId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Deal' : 'Create Deal'}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* Linked Documents */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Purchase Order</Label>
                <Select value={form.purchase_order_id} onValueChange={handlePOChange}>
                  <SelectTrigger><SelectValue placeholder="Select PO..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {purchaseOrders.map((po: any) => <SelectItem key={po.id} value={po.id}>{po.po_number} — {po.vendor_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sales Order</Label>
                <Select value={form.sales_order_id} onValueChange={handleSOChange}>
                  <SelectTrigger><SelectValue placeholder="Select SO..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {salesOrders.map((so: any) => <SelectItem key={so.id} value={so.id}>SO-{so.doc_num} — {so.customer_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Shipment</Label>
                <Select value={form.shipment_id} onValueChange={v => setForm(f => ({ ...f, shipment_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {shipments.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.shipment_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Product Name</Label><Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} /></div>
              <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} /></div>
            </div>

            {/* Buy / Sell Comparison */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="border-red-200 dark:border-red-900/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Purchase Side</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label className="text-xs">Supplier</Label><Input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Buy Price</Label><Input type="number" value={form.buy_price} onChange={e => setForm(f => ({ ...f, buy_price: parseFloat(e.target.value) || 0 }))} /></div>
                    <div><Label className="text-xs">Currency</Label>
                      <Select value={form.buy_currency} onValueChange={v => setForm(f => ({ ...f, buy_currency: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  {form.buy_currency !== 'SAR' && (
                    <div><Label className="text-xs">Exchange Rate to SAR</Label>
                      <Input type="number" step="0.0001" value={form.buy_exchange_rate} onChange={e => setForm(f => ({ ...f, buy_exchange_rate: parseFloat(e.target.value) || 1 }))} />
                      <p className="text-xs text-muted-foreground mt-1">= {formatSAR(form.buy_price * form.buy_exchange_rate)} SAR</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-green-200 dark:border-green-900/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Sales Side</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label className="text-xs">Customer</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Sell Price</Label><Input type="number" value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: parseFloat(e.target.value) || 0 }))} /></div>
                    <div><Label className="text-xs">Currency</Label>
                      <Select value={form.sell_currency} onValueChange={v => setForm(f => ({ ...f, sell_currency: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  {form.sell_currency !== 'SAR' && (
                    <div><Label className="text-xs">Exchange Rate to SAR</Label>
                      <Input type="number" step="0.0001" value={form.sell_exchange_rate} onChange={e => setForm(f => ({ ...f, sell_exchange_rate: parseFloat(e.target.value) || 1 }))} />
                      <p className="text-xs text-muted-foreground mt-1">= {formatSAR(form.sell_price * form.sell_exchange_rate)} SAR</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Live Margin */}
            <Card className={`border-2 ${formMargin < 0 ? 'border-red-500/50' : formMarginPct < 5 ? 'border-yellow-500/50' : 'border-green-500/30'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Preliminary Margin</p>
                    <p className={`text-2xl font-bold ${formMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatSAR(formMargin)} SAR
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Margin %</p>
                    <p className={`text-2xl font-bold ${getMarginColor(formMarginPct)}`}>{formMarginPct.toFixed(2)}%</p>
                  </div>
                </div>
                {formMargin < 0 && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Negative margin — review pricing</p>
                )}
                {(form.buy_currency !== form.sell_currency) && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <ArrowLeftRight className="h-3 w-3" /> FX impact: {form.buy_currency} → SAR (×{form.buy_exchange_rate}) | {form.sell_currency} → SAR (×{form.sell_exchange_rate})
                  </p>
                )}
              </CardContent>
            </Card>

            <div><Label>{t('common.status')}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFormOpen(false); setEditId(null); }}>{t('common.cancel')}</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {saveMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========= DEAL DETAIL (Split View) ========= */}
      <Dialog open={!!detailId} onOpenChange={o => { if (!o) setDetailId(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedDeal && (() => {
            const d = selectedDeal;
            const revSAR = (d.sell_price || 0) * (d.sell_exchange_rate || 1);
            const costSAR = (d.buy_price || 0) * (d.buy_exchange_rate || 1);
            const margin = d.actual_margin || d.preliminary_margin || 0;
            const pct = d.margin_percentage || 0;
            const linkedPO = purchaseOrders.find((po: any) => po.id === d.purchase_order_id);
            const linkedSO = salesOrders.find((so: any) => so.id === d.sales_order_id);
            const linkedShipment = shipments.find((s: any) => s.id === d.shipment_id);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <ArrowLeftRight className="h-6 w-6 text-blue-500" />
                    {d.deal_number}
                    <Badge variant="outline">{d.status}</Badge>
                    <Badge className={getMarginBadge(pct)}>{pct.toFixed(1)}%</Badge>
                  </DialogTitle>
                </DialogHeader>

                {/* Split View: Purchase | Profit | Sale */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Purchase Side */}
                  <Card className="border-red-200 dark:border-red-900/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-red-500" /> Purchase
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div><span className="text-muted-foreground">Supplier:</span> <strong>{d.supplier_name || '—'}</strong></div>
                      {linkedPO && <div><span className="text-muted-foreground">PO:</span> {linkedPO.po_number}</div>}
                      <div><span className="text-muted-foreground">Product:</span> {d.product_name || '—'}</div>
                      <div><span className="text-muted-foreground">Quantity:</span> {(d.quantity || 0).toLocaleString()}</div>
                      <div><span className="text-muted-foreground">Unit Price:</span> {formatSAR(d.buy_price)} {d.buy_currency}</div>
                      <Separator />
                      <div className="font-bold">Total Cost: {formatSAR(costSAR)} SAR</div>
                      {d.buy_currency !== 'SAR' && (
                        <p className="text-xs text-muted-foreground">FX: 1 {d.buy_currency} = {d.buy_exchange_rate} SAR</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Profit Center */}
                  <Card className={`border-2 ${margin < 0 ? 'border-red-500/50' : pct < 5 ? 'border-yellow-500/50' : 'border-green-500/30'}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {margin >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                        Profitability
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-mono">{formatSAR(revSAR)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Cost</span><span className="font-mono">({formatSAR(costSAR)})</span></div>
                      {d.landed_cost > 0 && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Landed Cost</span><span className="font-mono">{formatSAR(d.landed_cost)}</span></div>
                      )}
                      <Separator />
                      <div className={`flex justify-between font-bold text-lg ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <span>Gross Profit</span><span className="font-mono">{formatSAR(margin)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Margin</span>
                        <span className={`font-bold ${getMarginColor(pct)}`}>{pct.toFixed(2)}%</span>
                      </div>
                      {margin < 0 && (
                        <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-600 text-xs flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" /> Loss on this deal
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Sales Side */}
                  <Card className="border-green-200 dark:border-green-900/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" /> Sale
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div><span className="text-muted-foreground">Customer:</span> <strong>{d.customer_name || '—'}</strong></div>
                      {linkedSO && <div><span className="text-muted-foreground">SO:</span> SO-{linkedSO.doc_num}</div>}
                      <div><span className="text-muted-foreground">Product:</span> {d.product_name || '—'}</div>
                      <div><span className="text-muted-foreground">Quantity:</span> {(d.quantity || 0).toLocaleString()}</div>
                      <div><span className="text-muted-foreground">Unit Price:</span> {formatSAR(d.sell_price)} {d.sell_currency}</div>
                      <Separator />
                      <div className="font-bold">Total Revenue: {formatSAR(revSAR)} SAR</div>
                      {d.sell_currency !== 'SAR' && (
                        <p className="text-xs text-muted-foreground">FX: 1 {d.sell_currency} = {d.sell_exchange_rate} SAR</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Linked Shipment */}
                {linkedShipment && (
                  <Card>
                    <CardContent className="pt-4 flex items-center gap-3">
                      <Ship className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Linked Shipment: {linkedShipment.shipment_number}</p>
                        <p className="text-sm text-muted-foreground">Status: {linkedShipment.status}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => { openEdit(d); setDetailId(null); }}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button variant="destructive" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(d.id); }}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
