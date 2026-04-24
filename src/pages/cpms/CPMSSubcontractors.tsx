import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SubcontractorPerformanceTab from '@/components/cpms/SubcontractorPerformanceTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Plus, ShieldAlert, AlertTriangle, Users, Star, Search, ArrowLeft,
  FileText, DollarSign, CheckCircle2, XCircle, Clock, Building2,
  Phone, Mail, MapPin, Shield, Receipt, CreditCard, AlertCircle
} from 'lucide-react';
import { useSubcontractors, useSubcontractOrders, useSubcontractPayments, useSubcontractorInvoices } from '@/hooks/useSubcontractorMgmt';
import { useCPMS } from '@/hooks/useCPMS';
import { useLanguage } from '@/contexts/LanguageContext';

const TRADES = ['Concrete', 'Framing', 'Electrical', 'Plumbing', 'HVAC', 'Drywall', 'Painting', 'Flooring', 'Roofing', 'Landscaping', 'Other'];
const LIEN_WAIVER_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'conditional', label: 'Conditional (upon payment)' },
  { value: 'unconditional', label: 'Unconditional (after payment)' },
];

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'} ${!readonly ? 'cursor-pointer hover:text-yellow-400' : ''}`}
          onClick={() => !readonly && onChange?.(i)}
        />
      ))}
    </div>
  );
}

function ExpiryBadge({ date, label }: { date: string | null; label: string }) {
  if (!date) return <Badge variant="outline" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />No {label}</Badge>;
  const today = new Date();
  const expiry = new Date(date);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Expired {Math.abs(days)}d ago</Badge>;
  if (days < 30) return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />{days}d left</Badge>;
  if (days < 90) return <Badge className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />{days}d left</Badge>;
  return <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Valid ({days}d)</Badge>;
}

