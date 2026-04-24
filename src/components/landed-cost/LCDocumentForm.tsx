import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Save, Send, CheckCircle, XCircle, RotateCcw, Plus, Trash2, Calculator, FileText, Package, DollarSign, ClipboardList, Shield, History, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useLCSourceDocs, useLCItemLines, useLCChargeLines, useLCAllocations, useLCApprovals, useLCAuditLogs, calculateAllocations, computeItemTotals } from '@/hooks/useLandedCostSetup';
import { IncotermSelect } from '@/components/trading/IncotermSelect';
import { ItemCombobox, type ItemOption } from '@/components/items/ItemCombobox';
import { format } from 'date-fns';

const ALLOCATION_METHODS = [
  { value: 'by_quantity', label: 'By Quantity' },
  { value: 'by_weight', label: 'By Weight' },
  { value: 'by_volume', label: 'By Volume' },
  { value: 'by_value', label: 'By Value' },
  { value: 'by_customs_value', label: 'By Customs Value' },
  { value: 'by_packages', label: 'By Packages' },
  { value: 'equal', label: 'Equal' },
  { value: 'manual', label: 'Manual' },
];

const CHARGE_CATEGORIES = [
  'Freight', 'Customs Duty', 'Insurance', 'Clearance', 'Port Charges', 'Inland Transport',
  'Handling', 'Storage', 'Inspection', 'Documentation', 'Bank Charges', 'Demurrage', 'Other',
];

