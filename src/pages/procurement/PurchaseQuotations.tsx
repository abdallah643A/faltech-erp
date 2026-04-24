import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, X, ShoppingCart, GitCompare, MoreVertical, Eye, Edit, Mail, MessageCircle } from 'lucide-react';
import { ItemCombobox } from '@/components/items/ItemCombobox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { LineDimensionSelectors, DimensionTableHeaders, EMPTY_DIMENSIONS, type LineDimensions } from '@/components/dimensions/LineDimensionSelectors';
import { DocumentSeriesSelector, SAP_OBJECT_CODES } from '@/components/series/DocumentSeriesSelector';
import { usePurchaseQuotations, usePurchaseRequests } from '@/hooks/useProcurement';
import { useBusinessPartners } from '@/hooks/useBusinessPartners';
import { format } from 'date-fns';
import type { CopyFromPR, CopyFromPQ } from './ProcurementDashboard';
import { useLanguage } from '@/contexts/LanguageContext';
import { TransactionToolbar } from '@/components/shared/TransactionToolbar';

const pqColumns: ColumnDef[] = [
  { key: 'pq_number', header: 'PQ #' },
  { key: 'vendor_name', header: 'Vendor' },
  { key: 'vendor_code', header: 'Vendor Code' },
  { key: 'doc_date', header: 'Doc Date' },
  { key: 'valid_until', header: 'Valid Until' },
  { key: 'subtotal', header: 'Subtotal' },
  { key: 'total', header: 'Total' },
  { key: 'status', header: 'Status' },
];

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  open: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface Props {
  initialPRData?: CopyFromPR | null;
  onDataConsumed?: () => void;
  onCopyToPO?: (data: CopyFromPQ) => void;
  autoOpenCreate?: boolean;
}

