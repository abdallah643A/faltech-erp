import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search, Plus, MoreVertical, Banknote, CreditCard, Building2,
  Trash2, CheckCircle, Clock, Edit, Loader2, Minus, Maximize2, X,
  DollarSign, FileText,
} from 'lucide-react';
import { useOutgoingPayments } from '@/hooks/useOutgoingPayments';
import { CustomerSelector, SelectedCustomer } from '@/components/customers/CustomerSelector';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import { AccountingValidationPanel } from '@/components/accounting/AccountingValidationPanel';
import type { ColumnDef } from '@/utils/exportImportUtils';

const paymentColumns: ColumnDef[] = [
  { key: 'doc_num', header: 'Doc #' },
  { key: 'pay_to_type', header: 'Pay To' },
  { key: 'vendor_name', header: 'Name' },
  { key: 'doc_date', header: 'Date' },
  { key: 'total_amount', header: 'Amount' },
  { key: 'currency', header: 'Currency' },
  { key: 'status', header: 'Status' },
];

const emptyForm = {

  pay_to_type: 'vendor' as string,
  vendor_code: '', vendor_name: '', customer_code: '', customer_name: '',
  account_code: '', contact_person: '', project: '', blanket_agreement: '',
  doc_date: new Date().toISOString().split('T')[0],
  posting_date: new Date().toISOString().split('T')[0],
  due_date: new Date().toISOString().split('T')[0],
  reference: '', transaction_no: '',
  payment_type: 'bank_transfer',
  total_amount: 0, payment_on_account: 0, currency: 'SAR',
  remarks: '', journal_remarks: '',
  check_number: '', check_date: '', bank_code: '', bank_account: '',
  credit_card_type: '', credit_card_number: '', cash_account: '', transfer_account: '',
};

