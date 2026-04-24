import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLandedCostDocuments, useLandedCostItems, useLandedCostCosts } from '@/hooks/useLandedCosts';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Ship, DollarSign, Package, Trash2, Minus, Square, X, Edit, Eye, Copy } from 'lucide-react';
import { AccountingValidationPanel } from '@/components/accounting/AccountingValidationPanel';
import { format } from 'date-fns';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { SyncStatusBadge } from '@/components/sap/SyncStatusBadge';
import type { ColumnDef } from '@/utils/exportImportUtils';

const lcColumns: ColumnDef[] = [
  { key: 'doc_number', header: 'Doc #' },
  { key: 'vendor_name', header: 'Vendor' },
  { key: 'currency', header: 'Currency' },
  { key: 'status', header: 'Status' },
  { key: 'created_at', header: 'Created' },
];

const COST_CATEGORIES = [
  { value: 'freight', label: 'Freight' },
  { value: 'customs', label: 'Customs Duty' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'handling', label: 'Handling' },
  { value: 'other', label: 'Other' },
];

const ALLOCATION_METHODS = [
  { value: 'by_quantity', label: 'By Quantity' },
  { value: 'by_value', label: 'By Value' },
  { value: 'by_weight', label: 'By Weight' },
  { value: 'by_volume', label: 'By Volume' },
  { value: 'equal', label: 'Equal Distribution' },
];

const emptyForm = {
  doc_number: '', vendor_name: '', currency: 'SAR', remarks: '',
  broker_name: '', due_date: '', posting_date: '', reference: '',
  file_no: '', series: '', is_closed: false,
  projected_customs: 0, actual_customs: 0, customs_date: '',
  customs_affects_inventory: true, total_freight_charges: 0,
  amount_to_balance: 0, before_tax: 0, tax1: 0, tax2: 0,
};

const emptyCostForm = {
  cost_category: 'freight', cost_name: '', amount: '',
  allocation_method: 'by_quantity', vendor_name: '', invoice_number: '',
};

