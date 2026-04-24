import { useState, useEffect } from 'react';
import DocumentRelationshipMap from '@/components/documents/DocumentRelationshipMap';
import DocumentContextMenu from '@/components/documents/DocumentContextMenu';
import { IncotermSelect } from '@/components/trading/IncotermSelect';
import { PaymentTermsSelect } from '@/components/trading/PaymentTermsSelect';
import { IncotermInfoPanel } from '@/components/trading/IncotermInfoPanel';
import { getPOIncotermWarning } from '@/components/trading/IncotermConstants';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Eye, Check, X, Send, Package, Receipt, MoreVertical, Edit, Mail, MessageCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LineDimensionSelectors } from '@/components/dimensions/LineDimensionSelectors';
import { DocumentSeriesSelector, SAP_OBJECT_CODES } from '@/components/series/DocumentSeriesSelector';
import { ItemCombobox, type ItemOption } from '@/components/items/ItemCombobox';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';

const poColumns: ColumnDef[] = [
  { key: 'po_number', header: 'PO #' },
  { key: 'vendor_name', header: 'Vendor' },
  { key: 'doc_date', header: 'Date' },
  { key: 'subtotal', header: 'Subtotal' },
  { key: 'total', header: 'Total' },
  { key: 'status', header: 'Status' },
];
import { usePurchaseOrders, usePurchaseRequests } from '@/hooks/useProcurement';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import type { CopyFromPR, CopyFromPQ, CopyFromPO } from './ProcurementDashboard';
import { useLanguage } from '@/contexts/LanguageContext';
import { TransactionToolbar } from '@/components/shared/TransactionToolbar';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  partially_delivered: 'bg-blue-100 text-blue-800',
  fully_delivered: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface Props {
  initialPRData?: CopyFromPR | null;
  onDataConsumed?: () => void;
  initialPQData?: CopyFromPQ | null;
  onPQDataConsumed?: () => void;
  onCopyToGRPO?: (data: CopyFromPO) => void;
  onCopyToAPInvoice?: (data: CopyFromPO) => void;
  autoOpenCreate?: boolean;
}

