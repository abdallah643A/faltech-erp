import { useState, useEffect, useCallback } from 'react';
import { AccountingValidationPanel } from '@/components/accounting/AccountingValidationPanel';
import DocumentContextMenu from '@/components/documents/DocumentContextMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeliveryNotes, DeliveryNote, DeliveryNoteLine } from '@/hooks/useDeliveryNotes';
import { ItemCombobox, type ItemOption } from '@/components/items/ItemCombobox';
import { CustomerSelector, SelectedCustomer } from '@/components/customers/CustomerSelector';
import { LineDimensionSelectors } from '@/components/dimensions/LineDimensionSelectors';
import { DocumentSeriesSelector } from '@/components/series/DocumentSeriesSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, Plus, Filter, Download, MoreVertical, FileText, Trash2, Copy, Eye, Edit,
  Truck, Package, ArrowUp, ArrowDown, Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { SyncStatusBadge } from '@/components/sap/SyncStatusBadge';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';

const dnColumns: ColumnDef[] = [
  { key: 'doc_num', header: 'Doc #' },
  { key: 'customer_code', header: 'Customer Code' },
  { key: 'customer_name', header: 'Customer Name' },
  { key: 'doc_date', header: 'Date' },
  { key: 'total', header: 'Total' },
  { key: 'status', header: 'Status' },
];
import { useSAPSync } from '@/hooks/useSAPSync';

