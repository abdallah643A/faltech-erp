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
import { Search, Plus, Check, X, Receipt, MoreVertical, Eye, Edit, Mail, MessageCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';

const grColumns: ColumnDef[] = [
  { key: 'grpo_number', header: 'GRPO #' },
  { key: 'vendor_name', header: 'Vendor' },
  { key: 'doc_date', header: 'Date' },
  { key: 'subtotal', header: 'Subtotal' },
  { key: 'total', header: 'Total' },
  { key: 'status', header: 'Status' },
];
import { LineDimensionSelectors, DimensionTableHeaders, EMPTY_DIMENSIONS, type LineDimensions } from '@/components/dimensions/LineDimensionSelectors';
import { DocumentSeriesSelector, SAP_OBJECT_CODES } from '@/components/series/DocumentSeriesSelector';
import { useGoodsReceipts, usePurchaseOrders } from '@/hooks/useProcurement';
import { format } from 'date-fns';
import type { CopyFromPO } from './ProcurementDashboard';
import { useLanguage } from '@/contexts/LanguageContext';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  posted: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface Props {
  initialPOData?: CopyFromPO | null;
  onDataConsumed?: () => void;
  onCopyToAPInvoice?: (data: CopyFromPO) => void;
  autoOpenCreate?: boolean;
}

export default function GoodsReceipts({ initialPOData, onDataConsumed, onCopyToAPInvoice, autoOpenCreate }: Props) {
  const { t } = useLanguage();
  const { goodsReceipts, isLoading, createGRPO, postGRPO } = useGoodsReceipts();
  const { purchaseOrders, getPOLines } = usePurchaseOrders();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(autoOpenCreate || false);
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);
  const [selectedPO, setSelectedPO] = useState('');

  const [form, setForm] = useState({
    vendor_name: '',
    vendor_code: '',
    warehouse: '',
    remarks: '',
    lines: [{ item_description: '', item_code: '', received_quantity: 1, unit_price: 0, ordered_quantity: 0, ...EMPTY_DIMENSIONS }] as ({ item_description: string; item_code: string; received_quantity: number; unit_price: number; ordered_quantity: number } & LineDimensions)[],
  });

  // Handle initial PO data from "Copy PO to GRPO"
  useEffect(() => {
    if (initialPOData) {
      setForm({
        vendor_name: initialPOData.vendor_name,
        vendor_code: initialPOData.vendor_code || '',
        warehouse: '',
        remarks: initialPOData.remarks || `From ${initialPOData.doc_number}`,
        lines: initialPOData.lines.length > 0
          ? initialPOData.lines.map(l => ({
              item_code: l.item_code || '',
              item_description: l.item_description,
              received_quantity: l.quantity,
              unit_price: l.unit_price,
              ordered_quantity: l.quantity,
              ...EMPTY_DIMENSIONS,
            }))
          : [{ item_description: '', item_code: '', received_quantity: 1, unit_price: 0, ordered_quantity: 0, ...EMPTY_DIMENSIONS }],
      });
      setSelectedPO(initialPOData.source_id);
      setShowCreate(true);
      onDataConsumed?.();
    }
  }, [initialPOData]);

  const filtered = goodsReceipts?.filter(gr =>
    gr.grpo_number.toLowerCase().includes(search.toLowerCase()) ||
    gr.vendor_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { item_description: '', item_code: '', received_quantity: 1, unit_price: 0, ordered_quantity: 0, ...EMPTY_DIMENSIONS }] }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: string, value: any) => {
    setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));
  };

  const handlePOSelect = async (poId: string) => {
    setSelectedPO(poId);
    const po = purchaseOrders?.find(p => p.id === poId);
    if (po) {
      const lines = await getPOLines(po.id);
      setForm(f => ({
        ...f,
        vendor_name: po.vendor_name,
        vendor_code: po.vendor_code || '',
        remarks: f.remarks || `From ${po.po_number}`,
        lines: lines.length > 0 ? lines.map(l => ({
          item_code: l.item_code || '',
          item_description: l.item_description,
          received_quantity: l.quantity,
          unit_price: l.unit_price,
          ordered_quantity: l.quantity,
          ...EMPTY_DIMENSIONS,
        })) : f.lines,
      }));
    }
  };

  const handleCopyToAPInvoice = (gr: any) => {
    const data: CopyFromPO = {
      source_id: gr.id,
      source_type: 'grpo',
      doc_number: gr.grpo_number,
      vendor_name: gr.vendor_name,
      vendor_code: gr.vendor_code,
      project_id: gr.project_id,
      branch_id: gr.branch_id,
      remarks: gr.remarks,
      lines: [], // GRPO lines would need to be fetched separately; for now pass empty
    };
    onCopyToAPInvoice?.(data);
  };

  const handleCreate = async () => {
    // Accounting pre-validation
    try {
      const { validateAccounting } = await import('@/services/accountingValidator');
      const lineTotal = form.lines.reduce((s, l) => s + l.received_quantity * l.unit_price, 0);
      const res = await validateAccounting({ document_type: 'goods_receipt_po', total: lineTotal, subtotal: lineTotal, tax_amount: 0, conditions: { vendor: form.vendor_code } });
      if (!res.canProceed) return;
    } catch { /* proceed */ }

    await createGRPO.mutateAsync({
      vendor_name: form.vendor_name,
      vendor_code: form.vendor_code || undefined,
      purchase_order_id: selectedPO || undefined,
      warehouse: form.warehouse || undefined,
      remarks: form.remarks || undefined,
      lines: form.lines.filter(l => l.item_description),
    });
    setShowCreate(false);
    setForm({ vendor_name: '', vendor_code: '', warehouse: '', remarks: '', lines: [{ item_description: '', item_code: '', received_quantity: 1, unit_price: 0, ordered_quantity: 0, ...EMPTY_DIMENSIONS }] });
    setSelectedPO('');
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Goods Receipt PO</h1>
          <p className="text-muted-foreground">Record received goods against purchase orders</p>
        </div>
        <div className="flex gap-2">
          <ExportImportButtons data={filtered} columns={grColumns} filename="goods-receipts" title="Goods Receipts" />
          <SAPSyncButton entity="goods_receipt" />
          <ClearAllButton tableName="goods_receipts" displayName="Goods Receipts" queryKeys={['goodsReceipts']} relatedTables={['goods_receipt_lines']} />
          <Button onClick={() => { setSelectedPO(''); setForm({ vendor_name: '', vendor_code: '', warehouse: '', remarks: '', lines: [{ item_description: '', item_code: '', received_quantity: 1, unit_price: 0, ordered_quantity: 0, ...EMPTY_DIMENSIONS }] }); setShowCreate(true); }}><Plus className="h-4 w-4 mr-2" /> New Goods Receipt</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search goods receipts..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No goods receipts found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRPO Number</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>{t('common.total')}</TableHead>
                   <TableHead>{t('common.status')}</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(gr => (
                  <DocumentContextMenu key={gr.id} chain="procurement" documentType="goods_receipt" documentId={gr.id} documentNumber={gr.grpo_number}>
                  <TableRow className="cursor-pointer">
                    <TableCell className="font-mono font-medium">{gr.grpo_number}</TableCell>
                    <TableCell>{format(new Date(gr.doc_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{gr.vendor_name}</TableCell>
                    <TableCell>{gr.warehouse || '-'}</TableCell>
                    <TableCell>{gr.total?.toFixed(2)} SAR</TableCell>
                    <TableCell><Badge className={statusColors[gr.status] || ''}>{gr.status}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        gr.sync_status === 'synced' ? 'border-success text-success' :
                        gr.sync_status === 'error' ? 'border-destructive text-destructive' :
                        'border-muted-foreground text-muted-foreground'
                      }`}>
                        {gr.sync_status || 'pending'}
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
                          {gr.status === 'draft' && (
                            <DropdownMenuItem className="text-success" onClick={() => postGRPO.mutate(gr.id)}>
                              <Check className="h-4 w-4 mr-2" /> Post
                            </DropdownMenuItem>
                          )}
                          {gr.status === 'posted' && (
                            <DropdownMenuItem onClick={() => handleCopyToAPInvoice(gr)}>
                              <Receipt className="h-4 w-4 mr-2" /> Copy to AP Invoice
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" /> Send by Email
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageCircle className="h-4 w-4 mr-2 text-success" /> Send via WhatsApp
                          </DropdownMenuItem>
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

      {/* Create GRPO Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Goods Receipt PO</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Purchase Order</Label>
              <select className="w-full border rounded-md p-2 text-sm" value={selectedPO} onChange={e => handlePOSelect(e.target.value)}>
                <option value="">-- Select PO --</option>
                {purchaseOrders?.filter(po => po.status === 'approved' || po.status === 'partially_delivered').map(po => (
                  <option key={po.id} value={po.id}>{po.po_number} - {po.vendor_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Vendor Name *</Label>
              <Input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} />
            </div>
            <DocumentSeriesSelector
              objectCode={SAP_OBJECT_CODES.GoodsReceiptsPO}
              value={selectedSeries}
              onChange={(s) => setSelectedSeries(s)}
              label="Series / No."
            />
            <div>
              <Label>Warehouse</Label>
              <Input value={form.warehouse} onChange={e => setForm(f => ({ ...f, warehouse: e.target.value }))} />
            </div>
            <div>
              <Label>Vendor Code</Label>
              <Input value={form.vendor_code} onChange={e => setForm(f => ({ ...f, vendor_code: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Received Items</Label>
              <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead>Received Qty</TableHead>
                   <TableHead>Unit Price</TableHead>
                   <TableHead>{t('common.total')}</TableHead>
                   <DimensionTableHeaders />
                   <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell><Input value={line.item_code} onChange={e => updateLine(i, 'item_code', e.target.value)} className="w-24" /></TableCell>
                    <TableCell><Input value={line.item_description} onChange={e => updateLine(i, 'item_description', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" value={line.received_quantity} onChange={e => updateLine(i, 'received_quantity', +e.target.value)} className="w-20" /></TableCell>
                    <TableCell><Input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', +e.target.value)} className="w-28" /></TableCell>
                     <TableCell>{(line.received_quantity * line.unit_price).toFixed(2)}</TableCell>
                     <LineDimensionSelectors
                       dimensions={{ dim_employee_id: line.dim_employee_id, dim_branch_id: line.dim_branch_id, dim_business_line_id: line.dim_business_line_id, dim_factory_id: line.dim_factory_id }}
                       onChange={(dims) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, ...dims } : l) }))}
                     />
                     <td className="p-1">{form.lines.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeLine(i)}><X className="h-3 w-3" /></Button>}</td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-2">
            <AccountingValidationPanel
              documentType="goods_receipt_po"
              getDocumentData={() => {
                const lineTotal = form.lines.reduce((s, l) => s + l.received_quantity * l.unit_price, 0);
                return { document_type: 'goods_receipt_po', total: lineTotal, subtotal: lineTotal, tax_amount: 0, conditions: { vendor: form.vendor_code } };
              }}
              compact
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} disabled={!form.vendor_name || createGRPO.isPending}>Create Goods Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
