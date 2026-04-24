import { useState, useEffect, useCallback } from 'react';
import { AccountingValidationPanel } from '@/components/accounting/AccountingValidationPanel';
import DocumentContextMenu from '@/components/documents/DocumentContextMenu';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, X, MoreVertical, Eye, Edit, Mail, MessageCircle, ArrowUp, ArrowDown, BookOpen, ShieldAlert } from 'lucide-react';
import { useMatchExceptions } from '@/hooks/useMatchExceptions';
import JEPreviewPanel from '@/components/finance/JEPreviewPanel';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSAPSync } from '@/hooks/useSAPSync';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';

const apColumns: ColumnDef[] = [
  { key: 'invoice_number', header: 'Invoice #' },
  { key: 'vendor_name', header: 'Vendor' },
  { key: 'doc_date', header: 'Date' },
  { key: 'doc_due_date', header: 'Due Date' },
  { key: 'subtotal', header: 'Subtotal' },
  { key: 'total', header: 'Total' },
  { key: 'status', header: 'Status' },
];
import { LineDimensionSelectors, DimensionTableHeaders, EMPTY_DIMENSIONS, type LineDimensions } from '@/components/dimensions/LineDimensionSelectors';
import { DocumentSeriesSelector, SAP_OBJECT_CODES } from '@/components/series/DocumentSeriesSelector';
import { useAPInvoices, usePurchaseOrders, useGoodsReceipts } from '@/hooks/useProcurement';
import { format } from 'date-fns';
import type { CopyFromPO } from './ProcurementDashboard';
import { useLanguage } from '@/contexts/LanguageContext';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  open: 'bg-blue-100 text-blue-800',
  posted: 'bg-green-100 text-green-800',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface Props {
  initialPOData?: CopyFromPO | null;
  onDataConsumed?: () => void;
  autoOpenCreate?: boolean;
}