export default function OutgoingPayments() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { payments, isLoading, createPayment, updatePayment, deletePayment, postPayment, totalPaid, pendingCount, postedCount } = useOutgoingPayments();

  const filtered = (payments || []).filter(p =>
    (p.vendor_name || p.customer_name || '')?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(p.doc_num).includes(searchQuery) ||
    (p.vendor_code || p.customer_code || '')?.includes(searchQuery)
  );

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setForm({
      pay_to_type: p.pay_to_type || 'vendor',
      vendor_code: p.vendor_code || '', vendor_name: p.vendor_name || '',
      customer_code: p.customer_code || '', customer_name: p.customer_name || '',
      account_code: p.account_code || '', contact_person: p.contact_person || '',
      project: p.project || '', blanket_agreement: p.blanket_agreement || '',
      doc_date: p.doc_date || '', posting_date: p.posting_date || '',
      due_date: p.due_date || '', reference: p.reference || '',
      transaction_no: p.transaction_no || '',
      payment_type: p.payment_type || 'bank_transfer',
      total_amount: p.total_amount || 0, payment_on_account: p.payment_on_account || 0,
      currency: p.currency || 'SAR',
      remarks: p.remarks || '', journal_remarks: p.journal_remarks || '',
      check_number: p.check_number || '', check_date: p.check_date || '',
      bank_code: p.bank_code || '', bank_account: p.bank_account || '',
      credit_card_type: p.credit_card_type || '', credit_card_number: p.credit_card_number || '',
      cash_account: p.cash_account || '', transfer_account: p.transfer_account || '',
    });
    setEditingId(p.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload: any = {
      pay_to_type: form.pay_to_type,
      doc_date: form.doc_date,
      posting_date: form.posting_date || null,
      due_date: form.due_date || null,
      total_amount: Number(form.total_amount) || 0,
      payment_on_account: Number(form.payment_on_account) || 0,
      currency: form.currency,
      reference: form.reference || null,
      transaction_no: form.transaction_no || null,
      remarks: form.remarks || null,
      journal_remarks: form.journal_remarks || null,
      payment_type: form.payment_type,
      contact_person: form.contact_person || null,
      project: form.project || null,
      blanket_agreement: form.blanket_agreement || null,
      check_number: form.check_number || null,
      check_date: form.check_date || null,
      bank_code: form.bank_code || null,
      bank_account: form.bank_account || null,
      credit_card_type: form.credit_card_type || null,
      credit_card_number: form.credit_card_number || null,
      cash_account: form.cash_account || null,
      transfer_account: form.transfer_account || null,
    };

    if (form.pay_to_type === 'vendor') {
      payload.vendor_code = form.vendor_code;
      payload.vendor_name = form.vendor_name;
    } else if (form.pay_to_type === 'customer') {
      payload.customer_code = form.customer_code;
      payload.customer_name = form.customer_name;
    } else {
      payload.account_code = form.account_code;
    }

    if (editingId) {
      updatePayment.mutate({ id: editingId, ...payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createPayment.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleSelectVendor = (bp: SelectedCustomer | null) => {
    if (bp) setForm(f => ({ ...f, vendor_code: bp.code, vendor_name: bp.name }));
  };

  const handleSelectCustomer = (bp: SelectedCustomer | null) => {
    if (bp) setForm(f => ({ ...f, customer_code: bp.code, customer_name: bp.name }));
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'posted': return <Badge className="bg-green-600 text-white">Posted</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      case 'closed': return <Badge variant="secondary">Closed</Badge>;
      default: return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Outgoing Payments</h1>
          <p className="text-sm text-muted-foreground">Manage vendor and supplier payments</p>
        </div>
        <Button onClick={openNew} className="bg-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> New Payment
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Paid</p><p className="text-lg font-bold">{totalPaid.toLocaleString()} SAR</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
          <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold">{pendingCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-xs text-muted-foreground">Posted</p><p className="text-lg font-bold">{postedCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10"><FileText className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Payments</p><p className="text-lg font-bold">{(payments || []).length}</p></div>
        </CardContent></Card>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search payments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <ExportImportButtons data={filtered} columns={paymentColumns} filename="outgoing-payments" title="Outgoing Payments" />
        <ClearAllButton tableName="outgoing_payments" displayName="outgoing payments" queryKeys={['outgoing-payments']} />
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doc #</TableHead>
              <TableHead>Pay To</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No outgoing payments found</TableCell></TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id} className="cursor-pointer" onDoubleClick={() => openEdit(p)}>
                <TableCell className="font-mono">{p.doc_num}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{p.pay_to_type}</Badge></TableCell>
                <TableCell>{p.vendor_code || p.customer_code || p.account_code}</TableCell>
                <TableCell>{p.vendor_name || p.customer_name || '-'}</TableCell>
                <TableCell>{p.doc_date}</TableCell>
                <TableCell className="font-mono">{Number(p.total_amount).toLocaleString()}</TableCell>
                <TableCell>{p.currency}</TableCell>
                <TableCell>{statusBadge(p.status || 'draft')}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(p)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                      {p.status === 'draft' && (
                        <DropdownMenuItem onClick={() => postPayment.mutate(p.id)}>
                          <CheckCircle className="h-4 w-4 mr-2" />Post
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive" onClick={() => deletePayment.mutate(p.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* SAP-Style Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={isMaximized ? 'max-w-[100vw] w-screen h-screen max-h-screen rounded-none' : 'max-w-4xl max-h-[90vh] overflow-y-auto'}>
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 bg-[hsl(var(--sidebar-background))] -mx-6 -mt-6 px-6 pt-4 rounded-t-lg">
            <DialogTitle className="text-foreground">
              {editingId ? 'Outgoing Payments' : 'Outgoing Payments - Add'}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMaximized(!isMaximized)}>
                {isMaximized ? <Minus className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDialogOpen(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Top Section - Dual Column Header */}
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-3">
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Code</Label>
                  {form.pay_to_type === 'vendor' ? (
                    <CustomerSelector onChange={handleSelectVendor} value={form.vendor_code ? { id: null, code: form.vendor_code, name: form.vendor_name, phone: '', type: 'business_partner' } : null} />
                  ) : form.pay_to_type === 'customer' ? (
                    <CustomerSelector onChange={handleSelectCustomer} value={form.customer_code ? { id: null, code: form.customer_code, name: form.customer_name, phone: '', type: 'business_partner' } : null} />
                  ) : (
                    <Input value={form.account_code} onChange={e => setForm(f => ({ ...f, account_code: e.target.value }))} placeholder="G/L Account" />
                  )}
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Name</Label>
                  <Input value={form.pay_to_type === 'vendor' ? form.vendor_name : form.customer_name} readOnly className="bg-muted/50" />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Pay To</Label>
                  <Select value={form.pay_to_type} onValueChange={v => setForm(f => ({ ...f, pay_to_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Contact Person</Label>
                  <Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Project</Label>
                  <Input value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Blanket Agreement</Label>
                  <Input value={form.blanket_agreement} onChange={e => setForm(f => ({ ...f, blanket_agreement: e.target.value }))} />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" name="payToType" checked={form.pay_to_type === 'vendor'} onChange={() => setForm(f => ({ ...f, pay_to_type: 'vendor' }))} />
                    Vendor
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" name="payToType" checked={form.pay_to_type === 'customer'} onChange={() => setForm(f => ({ ...f, pay_to_type: 'customer' }))} />
                    Customer
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" name="payToType" checked={form.pay_to_type === 'account'} onChange={() => setForm(f => ({ ...f, pay_to_type: 'account' }))} />
                    Account
                  </label>
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Posting Date</Label>
                  <Input type="date" value={form.posting_date} onChange={e => setForm(f => ({ ...f, posting_date: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Due Date</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Document Date</Label>
                  <Input type="date" value={form.doc_date} onChange={e => setForm(f => ({ ...f, doc_date: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Reference</Label>
                  <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Transaction No.</Label>
                  <Input value={form.transaction_no} onChange={e => setForm(f => ({ ...f, transaction_no: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Contents / Attachments Tabs - Invoice Matching Table */}
            <Tabs defaultValue="contents" className="w-full">
              <TabsList>
                <TabsTrigger value="contents">Contents</TabsTrigger>
                <TabsTrigger value="payment_means">Payment Means</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
              </TabsList>

              <TabsContent value="contents">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Selected</TableHead>
                        <TableHead>Document No.</TableHead>
                        <TableHead>Installment</TableHead>
                        <TableHead>Document Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Overdue Days</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Balance Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-xs">
                          Select a vendor/customer to display matching invoices
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>

                <div className="flex items-center justify-end gap-3 mt-3">
                  <Checkbox id="payOnAccount" />
                  <Label htmlFor="payOnAccount" className="text-sm">Payment on Account</Label>
                  <Input type="number" value={form.payment_on_account} onChange={e => setForm(f => ({ ...f, payment_on_account: Number(e.target.value) }))} className="w-32 text-right" />
                </div>
              </TabsContent>

              <TabsContent value="payment_means">
                <Tabs defaultValue="check">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="check">Check</TabsTrigger>
                    <TabsTrigger value="bank_transfer">Bank Transfer</TabsTrigger>
                    <TabsTrigger value="credit_card">Credit Card</TabsTrigger>
                    <TabsTrigger value="cash">Cash</TabsTrigger>
                  </TabsList>
                  <TabsContent value="check" className="space-y-3 pt-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-xs">Check Number</Label><Input value={form.check_number} onChange={e => setForm(f => ({ ...f, check_number: e.target.value }))} /></div>
                      <div><Label className="text-xs">Check Date</Label><Input type="date" value={form.check_date} onChange={e => setForm(f => ({ ...f, check_date: e.target.value }))} /></div>
                      <div><Label className="text-xs">Bank Code</Label><Input value={form.bank_code} onChange={e => setForm(f => ({ ...f, bank_code: e.target.value }))} /></div>
                      <div><Label className="text-xs">Bank Account</Label><Input value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} /></div>
                    </div>
                  </TabsContent>
                  <TabsContent value="bank_transfer" className="space-y-3 pt-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-xs">Transfer Account</Label><Input value={form.transfer_account} onChange={e => setForm(f => ({ ...f, transfer_account: e.target.value }))} /></div>
                      <div><Label className="text-xs">Reference</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} /></div>
                    </div>
                  </TabsContent>
                  <TabsContent value="credit_card" className="space-y-3 pt-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-xs">Credit Card Type</Label><Input value={form.credit_card_type} onChange={e => setForm(f => ({ ...f, credit_card_type: e.target.value }))} /></div>
                      <div><Label className="text-xs">Card Number</Label><Input value={form.credit_card_number} onChange={e => setForm(f => ({ ...f, credit_card_number: e.target.value }))} /></div>
                    </div>
                  </TabsContent>
                  <TabsContent value="cash" className="space-y-3 pt-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-xs">Cash Account</Label><Input value={form.cash_account} onChange={e => setForm(f => ({ ...f, cash_account: e.target.value }))} /></div>
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="attachments">
                <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
                  No attachments. Drag and drop files here.
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer - Totals */}
            <div className="grid grid-cols-2 gap-8 border-t pt-4">
              <div className="space-y-2">
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Remarks</Label>
                  <Input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Journal Remarks</Label>
                  <Input value={form.journal_remarks} onChange={e => setForm(f => ({ ...f, journal_remarks: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Total Amount Due</Label>
                  <Input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: Number(e.target.value) }))} className="text-right font-mono" />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-medium">Open Balance</Label>
                  <Input value="0.00" readOnly className="text-right font-mono bg-muted/50" />
                </div>
              </div>
            </div>

            {/* Accounting Validation */}
            <div className="mt-3">
              <AccountingValidationPanel
                documentType="outgoing_payment"
                getDocumentData={() => ({
                  document_type: 'outgoing_payment',
                  total: form.total_amount,
                  subtotal: form.total_amount,
                  tax_amount: 0,
                  conditions: { vendor: form.vendor_code || form.customer_code || form.account_code },
                })}
                compact
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex justify-between">
            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white">
                {editingId ? 'Update' : 'Add'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Deselect All</Button>
              <Button variant="outline" size="sm">Select All</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
