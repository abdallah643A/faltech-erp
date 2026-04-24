import { useState, useEffect } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { SyncStatusBadge } from '@/components/sap/SyncStatusBadge';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus, DollarSign, Receipt, FileText, TrendingUp,
  MoreHorizontal, ArrowRight, CheckCircle2, XCircle, Send, CreditCard, Banknote,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(48, 96%, 53%)', 'hsl(0, 84%, 60%)'];
const invoiceStatusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  paid: 'bg-emerald-100 text-emerald-800',
  partially_paid: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
};

const STATUS_FLOW: Record<string, { next: string; label: string; icon: any }[]> = {
  draft: [{ next: 'submitted', label: 'Submit for Approval', icon: Send }],
  submitted: [
    { next: 'approved', label: 'Approve', icon: CheckCircle2 },
    { next: 'rejected', label: 'Reject', icon: XCircle },
  ],
  approved: [{ next: 'submitted', label: 'Revert to Submitted', icon: ArrowRight }],
  rejected: [{ next: 'draft', label: 'Revert to Draft', icon: ArrowRight }],
  partially_paid: [],
  paid: [],
};

interface Invoice {
  id: string;
  project_id: string;
  invoice_number: string;
  type: string;
  status: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  retention_amount: number;
  period_from?: string;
  period_to?: string;
  issue_date: string;
  due_date?: string;
  paid_date?: string;
  remarks?: string;
  sync_status?: string;
  sap_doc_entry?: string;
  last_synced_at?: string;
}

interface Collection {
  id: string;
  invoice_id: string;
  project_id: string;
  collection_number: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number?: string;
  bank_name?: string;
  remarks?: string;
  sync_status?: string;
  sap_doc_entry?: string;
  last_synced_at?: string;
}

interface BOQItem {
  id: string;
  project_id: string;
  category?: string;
  item_code?: string;
  description: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  actual_quantity: number;
  actual_amount: number;
  variance: number;
}