export default function LandedCosts() {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [costForm, setCostForm] = useState({ ...emptyCostForm });
  const [activeTab, setActiveTab] = useState('items');

  const docs = useLandedCostDocuments();
  const items = useLandedCostItems(selectedDoc?.id);
  const costs = useLandedCostCosts(selectedDoc?.id);

  const handleCreate = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    docs.create.mutate({
      ...form,
      doc_date: today,
      posting_date: form.posting_date || today,
      due_date: form.due_date || today,
      customs_date: form.customs_date || today,
    }, {
      onSuccess: (data: any) => {
        setShowForm(false);
        setForm({ ...emptyForm });
        if (data) { setSelectedDoc(data); setEditMode(true); }
      },
    });
  };

  const handleAddCost = () => {
    if (!selectedDoc) return;
    const nextLine = (costs.data?.length || 0) + 1;
    costs.upsert.mutate({
      landed_cost_id: selectedDoc.id,
      ...costForm,
      amount: Number(costForm.amount) || 0,
      line_num: nextLine,
    }, {
      onSuccess: () => setCostForm({ ...emptyCostForm }),
    });
  };

  const totalCosts = costs.data?.reduce((s: number, c: any) => s + (c.amount || 0), 0) || 0;

  const openDocument = (doc: any, edit = false) => {
    setSelectedDoc(doc);
    setEditMode(edit);
    setForm({
      doc_number: doc.doc_number || '',
      vendor_name: doc.vendor_name || '',
      currency: doc.currency || 'SAR',
      remarks: doc.remarks || '',
      broker_name: doc.broker_name || '',
      due_date: doc.due_date || '',
      posting_date: doc.posting_date || '',
      reference: doc.reference || '',
      file_no: doc.file_no || '',
      series: doc.series || '',
      is_closed: doc.is_closed || false,
      projected_customs: doc.projected_customs || 0,
      actual_customs: doc.actual_customs || 0,
      customs_date: doc.customs_date || '',
      customs_affects_inventory: doc.customs_affects_inventory ?? true,
      total_freight_charges: doc.total_freight_charges || 0,
      amount_to_balance: doc.amount_to_balance || 0,
      before_tax: doc.before_tax || 0,
      tax1: doc.tax1 || 0,
      tax2: doc.tax2 || 0,
    });
    setActiveTab('items');
  };

  return (
    <div className="space-y-4 p-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Landed Costs</h1>
          <p className="text-xs text-muted-foreground">Import cost allocation across shipment items</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={docs.data || []} columns={lcColumns} filename="landed-costs" title="Landed Costs" />
          <Button size="sm" onClick={() => { setShowForm(true); setForm({ ...emptyForm }); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Document
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Ship className="h-6 w-6 text-primary" />
            <div><p className="text-xs text-muted-foreground">Total Documents</p><p className="text-xl font-bold">{docs.data?.length || 0}</p></div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            <div><p className="text-xs text-muted-foreground">Total Landed Costs</p>
            <p className="text-xl font-bold">{docs.data?.reduce((s: number, d: any) => s + (d.total_landed_cost || 0), 0).toLocaleString()} SAR</p></div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div><p className="text-xs text-muted-foreground">Open Documents</p>
            <p className="text-xl font-bold">{docs.data?.filter((d: any) => d.status === 'open').length || 0}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-sm">Landed Cost Documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-8">Doc Number</TableHead>
                  <TableHead className="h-8">Date</TableHead>
                  <TableHead className="h-8">Vendor</TableHead>
                  <TableHead className="h-8">Broker</TableHead>
                  <TableHead className="h-8">Total Cost</TableHead>
                  <TableHead className="h-8">Currency</TableHead>
                  <TableHead className="h-8">Status</TableHead>
                  <TableHead className="h-8">Sync</TableHead>
                  <TableHead className="h-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.data?.map((doc: any) => (
                  <TableRow key={doc.id} className="text-xs cursor-pointer hover:bg-muted/50" onDoubleClick={() => openDocument(doc, true)}>
                    <TableCell className="py-1.5 font-medium">{doc.doc_number}</TableCell>
                    <TableCell className="py-1.5">{doc.doc_date ? format(new Date(doc.doc_date), 'dd.MM.yy') : '-'}</TableCell>
                    <TableCell className="py-1.5">{doc.vendor_name || '-'}</TableCell>
                    <TableCell className="py-1.5">{doc.broker_name || '-'}</TableCell>
                    <TableCell className="py-1.5 font-semibold">{doc.total_landed_cost?.toLocaleString() || '0'}</TableCell>
                    <TableCell className="py-1.5">{doc.currency}</TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant={doc.status === 'open' ? 'default' : 'secondary'} className="text-[10px]">{doc.status || 'Open'}</Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <SyncStatusBadge syncStatus={doc.sync_status || 'local'} />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="View" onClick={() => openDocument(doc, false)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Edit" onClick={() => openDocument(doc, true)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!docs.data?.length && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">No landed cost documents</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ========== SAP B1 Style Document Dialog ========== */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-[95vw] w-[1100px] max-h-[90vh] flex flex-col p-0">
          {/* Title Bar - SAP B1 style */}
          <div className="flex items-center justify-between bg-primary px-3 py-1.5 rounded-t-lg">
            <span className="text-sm font-semibold text-primary-foreground">Landed Costs - {selectedDoc?.doc_number}</span>
            <div className="flex items-center gap-1">
              <button className="text-primary-foreground/70 hover:text-primary-foreground"><Minus className="h-3.5 w-3.5" /></button>
              <button className="text-primary-foreground/70 hover:text-primary-foreground"><Square className="h-3 w-3" /></button>
              <button className="text-primary-foreground/70 hover:text-primary-foreground" onClick={() => setSelectedDoc(null)}><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Header Fields - SAP B1 dual column layout */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {/* Left Column */}
              <div className="space-y-2">
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <Label className="text-xs text-right">Vendor</Label>
                  <Input className="h-7 text-xs" value={form.vendor_name} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <Label className="text-xs text-right">Broker</Label>
                  <Input className="h-7 text-xs" value={form.broker_name} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, broker_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <Label className="text-xs text-right">Currency</Label>
                  <div className="flex items-center gap-2">
                    <Select value={form.currency} onValueChange={v => editMode && setForm(p => ({ ...p, currency: v }))} disabled={!editMode}>
                      <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1.5 ml-4">
                      <Checkbox
                        checked={form.is_closed}
                        onCheckedChange={v => editMode && setForm(p => ({ ...p, is_closed: !!v }))}
                        disabled={!editMode}
                        id="closed-doc"
                      />
                      <Label htmlFor="closed-doc" className="text-xs">Closed Document</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <Label className="text-xs text-right">Number</Label>
                  <Input className="h-7 text-xs bg-muted/50" value={selectedDoc?.doc_number || ''} readOnly />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <Label className="text-xs text-right">Series</Label>
                  <Input className="h-7 text-xs" value={form.series} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, series: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <Label className="text-xs text-right">Posting Date</Label>
                  <Input type="date" className="h-7 text-xs" value={form.posting_date} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, posting_date: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <Label className="text-xs text-right">Due Date</Label>
                  <Input type="date" className="h-7 text-xs" value={form.due_date} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <Label className="text-xs text-right">Reference</Label>
                  <Input className="h-7 text-xs" value={form.reference} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <Label className="text-xs text-right">File No.</Label>
                  <Input className="h-7 text-xs" value={form.file_no} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, file_no: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Tabbed Content - SAP B1 style */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8 p-0.5">
                <TabsTrigger value="items" className="text-xs h-7 px-4">Items</TabsTrigger>
                <TabsTrigger value="costs" className="text-xs h-7 px-4">Costs</TabsTrigger>
                <TabsTrigger value="vendors" className="text-xs h-7 px-4">Vendors</TabsTrigger>
                <TabsTrigger value="details" className="text-xs h-7 px-4">Details</TabsTrigger>
                <TabsTrigger value="general" className="text-xs h-7 px-4">General</TabsTrigger>
                <TabsTrigger value="attachments" className="text-xs h-7 px-4">Attachments</TabsTrigger>
              </TabsList>

              {/* Items Tab */}
              <TabsContent value="items" className="mt-2 border rounded">
                <div className="overflow-auto max-h-[250px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px] bg-muted/30">
                        <TableHead className="h-7 w-8">#</TableHead>
                        <TableHead className="h-7">Item No.</TableHead>
                        <TableHead className="h-7">Qty</TableHead>
                        <TableHead className="h-7">Base Doc. Price</TableHead>
                        <TableHead className="h-7">Base Doc. Value</TableHead>
                        <TableHead className="h-7">Proj. Cust.</TableHead>
                        <TableHead className="h-7">Customs Value</TableHead>
                        <TableHead className="h-7">Expenditure</TableHead>
                        <TableHead className="h-7">Alloc. Costs Val.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.data?.map((item: any, idx: number) => (
                        <TableRow key={item.id} className="text-[11px]">
                          <TableCell className="py-1">{idx + 1}</TableCell>
                          <TableCell className="py-1">{item.item_code}</TableCell>
                          <TableCell className="py-1">{item.quantity}</TableCell>
                          <TableCell className="py-1">{item.base_doc_price?.toLocaleString() || '0'}</TableCell>
                          <TableCell className="py-1">{item.base_doc_value?.toLocaleString() || '0'}</TableCell>
                          <TableCell className="py-1">{item.proj_customs?.toLocaleString() || '0'}</TableCell>
                          <TableCell className="py-1">{item.customs_value?.toLocaleString() || '0'}</TableCell>
                          <TableCell className="py-1">{item.expenditure?.toLocaleString() || '0'}</TableCell>
                          <TableCell className="py-1 font-medium">{item.alloc_costs_val?.toLocaleString() || '0'}</TableCell>
                        </TableRow>
                      ))}
                      {/* Empty rows for SAP feel */}
                      {Array.from({ length: Math.max(0, 6 - (items.data?.length || 0)) }).map((_, i) => (
                        <TableRow key={`empty-${i}`} className="text-[11px]">
                          <TableCell className="py-1 h-7">&nbsp;</TableCell>
                          <TableCell className="py-1">&nbsp;</TableCell>
                          <TableCell className="py-1">&nbsp;</TableCell>
                          <TableCell className="py-1">&nbsp;</TableCell>
                          <TableCell className="py-1">&nbsp;</TableCell>
                          <TableCell className="py-1">&nbsp;</TableCell>
                          <TableCell className="py-1">&nbsp;</TableCell>
                          <TableCell className="py-1">&nbsp;</TableCell>
                          <TableCell className="py-1">&nbsp;</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Costs Tab */}
              <TabsContent value="costs" className="mt-2 space-y-3">
                <div className="border rounded overflow-auto max-h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px] bg-muted/30">
                        <TableHead className="h-7 w-8">#</TableHead>
                        <TableHead className="h-7">Category</TableHead>
                        <TableHead className="h-7">Cost Name</TableHead>
                        <TableHead className="h-7">Amount</TableHead>
                        <TableHead className="h-7">Allocation</TableHead>
                        <TableHead className="h-7">Vendor</TableHead>
                        <TableHead className="h-7">Invoice #</TableHead>
                        <TableHead className="h-7 w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costs.data?.map((c: any) => (
                        <TableRow key={c.id} className="text-[11px]">
                          <TableCell className="py-1">{c.line_num}</TableCell>
                          <TableCell className="py-1"><Badge variant="outline" className="text-[10px]">{c.cost_category}</Badge></TableCell>
                          <TableCell className="py-1">{c.cost_name}</TableCell>
                          <TableCell className="py-1 font-semibold">{c.amount?.toLocaleString()}</TableCell>
                          <TableCell className="py-1">{ALLOCATION_METHODS.find(m => m.value === c.allocation_method)?.label || c.allocation_method}</TableCell>
                          <TableCell className="py-1">{c.vendor_name || '-'}</TableCell>
                          <TableCell className="py-1">{c.invoice_number || '-'}</TableCell>
                          <TableCell className="py-1">
                            {editMode && (
                              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => costs.remove.mutate(c.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {editMode && (
                  <div className="grid grid-cols-7 gap-2 items-end border-t pt-3">
                    <div>
                      <Label className="text-[10px]">Category</Label>
                      <Select value={costForm.cost_category} onValueChange={v => setCostForm(p => ({ ...p, cost_category: v }))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{COST_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-[10px]">Cost Name</Label><Input className="h-7 text-xs" value={costForm.cost_name} onChange={e => setCostForm(p => ({ ...p, cost_name: e.target.value }))} /></div>
                    <div><Label className="text-[10px]">Amount</Label><Input type="number" className="h-7 text-xs" value={costForm.amount} onChange={e => setCostForm(p => ({ ...p, amount: e.target.value }))} /></div>
                    <div>
                      <Label className="text-[10px]">Allocation</Label>
                      <Select value={costForm.allocation_method} onValueChange={v => setCostForm(p => ({ ...p, allocation_method: v }))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ALLOCATION_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-[10px]">Vendor</Label><Input className="h-7 text-xs" value={costForm.vendor_name} onChange={e => setCostForm(p => ({ ...p, vendor_name: e.target.value }))} /></div>
                    <div><Label className="text-[10px]">Invoice #</Label><Input className="h-7 text-xs" value={costForm.invoice_number} onChange={e => setCostForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddCost}><Plus className="h-3 w-3 mr-1" />Add</Button>
                  </div>
                )}
                <div className="text-right text-sm font-bold">Total Costs: {totalCosts.toLocaleString()} {form.currency}</div>
              </TabsContent>

              {/* Vendors Tab */}
              <TabsContent value="vendors" className="mt-2">
                <div className="border rounded p-4 text-xs text-muted-foreground text-center min-h-[200px] flex items-center justify-center">
                  Vendor details linked to cost lines will appear here.
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="mt-2">
                <div className="border rounded p-4 text-xs text-muted-foreground text-center min-h-[200px] flex items-center justify-center">
                  Shipment and import details will appear here.
                </div>
              </TabsContent>

              {/* General Tab */}
              <TabsContent value="general" className="mt-2">
                <div className="border rounded p-4 space-y-3">
                  <div className="grid grid-cols-[120px_1fr] items-start gap-2">
                    <Label className="text-xs text-right pt-1">Remarks</Label>
                    <Textarea className="text-xs min-h-[80px]" value={form.remarks} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />
                  </div>
                </div>
              </TabsContent>

              {/* Attachments Tab */}
              <TabsContent value="attachments" className="mt-2">
                <div className="border rounded p-4 text-xs text-muted-foreground text-center min-h-[200px] flex items-center justify-center">
                  Drag & drop files here or click to attach documents.
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer Summary - SAP B1 style */}
            <div className="grid grid-cols-3 gap-x-8 gap-y-1.5 border-t pt-3">
              {/* Left Column */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs">Projected Customs</Label>
                  <Input type="number" className="h-7 text-xs bg-muted/30" value={form.projected_customs} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, projected_customs: +e.target.value }))} />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs">Actual Customs</Label>
                  <Input type="number" className="h-7 text-xs bg-muted/30" value={form.actual_customs} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, actual_customs: +e.target.value }))} />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs">Customs Date</Label>
                  <Input type="date" className="h-7 text-xs" value={form.customs_date} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, customs_date: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox checked={form.customs_affects_inventory} onCheckedChange={v => editMode && setForm(p => ({ ...p, customs_affects_inventory: !!v }))} disabled={!editMode} id="customs-inv" />
                  <Label htmlFor="customs-inv" className="text-xs">Customs Affects Inventory</Label>
                </div>
              </div>

              {/* Center Column */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-[160px_1fr] items-center gap-2">
                  <Label className="text-xs">Total Freight Charges</Label>
                  <Input type="number" className="h-7 text-xs bg-muted/30" value={form.total_freight_charges} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, total_freight_charges: +e.target.value }))} />
                </div>
                <div className="grid grid-cols-[160px_1fr] items-center gap-2">
                  <Label className="text-xs">Amount to Balance</Label>
                  <Input type="number" className="h-7 text-xs bg-muted/30" value={form.amount_to_balance} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, amount_to_balance: +e.target.value }))} />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <Label className="text-xs">Before Tax</Label>
                  <Input type="number" className="h-7 text-xs bg-muted/30" value={form.before_tax} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, before_tax: +e.target.value }))} />
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <Label className="text-xs">Tax 1</Label>
                  <Input type="number" className="h-7 text-xs bg-muted/30" value={form.tax1} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, tax1: +e.target.value }))} />
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <Label className="text-xs">Tax 2</Label>
                  <Input type="number" className="h-7 text-xs bg-muted/30" value={form.tax2} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, tax2: +e.target.value }))} />
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <Label className="text-xs font-bold">Total</Label>
                  <Input type="number" className="h-7 text-xs bg-primary/5 font-bold" value={selectedDoc?.total_landed_cost || 0} readOnly />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="grid grid-cols-[80px_1fr] items-start gap-2 border-t pt-3">
              <Label className="text-xs pt-1">Remarks</Label>
              <Textarea className="text-xs min-h-[50px]" value={form.remarks} readOnly={!editMode} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />
            </div>
          </div>

          {/* Bottom Action Bar - SAP B1 style */}
          <div className="px-4 py-2">
            <AccountingValidationPanel
              documentType="landed_cost"
              getDocumentData={() => ({
                document_type: 'landed_cost',
                total: totalCosts,
                subtotal: totalCosts,
                tax_amount: 0,
                conditions: { vendor: form.vendor_name },
              })}
              compact
            />
          </div>
          <div className="flex items-center justify-between border-t px-4 py-2 bg-muted/30">
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button size="sm" className="h-8 px-6 text-xs bg-primary" onClick={() => {
                    if (selectedDoc) {
                      docs.update.mutate({ id: selectedDoc.id, ...form });
                    }
                  }}>
                    Update
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-6 text-xs" onClick={() => setSelectedDoc(null)}>Cancel</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-8 px-6 text-xs" onClick={() => setEditMode(true)}>Edit</Button>
              )}
            </div>
            <Button size="sm" variant="outline" className="h-8 px-6 text-xs" title="Copy from existing document">
              <Copy className="h-3 w-3 mr-1" /> Copy From
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== Create Document Dialog ========== */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">New Landed Cost Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <Label className="text-xs text-right">Doc Number</Label>
              <Input className="h-7 text-xs" value={form.doc_number} onChange={e => setForm(p => ({ ...p, doc_number: e.target.value }))} placeholder="LC-001" />
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <Label className="text-xs text-right">Vendor</Label>
              <Input className="h-7 text-xs" value={form.vendor_name} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <Label className="text-xs text-right">Broker</Label>
              <Input className="h-7 text-xs" value={form.broker_name} onChange={e => setForm(p => ({ ...p, broker_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <Label className="text-xs text-right">Currency</Label>
              <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <Label className="text-xs text-right">Series</Label>
              <Input className="h-7 text-xs" value={form.series} onChange={e => setForm(p => ({ ...p, series: e.target.value }))} />
            </div>
            <div className="grid grid-cols-[100px_1fr] items-start gap-2">
              <Label className="text-xs text-right pt-1">Remarks</Label>
              <Textarea className="text-xs" value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