export default function APInvoices({ initialPOData, onDataConsumed, autoOpenCreate }: Props) {
  const { t } = useLanguage();
  const { apInvoices, isLoading, createAPInvoice } = useAPInvoices();
  const { requestOverride } = useMatchExceptions();
  const [overrideInvoiceId, setOverrideInvoiceId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const { purchaseOrders, getPOLines } = usePurchaseOrders();
  const { goodsReceipts } = useGoodsReceipts();
  const { sync: syncAP } = useSAPSync();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(autoOpenCreate || false);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);
  const [sourceType, setSourceType] = useState<'po' | 'grpo'>('po');
  const [jePreviewInvoice, setJePreviewInvoice] = useState<any>(null);

  const [form, setForm] = useState({
    vendor_name: '',
    vendor_code: '',
    doc_due_date: '',
    payment_terms: '',
    remarks: '',
    purchase_order_id: '' as string | undefined,
    goods_receipt_id: '' as string | undefined,
    lines: [{ item_description: '', item_code: '', quantity: 1, unit_price: 0, ...EMPTY_DIMENSIONS }] as ({ item_description: string; item_code: string; quantity: number; unit_price: number } & LineDimensions)[],
  });

  useEffect(() => {
    if (initialPOData) {
      setForm({
        vendor_name: initialPOData.vendor_name,
        vendor_code: initialPOData.vendor_code || '',
        doc_due_date: '',
        payment_terms: '',
        remarks: initialPOData.remarks || `From ${initialPOData.doc_number}`,
        purchase_order_id: initialPOData.source_type === 'po' ? initialPOData.source_id : undefined,
        goods_receipt_id: initialPOData.source_type === 'grpo' ? initialPOData.source_id : undefined,
        lines: initialPOData.lines.length > 0
          ? initialPOData.lines.map(l => ({
              item_code: l.item_code || '',
              item_description: l.item_description,
              quantity: l.quantity,
              unit_price: l.unit_price,
              ...EMPTY_DIMENSIONS,
            }))
          : [{ item_description: '', item_code: '', quantity: 1, unit_price: 0, ...EMPTY_DIMENSIONS }],
      });
      setShowCreate(true);
      onDataConsumed?.();
    }
  }, [initialPOData]);

  const handleSourceSelect = async (id: string, type: 'po' | 'grpo') => {
    setSelectedSource(id);
    setSourceType(type);
    if (!id) return;

    if (type === 'po') {
      const po = purchaseOrders?.find(p => p.id === id);
      if (po) {
        const lines = await getPOLines(po.id);
        setForm(f => ({
          ...f,
          vendor_name: po.vendor_name,
          vendor_code: po.vendor_code || '',
          purchase_order_id: po.id,
          goods_receipt_id: undefined,
          remarks: f.remarks || `From ${po.po_number}`,
          lines: lines.length > 0 ? lines.map(l => ({
            item_code: l.item_code || '',
            item_description: l.item_description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            ...EMPTY_DIMENSIONS,
          })) : f.lines,
        }));
      }
    } else {
      const gr = goodsReceipts?.find(g => g.id === id);
      if (gr) {
        setForm(f => ({
          ...f,
          vendor_name: gr.vendor_name,
          vendor_code: gr.vendor_code || '',
          purchase_order_id: undefined,
          goods_receipt_id: gr.id,
          remarks: f.remarks || `From ${gr.grpo_number}`,
        }));
      }
    }
  };

  const filtered = apInvoices?.filter(inv =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    inv.vendor_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { item_description: '', item_code: '', quantity: 1, unit_price: 0, ...EMPTY_DIMENSIONS }] }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: string, value: any) => {
    setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));
  };

  const resetForm = () => {
    setForm({ vendor_name: '', vendor_code: '', doc_due_date: '', payment_terms: '', remarks: '', purchase_order_id: undefined, goods_receipt_id: undefined, lines: [{ item_description: '', item_code: '', quantity: 1, unit_price: 0, ...EMPTY_DIMENSIONS }] });
    setSelectedSource('');
  };

  const handleCreate = async () => {
    // Accounting pre-validation
    try {
      const { validateAccounting } = await import('@/services/accountingValidator');
      const simInput = { document_type: 'ap_invoice', total: lineTotal, subtotal: lineSubtotal, tax_amount: lineTax, conditions: { vendor: form.vendor_code } };
      const res = await validateAccounting(simInput);
      if (!res.canProceed) { return; }
    } catch { /* proceed if no rules */ }

    await createAPInvoice.mutateAsync({
      vendor_name: form.vendor_name,
      vendor_code: form.vendor_code || undefined,
      purchase_order_id: form.purchase_order_id || undefined,
      goods_receipt_id: form.goods_receipt_id || undefined,
      doc_due_date: form.doc_due_date || undefined,
      payment_terms: form.payment_terms || undefined,
      remarks: form.remarks || undefined,
      lines: form.lines.filter(l => l.item_description),
    });
    setShowCreate(false);
    resetForm();
  };

  const lineSubtotal = form.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const lineTax = lineSubtotal * 0.15;
  const lineTotal = lineSubtotal + lineTax;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AP Invoices</h1>
          <p className="text-muted-foreground">Manage accounts payable invoices from vendors</p>
        </div>
        <div className="flex gap-2">
          <ExportImportButtons data={filtered} columns={apColumns} filename="ap-invoices" title="AP Invoices" />
          <SAPSyncButton entity="ap_invoice_payable" />
          <ClearAllButton tableName="ap_invoices" displayName="AP Invoices" queryKeys={['apInvoices']} relatedTables={['ap_invoice_lines']} />
          <Button onClick={() => { resetForm(); setShowCreate(true); }}><Plus className="h-4 w-4 mr-2" /> New AP Invoice</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search AP invoices..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No AP invoices found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>VAT 15%</TableHead>
                  <TableHead>{t('common.total')}</TableHead>
                   <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('proc.apinv.matchStatus')}</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(inv => (
                  <DocumentContextMenu key={inv.id} chain="procurement" documentType="ap_invoice" documentId={inv.id} documentNumber={inv.invoice_number}>
                  <TableRow className="cursor-pointer">
                    <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{format(new Date(inv.doc_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{inv.vendor_name}</TableCell>
                    <TableCell>{inv.doc_due_date ? format(new Date(inv.doc_due_date), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>{inv.subtotal?.toFixed(2)} SAR</TableCell>
                    <TableCell>{inv.tax_amount?.toFixed(2)} SAR</TableCell>
                    <TableCell>{inv.total?.toFixed(2)} SAR</TableCell>
                    <TableCell><Badge className={statusColors[inv.status] || ''}>{inv.status}</Badge></TableCell>
                    <TableCell>
                      {(() => {
                        const ms = (inv as any).match_status as string | null | undefined;
                        if (ms === 'exception') return <Badge variant="destructive" className="text-xs">{t('proc.apinv.matchException')}</Badge>;
                        if (ms === 'overridden') return <Badge variant="secondary" className="text-xs">{t('proc.apinv.matchOverridden')}</Badge>;
                        if (ms === 'matched' || ms === 'ok') return <Badge variant="outline" className="text-xs border-success text-success">{t('proc.apinv.matchOk')}</Badge>;
                        return <Badge variant="outline" className="text-xs text-muted-foreground">—</Badge>;
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        inv.sync_status === 'synced' ? 'border-success text-success' :
                        inv.sync_status === 'error' ? 'border-destructive text-destructive' :
                        'border-muted-foreground text-muted-foreground'
                      }`}>
                        {inv.sync_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" /> Send by Email
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageCircle className="h-4 w-4 mr-2 text-success" /> Send via WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => syncAP('ap_invoice_payable', 'to_sap', inv.id)}>
                            <ArrowUp className="h-4 w-4 mr-2" /> Push to SAP
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => syncAP('ap_invoice_payable', 'from_sap', inv.id)}>
                            <ArrowDown className="h-4 w-4 mr-2" /> Pull from SAP
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setJePreviewInvoice(inv)}>
                            <BookOpen className="h-4 w-4 mr-2 text-primary" /> Finance Effect
                          </DropdownMenuItem>
                          {((inv as any).match_status === 'exception') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setOverrideInvoiceId(inv.id); setOverrideReason(''); }}>
                                <ShieldAlert className="h-4 w-4 mr-2 text-destructive" /> {t('proc.apinv.requestOverride')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  </DocumentContextMenu>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create AP Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm(); setShowCreate(open); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New AP Invoice</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Purchase Order</Label>
              <select className="w-full border rounded-md p-2 text-sm" value={sourceType === 'po' ? selectedSource : ''} onChange={e => handleSourceSelect(e.target.value, 'po')}>
                <option value="">-- Select PO --</option>
                {purchaseOrders?.filter(po => po.status === 'approved' || po.status === 'partially_delivered' || po.status === 'fully_delivered').map(po => (
                  <option key={po.id} value={po.id}>{po.po_number} - {po.vendor_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>From Goods Receipt</Label>
              <select className="w-full border rounded-md p-2 text-sm" value={sourceType === 'grpo' ? selectedSource : ''} onChange={e => handleSourceSelect(e.target.value, 'grpo')}>
                <option value="">-- Select GRPO --</option>
                {goodsReceipts?.filter(gr => gr.status === 'posted').map(gr => (
                  <option key={gr.id} value={gr.id}>{gr.grpo_number} - {gr.vendor_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Vendor Name *</Label>
              <Input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} />
            </div>
            <DocumentSeriesSelector
              objectCode={SAP_OBJECT_CODES.PurchaseAPInvoices}
              value={selectedSeries}
              onChange={(s) => setSelectedSeries(s)}
              label="Series / No."
            />
            <div>
              <Label>Vendor Code</Label>
              <Input value={form.vendor_code} onChange={e => setForm(f => ({ ...f, vendor_code: e.target.value }))} />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.doc_due_date} onChange={e => setForm(f => ({ ...f, doc_due_date: e.target.value }))} />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Line Items</Label>
              <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                   <TableHead>{t('common.total')}</TableHead>
                   <TableHead>VAT 15%</TableHead>
                   <TableHead>Total + VAT</TableHead>
                   <DimensionTableHeaders />
                   <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.lines.map((line, i) => {
                  const lt = line.quantity * line.unit_price;
                  const tax = lt * 0.15;
                  return (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell><Input value={line.item_code} onChange={e => updateLine(i, 'item_code', e.target.value)} className="w-24" /></TableCell>
                      <TableCell><Input value={line.item_description} onChange={e => updateLine(i, 'item_description', e.target.value)} /></TableCell>
                      <TableCell><Input type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', +e.target.value)} className="w-20" /></TableCell>
                      <TableCell><Input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', +e.target.value)} className="w-28" /></TableCell>
                      <TableCell>{lt.toFixed(2)}</TableCell>
                       <TableCell>{tax.toFixed(2)}</TableCell>
                       <TableCell>{(lt + tax).toFixed(2)}</TableCell>
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
            <div className="text-right mt-2 space-y-1">
              <div className="text-muted-foreground text-sm">Subtotal: {lineSubtotal.toFixed(2)} SAR</div>
              <div className="text-muted-foreground text-sm">VAT (15%): {lineTax.toFixed(2)} SAR</div>
              <div className="font-semibold">Total: {lineTotal.toFixed(2)} SAR</div>
            </div>
          </div>

          <div className="mt-2">
            <AccountingValidationPanel
              documentType="ap_invoice"
              getDocumentData={() => ({ document_type: 'ap_invoice', total: lineTotal, subtotal: lineSubtotal, tax_amount: lineTax, conditions: { vendor: form.vendor_code } })}
              compact
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} disabled={!form.vendor_name || createAPInvoice.isPending}>Create AP Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finance Effect — JE Preview Dialog */}
      <Dialog open={!!jePreviewInvoice} onOpenChange={(open) => { if (!open) setJePreviewInvoice(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Finance Effect — AP Invoice {jePreviewInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          {jePreviewInvoice?.id && (
            <JEPreviewPanel
              documentType="ap_invoice"
              documentId={jePreviewInvoice.id}
              documentRef={jePreviewInvoice.invoice_number}
              postingDate={jePreviewInvoice.doc_date}
              collapsible={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Three-way match override request */}
      <Dialog open={!!overrideInvoiceId} onOpenChange={(o) => { if (!o) { setOverrideInvoiceId(null); setOverrideReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('proc.apinv.requestOverride')}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>{t('common.notes')}</Label>
            <Textarea rows={4} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Explain why the variance is acceptable" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOverrideInvoiceId(null); setOverrideReason(''); }}>Cancel</Button>
            <Button
              disabled={!overrideReason.trim() || requestOverride.isPending}
              onClick={() => {
                if (!overrideInvoiceId) return;
                requestOverride.mutate(
                  { invoiceId: overrideInvoiceId, reason: overrideReason },
                  { onSettled: () => { setOverrideInvoiceId(null); setOverrideReason(''); } },
                );
              }}
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