export default function CPMSFinance() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showBOQForm, setShowBOQForm] = useState(false);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedProject, setSelectedProject] = useState('all');
  const [invoiceForm, setInvoiceForm] = useState<any>({
    project_id: '', invoice_number: '', type: 'progress', status: 'draft',
    amount: 0, tax_amount: 0, total_amount: 0, retention_amount: 0,
    issue_date: new Date().toISOString().split('T')[0],
  });
  const [boqForm, setBoqForm] = useState<any>({
    project_id: '', category: '', item_code: '', description: '', unit: '',
    quantity: 0, unit_price: 0, actual_quantity: 0, actual_amount: 0,
  });
  const [collectionForm, setCollectionForm] = useState<any>({
    collection_number: '', amount: 0, payment_method: 'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '', bank_name: '', remarks: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const [invR, boqR, projR, colR] = await Promise.all([
      supabase.from('cpms_invoices' as any).select('*').order('issue_date', { ascending: false }),
      supabase.from('cpms_boq_items' as any).select('*').order('sort_order'),
      supabase.from('cpms_projects' as any).select('id, code, name, contract_value'),
      supabase.from('cpms_invoice_collections' as any).select('*').order('payment_date', { ascending: false }),
    ]);
    setInvoices((invR.data || []) as any);
    setBoqItems((boqR.data || []) as any);
    setProjects((projR.data || []) as any);
    setCollections((colR.data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (invoice: Invoice, newStatus: string) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'approved') updates.approved_by = user?.id;
    if (newStatus === 'paid') updates.paid_date = new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('cpms_invoices' as any).update(updates).eq('id', invoice.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Invoice ${newStatus}`, description: `Invoice #${invoice.invoice_number} is now ${newStatus}` });
    fetchData();
  };

  const handleInvoiceSave = async () => {
    if (!invoiceForm.project_id || !invoiceForm.invoice_number) return;
    const payload = Object.fromEntries(
      Object.entries({ ...invoiceForm, created_by: user?.id }).map(([k, v]) => [k, v === '' ? null : v])
    );
    const { error } = await supabase.from('cpms_invoices' as any).insert(payload);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Invoice created' });
    setShowInvoiceForm(false);
    setInvoiceForm({
      project_id: '', invoice_number: '', type: 'progress', status: 'draft',
      amount: 0, tax_amount: 0, total_amount: 0, retention_amount: 0,
      issue_date: new Date().toISOString().split('T')[0],
    });
    fetchData();
  };

  const handleCollectionSave = async () => {
    if (!selectedInvoice || !collectionForm.collection_number || collectionForm.amount <= 0) return;

    const payload = Object.fromEntries(
      Object.entries({
        ...collectionForm,
        invoice_id: selectedInvoice.id,
        project_id: selectedInvoice.project_id,
        created_by: user?.id,
      }).map(([k, v]) => [k, v === '' ? null : v])
    );

    const { error } = await supabase.from('cpms_invoice_collections' as any).insert(payload);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    // Calculate total collected including this new one
    const existingCollected = collections
      .filter(c => c.invoice_id === selectedInvoice.id)
      .reduce((s, c) => s + (c.amount || 0), 0);
    const totalCollected = existingCollected + collectionForm.amount;

    // Auto-update invoice status
    if (totalCollected >= (selectedInvoice.total_amount || 0)) {
      await supabase.from('cpms_invoices' as any).update({
        status: 'paid', paid_date: collectionForm.payment_date, updated_at: new Date().toISOString(),
      }).eq('id', selectedInvoice.id);
    } else if (totalCollected > 0 && selectedInvoice.status !== 'paid') {
      await supabase.from('cpms_invoices' as any).update({
        status: 'partially_paid', updated_at: new Date().toISOString(),
      }).eq('id', selectedInvoice.id);
    }

    toast({ title: 'Collection recorded', description: `${collectionForm.amount.toLocaleString()} SAR collected` });
    setShowCollectionForm(false);
    setSelectedInvoice(null);
    setCollectionForm({
      collection_number: '', amount: 0, payment_method: 'bank_transfer',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '', bank_name: '', remarks: '',
    });
    fetchData();
  };

  const openCollectionForm = (inv: Invoice) => {
  const { t } = useLanguage();

    setSelectedInvoice(inv);
    const invCollections = collections.filter(c => c.invoice_id === inv.id);
    const totalCollected = invCollections.reduce((s, c) => s + (c.amount || 0), 0);
    const remaining = (inv.total_amount || 0) - totalCollected;
    setCollectionForm({
      collection_number: `COL-${inv.invoice_number}-${invCollections.length + 1}`,
      amount: remaining > 0 ? remaining : 0,
      payment_method: 'bank_transfer',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '', bank_name: '', remarks: '',
    });
    setShowCollectionForm(true);
  };

  const handleBOQSave = async () => {
    if (!boqForm.project_id || !boqForm.description) return;
    const { error } = await supabase.from('cpms_boq_items' as any).insert(boqForm);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'BOQ item added' });
    setShowBOQForm(false);
    fetchData();
  };

  const getInvoiceCollected = (invoiceId: string) =>
    collections.filter(c => c.invoice_id === invoiceId).reduce((s, c) => s + (c.amount || 0), 0);

  const filteredInv = selectedProject === 'all' ? invoices : invoices.filter(i => i.project_id === selectedProject);
  const filteredBOQ = selectedProject === 'all' ? boqItems : boqItems.filter(b => b.project_id === selectedProject);

  const totalInvoiced = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPaid = collections.reduce((s, c) => s + (c.amount || 0), 0);
  const totalBOQ = boqItems.reduce((s, b) => s + (b.total_amount || 0), 0);
  const totalActual = boqItems.reduce((s, b) => s + (b.actual_amount || 0), 0);

  const typeDistribution = invoices.reduce((acc: any[], i) => {
    const ex = acc.find(a => a.name === i.type);
    if (ex) ex.value += i.total_amount; else acc.push({ name: i.type, value: i.total_amount });
    return acc;
  }, []);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" /> CPMS Finance & BOQ
          </h1>
          <p className="text-sm text-muted-foreground">الفواتير وجداول الكميات</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <SAPSyncButton entity="cpms_invoice" size="sm" />
          <ExportImportButtons
            data={invoices}
            columns={[
              { key: 'invoice_number', header: 'Invoice #' }, { key: 'type', header: 'Type' },
              { key: 'status', header: 'Status' }, { key: 'amount', header: 'Amount' },
              { key: 'tax_amount', header: 'Tax' }, { key: 'total_amount', header: 'Total' },
              { key: 'issue_date', header: 'Issue Date' }, { key: 'due_date', header: 'Due Date' },
            ]}
            filename="cpms-invoices"
            title="CPMS Invoices"
          />
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Invoiced</p><p className="text-2xl font-bold">{(totalInvoiced / 1000000).toFixed(1)}M</p></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Collected</p><p className="text-2xl font-bold">{(totalPaid / 1000000).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Outstanding: {((totalInvoiced - totalPaid) / 1000000).toFixed(1)}M</p></CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">BOQ Budget</p><p className="text-2xl font-bold">{(totalBOQ / 1000000).toFixed(1)}M</p></CardContent></Card>
        <Card className="border-l-4 border-l-orange-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Actual Cost</p><p className="text-2xl font-bold">{(totalActual / 1000000).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Variance: {((totalBOQ - totalActual) / 1000000).toFixed(1)}M</p></CardContent></Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices"><Receipt className="h-4 w-4 mr-1" /> Invoices ({filteredInv.length})</TabsTrigger>
          <TabsTrigger value="boq"><FileText className="h-4 w-4 mr-1" /> BOQ ({filteredBOQ.length})</TabsTrigger>
          <TabsTrigger value="collections"><Banknote className="h-4 w-4 mr-1" /> Collections ({collections.length})</TabsTrigger>
          <TabsTrigger value="analytics"><TrendingUp className="h-4 w-4 mr-1" /> Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Invoices</CardTitle>
              <Button size="sm" onClick={() => setShowInvoiceForm(true)}><Plus className="h-4 w-4 mr-1" /> New Invoice</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Issue Date</TableHead>
                     <TableHead>{t('common.status')}</TableHead>
                     <TableHead>Sync</TableHead>
                     <TableHead className="text-center">{t('common.actions')}</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInv.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No invoices</TableCell></TableRow>
                  ) : filteredInv.map(inv => {
                    const proj = projects.find(p => p.id === inv.project_id);
                    const collected = getInvoiceCollected(inv.id);
                    const balance = (inv.total_amount || 0) - collected;
                    const actions = STATUS_FLOW[inv.status] || [];
                    const canCollect = ['approved', 'partially_paid'].includes(inv.status);

                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>{proj?.code || '-'}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{inv.type}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{(inv.total_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">{collected > 0 ? collected.toLocaleString() : '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {balance > 0 ? balance.toLocaleString() : 'Paid'}
                        </TableCell>
                        <TableCell>{inv.issue_date ? format(new Date(inv.issue_date), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell><Badge className={invoiceStatusColors[inv.status] || ''}>{inv.status?.replace('_', ' ')}</Badge></TableCell>
                        <TableCell><SyncStatusBadge syncStatus={inv.sync_status || 'local'} /></TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {actions.map(a => (
                                <DropdownMenuItem key={a.next} onClick={() => handleStatusChange(inv, a.next)}>
                                  <a.icon className="h-4 w-4 mr-2" /> {a.label}
                                </DropdownMenuItem>
                              ))}
                              {actions.length > 0 && canCollect && <DropdownMenuSeparator />}
                              {canCollect && (
                                <DropdownMenuItem onClick={() => openCollectionForm(inv)}>
                                  <CreditCard className="h-4 w-4 mr-2" /> Record Collection
                                </DropdownMenuItem>
                              )}
                              {!canCollect && actions.length === 0 && inv.status === 'paid' && (
                                <DropdownMenuItem disabled>
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Fully Paid
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collections">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader><CardTitle className="text-base">Payment Collections</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                   <TableRow>
                     <TableHead>Collection #</TableHead>
                     <TableHead>Invoice #</TableHead>
                     <TableHead>Project</TableHead>
                     <TableHead>Method</TableHead>
                     <TableHead className="text-right">{t('common.amount')}</TableHead>
                     <TableHead>Payment Date</TableHead>
                     <TableHead>Reference</TableHead>
                     <TableHead>Sync</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No collections recorded</TableCell></TableRow>
                  ) : collections.map(c => {
                    const inv = invoices.find(i => i.id === c.invoice_id);
                    const proj = projects.find(p => p.id === c.project_id);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-medium">{c.collection_number}</TableCell>
                        <TableCell className="font-mono">{inv?.invoice_number || '-'}</TableCell>
                        <TableCell>{proj?.code || '-'}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{c.payment_method?.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{c.amount.toLocaleString()}</TableCell>
                        <TableCell>{c.payment_date ? format(new Date(c.payment_date), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell>{c.reference_number || '-'}</TableCell>
                        <TableCell><SyncStatusBadge syncStatus={c.sync_status || 'local'} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="boq">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Bill of Quantities</CardTitle>
              <Button size="sm" onClick={() => setShowBOQForm(true)}><Plus className="h-4 w-4 mr-1" /> Add BOQ Item</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>{t('common.description')}</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">{t('common.total')}</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBOQ.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No BOQ items</TableCell></TableRow>
                  ) : filteredBOQ.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono">{b.item_code || '-'}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{b.description}</TableCell>
                      <TableCell>{b.category || '-'}</TableCell>
                      <TableCell>{b.unit || '-'}</TableCell>
                      <TableCell className="text-right">{b.quantity}</TableCell>
                      <TableCell className="text-right">{b.unit_price.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">{(b.total_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{b.actual_amount.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-semibold ${b.variance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {b.variance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="text-sm">Invoice by Type</CardTitle></CardHeader>
              <CardContent>
                {typeDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${(value / 1000000).toFixed(1)}M`}>
                        {typeDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toLocaleString()} SAR`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-8 text-muted-foreground">No data</p>}
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="text-sm">Budget vs Actual per Project</CardTitle></CardHeader>
              <CardContent>
                {projects.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={projects.map(p => ({
                      name: p.code,
                      budget: boqItems.filter(b => b.project_id === p.id).reduce((s, b) => s + (b.total_amount || 0), 0) / 1000000,
                      actual: boqItems.filter(b => b.project_id === p.id).reduce((s, b) => s + (b.actual_amount || 0), 0) / 1000000,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}M SAR`} />
                      <Bar dataKey="budget" fill="hsl(var(--primary))" name="Budget" />
                      <Bar dataKey="actual" fill="hsl(0, 84%, 60%)" name="Actual" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-8 text-muted-foreground">No data</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invoice Form */}
      <Dialog open={showInvoiceForm} onOpenChange={setShowInvoiceForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={invoiceForm.project_id} onValueChange={v => setInvoiceForm((f: any) => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Invoice # *</Label><Input value={invoiceForm.invoice_number} onChange={e => setInvoiceForm((f: any) => ({ ...f, invoice_number: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>{t('common.type')}</Label>
              <Select value={invoiceForm.type} onValueChange={v => setInvoiceForm((f: any) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="retention">Retention</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="variation">Variation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{t('common.amount')}</Label><Input type="number" value={invoiceForm.amount} onChange={e => { const v = parseFloat(e.target.value) || 0; setInvoiceForm((f: any) => ({ ...f, amount: v, total_amount: v + f.tax_amount })); }} /></div>
            <div className="space-y-2"><Label>Tax</Label><Input type="number" value={invoiceForm.tax_amount} onChange={e => { const v = parseFloat(e.target.value) || 0; setInvoiceForm((f: any) => ({ ...f, tax_amount: v, total_amount: f.amount + v })); }} /></div>
            <div className="space-y-2"><Label>Issue Date</Label><Input type="date" value={invoiceForm.issue_date} onChange={e => setInvoiceForm((f: any) => ({ ...f, issue_date: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowInvoiceForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleInvoiceSave} disabled={!invoiceForm.project_id || !invoiceForm.invoice_number}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Collection Form */}
      <Dialog open={showCollectionForm} onOpenChange={v => { setShowCollectionForm(v); if (!v) setSelectedInvoice(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Collection — Invoice #{selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="mb-2 p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Invoice Total:</span><span className="font-semibold">{(selectedInvoice.total_amount || 0).toLocaleString()} SAR</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Already Collected:</span><span className="font-semibold text-green-600">{getInvoiceCollected(selectedInvoice.id).toLocaleString()} SAR</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Remaining:</span><span className="font-semibold text-amber-600">{((selectedInvoice.total_amount || 0) - getInvoiceCollected(selectedInvoice.id)).toLocaleString()} SAR</span></div>
              <Progress value={(getInvoiceCollected(selectedInvoice.id) / (selectedInvoice.total_amount || 1)) * 100} className="h-2 mt-2" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Collection # *</Label><Input value={collectionForm.collection_number} onChange={e => setCollectionForm((f: any) => ({ ...f, collection_number: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Amount *</Label><Input type="number" value={collectionForm.amount} onChange={e => setCollectionForm((f: any) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={collectionForm.payment_method} onValueChange={v => setCollectionForm((f: any) => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Payment Date</Label><Input type="date" value={collectionForm.payment_date} onChange={e => setCollectionForm((f: any) => ({ ...f, payment_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Reference #</Label><Input value={collectionForm.reference_number} onChange={e => setCollectionForm((f: any) => ({ ...f, reference_number: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Bank Name</Label><Input value={collectionForm.bank_name} onChange={e => setCollectionForm((f: any) => ({ ...f, bank_name: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowCollectionForm(false); setSelectedInvoice(null); }}>{t('common.cancel')}</Button>
            <Button onClick={handleCollectionSave} disabled={!collectionForm.collection_number || collectionForm.amount <= 0}>
              <CreditCard className="h-4 w-4 mr-1" /> Record Collection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* BOQ Form */}
      <Dialog open={showBOQForm} onOpenChange={setShowBOQForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add BOQ Item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={boqForm.project_id} onValueChange={v => setBoqForm((f: any) => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Item Code</Label><Input value={boqForm.item_code} onChange={e => setBoqForm((f: any) => ({ ...f, item_code: e.target.value }))} /></div>
            <div className="space-y-2 col-span-2"><Label>Description *</Label><Input value={boqForm.description} onChange={e => setBoqForm((f: any) => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Category</Label><Input value={boqForm.category} onChange={e => setBoqForm((f: any) => ({ ...f, category: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Unit</Label><Input value={boqForm.unit} onChange={e => setBoqForm((f: any) => ({ ...f, unit: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={boqForm.quantity} onChange={e => setBoqForm((f: any) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-2"><Label>Unit Price</Label><Input type="number" value={boqForm.unit_price} onChange={e => setBoqForm((f: any) => ({ ...f, unit_price: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowBOQForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleBOQSave} disabled={!boqForm.project_id || !boqForm.description}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