export default function PurchaseQuotations({ initialPRData, onDataConsumed, onCopyToPO, autoOpenCreate }: Props) {
  const { t } = useLanguage();
  const { quotations, isLoading, createQuotation, getQuotationLines } = usePurchaseQuotations();
  const { purchaseRequests, getPRLines } = usePurchaseRequests();
  const { businessPartners } = useBusinessPartners();
  const [search, setSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [showCreate, setShowCreate] = useState(autoOpenCreate || false);
  const [selectedPR, setSelectedPR] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);
  const [comparePRId, setComparePRId] = useState('');
  const [compareData, setCompareData] = useState<any[]>([]);
  const [formTab, setFormTab] = useState('contents');

  // Filter only vendors from BP data
  const vendors = useMemo(() =>
    businessPartners.filter(bp => bp.card_type === 'supplier' || bp.card_type === 'Supplier' || bp.card_type === 'vendor' || bp.card_type === 'Vendor'),
    [businessPartners]
  );

  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return vendors;
    const q = vendorSearch.toLowerCase();
    return vendors.filter(v =>
      v.card_name.toLowerCase().includes(q) ||
      v.card_code.toLowerCase().includes(q)
    );
  }, [vendors, vendorSearch]);

  const [form, setForm] = useState({
    vendor_name: '',
    vendor_code: '',
    vendor_id: '',
    contact_person: '',
    doc_date: format(new Date(), 'yyyy-MM-dd'),
    posting_date: format(new Date(), 'yyyy-MM-dd'),
    valid_until: '',
    required_date: '',
    payment_terms: '',
    currency: 'SAR',
    remarks: '',
    lines: [{ item_description: '', item_code: '', quantity: 1, unit: '', unit_price: 0, discount_percent: 0, tax_code: 'V15', warehouse: '', ...EMPTY_DIMENSIONS }] as (LineItem & LineDimensions)[],
  });

  type LineItem = {
    item_description: string;
    item_code: string;
    quantity: number;
    unit: string;
    unit_price: number;
    discount_percent: number;
    tax_code: string;
    warehouse: string;
  };

  useEffect(() => {
    if (initialPRData) {
      setForm(f => ({
        ...f,
        vendor_name: '',
        vendor_code: '',
        vendor_id: '',
        remarks: initialPRData.remarks || `From ${initialPRData.pr_number}`,
        lines: initialPRData.lines.length > 0
          ? initialPRData.lines.map(l => ({
              item_code: l.item_code || '',
              item_description: l.item_description,
              quantity: l.quantity,
              unit: l.unit || '',
              unit_price: l.unit_price,
              discount_percent: 0,
              tax_code: 'V15',
              warehouse: '',
              ...EMPTY_DIMENSIONS,
            }))
          : [{ item_description: '', item_code: '', quantity: 1, unit: '', unit_price: 0, discount_percent: 0, tax_code: 'V15', warehouse: '', ...EMPTY_DIMENSIONS }],
      }));
      setSelectedPR(initialPRData.pr_id);
      setShowCreate(true);
      onDataConsumed?.();
    }
  }, [initialPRData]);

  const handleVendorSelect = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      setForm(f => ({
        ...f,
        vendor_name: vendor.card_name,
        vendor_code: vendor.card_code,
        vendor_id: vendor.id,
      }));
    }
  };

  const handlePRSelect = async (prId: string) => {
    setSelectedPR(prId);
    if (!prId) return;
    try {
      const lines = await getPRLines(prId);
      if (lines.length > 0) {
        const pr = purchaseRequests?.find(p => p.id === prId);
        setForm(f => ({
          ...f,
          remarks: f.remarks || `From ${pr?.pr_number || 'PR'}`,
          lines: lines.map(l => ({
            item_code: l.item_code || '',
            item_description: l.item_description,
            quantity: l.quantity,
            unit: '',
            unit_price: l.unit_price || 0,
            discount_percent: 0,
            tax_code: 'V15',
            warehouse: '',
            ...EMPTY_DIMENSIONS,
          })),
        }));
      }
    } catch (e) {
      console.error('Failed to load PR lines', e);
    }
  };

  const handleCopyToPO = async (pq: any) => {
    let lines: any[] = [];
    if (getQuotationLines) {
      try { lines = await getQuotationLines(pq.id); } catch (e) { console.error(e); }
    }
    const copyData: CopyFromPQ = {
      pq_id: pq.id,
      pq_number: pq.pq_number,
      vendor_name: pq.vendor_name,
      vendor_code: pq.vendor_code,
      purchase_request_id: pq.purchase_request_id,
      project_id: pq.project_id,
      branch_id: pq.branch_id,
      remarks: pq.remarks,
      lines: lines.map(l => ({
        item_code: l.item_code,
        item_description: l.item_description,
        quantity: l.quantity,
        unit_price: l.unit_price || 0,
      })),
    };
    onCopyToPO?.(copyData);
  };

  // PQ Comparison
  const prsWithMultiplePQs = (() => {
    const prMap = new Map<string, number>();
    quotations?.forEach(pq => {
      if (pq.purchase_request_id) {
        prMap.set(pq.purchase_request_id, (prMap.get(pq.purchase_request_id) || 0) + 1);
      }
    });
    return Array.from(prMap.entries()).filter(([, count]) => count > 1).map(([prId]) => prId);
  })();

  const handleCompare = async (prId: string) => {
    setComparePRId(prId);
    const pqs = quotations?.filter(pq => pq.purchase_request_id === prId) || [];
    const withLines = await Promise.all(pqs.map(async (pq) => {
      let lines: any[] = [];
      if (getQuotationLines) {
        try { lines = await getQuotationLines(pq.id); } catch {}
      }
      const subtotal = lines.reduce((s: number, l: any) => s + (l.quantity * (l.unit_price || 0)), 0) || pq.subtotal || 0;
      return { ...pq, loadedLines: lines, calcSubtotal: subtotal, calcTax: subtotal * 0.15, calcTotal: subtotal * 1.15 };
    }));
    setCompareData(withLines);
    setShowCompare(true);
  };

  const filtered = quotations?.filter(pq =>
    pq.pq_number.toLowerCase().includes(search.toLowerCase()) ||
    pq.vendor_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const addLine = () => setForm(f => ({
    ...f,
    lines: [...f.lines, { item_description: '', item_code: '', quantity: 1, unit: '', unit_price: 0, discount_percent: 0, tax_code: 'V15', warehouse: '', ...EMPTY_DIMENSIONS }],
  }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: string, value: any) => {
    setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));
  };

  const resetForm = () => {
    setForm({
      vendor_name: '', vendor_code: '', vendor_id: '', contact_person: '',
      doc_date: format(new Date(), 'yyyy-MM-dd'), posting_date: format(new Date(), 'yyyy-MM-dd'),
      valid_until: '', required_date: '', payment_terms: '', currency: 'SAR', remarks: '',
      lines: [{ item_description: '', item_code: '', quantity: 1, unit: '', unit_price: 0, discount_percent: 0, tax_code: 'V15', warehouse: '', ...EMPTY_DIMENSIONS }],
    });
    setSelectedPR('');
    setVendorSearch('');
    setFormTab('contents');
  };

  const handleCreate = async () => {
    await createQuotation.mutateAsync({
      vendor_name: form.vendor_name,
      vendor_code: form.vendor_code || undefined,
      purchase_request_id: selectedPR || undefined,
      valid_until: form.valid_until || undefined,
      remarks: form.remarks || undefined,
      lines: form.lines.filter(l => l.item_description).map(l => ({
        item_code: l.item_code,
        item_description: l.item_description,
        quantity: l.quantity,
        unit_price: l.unit_price,
      })),
    });
    setShowCreate(false);
    resetForm();
  };

  // Totals
  const lineSubtotal = form.lines.reduce((s, l) => {
    const lineNet = l.quantity * l.unit_price * (1 - (l.discount_percent || 0) / 100);
    return s + lineNet;
  }, 0);
  const lineTax = lineSubtotal * 0.15;
  const lineTotal = lineSubtotal + lineTax;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Quotations</h1>
          <p className="text-muted-foreground">Request and compare vendor quotes</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <TransactionToolbar
            onAdd={() => { resetForm(); setShowCreate(true); }}
            addLabel="New Quotation"
            onFind={(q) => setSearch(q)}
          />
          <ExportImportButtons data={filtered} columns={pqColumns} filename="purchase-quotations" title="Purchase Quotations" />
          <SAPSyncButton entity="purchase_quotation" />
          <ClearAllButton tableName="purchase_quotations" displayName="Purchase Quotations" queryKeys={['purchaseQuotations']} relatedTables={['purchase_quotation_lines']} />
        </div>
      </div>

      {/* Compare PQs section */}
      {prsWithMultiplePQs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Compare Quotations by PR</Label>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {prsWithMultiplePQs.map(prId => {
                const pr = purchaseRequests?.find(p => p.id === prId);
                const count = quotations?.filter(pq => pq.purchase_request_id === prId).length || 0;
                return (
                  <Button key={prId} variant="outline" size="sm" onClick={() => handleCompare(prId)}>
                    <GitCompare className="h-3 w-3 mr-1" />
                    {pr?.pr_number || 'PR'} ({count} PQs)
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No purchase quotations found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PQ Number</TableHead>
                  <TableHead>Doc Date</TableHead>
                  <TableHead>Vendor Code</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="text-right">{t('common.total')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(pq => (
                  <TableRow key={pq.id}>
                    <TableCell className="font-mono font-medium">{pq.pq_number}</TableCell>
                    <TableCell>{format(new Date(pq.doc_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-mono text-xs">{pq.vendor_code || '-'}</TableCell>
                    <TableCell>{pq.vendor_name}</TableCell>
                    <TableCell>{pq.valid_until ? format(new Date(pq.valid_until), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="text-right font-mono">{pq.total?.toFixed(2)} SAR</TableCell>
                    <TableCell><Badge className={statusColors[pq.status] || ''}>{pq.status}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        pq.sync_status === 'synced' ? 'border-success text-success' :
                        pq.sync_status === 'error' ? 'border-destructive text-destructive' :
                        'border-muted-foreground text-muted-foreground'
                      }`}>
                        {pq.sync_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyToPO(pq)}>
                            <ShoppingCart className="h-4 w-4 mr-2" /> Copy to PO
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem><Mail className="h-4 w-4 mr-2" /> Send by Email</DropdownMenuItem>
                          <DropdownMenuItem><MessageCircle className="h-4 w-4 mr-2 text-success" /> Send via WhatsApp</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create PQ Dialog - SAP B1 Format */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm(); setShowCreate(open); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Purchase Quotation - New</DialogTitle>
          </DialogHeader>

          {/* SAP-style Header */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 border rounded-lg p-4 bg-muted/30">
            {/* Left Column */}
            <div className="space-y-3">
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-medium text-right">Vendor</Label>
                <div className="space-y-1 relative">
                  <Input
                    placeholder="Search vendor by name or code..."
                    value={vendorSearch}
                    onChange={e => setVendorSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                  {vendorSearch && filteredVendors.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto bg-background shadow-md absolute z-[100] left-0 right-0 top-full mt-1">
                      {filteredVendors.slice(0, 20).map(v => (
                        <div
                          key={v.id}
                          className="px-3 py-1.5 hover:bg-accent cursor-pointer text-sm flex justify-between"
                          onClick={() => {
                            handleVendorSelect(v.id);
                            setVendorSearch('');
                          }}
                        >
                          <span className="font-medium">{v.card_name}</span>
                          <span className="text-muted-foreground font-mono text-xs">{v.card_code}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-medium text-right">Vendor Code</Label>
                <Input value={form.vendor_code} readOnly className="h-8 text-sm bg-muted/50" />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-medium text-right">Vendor Name</Label>
                <Input value={form.vendor_name} readOnly className="h-8 text-sm bg-muted/50" />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-medium text-right">Contact Person</Label>
                <Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-medium text-right">From PR</Label>
                <select className="w-full border rounded-md p-1.5 text-sm h-8" value={selectedPR} onChange={e => handlePRSelect(e.target.value)}>
                  <option value="">-- None --</option>
                  {purchaseRequests?.filter(pr => pr.status === 'open' || pr.status === 'approved').map(pr => (
                    <option key={pr.id} value={pr.id}>{pr.pr_number} - {pr.requester_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-medium text-right">Series / No.</Label>
                <DocumentSeriesSelector
                  objectCode={SAP_OBJECT_CODES.PurchaseQuotations}
                  value={selectedSeries}
                  onChange={(s) => setSelectedSeries(s)}
                  label=""
                  compact
                />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-medium text-right">Posting Date</Label>
                <Input type="date" value={form.posting_date} onChange={e => setForm(f => ({ ...f, posting_date: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-medium text-right">Document Date</Label>
                <Input type="date" value={form.doc_date} onChange={e => setForm(f => ({ ...f, doc_date: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-medium text-right">Valid Until</Label>
                <Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-medium text-right">Required Date</Label>
                <Input type="date" value={form.required_date} onChange={e => setForm(f => ({ ...f, required_date: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-medium text-right">Currency</Label>
                <Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="h-8 text-sm w-24" />
              </div>
            </div>
          </div>

          {/* SAP-style Tabs for Content/Logistics/Accounting */}
          <Tabs value={formTab} onValueChange={setFormTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contents">Contents</TabsTrigger>
              <TabsTrigger value="logistics">Logistics</TabsTrigger>
              <TabsTrigger value="accounting">Accounting</TabsTrigger>
            </TabsList>

            <TabsContent value="contents" className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Line Items</Label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-24">Item No.</TableHead>
                      <TableHead>Item Description</TableHead>
                      <TableHead className="w-20">Quantity</TableHead>
                      <TableHead className="w-16">Unit</TableHead>
                      <TableHead className="w-28">Unit Price</TableHead>
                      <TableHead className="w-16">Disc %</TableHead>
                      <TableHead className="w-16">Tax Code</TableHead>
                      <TableHead className="w-24">Total (LC)</TableHead>
                      <TableHead className="w-24">Warehouse</TableHead>
                      <DimensionTableHeaders />
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.lines.map((line, i) => {
                      const lineNet = line.quantity * line.unit_price * (1 - (line.discount_percent || 0) / 100);
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <ItemCombobox
                              value={line.item_code}
                              onSelect={(item) => {
                                if (item) {
                                  setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, item_code: item.item_code, item_description: item.description, unit_price: item.default_price || l.unit_price, unit: item.uom || l.unit, warehouse: item.warehouse || l.warehouse } : l) }));
                                } else {
                                  updateLine(i, 'item_code', '');
                                }
                              }}
                              className="h-7 text-xs"
                            />
                          </TableCell>
                          <TableCell><Input value={line.item_description} onChange={e => updateLine(i, 'item_description', e.target.value)} className="h-7 text-xs" /></TableCell>
                          <TableCell><Input type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', +e.target.value)} className="h-7 text-xs w-20" /></TableCell>
                          <TableCell><Input value={line.unit} onChange={e => updateLine(i, 'unit', e.target.value)} className="h-7 text-xs w-16" /></TableCell>
                          <TableCell><Input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', +e.target.value)} className="h-7 text-xs" /></TableCell>
                          <TableCell><Input type="number" value={line.discount_percent} onChange={e => updateLine(i, 'discount_percent', +e.target.value)} className="h-7 text-xs w-16" /></TableCell>
                          <TableCell><Input value={line.tax_code} onChange={e => updateLine(i, 'tax_code', e.target.value)} className="h-7 text-xs w-16" /></TableCell>
                          <TableCell className="font-mono text-xs text-right">{lineNet.toFixed(2)}</TableCell>
                          <TableCell><Input value={line.warehouse} onChange={e => updateLine(i, 'warehouse', e.target.value)} className="h-7 text-xs w-24" /></TableCell>
                          <LineDimensionSelectors
                            dimensions={{ dim_employee_id: line.dim_employee_id, dim_branch_id: line.dim_branch_id, dim_business_line_id: line.dim_business_line_id, dim_factory_id: line.dim_factory_id }}
                            onChange={(dims) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, ...dims } : l) }))}
                          />
                          <td className="p-1">{form.lines.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeLine(i)}><X className="h-3 w-3" /></Button>}</td>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex justify-between items-start mt-4 border-t pt-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Remarks</Label>
                  <Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="mt-1 text-sm" rows={2} />
                </div>
                <div className="text-right space-y-1 ml-8 min-w-[200px]">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Before Discount:</span>
                    <span className="font-mono">{(form.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-mono">{(form.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0) - lineSubtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-1">
                    <span className="text-muted-foreground">Total After Discount:</span>
                    <span className="font-mono">{lineSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (15%):</span>
                    <span className="font-mono">{lineTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-1">
                    <span>Total:</span>
                    <span className="font-mono">{lineTotal.toFixed(2)} {form.currency}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logistics" className="mt-2">
              <div className="grid grid-cols-2 gap-4 p-4">
                <div>
                  <Label className="text-xs">Payment Terms</Label>
                  <Input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Net 30" />
                </div>
                <div>
                  <Label className="text-xs">Required Date</Label>
                  <Input type="date" value={form.required_date} onChange={e => setForm(f => ({ ...f, required_date: e.target.value }))} className="h-8 text-sm" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="accounting" className="mt-2">
              <div className="grid grid-cols-2 gap-4 p-4">
                <div>
                  <Label className="text-xs">Posting Date</Label>
                  <Input type="date" value={form.posting_date} onChange={e => setForm(f => ({ ...f, posting_date: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Document Date</Label>
                  <Input type="date" value={form.doc_date} onChange={e => setForm(f => ({ ...f, doc_date: e.target.value }))} className="h-8 text-sm" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} disabled={!form.vendor_name || createQuotation.isPending}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare PQs Dialog */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare Quotations - {purchaseRequests?.find(p => p.id === comparePRId)?.pr_number || 'PR'}</DialogTitle>
          </DialogHeader>
          {compareData.length > 0 && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attribute</TableHead>
                    {compareData.map(pq => (
                      <TableHead key={pq.id} className="text-center">
                        <div>{pq.pq_number}</div>
                        <div className="text-xs font-normal text-muted-foreground">{pq.vendor_name}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">{t('common.status')}</TableCell>
                    {compareData.map(pq => (
                      <TableCell key={pq.id} className="text-center"><Badge className={statusColors[pq.status] || ''}>{pq.status}</Badge></TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Valid Until</TableCell>
                    {compareData.map(pq => (
                      <TableCell key={pq.id} className="text-center">{pq.valid_until ? format(new Date(pq.valid_until), 'dd/MM/yyyy') : '-'}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Subtotal</TableCell>
                    {compareData.map(pq => {
                      const isLowest = pq.calcSubtotal === Math.min(...compareData.map((d: any) => d.calcSubtotal));
                      return (
                        <TableCell key={pq.id} className={`text-center font-mono ${isLowest ? 'text-green-600 font-bold' : ''}`}>
                          {pq.calcSubtotal.toFixed(2)} SAR
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">VAT (15%)</TableCell>
                    {compareData.map(pq => (
                      <TableCell key={pq.id} className="text-center font-mono">{pq.calcTax.toFixed(2)} SAR</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t('common.total')}</TableCell>
                    {compareData.map(pq => {
                      const isLowest = pq.calcTotal === Math.min(...compareData.map((d: any) => d.calcTotal));
                      return (
                        <TableCell key={pq.id} className={`text-center font-mono font-semibold ${isLowest ? 'text-green-600' : ''}`}>
                          {pq.calcTotal.toFixed(2)} SAR
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Items Count</TableCell>
                    {compareData.map(pq => (
                      <TableCell key={pq.id} className="text-center">{pq.loadedLines?.length || 0}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t('common.actions')}</TableCell>
                    {compareData.map(pq => (
                      <TableCell key={pq.id} className="text-center">
                        <Button variant="outline" size="sm" onClick={() => { handleCopyToPO(pq); setShowCompare(false); }}>
                          <ShoppingCart className="h-3 w-3 mr-1" /> Copy to PO
                        </Button>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>

              <div>
                <Label className="text-base font-semibold">Line Items Comparison</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      {compareData.map(pq => (
                        <TableHead key={pq.id} className="text-center" colSpan={2}>
                          <div className="text-xs">{pq.pq_number}</div>
                          <div className="flex text-xs">
                            <span className="flex-1">Qty</span>
                            <span className="flex-1">Price</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const allItems = new Set<string>();
                      compareData.forEach(pq => pq.loadedLines?.forEach((l: any) => allItems.add(l.item_description)));
                      return Array.from(allItems).map(item => (
                        <TableRow key={item}>
                          <TableCell className="text-sm">{item}</TableCell>
                          {compareData.map(pq => {
                            const line = pq.loadedLines?.find((l: any) => l.item_description === item);
                            const prices = compareData.map(d => d.loadedLines?.find((l: any) => l.item_description === item)?.unit_price).filter(Boolean);
                            const lowestPrice = Math.min(...prices);
                            return (
                              <TableCell key={pq.id} colSpan={2} className="text-center">
                                {line ? (
                                  <div className="flex text-sm">
                                    <span className="flex-1">{line.quantity}</span>
                                    <span className={`flex-1 font-mono ${line.unit_price === lowestPrice ? 'text-green-600 font-bold' : ''}`}>
                                      {line.unit_price?.toFixed(2)}
                                    </span>
                                  </div>
                                ) : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
