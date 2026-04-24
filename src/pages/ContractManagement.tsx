import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContractManagement } from '@/hooks/useContractManagement';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Edit, Trash2, AlertTriangle, CheckCircle2, Calendar, Eye, Search, Shield, Scale, ArrowUpDown, Clock, DollarSign, TrendingUp, FileWarning, Gavel } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const contractExpCols: ColumnDef[] = [
  { key: 'contract_number', header: 'Contract #' }, { key: 'partner_name', header: 'Partner' },
  { key: 'contract_type', header: 'Type' }, { key: 'value', header: 'Value' },
  { key: 'start_date', header: 'Start Date' }, { key: 'end_date', header: 'End Date' },
  { key: 'status', header: 'Status' },
];

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  signed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  amended: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  terminated: 'bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const typeLabels: Record<string, string> = {
  customer: 'Customer', supplier: 'Supplier', subcontract: 'Subcontract',
  framework: 'Framework', nda: 'NDA', service: 'Service',
};

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function ContractManagement() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    contracts, amendments, obligations, guarantees, claims, variations,
    isLoading, createContract, updateContract, deleteContract,
    createAmendment, createObligation, createGuarantee, createClaim, createVariation,
    updateObligation, updateVariation, updateClaim, updateAmendment, updateGuarantee,
  } = useContractManagement();

  const [tab, setTab] = useState('register');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editContract, setEditContract] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const resetForm = () => setForm({});

  const filtered = contracts.filter((c: any) => {
    if (filterType !== 'all' && c.contract_type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return (c.contract_number || '').toLowerCase().includes(s) || (c.partner_name || '').toLowerCase().includes(s) || (c.title || '').toLowerCase().includes(s);
    }
    return true;
  });

  const totalValue = contracts.reduce((s: number, c: any) => s + Number(c.value || 0), 0);
  const activeCount = contracts.filter((c: any) => ['active', 'signed'].includes(c.status)).length;
  const expiringCount = contracts.filter((c: any) => { if (!c.end_date) return false; const d = differenceInDays(new Date(c.end_date), new Date()); return d >= 0 && d <= 90; }).length;
  const totalVariationImpact = variations.reduce((s: number, v: any) => s + Number(v.cost_impact || 0), 0);
  const overdueObligations = obligations.filter((o: any) => o.status === 'pending' && o.due_date && isPast(new Date(o.due_date))).length;

  const handleSave = () => {
    if (editContract) { updateContract.mutate({ id: editContract.id, ...form }); }
    else { createContract.mutate(form); }
    setShowCreate(false); setEditContract(null); resetForm();
  };

  const openEdit = (c: any) => {
    setForm({ contract_number: c.contract_number, contract_type: c.contract_type, partner_name: c.partner_name, title: c.title || '', description: c.description || '', value: c.value, currency: c.currency || 'SAR', start_date: c.start_date, end_date: c.end_date || '', status: c.status, risk_level: c.risk_level || 'medium', payment_terms: c.payment_terms || '', retention_pct: c.retention_pct || 0, governing_law: c.governing_law || '', auto_renew: c.auto_renew || false, notes: c.notes || '' });
    setEditContract(c); setShowCreate(true);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Scale className="h-6 w-6 text-primary" />{t('nav.contractManagement')}</h1>
          <p className="text-sm text-muted-foreground">Contract Lifecycle Management — Draft to Expiry</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={filtered} columns={contractExpCols} filename="contracts" title="Contract Management" />
          <Button onClick={() => { resetForm(); setEditContract(null); setShowCreate(true); }}><Plus className="h-4 w-4 mr-1" /> New Contract</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold text-foreground">{contracts.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-600">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-2xl font-bold text-foreground">{(totalValue / 1e6).toFixed(1)}M</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Expiring (90d)</p><p className="text-2xl font-bold text-amber-600">{expiringCount}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Overdue Tasks</p><p className="text-2xl font-bold text-red-600">{overdueObligations}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">VO Impact</p><p className="text-2xl font-bold text-foreground">{(totalVariationImpact / 1e3).toFixed(0)}K</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="register"><FileText className="h-3.5 w-3.5 mr-1" />Register</TabsTrigger>
          <TabsTrigger value="obligations"><Clock className="h-3.5 w-3.5 mr-1" />Obligations</TabsTrigger>
          <TabsTrigger value="variations"><ArrowUpDown className="h-3.5 w-3.5 mr-1" />Variations</TabsTrigger>
          <TabsTrigger value="claims"><Gavel className="h-3.5 w-3.5 mr-1" />Claims</TabsTrigger>
          <TabsTrigger value="guarantees"><Shield className="h-3.5 w-3.5 mr-1" />Guarantees</TabsTrigger>
          <TabsTrigger value="amendments"><TrendingUp className="h-3.5 w-3.5 mr-1" />Amendments</TabsTrigger>
          <TabsTrigger value="risk"><FileWarning className="h-3.5 w-3.5 mr-1" />Risk Report</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" /></div>
            <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{Object.keys(statusColors).map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select>
          </div>
          <Card><ScrollArea className="h-[500px]"><Table>
            <TableHeader><TableRow><TableHead>Contract #</TableHead><TableHead>Type</TableHead><TableHead>Counterparty</TableHead><TableHead>Title</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead><TableHead>Risk</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No contracts found</TableCell></TableRow>}
              {filtered.map((c: any) => {
                const daysLeft = c.end_date ? differenceInDays(new Date(c.end_date), new Date()) : null;
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onDoubleClick={() => navigate(`/contract-detail/${c.id}`)}>
                    <TableCell className="font-mono text-sm">{c.contract_number}</TableCell>
                    <TableCell><Badge variant="outline">{typeLabels[c.contract_type] || c.contract_type}</Badge></TableCell>
                    <TableCell className="font-medium">{c.partner_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.title || '-'}</TableCell>
                    <TableCell className="text-right font-mono">{Number(c.value || 0).toLocaleString()} {c.currency || 'SAR'}</TableCell>
                    <TableCell>{c.start_date ? format(new Date(c.start_date), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell><span className={daysLeft !== null && daysLeft <= 30 ? 'text-red-600 font-medium' : ''}>{c.end_date ? format(new Date(c.end_date), 'dd/MM/yyyy') : '-'}</span>{daysLeft !== null && daysLeft > 0 && daysLeft <= 90 && <span className="text-xs text-amber-600 ml-1">({daysLeft}d)</span>}</TableCell>
                    <TableCell><Badge className={statusColors[c.status] || 'bg-muted'}>{c.status}</Badge></TableCell>
                    <TableCell><Badge className={riskColors[c.risk_level] || 'bg-muted'}>{c.risk_level || 'medium'}</Badge></TableCell>
                    <TableCell><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => navigate(`/contract-detail/${c.id}`)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => deleteContract.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></ScrollArea></Card>
        </TabsContent>

        <TabsContent value="obligations"><ObligationsTab obligations={obligations} contracts={contracts} createObligation={createObligation} updateObligation={updateObligation} /></TabsContent>
        <TabsContent value="variations"><VariationsTab variations={variations} contracts={contracts} createVariation={createVariation} updateVariation={updateVariation} /></TabsContent>
        <TabsContent value="claims"><ClaimsTab claims={claims} contracts={contracts} createClaim={createClaim} updateClaim={updateClaim} /></TabsContent>
        <TabsContent value="guarantees"><GuaranteesTab guarantees={guarantees} contracts={contracts} createGuarantee={createGuarantee} updateGuarantee={updateGuarantee} /></TabsContent>
        <TabsContent value="amendments"><AmendmentsTab amendments={amendments} contracts={contracts} createAmendment={createAmendment} updateAmendment={updateAmendment} /></TabsContent>
        <TabsContent value="risk"><RiskTab contracts={contracts} obligations={obligations} variations={variations} claims={claims} guarantees={guarantees} /></TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={v => { if (!v) { setShowCreate(false); setEditContract(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editContract ? 'Edit Contract' : 'New Contract'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contract #</Label><Input value={form.contract_number || ''} onChange={e => setForm({ ...form, contract_number: e.target.value })} placeholder="Auto-generated" /></div>
            <div><Label>Type</Label><Select value={form.contract_type || 'customer'} onValueChange={v => setForm({ ...form, contract_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2"><Label>Title</Label><Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Counterparty</Label><Input value={form.partner_name || ''} onChange={e => setForm({ ...form, partner_name: e.target.value })} /></div>
            <div><Label>Value</Label><Input type="number" value={form.value || ''} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) })} /></div>
            <div><Label>Currency</Label><Select value={form.currency || 'SAR'} onValueChange={v => setForm({ ...form, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SAR">SAR</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status || 'draft'} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['draft','review','approved','signed','active','amended','suspended','expired','terminated'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Start Date</Label><Input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            <div><Label>Risk</Label><Select value={form.risk_level || 'medium'} onValueChange={v => setForm({ ...form, risk_level: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
            <div><Label>Retention %</Label><Input type="number" value={form.retention_pct || ''} onChange={e => setForm({ ...form, retention_pct: parseFloat(e.target.value) })} /></div>
            <div><Label>Payment Terms</Label><Input value={form.payment_terms || ''} onChange={e => setForm({ ...form, payment_terms: e.target.value })} /></div>
            <div><Label>Governing Law</Label><Input value={form.governing_law || ''} onChange={e => setForm({ ...form, governing_law: e.target.value })} /></div>
            <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={form.auto_renew || false} onChange={e => setForm({ ...form, auto_renew: e.target.checked })} /><Label>Auto Renew</Label></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditContract(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.partner_name}>{editContract ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Sub-tab components ===

function ObligationsTab({ obligations, contracts, createObligation, updateObligation }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({});
  const cMap = Object.fromEntries(contracts.map((c: any) => [c.id, c]));
  const overdue = obligations.filter((o: any) => o.status === 'pending' && o.due_date && isPast(new Date(o.due_date)));
  const upcoming = obligations.filter((o: any) => o.status === 'pending' && o.due_date && !isPast(new Date(o.due_date)) && differenceInDays(new Date(o.due_date), new Date()) <= 30);

  return (<div className="space-y-3">
    <div className="grid grid-cols-3 gap-3">
      <Card className="border-red-200"><CardContent className="p-3 text-center"><p className="text-xs text-red-600">Overdue</p><p className="text-2xl font-bold text-red-600">{overdue.length}</p></CardContent></Card>
      <Card className="border-amber-200"><CardContent className="p-3 text-center"><p className="text-xs text-amber-600">Due 30d</p><p className="text-2xl font-bold text-amber-600">{upcoming.length}</p></CardContent></Card>
      <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{obligations.length}</p></CardContent></Card>
    </div>
    <div className="flex justify-end"><Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
    <Card><ScrollArea className="h-[400px]"><Table>
      <TableHeader><TableRow><TableHead>Contract</TableHead><TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody>{obligations.map((o: any) => (
        <TableRow key={o.id}><TableCell className="text-sm">{cMap[o.contract_id]?.contract_number || '-'}</TableCell><TableCell><Badge variant="outline">{o.obligation_type}</Badge></TableCell><TableCell>{o.title}</TableCell>
        <TableCell className={o.due_date && isPast(new Date(o.due_date)) && o.status === 'pending' ? 'text-red-600 font-medium' : ''}>{o.due_date ? format(new Date(o.due_date), 'dd/MM/yyyy') : '-'}</TableCell>
        <TableCell><Badge className={statusColors[o.status] || 'bg-muted'}>{o.status}</Badge></TableCell>
        <TableCell>{o.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateObligation.mutate({ id: o.id, status: 'completed', completed_date: new Date().toISOString().split('T')[0] })}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Done</Button>}</TableCell>
        </TableRow>))}</TableBody>
    </Table></ScrollArea></Card>
    <Dialog open={showAdd} onOpenChange={setShowAdd}><DialogContent><DialogHeader><DialogTitle>Add Obligation</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Contract</Label><Select value={form.contract_id || ''} onValueChange={v => setForm({ ...form, contract_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{contracts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.contract_number}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Title</Label><Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Type</Label><Select value={form.obligation_type || 'deliverable'} onValueChange={v => setForm({ ...form, obligation_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="deliverable">Deliverable</SelectItem><SelectItem value="payment">Payment</SelectItem><SelectItem value="milestone">Milestone</SelectItem><SelectItem value="compliance">Compliance</SelectItem></SelectContent></Select></div>
        <div><Label>Due Date</Label><Input type="date" value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
        <div><Label>Priority</Label><Select value={form.priority || 'medium'} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={() => { createObligation.mutate(form); setShowAdd(false); setForm({}); }} disabled={!form.contract_id || !form.title}>Create</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>);
}

function VariationsTab({ variations, contracts, createVariation, updateVariation }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({});
  const cMap = Object.fromEntries(contracts.map((c: any) => [c.id, c]));
  const totalImpact = variations.reduce((s: number, v: any) => s + Number(v.cost_impact || 0), 0);

  return (<div className="space-y-3">
    <div className="grid grid-cols-3 gap-3">
      <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{variations.length}</p></CardContent></Card>
      <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{variations.filter((v: any) => v.status === 'approved').length}</p></CardContent></Card>
      <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Cost Impact</p><p className="text-2xl font-bold">{totalImpact.toLocaleString()}</p></CardContent></Card>
    </div>
    <div className="flex justify-end"><Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3.5 w-3.5 mr-1" />New VO</Button></div>
    <Card><ScrollArea className="h-[400px]"><Table>
      <TableHeader><TableRow><TableHead>VO #</TableHead><TableHead>Contract</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Cost Impact</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody>{variations.map((v: any) => (
        <TableRow key={v.id}><TableCell className="font-mono">{v.variation_number}</TableCell><TableCell>{cMap[v.contract_id]?.contract_number || '-'}</TableCell><TableCell>{v.title}</TableCell><TableCell><Badge variant="outline">{v.variation_type}</Badge></TableCell>
        <TableCell className={`text-right font-mono ${Number(v.cost_impact) > 0 ? 'text-red-600' : 'text-green-600'}`}>{Number(v.cost_impact || 0).toLocaleString()}</TableCell>
        <TableCell>{v.schedule_impact_days || 0}</TableCell><TableCell><Badge className={statusColors[v.status] || 'bg-muted'}>{v.status}</Badge></TableCell>
        <TableCell>{v.status === 'draft' && <Button size="sm" variant="outline" onClick={() => updateVariation.mutate({ id: v.id, status: 'approved', approved_at: new Date().toISOString() })}>Approve</Button>}</TableCell>
        </TableRow>))}</TableBody>
    </Table></ScrollArea></Card>
    <Dialog open={showAdd} onOpenChange={setShowAdd}><DialogContent><DialogHeader><DialogTitle>New Variation Order</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Contract</Label><Select value={form.contract_id || ''} onValueChange={v => setForm({ ...form, contract_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{contracts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.contract_number}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>VO Number</Label><Input value={form.variation_number || ''} onChange={e => setForm({ ...form, variation_number: e.target.value })} placeholder="VO-001" /></div>
        <div><Label>Title</Label><Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Type</Label><Select value={form.variation_type || 'addition'} onValueChange={v => setForm({ ...form, variation_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="addition">Addition</SelectItem><SelectItem value="omission">Omission</SelectItem><SelectItem value="substitution">Substitution</SelectItem></SelectContent></Select></div>
        <div><Label>Cost Impact</Label><Input type="number" value={form.cost_impact || ''} onChange={e => setForm({ ...form, cost_impact: parseFloat(e.target.value) })} /></div>
        <div><Label>Schedule Days</Label><Input type="number" value={form.schedule_impact_days || ''} onChange={e => setForm({ ...form, schedule_impact_days: parseInt(e.target.value) })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={() => { createVariation.mutate(form); setShowAdd(false); setForm({}); }} disabled={!form.contract_id || !form.title || !form.variation_number}>Create</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>);
}

function ClaimsTab({ claims, contracts, createClaim, updateClaim }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({});
  const cMap = Object.fromEntries(contracts.map((c: any) => [c.id, c]));
  const totalClaimed = claims.reduce((s: number, c: any) => s + Number(c.amount_claimed || 0), 0);
  const totalApproved = claims.reduce((s: number, c: any) => s + Number(c.amount_approved || 0), 0);

  return (<div className="space-y-3">
    <div className="grid grid-cols-3 gap-3">
      <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Claims</p><p className="text-2xl font-bold">{claims.length}</p></CardContent></Card>
      <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Claimed</p><p className="text-2xl font-bold text-amber-600">{totalClaimed.toLocaleString()}</p></CardContent></Card>
      <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{totalApproved.toLocaleString()}</p></CardContent></Card>
    </div>
    <div className="flex justify-end"><Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Claim</Button></div>
    <Card><ScrollArea className="h-[400px]"><Table>
      <TableHeader><TableRow><TableHead>Claim #</TableHead><TableHead>Contract</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Claimed</TableHead><TableHead className="text-right">Approved</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody>{claims.map((c: any) => (
        <TableRow key={c.id}><TableCell className="font-mono">{c.claim_number}</TableCell><TableCell>{cMap[c.contract_id]?.contract_number || '-'}</TableCell><TableCell>{c.title}</TableCell><TableCell><Badge variant="outline">{c.claim_type}</Badge></TableCell>
        <TableCell className="text-right font-mono">{Number(c.amount_claimed || 0).toLocaleString()}</TableCell><TableCell className="text-right font-mono text-green-600">{Number(c.amount_approved || 0).toLocaleString()}</TableCell>
        <TableCell><Badge className={statusColors[c.status] || 'bg-muted'}>{c.status}</Badge></TableCell>
        <TableCell>{c.status === 'draft' && <Button size="sm" variant="outline" onClick={() => updateClaim.mutate({ id: c.id, status: 'submitted', submission_date: new Date().toISOString().split('T')[0] })}>Submit</Button>}</TableCell>
        </TableRow>))}</TableBody>
    </Table></ScrollArea></Card>
    <Dialog open={showAdd} onOpenChange={setShowAdd}><DialogContent><DialogHeader><DialogTitle>New Claim</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Contract</Label><Select value={form.contract_id || ''} onValueChange={v => setForm({ ...form, contract_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{contracts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.contract_number}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Claim #</Label><Input value={form.claim_number || ''} onChange={e => setForm({ ...form, claim_number: e.target.value })} placeholder="CLM-001" /></div>
        <div><Label>Title</Label><Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Type</Label><Select value={form.claim_type || 'cost'} onValueChange={v => setForm({ ...form, claim_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cost">Cost</SelectItem><SelectItem value="time">Time</SelectItem><SelectItem value="damage">Damage</SelectItem><SelectItem value="warranty">Warranty</SelectItem></SelectContent></Select></div>
        <div><Label>Amount Claimed</Label><Input type="number" value={form.amount_claimed || ''} onChange={e => setForm({ ...form, amount_claimed: parseFloat(e.target.value) })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={() => { createClaim.mutate(form); setShowAdd(false); setForm({}); }} disabled={!form.contract_id || !form.title || !form.claim_number}>Create</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>);
}

function GuaranteesTab({ guarantees, contracts, createGuarantee, updateGuarantee }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({});
  const cMap = Object.fromEntries(contracts.map((c: any) => [c.id, c]));
  const gTypes: Record<string, string> = { performance_bond: 'Performance Bond', advance_payment: 'Advance Payment', bid_bond: 'Bid Bond', retention_guarantee: 'Retention', insurance: 'Insurance', bank_guarantee: 'Bank Guarantee' };

  return (<div className="space-y-3">
    <div className="grid grid-cols-3 gap-3">
      <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{guarantees.length}</p></CardContent></Card>
      <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Exposure</p><p className="text-2xl font-bold">{guarantees.reduce((s: number, g: any) => s + Number(g.amount || 0), 0).toLocaleString()}</p></CardContent></Card>
      <Card className="border-amber-200"><CardContent className="p-3 text-center"><p className="text-xs text-amber-600">Expiring 90d</p><p className="text-2xl font-bold text-amber-600">{guarantees.filter((g: any) => g.expiry_date && differenceInDays(new Date(g.expiry_date), new Date()) <= 90 && differenceInDays(new Date(g.expiry_date), new Date()) >= 0).length}</p></CardContent></Card>
    </div>
    <div className="flex justify-end"><Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
    <Card><ScrollArea className="h-[400px]"><Table>
      <TableHeader><TableRow><TableHead>Contract</TableHead><TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>Provider</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>{guarantees.map((g: any) => (
        <TableRow key={g.id}><TableCell>{cMap[g.contract_id]?.contract_number || '-'}</TableCell><TableCell><Badge variant="outline">{gTypes[g.guarantee_type] || g.guarantee_type}</Badge></TableCell><TableCell>{g.title}</TableCell><TableCell>{g.provider || '-'}</TableCell>
        <TableCell className="text-right font-mono">{Number(g.amount || 0).toLocaleString()}</TableCell>
        <TableCell className={g.expiry_date && differenceInDays(new Date(g.expiry_date), new Date()) <= 30 ? 'text-red-600 font-medium' : ''}>{g.expiry_date ? format(new Date(g.expiry_date), 'dd/MM/yyyy') : '-'}</TableCell>
        <TableCell><Badge className={statusColors[g.status] || 'bg-muted'}>{g.status}</Badge></TableCell>
        </TableRow>))}</TableBody>
    </Table></ScrollArea></Card>
    <Dialog open={showAdd} onOpenChange={setShowAdd}><DialogContent><DialogHeader><DialogTitle>Add Guarantee</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Contract</Label><Select value={form.contract_id || ''} onValueChange={v => setForm({ ...form, contract_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{contracts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.contract_number}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Type</Label><Select value={form.guarantee_type || 'performance_bond'} onValueChange={v => setForm({ ...form, guarantee_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(gTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Title</Label><Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Provider</Label><Input value={form.provider || ''} onChange={e => setForm({ ...form, provider: e.target.value })} /></div>
        <div><Label>Amount</Label><Input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) })} /></div>
        <div><Label>Issue Date</Label><Input type="date" value={form.issue_date || ''} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></div>
        <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date || ''} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={() => { createGuarantee.mutate(form); setShowAdd(false); setForm({}); }} disabled={!form.contract_id || !form.title}>Create</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>);
}

function AmendmentsTab({ amendments, contracts, createAmendment, updateAmendment }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({});
  const cMap = Object.fromEntries(contracts.map((c: any) => [c.id, c]));

  return (<div className="space-y-3">
    <div className="flex justify-end"><Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Amendment</Button></div>
    <Card><ScrollArea className="h-[450px]"><Table>
      <TableHeader><TableRow><TableHead>AMD #</TableHead><TableHead>Contract</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Old</TableHead><TableHead className="text-right">New</TableHead><TableHead className="text-right">Impact</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody>{amendments.map((a: any) => (
        <TableRow key={a.id}><TableCell className="font-mono">{a.amendment_number}</TableCell><TableCell>{cMap[a.contract_id]?.contract_number || '-'}</TableCell><TableCell>{a.title}</TableCell><TableCell><Badge variant="outline">{a.amendment_type}</Badge></TableCell>
        <TableCell className="text-right font-mono">{Number(a.old_value || 0).toLocaleString()}</TableCell><TableCell className="text-right font-mono">{Number(a.new_value || 0).toLocaleString()}</TableCell>
        <TableCell className={`text-right font-mono ${Number(a.cost_impact) > 0 ? 'text-red-600' : 'text-green-600'}`}>{Number(a.cost_impact || 0).toLocaleString()}</TableCell>
        <TableCell><Badge className={statusColors[a.status] || 'bg-muted'}>{a.status}</Badge></TableCell>
        <TableCell>{a.status === 'draft' && <Button size="sm" variant="outline" onClick={() => updateAmendment.mutate({ id: a.id, status: 'approved', approved_at: new Date().toISOString() })}>Approve</Button>}</TableCell>
        </TableRow>))}</TableBody>
    </Table></ScrollArea></Card>
    <Dialog open={showAdd} onOpenChange={setShowAdd}><DialogContent><DialogHeader><DialogTitle>New Amendment</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Contract</Label><Select value={form.contract_id || ''} onValueChange={v => setForm({ ...form, contract_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{contracts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.contract_number}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>AMD #</Label><Input value={form.amendment_number || ''} onChange={e => setForm({ ...form, amendment_number: e.target.value })} placeholder="AMD-001" /></div>
        <div><Label>Title</Label><Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Type</Label><Select value={form.amendment_type || 'modification'} onValueChange={v => setForm({ ...form, amendment_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="modification">Modification</SelectItem><SelectItem value="extension">Extension</SelectItem><SelectItem value="reduction">Reduction</SelectItem><SelectItem value="termination">Termination</SelectItem></SelectContent></Select></div>
        <div><Label>Old Value</Label><Input type="number" value={form.old_value || ''} onChange={e => setForm({ ...form, old_value: parseFloat(e.target.value) })} /></div>
        <div><Label>New Value</Label><Input type="number" value={form.new_value || ''} onChange={e => setForm({ ...form, new_value: parseFloat(e.target.value) })} /></div>
        <div><Label>Cost Impact</Label><Input type="number" value={form.cost_impact || ''} onChange={e => setForm({ ...form, cost_impact: parseFloat(e.target.value) })} /></div>
        <div><Label>Effective Date</Label><Input type="date" value={form.effective_date || ''} onChange={e => setForm({ ...form, effective_date: e.target.value })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={() => { createAmendment.mutate(form); setShowAdd(false); setForm({}); }} disabled={!form.contract_id || !form.title || !form.amendment_number}>Create</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>);
}

function RiskTab({ contracts, obligations, variations, claims, guarantees }: any) {
  const highRisk = contracts.filter((c: any) => c.risk_level === 'high');
  const overdueObs = obligations.filter((o: any) => o.status === 'pending' && o.due_date && isPast(new Date(o.due_date)));
  const openClaims = claims.filter((c: any) => !['resolved', 'withdrawn'].includes(c.status));
  const expiringG = guarantees.filter((g: any) => g.expiry_date && differenceInDays(new Date(g.expiry_date), new Date()) <= 30 && differenceInDays(new Date(g.expiry_date), new Date()) >= 0);
  const pendingVO = variations.filter((v: any) => ['draft', 'submitted'].includes(v.status));

  const items = [
    ...highRisk.map((c: any) => ({ type: 'High Risk Contract', ref: c.contract_number, detail: `${c.partner_name} - ${Number(c.value || 0).toLocaleString()}`, sev: 'high' })),
    ...overdueObs.map((o: any) => ({ type: 'Overdue Obligation', ref: o.title, detail: `Due: ${o.due_date ? format(new Date(o.due_date), 'dd/MM/yyyy') : '-'}`, sev: 'high' })),
    ...expiringG.map((g: any) => ({ type: 'Expiring Guarantee', ref: g.title, detail: `${Number(g.amount || 0).toLocaleString()} - Exp: ${g.expiry_date ? format(new Date(g.expiry_date), 'dd/MM/yyyy') : ''}`, sev: 'high' })),
    ...openClaims.map((c: any) => ({ type: 'Open Claim', ref: c.claim_number, detail: `${c.title} - ${Number(c.amount_claimed || 0).toLocaleString()}`, sev: 'medium' })),
    ...pendingVO.map((v: any) => ({ type: 'Pending VO', ref: v.variation_number, detail: `${v.title} - ${Number(v.cost_impact || 0).toLocaleString()}`, sev: 'medium' })),
  ];

  return (<div className="space-y-3">
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card className="border-red-200"><CardContent className="p-3 text-center"><p className="text-xs text-red-600">High Risk</p><p className="text-2xl font-bold text-red-600">{highRisk.length}</p></CardContent></Card>
      <Card className="border-red-200"><CardContent className="p-3 text-center"><p className="text-xs text-red-600">Overdue</p><p className="text-2xl font-bold text-red-600">{overdueObs.length}</p></CardContent></Card>
      <Card className="border-amber-200"><CardContent className="p-3 text-center"><p className="text-xs text-amber-600">Open Claims</p><p className="text-2xl font-bold text-amber-600">{openClaims.length}</p></CardContent></Card>
      <Card className="border-amber-200"><CardContent className="p-3 text-center"><p className="text-xs text-amber-600">Expiring G.</p><p className="text-2xl font-bold text-amber-600">{expiringG.length}</p></CardContent></Card>
      <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Pending VO</p><p className="text-2xl font-bold">{pendingVO.length}</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Risk & Deviation Items</CardTitle></CardHeader><CardContent>
      <ScrollArea className="h-[400px]"><Table>
        <TableHeader><TableRow><TableHead>Severity</TableHead><TableHead>Type</TableHead><TableHead>Reference</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
        <TableBody>
          {items.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No risk items</TableCell></TableRow>}
          {items.map((item, i) => (
            <TableRow key={i}><TableCell><Badge className={item.sev === 'high' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>{item.sev}</Badge></TableCell><TableCell className="font-medium">{item.type}</TableCell><TableCell className="font-mono">{item.ref}</TableCell><TableCell className="text-sm text-muted-foreground">{item.detail}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table></ScrollArea>
    </CardContent></Card>
  </div>);
}