export default function SubcontractorPage() {
  const { projects } = useCPMS();
  const { list: subs, create: createSub, update: updateSub, remove: removeSub, checkCompliance, getExpiryStatus } = useSubcontractors();
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('active');

  const subsData = subs.data || [];
  const expiredCount = subsData.filter((s: any) => !checkCompliance(s).canPay).length;
  const expiringCount = subsData.filter((s: any) => {
    const ins = getExpiryStatus(s.insurance_expiry);
    const lic = getExpiryStatus(s.license_expiry);
    return ins === 'warning' || lic === 'warning';
  }).length;

  const filteredSubs = useMemo(() => {
    return subsData.filter((s: any) => {
      if (searchQuery && !s.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !s.code?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (tradeFilter !== 'all' && s.trade !== tradeFilter) return false;
      if (activeFilter === 'active' && s.is_active === false) return false;
      if (activeFilter === 'inactive' && s.is_active !== false) return false;
      return true;
    });
  }, [subsData, searchQuery, tradeFilter, activeFilter]);

  if (selectedSub) {
    return <SubcontractorDetail sub={selectedSub} onBack={() => setSelectedSub(null)} projects={projects} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subcontractor Management</h1>
          <p className="text-muted-foreground">Compliance gates, lien waivers & payment management</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Subcontractor</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Subcontractor</DialogTitle></DialogHeader>
            <SubcontractorForm onSubmit={(data) => { createSub.mutate(data); setShowAddDialog(false); }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><p className="text-sm text-muted-foreground">Total Subcontractors</p></div>
          <p className="text-2xl font-bold mt-1">{subsData.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><p className="text-sm text-muted-foreground">Active</p></div>
          <p className="text-2xl font-bold mt-1">{subsData.filter((s: any) => s.is_active !== false).length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /><p className="text-sm text-muted-foreground">Expired Compliance</p></div>
          <p className="text-2xl font-bold mt-1 text-destructive">{expiredCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /><p className="text-sm text-muted-foreground">Expiring Soon</p></div>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{expiringCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><Star className="h-4 w-4 text-yellow-400" /><p className="text-sm text-muted-foreground">Avg Rating</p></div>
          <p className="text-2xl font-bold mt-1">{subsData.length ? (subsData.reduce((s: number, sub: any) => s + (sub.rating || 0), 0) / subsData.filter((s: any) => s.rating > 0).length || 0).toFixed(1) : '—'}</p>
        </CardContent></Card>
      </div>

      {/* Compliance Alerts */}
      {expiredCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2"><ShieldAlert className="h-5 w-5 text-destructive" /><span className="font-semibold text-destructive">Compliance Alerts</span></div>
            <div className="space-y-1">
              {subsData.filter((s: any) => !checkCompliance(s).canPay).map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{s.name}:</span>
                  <span className="text-destructive">{checkCompliance(s).issues.join(', ')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or code..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={tradeFilter} onValueChange={setTradeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Trade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            {TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Trade</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Insurance</TableHead>
            <TableHead>License</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredSubs.map((s: any) => {
              const comp = checkCompliance(s);
              return (
                <TableRow key={s.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedSub(s)}>
                  <TableCell>
                    <div><span className="font-medium">{s.name}</span></div>
                    <div className="text-xs text-muted-foreground font-mono">{s.code}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{s.trade || '—'}</Badge></TableCell>
                  <TableCell>
                    <div className="text-sm">{s.contact_person || s.phone || '—'}</div>
                    {s.phone && s.contact_person && <div className="text-xs text-muted-foreground">{s.phone}</div>}
                  </TableCell>
                  <TableCell><StarRating value={s.rating || 0} readonly /></TableCell>
                  <TableCell><ExpiryBadge date={s.insurance_expiry} label="Insurance" /></TableCell>
                  <TableCell><ExpiryBadge date={s.license_expiry} label="License" /></TableCell>
                  <TableCell>
                    {comp.canPay
                      ? <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Compliant</Badge>
                      : <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Issues</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredSubs.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No subcontractors found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ===================== Subcontractor Form =====================
function SubcontractorForm({ onSubmit, initial }: { onSubmit: (d: any) => void; initial?: any }) {
  const [form, setForm] = useState(initial || {
    code: '', name: '', contact_person: '', email: '', phone: '', address: '', city: '', state: '', zip: '',
    trade: '', tax_registration: '', insurance_expiry: '', safety_cert_expiry: '', license_number: '', license_expiry: '',
    default_retention_pct: 10, rating: 0, notes: '', is_active: true,
  });
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Code *</Label><Input value={form.code} onChange={e => set('code', e.target.value)} placeholder="SC-001" /></div>
        <div><Label>Company Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => set('contact_person', e.target.value)} /></div>
        <div><Label>Trade</Label>
          <Select value={form.trade} onValueChange={v => set('trade', v)}>
            <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
            <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
      </div>
      <Separator />
      <p className="text-sm font-medium text-muted-foreground">Address</p>
      <div><Label>Street</Label><Input value={form.address} onChange={e => set('address', e.target.value)} /></div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>City</Label><Input value={form.city} onChange={e => set('city', e.target.value)} /></div>
        <div><Label>State</Label><Input value={form.state} onChange={e => set('state', e.target.value)} /></div>
        <div><Label>ZIP</Label><Input value={form.zip} onChange={e => set('zip', e.target.value)} /></div>
      </div>
      <Separator />
      <p className="text-sm font-medium text-muted-foreground">Compliance & Licensing</p>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Tax ID / Registration</Label><Input value={form.tax_registration} onChange={e => set('tax_registration', e.target.value)} /></div>
        <div><Label>License Number</Label><Input value={form.license_number} onChange={e => set('license_number', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>Insurance Expiry</Label><Input type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)} /></div>
        <div><Label>Safety Cert Expiry</Label><Input type="date" value={form.safety_cert_expiry} onChange={e => set('safety_cert_expiry', e.target.value)} /></div>
        <div><Label>License Expiry</Label><Input type="date" value={form.license_expiry} onChange={e => set('license_expiry', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Default Retention %</Label><Input type="number" value={form.default_retention_pct} onChange={e => set('default_retention_pct', Number(e.target.value))} /></div>
        <div><Label>Rating</Label><StarRating value={form.rating} onChange={v => set('rating', v)} /></div>
      </div>
      <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} /></div>
      <Button onClick={() => onSubmit(form)} className="w-full">{initial ? 'Update' : 'Add'} Subcontractor</Button>
    </div>
  );
}

// ===================== Subcontractor Detail =====================
function SubcontractorDetail({ sub, onBack, projects }: { sub: any; onBack: () => void; projects: any[] }) {
  const { update: updateSub, checkCompliance, getExpiryStatus } = useSubcontractors();
  const { orders } = useSubcontractOrders(null, sub.id);
  const { invoices } = useSubcontractorInvoices(sub.id);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const { createOrder } = useSubcontractOrders(null, sub.id);
  const { createInvoice, markPaid } = useSubcontractorInvoices(sub.id);

  const ordersData = orders.data || [];
  const invoicesData = invoices.data || [];
  const compliance = checkCompliance(sub);
  const totalContracts = ordersData.length;
  const totalContractValue = ordersData.reduce((s: number, o: any) => s + (o.contract_value || 0), 0);
  const totalPaid = invoicesData.filter((i: any) => i.paid).reduce((s: number, i: any) => s + (i.amount_to_pay || 0), 0);
  const unpaidInvoices = invoicesData.filter((i: any) => !i.paid);

  const [orderForm, setOrderForm] = useState({ project_id: '', scope_description: '', contract_value: 0, retention_pct: sub.default_retention_pct || 10, start_date: '', end_date: '', payment_terms: '', notes: '' });
  const [invoiceForm, setInvoiceForm] = useState({ subcontract_order_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], amount: 0, retention_pct: 10, lien_waiver_type: 'none', lien_waiver_received: false, notes: '' });
  const [payForm, setPayForm] = useState({ payment_method: '', payment_reference: '' });

  const handleCreateOrder = () => {
  const { t } = useLanguage();

    if (!compliance.canPay) {
      alert('Cannot create contract: ' + compliance.issues.join(', '));
      return;
    }
    createOrder.mutate({ ...orderForm, subcontractor_id: sub.id });
    setShowOrderDialog(false);
  };

  const handleReceiveInvoice = () => {
    const retention = invoiceForm.amount * (invoiceForm.retention_pct / 100);
    createInvoice.mutate({
      ...invoiceForm,
      subcontractor_id: sub.id,
      project_id: ordersData.find((o: any) => o.id === invoiceForm.subcontract_order_id)?.project_id,
      retention_held: retention,
      amount_to_pay: invoiceForm.amount - retention,
    });
    setShowInvoiceDialog(false);
  };

  const handleMarkPaid = () => {
  const { t } = useLanguage();

    if (!selectedInvoice) return;
    if (!selectedInvoice.lien_waiver_received) {
      alert('⚠️ LIEN WAIVER REQUIRED: Cannot mark as paid without a lien waiver on file. This protects you from mechanic\'s liens.');
      return;
    }
    markPaid.mutate({ id: selectedInvoice.id, ...payForm });
    setShowPayDialog(false);
    setSelectedInvoice(null);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back to Subcontractors</Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{sub.name}</h1>
            <Badge variant="outline">{sub.trade || 'General'}</Badge>
            {sub.is_active === false && <Badge variant="destructive">Inactive</Badge>}
          </div>
          <p className="text-sm text-muted-foreground font-mono mt-1">{sub.code}</p>
          <StarRating value={sub.rating || 0} readonly />
        </div>
        <div className="flex gap-2">
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger asChild><Button variant="outline">Edit</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Edit Subcontractor</DialogTitle></DialogHeader>
              <SubcontractorForm initial={sub} onSubmit={(d) => { updateSub.mutate({ id: sub.id, ...d }); setShowEditDialog(false); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info + Compliance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sub.contact_person && <div className="flex items-center gap-2"><Users className="h-3 w-3 text-muted-foreground" />{sub.contact_person}</div>}
            {sub.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" />{sub.phone}</div>}
            {sub.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" />{sub.email}</div>}
            {(sub.address || sub.city) && <div className="flex items-center gap-2"><MapPin className="h-3 w-3 text-muted-foreground" />{[sub.address, sub.city, sub.state, sub.zip].filter(Boolean).join(', ')}</div>}
          </CardContent>
        </Card>

        <Card className={!compliance.canPay ? 'border-destructive/50' : ''}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" />Compliance Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center"><span className="text-sm">Insurance</span><ExpiryBadge date={sub.insurance_expiry} label="Insurance" /></div>
            <div className="flex justify-between items-center"><span className="text-sm">License</span><ExpiryBadge date={sub.license_expiry} label="License" /></div>
            <div className="flex justify-between items-center"><span className="text-sm">Safety Cert</span><ExpiryBadge date={sub.safety_cert_expiry} label="Safety" /></div>
            <div className="flex justify-between items-center"><span className="text-sm">Tax ID</span>
              {sub.tax_registration ? <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />On file</Badge> : <Badge variant="outline" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Missing</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" />Performance</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Contracts</span><span className="font-medium">{totalContracts}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Value</span><span className="font-medium">${totalContractValue.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Paid</span><span className="font-medium">${totalPaid.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Unpaid Invoices</span><span className="font-medium text-destructive">{unpaidInvoices.length}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">Subcontracts ({ordersData.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoicesData.length})</TabsTrigger>
          <TabsTrigger value="payments">Payment Queue ({unpaidInvoices.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Subcontracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
              <DialogTrigger asChild><Button disabled={!compliance.canPay}><Plus className="h-4 w-4 mr-2" />New Subcontract</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Subcontract</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Project *</Label>
                    <Select value={orderForm.project_id} onValueChange={v => setOrderForm({ ...orderForm, project_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code || p.project_number} - {p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Scope of Work</Label><Textarea value={orderForm.scope_description} onChange={e => setOrderForm({ ...orderForm, scope_description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Contract Amount</Label><Input type="number" value={orderForm.contract_value} onChange={e => setOrderForm({ ...orderForm, contract_value: Number(e.target.value) })} /></div>
                    <div><Label>Retention %</Label><Input type="number" value={orderForm.retention_pct} onChange={e => setOrderForm({ ...orderForm, retention_pct: Number(e.target.value) })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Start Date</Label><Input type="date" value={orderForm.start_date} onChange={e => setOrderForm({ ...orderForm, start_date: e.target.value })} /></div>
                    <div><Label>Completion Date</Label><Input type="date" value={orderForm.end_date} onChange={e => setOrderForm({ ...orderForm, end_date: e.target.value })} /></div>
                  </div>
                  <div><Label>Payment Terms</Label><Input value={orderForm.payment_terms} onChange={e => setOrderForm({ ...orderForm, payment_terms: e.target.value })} placeholder="Net 30, etc." /></div>
                  <Button onClick={handleCreateOrder} className="w-full">Create Subcontract</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {!compliance.canPay && (
            <Card className="border-destructive/30 bg-destructive/5"><CardContent className="pt-4 text-sm text-destructive flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />Cannot create new subcontracts: {compliance.issues.join(', ')}
            </CardContent></Card>
          )}
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Order #</TableHead><TableHead>Scope</TableHead><TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Retention</TableHead><TableHead>Status</TableHead><TableHead>Dates</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {ordersData.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono">{o.order_number}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{o.scope_description}</TableCell>
                    <TableCell className="text-right font-medium">${(o.contract_value || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{o.retention_pct}%</TableCell>
                    <TableCell><Badge variant="outline">{o.status || 'active'}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.start_date || '—'} → {o.end_date || '—'}</TableCell>
                  </TableRow>
                ))}
                {ordersData.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No subcontracts yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
              <DialogTrigger asChild><Button><Receipt className="h-4 w-4 mr-2" />Receive Invoice</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Receive Subcontractor Invoice</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Subcontract Order *</Label>
                    <Select value={invoiceForm.subcontract_order_id} onValueChange={v => setInvoiceForm({ ...invoiceForm, subcontract_order_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                      <SelectContent>{ordersData.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.order_number} - ${(o.contract_value || 0).toLocaleString()}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Their Invoice #</Label><Input value={invoiceForm.invoice_number} onChange={e => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })} /></div>
                    <div><Label>Invoice Date</Label><Input type="date" value={invoiceForm.invoice_date} onChange={e => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Amount</Label><Input type="number" value={invoiceForm.amount} onChange={e => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })} /></div>
                    <div><Label>Retention %</Label><Input type="number" value={invoiceForm.retention_pct} onChange={e => setInvoiceForm({ ...invoiceForm, retention_pct: Number(e.target.value) })} /></div>
                  </div>
                  {invoiceForm.amount > 0 && (
                    <Card className="bg-muted/30"><CardContent className="pt-3 space-y-1 text-sm">
                      <div className="flex justify-between"><span>Invoice Amount:</span><span>${invoiceForm.amount.toLocaleString()}</span></div>
                      <div className="flex justify-between text-destructive"><span>Retention ({invoiceForm.retention_pct}%):</span><span>-${(invoiceForm.amount * invoiceForm.retention_pct / 100).toLocaleString()}</span></div>
                      <Separator />
                      <div className="flex justify-between font-semibold"><span>Amount to Pay:</span><span>${(invoiceForm.amount - invoiceForm.amount * invoiceForm.retention_pct / 100).toLocaleString()}</span></div>
                    </CardContent></Card>
                  )}
                  <Separator />
                  <p className="text-sm font-medium">Lien Waiver</p>
                  <div><Label>Waiver Type</Label>
                    <Select value={invoiceForm.lien_waiver_type} onValueChange={v => setInvoiceForm({ ...invoiceForm, lien_waiver_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{LIEN_WAIVER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={invoiceForm.lien_waiver_received} onCheckedChange={v => setInvoiceForm({ ...invoiceForm, lien_waiver_received: !!v })} />
                    <Label>Lien waiver received</Label>
                  </div>
                  <div><Label>Notes</Label><Textarea value={invoiceForm.notes} onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></div>
                  <Button onClick={handleReceiveInvoice} className="w-full">Receive Invoice</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Invoice #</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Retention</TableHead><TableHead className="text-right">To Pay</TableHead>
                <TableHead>Lien Waiver</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {invoicesData.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.invoice_date}</TableCell>
                    <TableCell className="text-right">${(inv.amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">${(inv.retention_held || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">${(inv.amount_to_pay || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {inv.lien_waiver_received
                        ? <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />{inv.lien_waiver_type}</Badge>
                        : <Badge variant="outline" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Missing</Badge>}
                    </TableCell>
                    <TableCell>
                      {inv.paid
                        ? <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>
                        : <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Unpaid</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
                {invoicesData.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No invoices received yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Payment Queue Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-4 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span><strong>Legal Protection:</strong> Never pay a subcontractor without a proper lien waiver on file. Conditional waivers are required before payment; unconditional waivers after payment is received.</span>
            </CardContent>
          </Card>
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Invoice #</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount Due</TableHead>
                <TableHead>Lien Waiver</TableHead><TableHead>Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {unpaidInvoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.invoice_date}</TableCell>
                    <TableCell className="text-right font-medium">${(inv.amount_to_pay || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {inv.lien_waiver_received
                        ? <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Received</Badge>
                        : <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Required</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={inv.lien_waiver_received ? 'default' : 'outline'}
                        disabled={!inv.lien_waiver_received}
                        onClick={() => { setSelectedInvoice(inv); setShowPayDialog(true); }}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />Mark Paid
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {unpaidInvoices.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No unpaid invoices</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <SubcontractorPerformanceTab
            subcontractorId={sub.id}
            subcontractorName={sub.name}
            projects={projects}
          />
        </TabsContent>
      </Tabs>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={v => { setShowPayDialog(v); if (!v) setSelectedInvoice(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Invoice as Paid</DialogTitle></DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <Card className="bg-muted/30"><CardContent className="pt-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Invoice:</span><span className="font-mono">{selectedInvoice.invoice_number}</span></div>
                <div className="flex justify-between"><span>Amount:</span><span className="font-semibold">${(selectedInvoice.amount_to_pay || 0).toLocaleString()}</span></div>
              </CardContent></Card>
              <div><Label>Payment Method</Label>
                <Select value={payForm.payment_method} onValueChange={v => setPayForm({ ...payForm, payment_method: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="ach">ACH Transfer</SelectItem>
                    <SelectItem value="wire">Wire Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reference (Check #, ACH confirmation, etc.)</Label><Input value={payForm.payment_reference} onChange={e => setPayForm({ ...payForm, payment_reference: e.target.value })} /></div>
              <Button onClick={handleMarkPaid} className="w-full">Confirm Payment</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