export default function PurchaseOrders({ initialPRData, onDataConsumed, initialPQData, onPQDataConsumed, onCopyToGRPO, onCopyToAPInvoice, autoOpenCreate }: Props) {
  const { t } = useLanguage();
  const { purchaseOrders, isLoading, createPO, submitForApproval, approvePO, rejectPO, getPOLines } = usePurchaseOrders();
  const { purchaseRequests, getPRLines } = usePurchaseRequests();
  const { hasRole } = useAuth();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(autoOpenCreate || false);
  const [viewPO, setViewPO] = useState<any>(null);
  const [viewLines, setViewLines] = useState<any[]>([]);
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedPR, setSelectedPR] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);

  const [form, setForm] = useState({
    vendor_name: '',
    vendor_code: '',
    delivery_date: '',
    payment_terms: '',
    incoterm: '',
    shipping_address: '',
    remarks: '',
    purchase_quotation_id: undefined as string | undefined,
    lines: [{ item_description: '', item_code: '', quantity: 1, unit_price: 0, dim_employee_id: null as string | null, dim_branch_id: null as string | null, dim_business_line_id: null as string | null, dim_factory_id: null as string | null }] as { item_description: string; item_code: string; quantity: number; unit_price: number; dim_employee_id: string | null; dim_branch_id: string | null; dim_business_line_id: string | null; dim_factory_id: string | null }[],
  });

  // Handle initial PR data from "Copy to PO"
  useEffect(() => {
    if (initialPRData) {
      setForm({
        vendor_name: '',
        vendor_code: '',
        delivery_date: '',
        payment_terms: '',
        incoterm: '',
        shipping_address: '',
        remarks: initialPRData.remarks || `From ${initialPRData.pr_number}`,
        purchase_quotation_id: undefined,
        lines: initialPRData.lines.length > 0
          ? initialPRData.lines.map(l => ({
              item_code: l.item_code || '',
              item_description: l.item_description,
              quantity: l.quantity,
              unit_price: l.unit_price,
              dim_employee_id: null as string | null, dim_branch_id: null as string | null, dim_business_line_id: null as string | null, dim_factory_id: null as string | null,
            }))
          : [{ item_description: '', item_code: '', quantity: 1, unit_price: 0, dim_employee_id: null as string | null, dim_branch_id: null as string | null, dim_business_line_id: null as string | null, dim_factory_id: null as string | null }],
      });
      setSelectedPR(initialPRData.pr_id);
      setShowCreate(true);
      onDataConsumed?.();
    }
  }, [initialPRData]);

  // Handle initial PQ data from "Copy PQ to PO"
  useEffect(() => {
    if (initialPQData) {
      setForm({
        vendor_name: initialPQData.vendor_name,
        vendor_code: initialPQData.vendor_code || '',
        delivery_date: '',
        payment_terms: '',
        incoterm: '',
        shipping_address: '',
        remarks: initialPQData.remarks || `From ${initialPQData.pq_number}`,
        purchase_quotation_id: initialPQData.pq_id,
        lines: initialPQData.lines.length > 0
          ? initialPQData.lines.map(l => ({
              item_code: l.item_code || '',
              item_description: l.item_description,
              quantity: l.quantity,
              unit_price: l.unit_price,
              dim_employee_id: null as string | null, dim_branch_id: null as string | null, dim_business_line_id: null as string | null, dim_factory_id: null as string | null,
            }))
          : [{ item_description: '', item_code: '', quantity: 1, unit_price: 0, dim_employee_id: null as string | null, dim_branch_id: null as string | null, dim_business_line_id: null as string | null, dim_factory_id: null as string | null }],
      });
      setSelectedPR(initialPQData.purchase_request_id || '');
      setShowCreate(true);
      onPQDataConsumed?.();
    }
  }, [initialPQData]);

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
            unit_price: l.unit_price || 0,
            dim_employee_id: null as string | null, dim_branch_id: null as string | null, dim_business_line_id: null as string | null, dim_factory_id: null as string | null,
          })),
        }));
      }
    } catch (e) {
      console.error('Failed to load PR lines', e);
    }
  };

  const handleCopyToGRPO = async (po: any) => {
    const lines = await getPOLines(po.id);
    const data: CopyFromPO = {
      source_id: po.id,
      source_type: 'po',
      doc_number: po.po_number,
      vendor_name: po.vendor_name,
      vendor_code: po.vendor_code,
      project_id: po.project_id,
      branch_id: po.branch_id,
      remarks: po.remarks,
      lines: lines.map(l => ({
        item_code: l.item_code,
        item_description: l.item_description,
        quantity: l.quantity,
        unit_price: l.unit_price,
      })),
    };
    onCopyToGRPO?.(data);
  };

  const handleCopyToAPInvoice = async (po: any) => {
    const lines = await getPOLines(po.id);
    const data: CopyFromPO = {
      source_id: po.id,
      source_type: 'po',
      doc_number: po.po_number,
      vendor_name: po.vendor_name,
      vendor_code: po.vendor_code,
      project_id: po.project_id,
      branch_id: po.branch_id,
      remarks: po.remarks,
      lines: lines.map(l => ({
        item_code: l.item_code,
        item_description: l.item_description,
        quantity: l.quantity,
        unit_price: l.unit_price,
      })),
    };
    onCopyToAPInvoice?.(data);
  };

  const filtered = purchaseOrders?.filter(po =>
    po.po_number.toLowerCase().includes(search.toLowerCase()) ||
    po.vendor_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleView = async (po: any) => {
    setViewPO(po);
    const lines = await getPOLines(po.id);
    setViewLines(lines);
  };

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { item_description: '', item_code: '', quantity: 1, unit_price: 0, dim_employee_id: null, dim_branch_id: null, dim_business_line_id: null, dim_factory_id: null }] }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: string, value: any) => {
    setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));
  };

  const resetForm = () => {
    setForm({ vendor_name: '', vendor_code: '', delivery_date: '', payment_terms: '', incoterm: '', shipping_address: '', remarks: '', purchase_quotation_id: undefined, lines: [{ item_description: '', item_code: '', quantity: 1, unit_price: 0, dim_employee_id: null, dim_branch_id: null, dim_business_line_id: null, dim_factory_id: null }] });
    setSelectedPR('');
  };

  const handleCreate = async () => {
    await createPO.mutateAsync({
      vendor_name: form.vendor_name,
      vendor_code: form.vendor_code || undefined,
      purchase_request_id: selectedPR || undefined,
      purchase_quotation_id: form.purchase_quotation_id,
      delivery_date: form.delivery_date || undefined,
      payment_terms: form.payment_terms || undefined,
      incoterm: form.incoterm || undefined,
      shipping_address: form.shipping_address || undefined,
      remarks: form.remarks || undefined,
      lines: form.lines.filter(l => l.item_description),
    });
    setShowCreate(false);
    resetForm();
  };

  const handleReject = async () => {
    if (rejectDialog) {
      await rejectPO.mutateAsync({ poId: rejectDialog, reason: rejectReason });
      setRejectDialog(null);
      setRejectReason('');
    }
  };

  const lineSubtotal = form.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const lineTax = lineSubtotal * 0.15;
  const lineTotal = lineSubtotal + lineTax;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground">Create and manage purchase orders with approval workflow</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <TransactionToolbar
            onAdd={() => { resetForm(); setShowCreate(true); }}
            addLabel="New Purchase Order"
            onFind={(q) => setSearch(q)}
          />
          <ExportImportButtons data={filtered} columns={poColumns} filename="purchase-orders" title="Purchase Orders" />
          <SAPSyncButton entity="purchase_order" />
          <ClearAllButton tableName="purchase_orders" displayName="Purchase Orders" queryKeys={['purchaseOrders']} relatedTables={['purchase_order_lines']} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search purchase orders..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No purchase orders found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>{t('common.total')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                   <TableHead>Approval</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(po => (
                  <DocumentContextMenu key={po.id} chain="procurement" documentType="purchase_order" documentId={po.id} documentNumber={po.po_number} onOpen={() => handleView(po)}>
                  <TableRow className="cursor-pointer">
                    <TableCell className="font-mono font-medium">{po.po_number}</TableCell>
                    <TableCell>{format(new Date(po.doc_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{po.vendor_name}</TableCell>
                    <TableCell>{po.total?.toFixed(2)} SAR</TableCell>
                    <TableCell><Badge className={statusColors[po.status] || ''}>{po.status.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><Badge variant={po.approval_status === 'approved' ? 'default' : 'outline'}>{po.approval_status}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        po.sync_status === 'synced' ? 'border-success text-success' :
                        po.sync_status === 'error' ? 'border-destructive text-destructive' :
                        'border-muted-foreground text-muted-foreground'
                      }`}>
                        {po.sync_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(po)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          {po.status === 'draft' && (
                            <DropdownMenuItem onClick={() => submitForApproval.mutate(po.id)}>
                              <Send className="h-4 w-4 mr-2" /> Submit for Approval
                            </DropdownMenuItem>
                          )}
                          {po.status === 'pending_approval' && (hasRole('admin') || hasRole('manager')) && (
                            <>
                              <DropdownMenuItem className="text-success" onClick={() => approvePO.mutate(po.id)}>
                                <Check className="h-4 w-4 mr-2" /> Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setRejectDialog(po.id)}>
                                <X className="h-4 w-4 mr-2" /> Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {(po.status === 'approved' || po.status === 'partially_delivered') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleCopyToGRPO(po)}>
                                <Package className="h-4 w-4 mr-2" /> Copy to GRPO
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyToAPInvoice(po)}>
                                <Receipt className="h-4 w-4 mr-2" /> Copy to AP Invoice
                              </DropdownMenuItem>
                            </>
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

      {/* Create PO Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm(); setShowCreate(open); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendor Name *</Label>
              <Input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} />
            </div>
            <DocumentSeriesSelector
              objectCode={SAP_OBJECT_CODES.PurchaseOrders}
              value={selectedSeries}
              onChange={(s) => setSelectedSeries(s)}
              label="Series / No."
            />
            <div>
              <Label>Vendor Code</Label>
              <Input value={form.vendor_code} onChange={e => setForm(f => ({ ...f, vendor_code: e.target.value }))} />
            </div>
            <div>
              <Label>From Purchase Request</Label>
              <select className="w-full border rounded-md p-2 text-sm" value={selectedPR} onChange={e => handlePRSelect(e.target.value)}>
                <option value="">-- None --</option>
                {purchaseRequests?.filter(pr => pr.status === 'open' || pr.status === 'approved').map(pr => (
                  <option key={pr.id} value={pr.id}>{pr.pr_number} - {pr.requester_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Delivery Date</Label>
              <Input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <PaymentTermsSelect value={form.payment_terms} onValueChange={v => setForm(f => ({ ...f, payment_terms: v }))} />
            </div>
            <div>
              <Label>Incoterm</Label>
              <IncotermSelect value={form.incoterm} onValueChange={v => setForm(f => ({ ...f, incoterm: v }))} />
            </div>
            {form.incoterm && (
              <div className="col-span-2">
                <IncotermInfoPanel incoterm={form.incoterm} />
                {getPOIncotermWarning(form.incoterm) && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    {getPOIncotermWarning(form.incoterm)}
                  </div>
                )}
              </div>
            )}
            <div>
              <Label>Shipping Address</Label>
              <Input value={form.shipping_address} onChange={e => setForm(f => ({ ...f, shipping_address: e.target.value }))} />
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
                  <TableHead>{t('hr.employee')}</TableHead>
                  <TableHead>{t('common.branch')}</TableHead>
                  <TableHead>Business Line</TableHead>
                  <TableHead>Factory</TableHead>
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
                    <TableCell>
                      <ItemCombobox
                        value={line.item_code}
                        onSelect={(selected) => {
                          if (selected) {
                            updateLine(i, 'item_code', selected.item_code);
                            updateLine(i, 'item_description', selected.description);
                            updateLine(i, 'unit_price', selected.default_price || 0);
                          } else {
                            updateLine(i, 'item_code', '');
                            updateLine(i, 'item_description', '');
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell><Input value={line.item_description} onChange={e => updateLine(i, 'item_description', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', +e.target.value)} className="w-20" /></TableCell>
                    <TableCell><Input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', +e.target.value)} className="w-28" /></TableCell>
                    <TableCell>{lt.toFixed(2)}</TableCell>
                    <TableCell>{tax.toFixed(2)}</TableCell>
                    <TableCell>{(lt + tax).toFixed(2)}</TableCell>
                    <LineDimensionSelectors
                      dimensions={{ dim_employee_id: line.dim_employee_id, dim_branch_id: line.dim_branch_id, dim_business_line_id: line.dim_business_line_id, dim_factory_id: line.dim_factory_id }}
                      onChange={(dims) => { setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, ...dims } : l) })); }}
                    />
                    <TableCell>{form.lines.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeLine(i)}><X className="h-3 w-3" /></Button>}</TableCell>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} disabled={!form.vendor_name || createPO.isPending}>Create Purchase Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View PO Dialog */}
      <Dialog open={!!viewPO} onOpenChange={() => setViewPO(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Purchase Order: {viewPO?.po_number}</DialogTitle></DialogHeader>
          {viewPO && (
            <DocumentRelationshipMap chain="procurement" documentType="purchase_order" documentId={viewPO.id} compact className="mb-2" />
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Vendor:</span> {viewPO?.vendor_name}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewPO?.doc_date}</div>
            <div><span className="text-muted-foreground">Status:</span> <Badge className={statusColors[viewPO?.status] || ''}>{viewPO?.status?.replace(/_/g, ' ')}</Badge></div>
            <div><span className="text-muted-foreground">Total:</span> {viewPO?.total?.toFixed(2)} SAR</div>
            <div><span className="text-muted-foreground">Approval:</span> {viewPO?.approval_status}</div>
            {viewPO?.approved_by_name && <div><span className="text-muted-foreground">Approved By:</span> {viewPO.approved_by_name}</div>}
            {viewPO?.rejected_reason && <div className="col-span-2 text-red-600"><span className="text-muted-foreground">Rejection:</span> {viewPO.rejected_reason}</div>}
          </div>
          {viewLines.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>{t('common.total')}</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewLines.map(line => (
                  <TableRow key={line.id}>
                    <TableCell>{line.line_num}</TableCell>
                    <TableCell>{line.item_code || '-'}</TableCell>
                    <TableCell>{line.item_description}</TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>{line.unit_price?.toFixed(2)}</TableCell>
                    <TableCell>{line.line_total?.toFixed(2)}</TableCell>
                    <TableCell>{line.received_quantity || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {(viewPO?.status === 'approved' || viewPO?.status === 'partially_delivered') && (
              <>
                <Button variant="outline" onClick={() => { handleCopyToGRPO(viewPO); setViewPO(null); }}>
                  <Package className="h-4 w-4 mr-1" /> Copy to GRPO
                </Button>
                <Button variant="outline" onClick={() => { handleCopyToAPInvoice(viewPO); setViewPO(null); }}>
                  <Receipt className="h-4 w-4 mr-1" /> Copy to AP Invoice
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Purchase Order</DialogTitle></DialogHeader>
          <div>
            <Label>Rejection Reason</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter reason..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