const statusColors: Record<string, string> = {
  open: 'bg-info/10 text-info',
  closed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

interface FormLine {
  lineNum: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  taxCode: string;
  lineTotal: number;
  warehouse: string;
  dim_employee_id: string | null;
  dim_branch_id: string | null;
  dim_business_line_id: string | null;
  dim_factory_id: string | null;
}

const emptyLine = (): FormLine => ({
  lineNum: 1, itemCode: '', itemName: '', quantity: 1, unitPrice: 0,
  taxCode: 'VAT15', lineTotal: 0, warehouse: '',
  dim_employee_id: null, dim_branch_id: null, dim_business_line_id: null, dim_factory_id: null,
});

export default function DeliveryNotes() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const { deliveryNotes, isLoading, createDeliveryNote, deleteDeliveryNote } = useDeliveryNotes();
  const { sync: sapSync } = useSAPSync();

  const { data: allBranches = [] } = useQuery({
    queryKey: ['branches-for-dn'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*, companies(name, name_ar)').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: userBranchAssignments = [] } = useQuery({
    queryKey: ['user-branch-assignments-dn', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('user_branch_assignments').select('branch_id').eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const userBranchIds = userBranchAssignments.map(a => a.branch_id);
  const defaultBranchId = userBranchIds.length === 1 ? userBranchIds[0] : '';
  const availableBranches = isAdmin ? allBranches : allBranches.filter(b => userBranchIds.includes(b.id));

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('contents');
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);
  const [seriesNextNo, setSeriesNextNo] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultDocDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    cardCode: '', cardName: '', customerId: '', customerPhone: '',
    docDate: defaultDocDate, postingDate: defaultDocDate, docDueDate: defaultDocDate,
    salesEmployee: '', remarks: '', shippingAddress: '', billingAddress: '',
    shippingMethod: '', trackingNumber: '', carrierName: '',
    branchId: defaultBranchId, numAtCard: '',
    items: [emptyLine()] as FormLine[],
  });

  // Pre-fill from Sales Order copy-to
  useEffect(() => {
    const state = location.state as any;
    if (state?.fromSalesOrder && state?.orderData) {
      const o = state.orderData;
      setSelectedCustomer(o.customer_id ? {
        id: o.customer_id, code: o.customer_code || o.card_code, name: o.customer_name,
        phone: o.customer_phone || '', type: 'business_partner',
      } : null);
      setFormData(prev => ({
        ...prev,
        cardCode: o.customer_code || o.card_code || '',
        cardName: o.customer_name || '',
        customerId: o.customer_id || '',
        customerPhone: o.customer_phone || '',
        salesEmployee: o.sales_employee_code?.toString() || '',
        remarks: o.remarks || '',
        shippingAddress: o.shipping_address || '',
        billingAddress: o.billing_address || '',
        branchId: o.branch_id || prev.branchId,
        items: o.lines && o.lines.length > 0 ? o.lines.map((l: any, i: number) => ({
          lineNum: i + 1,
          itemCode: l.item_code || l.itemCode || '',
          itemName: l.description || l.itemName || '',
          quantity: l.quantity || 1,
          unitPrice: l.unit_price || l.unitPrice || 0,
          taxCode: l.tax_code || l.taxCode || 'VAT15',
          lineTotal: l.line_total || l.lineTotal || 0,
          warehouse: l.warehouse || '',
          dim_employee_id: l.dim_employee_id || null,
          dim_branch_id: l.dim_branch_id || null,
          dim_business_line_id: l.dim_business_line_id || null,
          dim_factory_id: l.dim_factory_id || null,
        })) : prev.items,
      }));
      setIsDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const handleCustomerChange = (customer: SelectedCustomer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setFormData(prev => ({ ...prev, cardCode: customer.code, cardName: customer.name, customerId: customer.id, customerPhone: customer.phone }));
    } else {
      setFormData(prev => ({ ...prev, cardCode: '', cardName: '', customerId: '', customerPhone: '' }));
    }
  };

  const filteredNotes = deliveryNotes.filter(n =>
    n.doc_num.toString().includes(searchQuery.toLowerCase()) ||
    n.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(value);

  const calculateTotal = () => formData.items.reduce((sum, item) => sum + item.lineTotal, 0);

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyLine(), lineNum: prev.items.length + 1 }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    const updated = formData.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, lineNum: i + 1 }));
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updated = formData.items.map((item, i) => {
      if (i === index) {
        const u = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          u.lineTotal = u.unitPrice * u.quantity * 1.15;
        }
        return u;
      }
      return item;
    });
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const handleItemSelect = (index: number, item: ItemOption) => {
    const updated = formData.items.map((line, i) => {
      if (i === index) {
        const qty = line.quantity || 1;
        return {
          ...line,
          itemCode: item.item_code,
          itemName: item.description,
          unitPrice: item.default_price || 0,
          warehouse: item.warehouse || '',
          lineTotal: (item.default_price || 0) * qty * 1.15,
        };
      }
      return line;
    });
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const handleSave = async () => {
    if (!formData.cardName) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }
    if (formData.items.length === 0 || !formData.items[0].itemCode) {
      toast({ title: 'Error', description: 'Please add at least one item', variant: 'destructive' });
      return;
    }

    // Accounting pre-validation
    try {
      const { validateAccounting } = await import('@/services/accountingValidator');
      const subtotal = formData.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
      const res = await validateAccounting({ document_type: 'delivery', total: subtotal * 1.15, subtotal, tax_amount: subtotal * 0.15, conditions: { customer: formData.cardCode } });
      if (!res.canProceed) {
        toast({ title: 'Accounting Error', description: res.issues.find(i => i.type === 'error')?.message || 'Validation failed', variant: 'destructive' });
        setSaving(false); return;
      }
    } catch { /* proceed */ }

    try {
      const subtotal = formData.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
      const taxAmount = subtotal * 0.15;
      const total = subtotal + taxAmount;

      const noteData: Partial<DeliveryNote> = {
        customer_code: formData.cardCode,
        customer_name: formData.cardName,
        customer_id: formData.customerId || undefined,
        doc_date: formData.docDate,
        posting_date: formData.postingDate,
        doc_due_date: formData.docDueDate,
        sales_employee_code: formData.salesEmployee ? parseInt(formData.salesEmployee) : undefined,
        remarks: formData.remarks,
        shipping_address: formData.shippingAddress,
        billing_address: formData.billingAddress,
        shipping_method: formData.shippingMethod || undefined,
        tracking_number: formData.trackingNumber || undefined,
        carrier_name: formData.carrierName || undefined,
        branch_id: formData.branchId || undefined,
        num_at_card: formData.numAtCard || undefined,
        series: selectedSeries || undefined,
        subtotal,
        tax_amount: taxAmount,
        total,
        status: 'open',
      };

      const lines: DeliveryNoteLine[] = formData.items.map((item, i) => ({
        line_num: i + 1,
        item_code: item.itemCode,
        description: item.itemName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_code: item.taxCode,
        line_total: item.lineTotal,
        warehouse: item.warehouse || undefined,
        dim_employee_id: item.dim_employee_id,
        dim_branch_id: item.dim_branch_id,
        dim_business_line_id: item.dim_business_line_id,
        dim_factory_id: item.dim_factory_id,
      }));

      await createDeliveryNote(noteData, lines);
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      cardCode: '', cardName: '', customerId: '', customerPhone: '',
      docDate: defaultDocDate, postingDate: defaultDocDate, docDueDate: defaultDocDate,
      salesEmployee: '', remarks: '', shippingAddress: '', billingAddress: '',
      shippingMethod: '', trackingNumber: '', carrierName: '',
      branchId: defaultBranchId, numAtCard: '',
      items: [emptyLine()],
    });
    setSelectedCustomer(null);
    setSelectedSeries(null);
    setSeriesNextNo(null);
  };

  const handleCopyToInvoice = (note: DeliveryNote) => {
  const { t } = useLanguage();

    navigate('/ar-invoices', {
      state: {
        fromDeliveryNote: true,
        noteData: {
          customer_id: note.customer_id,
          customer_code: note.customer_code,
          customer_name: note.customer_name,
          sales_employee_code: note.sales_employee_code,
          remarks: note.remarks,
          shipping_address: note.shipping_address,
          billing_address: note.billing_address,
          branch_id: note.branch_id,
          base_doc_type: 'delivery_note',
          base_doc_id: note.id,
          base_doc_num: note.doc_num,
        },
      },
    });
    // Fetch lines and pass them asynchronously via a secondary navigation
    supabase.from('delivery_note_lines').select('*').eq('delivery_note_id', note.id).order('line_num').then(({ data }) => {
      if (data && data.length > 0) {
        navigate('/ar-invoices', {
          state: {
            fromDeliveryNote: true,
            noteData: {
              customer_id: note.customer_id,
              customer_code: note.customer_code,
              customer_name: note.customer_name,
              sales_employee_code: note.sales_employee_code,
              remarks: note.remarks,
              shipping_address: note.shipping_address,
              billing_address: note.billing_address,
              branch_id: note.branch_id,
              base_doc_type: 'delivery_note',
              base_doc_id: note.id,
              base_doc_num: note.doc_num,
              lines: data.map((l: any, i: number) => ({
                lineNum: i + 1,
                itemCode: l.item_code,
                itemName: l.description,
                quantity: l.quantity,
                unitPrice: l.unit_price,
                taxCode: l.tax_code || 'VAT15',
                lineTotal: l.line_total,
                warehouse: l.warehouse || '',
                dim_employee_id: l.dim_employee_id,
                dim_branch_id: l.dim_branch_id,
                dim_business_line_id: l.dim_business_line_id,
                dim_factory_id: l.dim_factory_id,
              })),
            },
          },
        });
      }
    });
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'مذكرات التسليم' : 'Delivery Notes'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة مذكرات التسليم (ODLN)' : 'Manage delivery notes (ODLN)'}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportImportButtons data={deliveryNotes} columns={dnColumns} filename="delivery-notes" title="Delivery Notes" />
          <SAPSyncButton entity="delivery_note" />
          <ClearAllButton tableName="delivery_notes" displayName="Delivery Notes" queryKeys={['delivery-notes']} relatedTables={['delivery_note_lines']} />
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'إنشاء مذكرة تسليم' : 'Create Delivery Note'}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={language === 'ar' ? 'بحث...' : 'Search...'} value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === 'ar' ? 'رقم المستند' : 'Doc #'}</TableHead>
              <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
              <TableHead>{language === 'ar' ? 'المرجع' : 'Base Doc'}</TableHead>
              <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
              <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredNotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد مذكرات تسليم' : 'No delivery notes found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredNotes.map((note) => (
                <DocumentContextMenu key={note.id} chain="crm" documentType="delivery" documentId={note.id} documentNumber={`DN-${note.doc_num}`}>
                <TableRow className="cursor-pointer">
                  <TableCell className="font-medium">DN-{note.doc_num}</TableCell>
                  <TableCell>{format(new Date(note.doc_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{note.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{note.customer_code}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {note.base_doc_num ? (
                      <Badge variant="outline">SO-{note.base_doc_num}</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{formatCurrency(note.total || 0)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[note.status] || 'bg-muted text-muted-foreground'}>
                      {note.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyToInvoice(note)}>
                          <Copy className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'نسخ إلى فاتورة' : 'Copy to A/R Invoice'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => sapSync('delivery_note', 'to_sap', note.id)}>
                          <ArrowUp className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'مزامنة إلى SAP' : 'Sync to SAP'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/ar-returns?from_dn=${note.doc_num}`)}>
                          <ArrowDown className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'نسخ إلى مرتجع' : 'Copy to A/R Return'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteDeliveryNote(note.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'حذف' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                </DocumentContextMenu>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {language === 'ar' ? 'مذكرة تسليم جديدة' : 'New Delivery Note'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' ? 'إنشاء مذكرة تسليم بتنسيق SAP B1' : 'Create a delivery note in SAP B1 format'}
            </DialogDescription>
          </DialogHeader>

          {/* SAP-style dual-column header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
            <div className="space-y-3">
              <div>
                <Label>{language === 'ar' ? 'العميل' : 'Customer'}</Label>
                <CustomerSelector value={selectedCustomer} onChange={handleCustomerChange} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'جهة الاتصال' : 'Contact Person'}</Label>
                <Input value={formData.customerPhone} onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))} />
              </div>
              {availableBranches.length > 0 && (
                <div>
                  <Label>{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
                  <Select value={formData.branchId} onValueChange={(v) => setFormData(prev => ({ ...prev, branchId: v }))}>
                    <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select branch'} /></SelectTrigger>
                    <SelectContent>
                      {availableBranches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{language === 'ar' ? b.name_ar || b.name : b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{language === 'ar' ? 'رقم السلسلة' : 'Series'}</Label>
                  <DocumentSeriesSelector objectCode="15" value={selectedSeries}
                    onChange={(series, nextNo) => { setSelectedSeries(series); setSeriesNextNo(nextNo); }} />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'الرقم' : 'Number'}</Label>
                  <Input value={seriesNextNo || ''} readOnly className="bg-muted" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>{language === 'ar' ? 'تاريخ المستند' : 'Doc Date'}</Label>
                  <Input type="date" value={formData.docDate} onChange={(e) => setFormData(prev => ({ ...prev, docDate: e.target.value }))} />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'تاريخ الترحيل' : 'Posting Date'}</Label>
                  <Input type="date" value={formData.postingDate} onChange={(e) => setFormData(prev => ({ ...prev, postingDate: e.target.value }))} />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                  <Input type="date" value={formData.docDueDate} onChange={(e) => setFormData(prev => ({ ...prev, docDueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>{language === 'ar' ? 'مرجع العميل' : 'Customer Ref. No.'}</Label>
                <Input value={formData.numAtCard} onChange={(e) => setFormData(prev => ({ ...prev, numAtCard: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Tabs body */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="contents">{language === 'ar' ? 'المحتويات' : 'Contents'}</TabsTrigger>
              <TabsTrigger value="logistics">{language === 'ar' ? 'الشحن' : 'Logistics'}</TabsTrigger>
              <TabsTrigger value="remarks">{language === 'ar' ? 'ملاحظات' : 'Remarks'}</TabsTrigger>
            </TabsList>

            <TabsContent value="contents" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="min-w-[200px]">{language === 'ar' ? 'الصنف' : 'Item'}</TableHead>
                    <TableHead className="w-24">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                    <TableHead className="w-28">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                    <TableHead className="w-28">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <ItemCombobox
                          value={item.itemCode || ''}
                          onSelect={(selected) => selected && handleItemSelect(idx, selected)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={1} value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.01" value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-24" />
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                      <TableCell>
                        {formData.items.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={handleAddItem} className="mt-2">
                <Plus className="h-4 w-4 mr-1" /> {language === 'ar' ? 'إضافة صنف' : 'Add Item'}
              </Button>
            </TabsContent>

            <TabsContent value="logistics" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'طريقة الشحن' : 'Shipping Method'}</Label>
                  <Input value={formData.shippingMethod} onChange={(e) => setFormData(prev => ({ ...prev, shippingMethod: e.target.value }))} />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'رقم التتبع' : 'Tracking Number'}</Label>
                  <Input value={formData.trackingNumber} onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))} />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'شركة النقل' : 'Carrier'}</Label>
                  <Input value={formData.carrierName} onChange={(e) => setFormData(prev => ({ ...prev, carrierName: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'عنوان الشحن' : 'Ship-To Address'}</Label>
                  <Textarea value={formData.shippingAddress} onChange={(e) => setFormData(prev => ({ ...prev, shippingAddress: e.target.value }))} />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'عنوان الفاتورة' : 'Bill-To Address'}</Label>
                  <Textarea value={formData.billingAddress} onChange={(e) => setFormData(prev => ({ ...prev, billingAddress: e.target.value }))} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="remarks" className="mt-4">
              <Textarea value={formData.remarks} onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder={language === 'ar' ? 'ملاحظات...' : 'Remarks...'} rows={4} />
            </TabsContent>
          </Tabs>

          {/* Summary footer */}
          <div className="flex justify-between items-center border-t pt-4">
            <div className="text-sm text-muted-foreground">
              {formData.items.filter(i => i.itemCode).length} {language === 'ar' ? 'أصناف' : 'items'}
            </div>
            <div className="text-right space-y-1">
              <div className="text-sm">
                {language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}: {formatCurrency(formData.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}
              </div>
              <div className="text-sm">
                {language === 'ar' ? 'الضريبة' : 'Tax (15%)'}: {formatCurrency(formData.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) * 0.15)}
              </div>
              <div className="text-lg font-bold text-primary">
                {language === 'ar' ? 'الإجمالي' : 'Total'}: {formatCurrency(calculateTotal())}
              </div>
            </div>
          </div>

          <div className="mt-2">
            <AccountingValidationPanel
              documentType="delivery"
              getDocumentData={() => {
                const subtotal = formData.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
                return { document_type: 'delivery', total: subtotal * 1.15, subtotal, tax_amount: subtotal * 0.15, conditions: { customer: formData.cardCode } };
              }}
              compact
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