const TREATMENTS = [
  { value: 'capitalize', label: 'Capitalize' },
  { value: 'expense', label: 'Expense' },
  { value: 'accrual', label: 'Accrual' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  posted: 'bg-emerald-100 text-emerald-800',
  reversed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

interface Props {
  document: any;
  onBack: () => void;
  onSave: (doc: any) => void;
  onUpdateStatus: (id: string, updates: any) => void;
}

export function LCDocumentForm({ document: doc, onBack, onSave, onUpdateStatus }: Props) {
  const [form, setForm] = useState<any>({ ...doc });
  const [activeTab, setActiveTab] = useState('source');
  const [newItemRows, setNewItemRows] = useState<any[]>([]);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showApprovalAction, setShowApprovalAction] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  const isEditable = form.status === 'draft' && !form.is_posted;
  const lcId = doc?.id;

  const sourceDocs = useLCSourceDocs(lcId);
  const itemLines = useLCItemLines(lcId);
  const chargeLines = useLCChargeLines(lcId);
  const allocations = useLCAllocations(lcId);
  const approvals = useLCApprovals(lcId);
  const auditLogs = useLCAuditLogs(lcId);



  // Charge form
  const [chargeForm, setChargeForm] = useState({
    charge_code: '', charge_description: '', charge_category: 'Freight',
    supplier_name: '', reference_document: '', currency: 'SAR', exchange_rate: 1,
    amount_foreign: 0, amount_local: 0, tax_applicable: false, tax_amount: 0,
    recoverable_tax: 0, non_recoverable_tax: 0, total_charge: 0,
    charge_account: '', treatment: 'capitalize', allocation_method: 'by_value', notes: '',
  });

  // Computed allocations
  const computedAllocations = useMemo(() =>
    calculateAllocations(chargeLines.data || [], itemLines.data || []),
    [chargeLines.data, itemLines.data]
  );

  const computedItems = useMemo(() =>
    computeItemTotals(itemLines.data || [], computedAllocations),
    [itemLines.data, computedAllocations]
  );

  // Totals
  const totalBase = computedItems.reduce((s, i) => s + (Number(i.base_line_amount) || 0), 0);
  const totalCharges = (chargeLines.data || []).reduce((s, c) => s + (Number(c.total_charge) || 0), 0);
  const totalCapitalized = (chargeLines.data || []).filter(c => c.treatment === 'capitalize').reduce((s, c) => s + (Number(c.total_charge) || 0), 0);
  const totalRecovTax = (chargeLines.data || []).reduce((s, c) => s + (Number(c.recoverable_tax) || 0), 0);
  const totalNonRecovTax = (chargeLines.data || []).reduce((s, c) => s + (Number(c.non_recoverable_tax) || 0), 0);
  const totalFinalValue = totalBase + totalCapitalized + totalNonRecovTax;

  const handleSave = () => {
    onSave({
      ...form,
      total_base_cost: totalBase,
      total_charges: totalCharges,
      total_capitalized: totalCapitalized,
      total_recoverable_tax: totalRecovTax,
      total_non_recoverable_tax: totalNonRecovTax,
      total_landed_cost: totalFinalValue,
    });
  };

  const handleAddNewRow = () => {
    setNewItemRows(prev => [...prev, {
      _tempId: Date.now(),
      item_code: '', item_name: '', uom: 'EA', received_qty: 0, base_unit_cost: 0,
      warehouse: '', weight: 0, volume: 0, num_packages: 0, customs_value: 0, project: '', cost_center: '',
    }]);
  };

  const updateNewRow = (tempId: number, field: string, value: any) => {
    setNewItemRows(prev => prev.map(r => r._tempId === tempId ? { ...r, [field]: value } : r));
  };

  const handleItemSelectForRow = (tempId: number, item: ItemOption | null) => {
    if (!item) return;
    setNewItemRows(prev => prev.map(r => r._tempId === tempId ? {
      ...r,
      item_code: item.item_code,
      item_name: item.description,
      uom: item.uom || 'EA',
      base_unit_cost: item.default_price || 0,
      warehouse: item.warehouse || '',
    } : r));
  };

  const saveNewRow = (tempId: number) => {
    const row = newItemRows.find(r => r._tempId === tempId);
    if (!row || !row.item_code) { toast.error('Select an item first'); return; }
    const lineNum = (itemLines.data?.length || 0) + 1;
    const baseLineAmount = row.received_qty * row.base_unit_cost;
    const { _tempId, ...payload } = row;
    itemLines.upsert.mutate({
      ...payload, line_num: lineNum, base_line_amount: baseLineAmount, lc_document_id: lcId,
    });
    setNewItemRows(prev => prev.filter(r => r._tempId !== tempId));
  };

  const removeNewRow = (tempId: number) => {
    setNewItemRows(prev => prev.filter(r => r._tempId !== tempId));
  };

  const handleAddCharge = () => {
    const lineNum = (chargeLines.data?.length || 0) + 1;
    chargeLines.upsert.mutate({
      ...chargeForm, line_num: lineNum,
      lc_document_id: lcId,
    });
    setShowAddCharge(false);
    setChargeForm({ charge_code: '', charge_description: '', charge_category: 'Freight', supplier_name: '', reference_document: '', currency: 'SAR', exchange_rate: 1, amount_foreign: 0, amount_local: 0, tax_applicable: false, tax_amount: 0, recoverable_tax: 0, non_recoverable_tax: 0, total_charge: 0, charge_account: '', treatment: 'capitalize', allocation_method: 'by_value', notes: '' });
  };

  const handleRunAllocation = () => {
    if (!computedAllocations.length) {
      toast.error('No allocations to calculate. Add items and charges first.');
      return;
    }
    allocations.bulkSave.mutate(computedAllocations, {
      onSuccess: () => toast.success(`Allocation calculated: ${computedAllocations.length} lines`),
    });
  };

  const handleApprovalAction = (action: string) => {
    if ((action === 'reject' || action === 'return') && !approvalComment.trim()) {
      toast.error('Comment required for rejection/return');
      return;
    }
    const statusMap: Record<string, string> = {
      submit: 'submitted', approve: 'approved', reject: 'draft', return: 'draft',
      post: 'posted', reverse: 'reversed', cancel: 'cancelled',
    };
    approvals.addAction.mutate({
      action, comments: approvalComment, from_status: form.status, to_status: statusMap[action],
      acted_by_name: 'Current User',
    });
    const updates: any = { status: statusMap[action] };
    if (action === 'submit') updates.approval_status = 'pending';
    if (action === 'approve') updates.approval_status = 'approved';
    if (action === 'reject') updates.approval_status = 'rejected';
    if (action === 'post') { updates.is_posted = true; updates.posted_at = new Date().toISOString(); }
    if (action === 'reverse') { updates.is_reversed = true; updates.reversed_at = new Date().toISOString(); updates.reversal_reason = approvalComment; }
    onUpdateStatus(lcId, updates);
    setForm((p: any) => ({ ...p, ...updates }));
    setShowApprovalAction(null);
    setApprovalComment('');
  };

  // Journal preview
  const journalPreview = useMemo(() => {
    const lines: any[] = [];
    (chargeLines.data || []).forEach(c => {
      if (c.treatment === 'capitalize') {
        lines.push({ account: 'Inventory', desc: `Capitalize: ${c.charge_description}`, debit: Number(c.total_charge) || 0, credit: 0 });
        lines.push({ account: c.charge_account || 'LC Clearing', desc: `Accrual: ${c.charge_description}`, debit: 0, credit: Number(c.total_charge) || 0 });
      } else {
        lines.push({ account: c.charge_account || 'Expense', desc: `Expense: ${c.charge_description}`, debit: Number(c.total_charge) || 0, credit: 0 });
        lines.push({ account: 'AP / Clearing', desc: `Payable: ${c.charge_description}`, debit: 0, credit: Number(c.total_charge) || 0 });
      }
      if (Number(c.recoverable_tax) > 0) {
        lines.push({ account: 'VAT Receivable', desc: `Recoverable tax: ${c.charge_description}`, debit: Number(c.recoverable_tax), credit: 0 });
      }
      if (Number(c.non_recoverable_tax) > 0) {
        lines.push({ account: 'Inventory (NR Tax)', desc: `Non-recov tax: ${c.charge_description}`, debit: Number(c.non_recoverable_tax), credit: 0 });
      }
    });
    return lines;
  }, [chargeLines.data]);

  const totalJEDebit = journalPreview.reduce((s, l) => s + l.debit, 0);
  const totalJECredit = journalPreview.reduce((s, l) => s + l.credit, 0);

  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-2.5 rounded-lg">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-sm font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Landed Cost</h1>
          <span className="text-xs opacity-80">{form.doc_number}</span>
          <Badge className={`text-[10px] ${STATUS_COLORS[form.status] || ''}`}>{form.status}</Badge>
          {form.is_posted && <Badge className="text-[10px] bg-emerald-500 text-white">Posted</Badge>}
          {form.is_reversed && <Badge className="text-[10px] bg-red-500 text-white">Reversed</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          {isEditable && (
            <>
              <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={handleSave}><Save className="h-3 w-3" /> Save</Button>
              <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setShowApprovalAction('submit')}><Send className="h-3 w-3" /> Submit</Button>
            </>
          )}
          {form.status === 'submitted' && (
            <>
              <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => setShowApprovalAction('approve')}><CheckCircle className="h-3 w-3" /> Approve</Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => setShowApprovalAction('reject')}><XCircle className="h-3 w-3" /> Reject</Button>
            </>
          )}
          {form.status === 'approved' && !form.is_posted && (
            <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600" onClick={() => setShowApprovalAction('post')}><CheckCircle className="h-3 w-3" /> Post</Button>
          )}
          {form.is_posted && !form.is_reversed && (
            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => setShowApprovalAction('reverse')}><RotateCcw className="h-3 w-3" /> Reverse</Button>
          )}
        </div>
      </div>

      {/* Sticky Totals Bar */}
      <div className="bg-card border border-border rounded-lg p-2.5 grid grid-cols-6 gap-3 text-center">
        {[
          { label: 'Base Cost', value: totalBase, color: '' },
          { label: 'Total Charges', value: totalCharges, color: 'text-blue-600' },
          { label: 'Capitalized', value: totalCapitalized, color: 'text-green-600' },
          { label: 'Recov. Tax', value: totalRecovTax, color: 'text-emerald-600' },
          { label: 'Non-Recov. Tax', value: totalNonRecovTax, color: 'text-amber-600' },
          { label: 'Final Inv. Value', value: totalFinalValue, color: 'text-primary font-bold' },
        ].map(t => (
          <div key={t.label}>
            <p className="text-[9px] text-muted-foreground uppercase">{t.label}</p>
            <p className={`text-sm font-mono ${t.color}`}>{t.value.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
          </div>
        ))}
      </div>

      {/* Header Fields */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="grid grid-cols-5 gap-3">
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Doc Number</Label><Input className="h-7 text-xs" value={form.doc_number} readOnly /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Reference</Label><Input className="h-7 text-xs" value={form.reference_no || ''} onChange={e => setForm((p: any) => ({ ...p, reference_no: e.target.value }))} disabled={!isEditable} /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Posting Date</Label><Input type="date" className="h-7 text-xs" value={form.posting_date || ''} onChange={e => setForm((p: any) => ({ ...p, posting_date: e.target.value }))} disabled={!isEditable} /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Document Date</Label><Input type="date" className="h-7 text-xs" value={form.document_date || ''} onChange={e => setForm((p: any) => ({ ...p, document_date: e.target.value }))} disabled={!isEditable} /></div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">LC Type</Label>
            <Select value={form.lc_type || 'import_shipment'} onValueChange={v => setForm((p: any) => ({ ...p, lc_type: v }))} disabled={!isEditable}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="import_shipment">Import Shipment</SelectItem>
                <SelectItem value="local_procurement">Local Procurement</SelectItem>
                <SelectItem value="inter_branch">Inter-Branch Transfer</SelectItem>
                <SelectItem value="project_material">Project Material Receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Vendor</Label><Input className="h-7 text-xs" value={form.vendor_name || ''} onChange={e => setForm((p: any) => ({ ...p, vendor_name: e.target.value }))} disabled={!isEditable} /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Shipment No.</Label><Input className="h-7 text-xs" value={form.shipment_no || ''} onChange={e => setForm((p: any) => ({ ...p, shipment_no: e.target.value }))} disabled={!isEditable} /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Container No.</Label><Input className="h-7 text-xs" value={form.container_no || ''} onChange={e => setForm((p: any) => ({ ...p, container_no: e.target.value }))} disabled={!isEditable} /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Bill of Entry</Label><Input className="h-7 text-xs" value={form.bill_of_entry || ''} onChange={e => setForm((p: any) => ({ ...p, bill_of_entry: e.target.value }))} disabled={!isEditable} /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Incoterm</Label><IncotermSelect value={form.incoterm || ''} onValueChange={v => setForm((p: any) => ({ ...p, incoterm: v }))} className="h-7 text-xs" /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Currency</Label><Input className="h-7 text-xs" value={form.currency || 'SAR'} onChange={e => setForm((p: any) => ({ ...p, currency: e.target.value }))} disabled={!isEditable} /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Exchange Rate</Label><Input type="number" className="h-7 text-xs" value={form.exchange_rate || 1} onChange={e => setForm((p: any) => ({ ...p, exchange_rate: Number(e.target.value) }))} disabled={!isEditable} /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Department</Label><Input className="h-7 text-xs" value={form.department || ''} onChange={e => setForm((p: any) => ({ ...p, department: e.target.value }))} disabled={!isEditable} /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Business Unit</Label><Input className="h-7 text-xs" value={form.business_unit || ''} onChange={e => setForm((p: any) => ({ ...p, business_unit: e.target.value }))} disabled={!isEditable} /></div>
          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Customs Ref</Label><Input className="h-7 text-xs" value={form.customs_ref || ''} onChange={e => setForm((p: any) => ({ ...p, customs_ref: e.target.value }))} disabled={!isEditable} /></div>
        </div>
        <div className="mt-2">
          <Label className="text-[10px] text-muted-foreground">Remarks</Label>
          <Textarea className="text-xs h-14 mt-1" value={form.remarks || ''} onChange={e => setForm((p: any) => ({ ...p, remarks: e.target.value }))} disabled={!isEditable} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8 bg-muted/50">
          <TabsTrigger value="source" className="text-[11px] h-7 gap-1"><FileText className="h-3 w-3" /> Source Docs</TabsTrigger>
          <TabsTrigger value="items" className="text-[11px] h-7 gap-1"><Package className="h-3 w-3" /> Item Lines</TabsTrigger>
          <TabsTrigger value="charges" className="text-[11px] h-7 gap-1"><DollarSign className="h-3 w-3" /> Charges</TabsTrigger>
          <TabsTrigger value="allocation" className="text-[11px] h-7 gap-1"><Calculator className="h-3 w-3" /> Allocation</TabsTrigger>
          <TabsTrigger value="accounting" className="text-[11px] h-7 gap-1"><ClipboardList className="h-3 w-3" /> Accounting</TabsTrigger>
          <TabsTrigger value="approvals" className="text-[11px] h-7 gap-1"><Shield className="h-3 w-3" /> Approvals</TabsTrigger>
          <TabsTrigger value="audit" className="text-[11px] h-7 gap-1"><History className="h-3 w-3" /> Audit</TabsTrigger>
        </TabsList>

        {/* Source Documents Tab */}
        <TabsContent value="source" className="mt-3">
          <Card className="border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold">Source Receipt Documents</h3>
                {isEditable && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                    sourceDocs.add.mutate({
                      source_type: 'goods_receipt',
                      source_number: `GRPO-${String(Date.now()).slice(-6)}`,
                      source_date: new Date().toISOString().split('T')[0],
                      source_total: 0,
                    });
                  }}><Plus className="h-3 w-3" /> Add GRPO</Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px]">
                    <TableHead className="h-7">Type</TableHead>
                    <TableHead className="h-7">Doc Number</TableHead>
                    <TableHead className="h-7">Vendor</TableHead>
                    <TableHead className="h-7">Date</TableHead>
                    <TableHead className="h-7 text-right">Total</TableHead>
                    <TableHead className="h-7">Allocation</TableHead>
                    <TableHead className="h-7 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sourceDocs.data || []).map((sd: any) => (
                    <TableRow key={sd.id} className="text-xs">
                      <TableCell className="py-1">{sd.source_type}</TableCell>
                      <TableCell className="py-1 font-medium">{sd.source_number}</TableCell>
                      <TableCell className="py-1">{sd.source_vendor || '-'}</TableCell>
                      <TableCell className="py-1">{sd.source_date || '-'}</TableCell>
                      <TableCell className="py-1 text-right font-mono">{(Number(sd.source_total) || 0).toFixed(2)}</TableCell>
                      <TableCell className="py-1"><Badge variant={sd.allocation_status === 'allocated' ? 'default' : 'secondary'} className="text-[9px]">{sd.allocation_status}</Badge></TableCell>
                      <TableCell className="py-1">{isEditable && <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => sourceDocs.remove.mutate(sd.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}</TableCell>
                    </TableRow>
                  ))}
                  {!(sourceDocs.data || []).length && (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">No source documents linked</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Item Lines Tab */}
        <TabsContent value="items" className="mt-3">
          <Card className="border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold">Item Lines ({(itemLines.data || []).length})</h3>
                {isEditable && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleAddNewRow}><Plus className="h-3 w-3" /> Add Item</Button>}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px]">
                      <TableHead className="h-7">#</TableHead>
                      <TableHead className="h-7 min-w-[140px]">Item Code</TableHead>
                      <TableHead className="h-7">Item Name</TableHead>
                      <TableHead className="h-7">UOM</TableHead>
                      <TableHead className="h-7 text-right">Qty</TableHead>
                      <TableHead className="h-7 text-right">Base Cost</TableHead>
                      <TableHead className="h-7 text-right">Base Total</TableHead>
                      <TableHead className="h-7 text-right">Weight</TableHead>
                      <TableHead className="h-7 text-right">Volume</TableHead>
                      <TableHead className="h-7 text-right">Customs Val</TableHead>
                      <TableHead className="h-7 text-right">Allocated LC</TableHead>
                      <TableHead className="h-7 text-right">Final Unit</TableHead>
                      <TableHead className="h-7 text-right">Final Total</TableHead>
                      <TableHead className="h-7 text-right">LC %</TableHead>
                      <TableHead className="h-7 w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {computedItems.map((item: any, idx: number) => {
                      const lcPct = item.variance_pct || 0;
                      const pctColor = lcPct > 20 ? 'text-red-600' : lcPct > 10 ? 'text-amber-600' : 'text-green-600';
                      return (
                        <TableRow key={item.id} className="text-xs">
                          <TableCell className="py-1">{idx + 1}</TableCell>
                          <TableCell className="py-1 font-medium">{item.item_code}</TableCell>
                          <TableCell className="py-1">{item.item_name}</TableCell>
                          <TableCell className="py-1">{item.uom}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{Number(item.received_qty).toFixed(0)}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{Number(item.base_unit_cost).toFixed(2)}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{Number(item.base_line_amount).toFixed(2)}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{Number(item.weight).toFixed(2)}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{Number(item.volume).toFixed(2)}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{Number(item.customs_value).toFixed(2)}</TableCell>
                          <TableCell className="py-1 text-right font-mono text-blue-600 font-semibold">{item.allocated_landed_cost.toFixed(2)}</TableCell>
                          <TableCell className="py-1 text-right font-mono font-semibold">{item.final_unit_cost.toFixed(2)}</TableCell>
                          <TableCell className="py-1 text-right font-mono font-semibold">{item.final_line_cost.toFixed(2)}</TableCell>
                          <TableCell className={`py-1 text-right font-mono font-semibold ${pctColor}`}>{lcPct.toFixed(1)}%</TableCell>
                          <TableCell className="py-1">{isEditable && <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => itemLines.remove.mutate(item.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}</TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Inline new rows */}
                    {newItemRows.map((row, idx) => (
                      <TableRow key={row._tempId} className="text-xs bg-muted/30">
                        <TableCell className="py-1 text-muted-foreground">{(itemLines.data?.length || 0) + idx + 1}</TableCell>
                        <TableCell className="py-1">
                          <ItemCombobox value={row.item_code} onSelect={(item) => handleItemSelectForRow(row._tempId, item)} className="w-[140px]" />
                        </TableCell>
                        <TableCell className="py-1 text-muted-foreground text-[10px]">{row.item_name || '—'}</TableCell>
                        <TableCell className="py-1 text-muted-foreground text-[10px]">{row.uom}</TableCell>
                        <TableCell className="py-1"><Input type="number" className="h-6 text-xs w-16 text-right" value={row.received_qty || ''} onChange={e => updateNewRow(row._tempId, 'received_qty', Number(e.target.value))} /></TableCell>
                        <TableCell className="py-1"><Input type="number" className="h-6 text-xs w-20 text-right" value={row.base_unit_cost || ''} onChange={e => updateNewRow(row._tempId, 'base_unit_cost', Number(e.target.value))} /></TableCell>
                        <TableCell className="py-1 text-right font-mono text-[10px]">{(row.received_qty * row.base_unit_cost).toFixed(2)}</TableCell>
                        <TableCell className="py-1"><Input type="number" className="h-6 text-xs w-16 text-right" value={row.weight || ''} onChange={e => updateNewRow(row._tempId, 'weight', Number(e.target.value))} /></TableCell>
                        <TableCell className="py-1"><Input type="number" className="h-6 text-xs w-16 text-right" value={row.volume || ''} onChange={e => updateNewRow(row._tempId, 'volume', Number(e.target.value))} /></TableCell>
                        <TableCell className="py-1"><Input type="number" className="h-6 text-xs w-20 text-right" value={row.customs_value || ''} onChange={e => updateNewRow(row._tempId, 'customs_value', Number(e.target.value))} /></TableCell>
                        <TableCell className="py-1 text-right text-muted-foreground">—</TableCell>
                        <TableCell className="py-1 text-right text-muted-foreground">—</TableCell>
                        <TableCell className="py-1 text-right text-muted-foreground">—</TableCell>
                        <TableCell className="py-1 text-right text-muted-foreground">—</TableCell>
                        <TableCell className="py-1">
                          <div className="flex gap-0.5">
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => saveNewRow(row._tempId)}><Save className="h-3 w-3 text-green-600" /></Button>
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => removeNewRow(row._tempId)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!computedItems.length && !newItemRows.length && (
                      <TableRow><TableCell colSpan={15} className="text-center py-6 text-xs text-muted-foreground">No item lines. Click "Add Item" to start.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charge Components Tab */}
        <TabsContent value="charges" className="mt-3">
          <Card className="border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold">Charge Components ({(chargeLines.data || []).length})</h3>
                {isEditable && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddCharge(true)}><Plus className="h-3 w-3" /> Add Charge</Button>}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px]">
                      <TableHead className="h-7">#</TableHead>
                      <TableHead className="h-7">Category</TableHead>
                      <TableHead className="h-7">Description</TableHead>
                      <TableHead className="h-7">Supplier</TableHead>
                      <TableHead className="h-7">Treatment</TableHead>
                      <TableHead className="h-7">Allocation</TableHead>
                      <TableHead className="h-7 text-right">Amount (FCY)</TableHead>
                      <TableHead className="h-7 text-right">Amount (LCY)</TableHead>
                      <TableHead className="h-7 text-right">Tax</TableHead>
                      <TableHead className="h-7 text-right">Recov. Tax</TableHead>
                      <TableHead className="h-7 text-right">Non-Recov.</TableHead>
                      <TableHead className="h-7 text-right">Total</TableHead>
                      <TableHead className="h-7 w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(chargeLines.data || []).map((c: any, idx: number) => (
                      <TableRow key={c.id} className="text-xs">
                        <TableCell className="py-1">{idx + 1}</TableCell>
                        <TableCell className="py-1 font-medium">{c.charge_category}</TableCell>
                        <TableCell className="py-1">{c.charge_description || '-'}</TableCell>
                        <TableCell className="py-1">{c.supplier_name || '-'}</TableCell>
                        <TableCell className="py-1"><Badge variant={c.treatment === 'capitalize' ? 'default' : 'secondary'} className="text-[9px]">{c.treatment}</Badge></TableCell>
                        <TableCell className="py-1 text-[10px]">{ALLOCATION_METHODS.find(m => m.value === c.allocation_method)?.label || c.allocation_method}</TableCell>
                        <TableCell className="py-1 text-right font-mono">{Number(c.amount_foreign).toFixed(2)}</TableCell>
                        <TableCell className="py-1 text-right font-mono">{Number(c.amount_local).toFixed(2)}</TableCell>
                        <TableCell className="py-1 text-right font-mono">{Number(c.tax_amount).toFixed(2)}</TableCell>
                        <TableCell className="py-1 text-right font-mono text-green-600">{Number(c.recoverable_tax).toFixed(2)}</TableCell>
                        <TableCell className="py-1 text-right font-mono text-amber-600">{Number(c.non_recoverable_tax).toFixed(2)}</TableCell>
                        <TableCell className="py-1 text-right font-mono font-semibold">{Number(c.total_charge).toFixed(2)}</TableCell>
                        <TableCell className="py-1">{isEditable && <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => chargeLines.remove.mutate(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}</TableCell>
                      </TableRow>
                    ))}
                    {!(chargeLines.data || []).length && (
                      <TableRow><TableCell colSpan={13} className="text-center py-6 text-xs text-muted-foreground">No charge components</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allocation Preview Tab */}
        <TabsContent value="allocation" className="mt-3">
          <Card className="border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold">Allocation Preview</h3>
                {isEditable && (
                  <Button size="sm" className="h-7 text-xs gap-1 bg-[#0066cc]" onClick={handleRunAllocation}>
                    <Calculator className="h-3 w-3" /> Calculate Allocation
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px]">
                      <TableHead className="h-7">Item</TableHead>
                      <TableHead className="h-7">Charge</TableHead>
                      <TableHead className="h-7 text-right">Basis</TableHead>
                      <TableHead className="h-7 text-right">Pct %</TableHead>
                      <TableHead className="h-7 text-right">Allocated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {computedAllocations.map((a, idx) => {
                      const item = (itemLines.data || []).find((i: any) => i.id === a.item_line_id);
                      const charge = (chargeLines.data || []).find((c: any) => c.id === a.charge_line_id);
                      return (
                        <TableRow key={idx} className="text-xs">
                          <TableCell className="py-1">{item?.item_code || '-'} - {item?.item_name || ''}</TableCell>
                          <TableCell className="py-1">{charge?.charge_category || '-'}: {charge?.charge_description || ''}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{a.allocation_basis?.toFixed(2)}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{a.allocation_pct?.toFixed(2)}%</TableCell>
                          <TableCell className="py-1 text-right font-mono font-semibold">{a.allocated_amount?.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {!computedAllocations.length && (
                      <TableRow><TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">Add items and charges, then click Calculate</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounting Impact Tab */}
        <TabsContent value="accounting" className="mt-3">
          <Card className="border-border">
            <CardContent className="p-3">
              <h3 className="text-xs font-semibold mb-2">Journal Entry Preview</h3>
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px]">
                    <TableHead className="h-7">Account</TableHead>
                    <TableHead className="h-7">Description</TableHead>
                    <TableHead className="h-7 text-right">Debit</TableHead>
                    <TableHead className="h-7 text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalPreview.map((l, idx) => (
                    <TableRow key={idx} className="text-xs">
                      <TableCell className="py-1 font-medium">{l.account}</TableCell>
                      <TableCell className="py-1">{l.desc}</TableCell>
                      <TableCell className="py-1 text-right font-mono">{l.debit ? l.debit.toFixed(2) : ''}</TableCell>
                      <TableCell className="py-1 text-right font-mono">{l.credit ? l.credit.toFixed(2) : ''}</TableCell>
                    </TableRow>
                  ))}
                  {journalPreview.length > 0 && (
                    <TableRow className="text-xs font-bold border-t-2">
                      <TableCell className="py-1.5" colSpan={2}>Total</TableCell>
                      <TableCell className="py-1.5 text-right font-mono">{totalJEDebit.toFixed(2)}</TableCell>
                      <TableCell className="py-1.5 text-right font-mono">{totalJECredit.toFixed(2)}</TableCell>
                    </TableRow>
                  )}
                  {!journalPreview.length && (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">Add charge components to see accounting impact</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {journalPreview.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge className={totalJEDebit === totalJECredit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {totalJEDebit === totalJECredit ? '✓ Balanced' : '✗ Unbalanced'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="mt-3">
          <Card className="border-border">
            <CardContent className="p-3">
              <h3 className="text-xs font-semibold mb-2">Approval History</h3>
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px]">
                    <TableHead className="h-7">Date</TableHead>
                    <TableHead className="h-7">Action</TableHead>
                    <TableHead className="h-7">By</TableHead>
                    <TableHead className="h-7">From</TableHead>
                    <TableHead className="h-7">To</TableHead>
                    <TableHead className="h-7">Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(approvals.data || []).map((a: any) => (
                    <TableRow key={a.id} className="text-xs">
                      <TableCell className="py-1">{a.acted_at ? format(new Date(a.acted_at), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                      <TableCell className="py-1"><Badge variant="outline" className="text-[9px]">{a.action}</Badge></TableCell>
                      <TableCell className="py-1">{a.acted_by_name || '-'}</TableCell>
                      <TableCell className="py-1">{a.from_status || '-'}</TableCell>
                      <TableCell className="py-1">{a.to_status || '-'}</TableCell>
                      <TableCell className="py-1">{a.comments || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {!(approvals.data || []).length && (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">No approval actions yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="mt-3">
          <Card className="border-border">
            <CardContent className="p-3">
              <h3 className="text-xs font-semibold mb-2">Audit Trail</h3>
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px]">
                    <TableHead className="h-7">Date</TableHead>
                    <TableHead className="h-7">Action</TableHead>
                    <TableHead className="h-7">Field</TableHead>
                    <TableHead className="h-7">Old Value</TableHead>
                    <TableHead className="h-7">New Value</TableHead>
                    <TableHead className="h-7">By</TableHead>
                    <TableHead className="h-7">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(auditLogs.data || []).map((l: any) => (
                    <TableRow key={l.id} className="text-xs">
                      <TableCell className="py-1">{l.changed_at ? format(new Date(l.changed_at), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                      <TableCell className="py-1">{l.action}</TableCell>
                      <TableCell className="py-1">{l.field_name || '-'}</TableCell>
                      <TableCell className="py-1 text-muted-foreground">{l.old_value || '-'}</TableCell>
                      <TableCell className="py-1">{l.new_value || '-'}</TableCell>
                      <TableCell className="py-1">{l.changed_by_name || '-'}</TableCell>
                      <TableCell className="py-1">{l.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {!(auditLogs.data || []).length && (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">No audit records</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>




      {/* Add Charge Dialog */}
      <Dialog open={showAddCharge} onOpenChange={setShowAddCharge}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-sm">Add Charge Component</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Charge Code</Label><Input className="h-7 text-xs" value={chargeForm.charge_code} onChange={e => setChargeForm(p => ({ ...p, charge_code: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={chargeForm.charge_category} onValueChange={v => setChargeForm(p => ({ ...p, charge_category: v }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{CHARGE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1"><Label className="text-xs">Description</Label><Input className="h-7 text-xs" value={chargeForm.charge_description} onChange={e => setChargeForm(p => ({ ...p, charge_description: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Supplier</Label><Input className="h-7 text-xs" value={chargeForm.supplier_name} onChange={e => setChargeForm(p => ({ ...p, supplier_name: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Reference Doc</Label><Input className="h-7 text-xs" value={chargeForm.reference_document} onChange={e => setChargeForm(p => ({ ...p, reference_document: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Currency</Label><Input className="h-7 text-xs" value={chargeForm.currency} onChange={e => setChargeForm(p => ({ ...p, currency: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Exchange Rate</Label><Input type="number" className="h-7 text-xs" value={chargeForm.exchange_rate} onChange={e => setChargeForm(p => ({ ...p, exchange_rate: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Amount (Foreign)</Label><Input type="number" className="h-7 text-xs" value={chargeForm.amount_foreign} onChange={e => { const v = Number(e.target.value); setChargeForm(p => ({ ...p, amount_foreign: v, amount_local: v * p.exchange_rate, total_charge: v * p.exchange_rate + p.non_recoverable_tax })); }} /></div>
            <div className="space-y-1"><Label className="text-xs">Amount (Local)</Label><Input type="number" className="h-7 text-xs" value={chargeForm.amount_local} onChange={e => setChargeForm(p => ({ ...p, amount_local: Number(e.target.value), total_charge: Number(e.target.value) + p.non_recoverable_tax }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Tax Amount</Label><Input type="number" className="h-7 text-xs" value={chargeForm.tax_amount} onChange={e => setChargeForm(p => ({ ...p, tax_amount: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Recoverable Tax</Label><Input type="number" className="h-7 text-xs" value={chargeForm.recoverable_tax} onChange={e => setChargeForm(p => ({ ...p, recoverable_tax: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Non-Recoverable Tax</Label><Input type="number" className="h-7 text-xs" value={chargeForm.non_recoverable_tax} onChange={e => { const v = Number(e.target.value); setChargeForm(p => ({ ...p, non_recoverable_tax: v, total_charge: p.amount_local + v })); }} /></div>
            <div className="space-y-1"><Label className="text-xs">Total Charge</Label><Input type="number" className="h-7 text-xs font-bold" value={chargeForm.total_charge} onChange={e => setChargeForm(p => ({ ...p, total_charge: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label className="text-xs">GL Account</Label><Input className="h-7 text-xs" value={chargeForm.charge_account} onChange={e => setChargeForm(p => ({ ...p, charge_account: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Treatment</Label>
              <Select value={chargeForm.treatment} onValueChange={v => setChargeForm(p => ({ ...p, treatment: v }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{TREATMENTS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Allocation Method</Label>
              <Select value={chargeForm.allocation_method} onValueChange={v => setChargeForm(p => ({ ...p, allocation_method: v }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ALLOCATION_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setShowAddCharge(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddCharge}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Action Dialog */}
      <Dialog open={!!showApprovalAction} onOpenChange={() => setShowApprovalAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm capitalize">{showApprovalAction} Document</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Comments {(showApprovalAction === 'reject' || showApprovalAction === 'return' || showApprovalAction === 'reverse') && <span className="text-destructive">*</span>}</Label>
            <Textarea className="text-xs" value={approvalComment} onChange={e => setApprovalComment(e.target.value)} placeholder="Enter comments..." />
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setShowApprovalAction(null)}>Cancel</Button>
            <Button size="sm" onClick={() => showApprovalAction && handleApprovalAction(showApprovalAction)}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
