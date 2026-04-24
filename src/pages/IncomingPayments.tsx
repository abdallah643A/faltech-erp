import { useState, useEffect, useCallback } from 'react';
import { AccountingValidationPanel } from '@/components/accounting/AccountingValidationPanel';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Plus,
  Filter,
  Download,
  MoreVertical,
  Banknote,
  CreditCard,
  Building2,
  Receipt,
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  FileSignature,
  Edit,
  Mail,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  Smartphone,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { CustomerSelector, SelectedCustomer } from '@/components/customers/CustomerSelector';
import { useIncomingPayments } from '@/hooks/useIncomingPayments';
import { useSalesOrders } from '@/hooks/useSalesOrderContracts';
import { usePaymentCertificates } from '@/hooks/usePaymentCertificates';
import { supabase } from '@/integrations/supabase/client';
import { useARInvoices } from '@/hooks/useARInvoices';
import { useQuery } from '@tanstack/react-query';
import { DocumentSeriesSelector, SAP_OBJECT_CODES } from '@/components/series/DocumentSeriesSelector';
import BankPOSPaymentDialog from '@/components/pos/BankPOSPaymentDialog';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';

const paymentColumns: ColumnDef[] = [
  { key: 'doc_num', header: 'Doc #' },
  { key: 'customer_code', header: 'Customer Code' },
  { key: 'customer_name', header: 'Customer Name' },
  { key: 'doc_date', header: 'Date' },
  { key: 'total_amount', header: 'Amount' },
  { key: 'payment_type', header: 'Payment Type' },
  { key: 'status', header: 'Status' },
];

const statusColors: Record<string, string> = {
  'draft': 'bg-muted text-muted-foreground',
  'pending': 'bg-warning/10 text-warning',
  'posted': 'bg-success/10 text-success',
  'cancelled': 'bg-destructive/10 text-destructive',
};

export default function IncomingPayments() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { sync: syncPayment } = useSAPSync();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    payments,
    isLoading,
    createPayment,
    updatePayment,
    deletePayment,
    postPayment,
    totalReceived,
    pendingCount,
    postedCount,
  } = useIncomingPayments();

  const { salesOrders } = useSalesOrders();
  const { updateCertificate } = usePaymentCertificates();
  const { invoices: arInvoices } = useARInvoices();

  const { data: paymentMeansAccounts } = useQuery({
    queryKey: ['payment-means-accounts-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_means_accounts')
        .select('*')
        .eq('is_active', true)
        .order('acct_code');
      if (error) throw error;
      return data;
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('contents');
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [prefillCertId, setPrefillCertId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentOnAccount, setPaymentOnAccount] = useState(false);
  const [showBankPOS, setShowBankPOS] = useState(false);

  const [newPayment, setNewPayment] = useState({
    customerId: '',
    cardCode: '',
    cardName: '',
    salesOrderId: '',
    docDate: new Date().toISOString().split('T')[0],
    postingDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    paymentType: 'bank_transfer',
    remarks: '',
    journalRemarks: '',
    totalAmount: 0,
    reference: '',
    checkNumber: '',
    checkDate: '',
    bankCode: '',
    bankAccount: '',
    creditCardType: '',
    creditCardNumber: '',
    contactPerson: '',
    project: '',
    series: null as number | null,
  });

  // Check for prefill from URL params (from other transaction pages)
  useEffect(() => {
    const prefillParam = searchParams.get('prefill');
    if (prefillParam) {
      try {
        const data = JSON.parse(decodeURIComponent(prefillParam));
        setNewPayment(prev => ({
          ...prev,
          salesOrderId: data.sales_order_id || '',
          cardCode: data.customer_code || '',
          cardName: data.customer_name || '',
          customerId: data.customer_id || '',
          totalAmount: data.total_amount || 0,
          remarks: data.remarks || '',
          reference: data.reference || '',
          contactPerson: data.contact_person || '',
        }));
        if (data.customer_code) {
          setSelectedCustomer({
            id: data.customer_id || '',
            code: data.customer_code,
            name: data.customer_name,
            phone: '',
            type: 'business_partner',
          });
        }
        if (data.certificate_id) {
          setPrefillCertId(data.certificate_id);
        }
        setIsDialogOpen(true);
        // Clear the URL param
        setSearchParams({}, { replace: true });
      } catch { /* ignore parse errors */ }
    }
  }, [searchParams]);

  // Check for prefill data from sessionStorage (from Payment Certificates page)
  useEffect(() => {
    const prefillData = sessionStorage.getItem('prefill_incoming_payment');
    if (prefillData) {
      sessionStorage.removeItem('prefill_incoming_payment');
      try {
        const data = JSON.parse(prefillData);
        setNewPayment(prev => ({
          ...prev,
          salesOrderId: data.sales_order_id || '',
          cardCode: data.customer_code || '',
          cardName: data.customer_name || '',
          customerId: data.customer_id || '',
          totalAmount: data.total_amount || 0,
          remarks: data.remarks || '',
        }));
        if (data.customer_code) {
          setSelectedCustomer({
            id: data.customer_id || '',
            code: data.customer_code,
            name: data.customer_name,
            phone: '',
            type: 'business_partner',
          });
        }
        if (data.certificate_id) {
          setPrefillCertId(data.certificate_id);
        }
        setIsDialogOpen(true);
      } catch { /* ignore parse errors */ }
    }
  }, []);

  const filteredPayments = (payments || []).filter(
    (p) =>
      p.doc_num.toString().includes(searchQuery.toLowerCase()) ||
      p.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.reference && p.reference.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(value);

  const handleCustomerChange = (customer: SelectedCustomer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setNewPayment({
        ...newPayment,
        cardCode: customer.code,
        cardName: customer.name,
        customerId: customer.id,
      });
    } else {
      setNewPayment({ ...newPayment, cardCode: '', cardName: '', customerId: '' });
    }
  };

  const handleSalesOrderSelect = (soId: string) => {
    const order = salesOrders?.find((o) => o.id === soId);
    if (order) {
      setNewPayment({
        ...newPayment,
        salesOrderId: soId,
        cardCode: order.customer_code,
        cardName: order.customer_name,
        customerId: order.customer_id || '',
        totalAmount: order.total || 0,
      });
      setSelectedCustomer({
        id: order.customer_id || '',
        code: order.customer_code,
        name: order.customer_name,
        phone: '',
        type: 'business_partner',
      });
    }
  };

  const resetForm = () => {
  const { t } = useLanguage();

    setNewPayment({
      customerId: '',
      cardCode: '',
      cardName: '',
      salesOrderId: '',
      docDate: new Date().toISOString().split('T')[0],
      postingDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      paymentType: 'bank_transfer',
      remarks: '',
      journalRemarks: '',
      totalAmount: 0,
      reference: '',
      checkNumber: '',
      checkDate: '',
      bankCode: '',
      bankAccount: '',
      creditCardType: '',
      creditCardNumber: '',
      contactPerson: '',
      project: '',
      series: null,
    });
    setSelectedCustomer(null);
    setActiveTab('contents');
    setPaymentOnAccount(false);
    setEditingPaymentId(null);
  };

  const handleAddPayment = async () => {
    if (!newPayment.cardCode || newPayment.totalAmount <= 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill customer and amount',
        variant: 'destructive',
      });
      return;
    }
    // Accounting pre-validation
    try {
      const { validateAccounting } = await import('@/services/accountingValidator');
      const res = await validateAccounting({ document_type: 'incoming_payment', total: newPayment.totalAmount, subtotal: newPayment.totalAmount, tax_amount: 0, conditions: { customer: newPayment.cardCode } });
      if (!res.canProceed) {
        toast({ title: language === 'ar' ? 'خطأ محاسبي' : 'Accounting Error', description: res.issues.find(i => i.type === 'error')?.message || 'Validation failed', variant: 'destructive' });
        return;
      }
    } catch { /* proceed if no rules */ }

    try {
      const paymentData = {
        customer_code: newPayment.cardCode,
        customer_name: newPayment.cardName,
        customer_id: newPayment.customerId || undefined,
        sales_order_id: newPayment.salesOrderId || undefined,
        doc_date: newPayment.docDate,
        due_date: newPayment.dueDate || undefined,
        payment_type: newPayment.paymentType || undefined,
        total_amount: newPayment.totalAmount,
        reference: newPayment.reference || undefined,
        remarks: newPayment.remarks || undefined,
        check_number: newPayment.checkNumber || undefined,
        check_date: newPayment.checkDate || undefined,
        bank_code: newPayment.bankCode || undefined,
        bank_account: newPayment.bankAccount || undefined,
        credit_card_type: newPayment.creditCardType || undefined,
        credit_card_number: newPayment.creditCardNumber || undefined,
      };

      if (editingPaymentId) {
        await updatePayment.mutateAsync({ id: editingPaymentId, ...paymentData });
      } else {
        await createPayment.mutateAsync(paymentData);
      }

      // Update certificate collection status if linked
      if (prefillCertId) {
        try {
          const { data: cert } = await supabase
            .from('payment_certificates')
            .select('amount, collected_amount')
            .eq('id', prefillCertId)
            .single();
          
          if (cert) {
            const newCollected = (cert.collected_amount || 0) + newPayment.totalAmount;
            const newStatus = newCollected >= cert.amount ? 'collected' : 'partial';
            await updateCertificate.mutateAsync({
              id: prefillCertId,
              collected_amount: newCollected,
              collection_status: newStatus,
            });
          }
        } catch { /* best effort */ }
        setPrefillCertId(null);
      }

      resetForm();
      setIsDialogOpen(false);
    } catch {
      // handled by mutation
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await deletePayment.mutateAsync(id);
    } catch {
      // handled by mutation
    }
  };

  const handlePostPayment = async (id: string) => {
    try {
      await postPayment.mutateAsync(id);
    } catch {
      // handled by mutation
    }
  };

  const getPaymentMethodIcon = (method: string | null) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'check': return <Receipt className="h-4 w-4" />;
      case 'credit_card': return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer': return <Building2 className="h-4 w-4" />;
      default: return <Banknote className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    const labels: Record<string, string> = {
      cash: language === 'ar' ? 'نقدي' : 'Cash',
      check: language === 'ar' ? 'شيك' : 'Check',
      credit_card: language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card',
      bank_transfer: language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
    };
    return labels[method || ''] || method || '-';
  };

  // Get linked invoices for the selected customer
  const customerInvoices = arInvoices?.filter(inv =>
    inv.customer_code === newPayment.cardCode && inv.status === 'open'
  ) || [];

  // Filter sales orders for the selector
  const availableSalesOrders = salesOrders?.filter((o) => o.is_contract || (o.total && o.total > 0)) || [];

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'المدفوعات الواردة' : 'Incoming Payments'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تسجيل وإدارة المدفوعات من العملاء' : 'Record and manage customer payments'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={payments || []} columns={paymentColumns} filename="incoming-payments" title="Incoming Payments" />
          <SAPSyncButton entity="incoming_payment" />
          <ClearAllButton tableName="incoming_payments" displayName="Incoming Payments" queryKeys={['incomingPayments']} />
          <Button className="gap-2" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'دفعة جديدة' : 'New Payment'}
          </Button>
        </div>
      </div>

      {/* SAP B1 Style Incoming Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPaymentId ? (language === 'ar' ? 'تعديل الدفعة' : 'Edit Payment') : (language === 'ar' ? 'المدفوعات الواردة' : 'Incoming Payments')}</DialogTitle>
          </DialogHeader>

          {/* SAP B1 Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 border rounded-lg p-4 bg-muted/20">
            {/* Left Column */}
            <div className="space-y-3">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold">{language === 'ar' ? 'الكود' : 'Code'}</Label>
                <CustomerSelector
                  value={selectedCustomer}
                  onChange={handleCustomerChange}
                  required
                />
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold">{language === 'ar' ? 'الاسم' : 'Name'}</Label>
                <Input value={newPayment.cardName} disabled className="h-8 text-sm bg-muted/50" />
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold">{language === 'ar' ? 'فاتورة إلى' : 'Bill To'}</Label>
                <Select value={newPayment.salesOrderId || 'none'} onValueChange={(v) => v === 'none' ? setNewPayment({ ...newPayment, salesOrderId: '' }) : handleSalesOrderSelect(v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={language === 'ar' ? 'اختر أمر بيع' : 'Select Sales Order'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                    {availableSalesOrders.map((so) => (
                      <SelectItem key={so.id} value={so.id}>
                        <div className="flex items-center gap-2">
                          {so.is_contract ? <FileSignature className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                          <span>SO-{so.doc_num} - {so.customer_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold">{language === 'ar' ? 'شخص الاتصال' : 'Contact Person'}</Label>
                <Input
                  value={newPayment.contactPerson}
                  onChange={(e) => setNewPayment({ ...newPayment, contactPerson: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold">{language === 'ar' ? 'المشروع' : 'Project'}</Label>
                <Input
                  value={newPayment.project}
                  onChange={(e) => setNewPayment({ ...newPayment, project: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              <DocumentSeriesSelector
                objectCode={SAP_OBJECT_CODES.IncomingPayments}
                value={newPayment.series}
                onChange={(series, nextNo) => setNewPayment({ ...newPayment, series })}
                label={language === 'ar' ? 'السلسلة' : 'Series'}
                compact
              />
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold">{language === 'ar' ? 'رقم المستند' : 'No.'}</Label>
                <Input value="Auto" disabled className="h-8 text-sm bg-muted/50" />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold">{language === 'ar' ? 'تاريخ الترحيل' : 'Posting Date'}</Label>
                <Input
                  type="date"
                  value={newPayment.postingDate}
                  onChange={(e) => setNewPayment({ ...newPayment, postingDate: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                <Input
                  type="date"
                  value={newPayment.dueDate}
                  onChange={(e) => setNewPayment({ ...newPayment, dueDate: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold">{language === 'ar' ? 'تاريخ المستند' : 'Document Date'}</Label>
                <Input
                  type="date"
                  value={newPayment.docDate}
                  onChange={(e) => setNewPayment({ ...newPayment, docDate: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold">{language === 'ar' ? 'المرجع' : 'Reference'}</Label>
                <Input
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Tabs: Contents & Attachments */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid grid-cols-3 w-fit">
              <TabsTrigger value="contents" className="text-xs">{language === 'ar' ? 'المحتويات' : 'Contents'}</TabsTrigger>
              <TabsTrigger value="payment-means" className="text-xs">{language === 'ar' ? 'وسائل الدفع' : 'Payment Means'}</TabsTrigger>
              <TabsTrigger value="attachments" className="text-xs">{language === 'ar' ? 'المرفقات' : 'Attachments'}</TabsTrigger>
            </TabsList>

            {/* Contents Tab - Referenced Documents */}
            <TabsContent value="contents" className="mt-3 space-y-3">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[50px] text-xs">{language === 'ar' ? 'تحديد' : 'Selected'}</TableHead>
                      <TableHead className="text-xs">{language === 'ar' ? 'رقم المستند' : 'Document No.'}</TableHead>
                      <TableHead className="text-xs">{language === 'ar' ? 'القسط' : 'Installment'}</TableHead>
                      <TableHead className="text-xs">{language === 'ar' ? 'نوع المستند' : 'Document Type'}</TableHead>
                      <TableHead className="text-xs">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead className="text-xs">{language === 'ar' ? 'متأخر' : 'Overdue'}</TableHead>
                      <TableHead className="text-xs text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                      <TableHead className="text-xs text-right">{language === 'ar' ? 'الرصيد المستحق' : 'Balance Due'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerInvoices.length > 0 ? (
                      customerInvoices.map((inv) => {
                        const overdueDays = inv.doc_due_date
                          ? Math.max(0, Math.floor((Date.now() - new Date(inv.doc_due_date).getTime()) / 86400000))
                          : 0;
                        return (
                          <TableRow key={inv.id} className="text-xs">
                            <TableCell>
                              <Checkbox />
                            </TableCell>
                            <TableCell className="font-mono">{inv.doc_num}</TableCell>
                            <TableCell>1</TableCell>
                            <TableCell>{language === 'ar' ? 'فاتورة' : 'A/R Invoice'}</TableCell>
                            <TableCell>{inv.doc_date}</TableCell>
                            <TableCell>{overdueDays > 0 ? `${overdueDays}d` : '-'}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(inv.total)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(inv.balance_due)}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">
                          {newPayment.cardCode
                            ? (language === 'ar' ? 'لا توجد فواتير مفتوحة لهذا العميل' : 'No open invoices for this customer')
                            : (language === 'ar' ? 'اختر عميل أولاً' : 'Select a customer first')
                          }
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Payment on Account */}
              <div className="flex items-center justify-end gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={paymentOnAccount}
                    onCheckedChange={(v) => setPaymentOnAccount(!!v)}
                  />
                  <Label className="text-xs font-semibold">{language === 'ar' ? 'دفعة على الحساب' : 'Payment on Account'}</Label>
                </div>
                <Input
                  type="number"
                  value={paymentOnAccount ? newPayment.totalAmount || '' : '0.00'}
                  onChange={(e) => setNewPayment({ ...newPayment, totalAmount: parseFloat(e.target.value) || 0 })}
                  disabled={!paymentOnAccount}
                  className="w-[150px] h-8 text-sm text-right font-mono"
                />
              </div>
            </TabsContent>

            {/* Payment Means Tab - SAP B1 Style */}
            <TabsContent value="payment-means" className="mt-3 space-y-4">
              {/* Currency Row */}
              <div className="grid grid-cols-[120px_1fr] items-center gap-2 max-w-sm">
                <Label className="text-xs font-semibold">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                <Input value="SAR" disabled className="h-8 text-sm bg-muted/50 font-mono" />
              </div>

              {/* Payment Method Sub-Tabs */}
              <Tabs value={newPayment.paymentType} onValueChange={(v) => setNewPayment({ ...newPayment, paymentType: v })}>
                <TabsList className="grid grid-cols-4 w-full bg-muted/30 border">
                  <TabsTrigger value="check" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1">
                    <Receipt className="h-3 w-3" />
                    {language === 'ar' ? 'شيك' : 'Check'}
                  </TabsTrigger>
                  <TabsTrigger value="bank_transfer" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1">
                    <Building2 className="h-3 w-3" />
                    {language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}
                  </TabsTrigger>
                  <TabsTrigger value="credit_card" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1">
                    <CreditCard className="h-3 w-3" />
                    {language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card'}
                  </TabsTrigger>
                  <TabsTrigger value="cash" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1">
                    <Banknote className="h-3 w-3" />
                    {language === 'ar' ? 'نقدي' : 'Cash'}
                  </TabsTrigger>
                </TabsList>

                {/* Check Tab Content */}
                <TabsContent value="check" className="border rounded-b-lg p-4 space-y-3 min-h-[180px]">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'حساب الأستاذ' : 'G/L Account'}</Label>
                    <Input value={newPayment.bankAccount} onChange={(e) => setNewPayment({ ...newPayment, bankAccount: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'رقم الشيك' : 'Check Number'}</Label>
                    <Input value={newPayment.checkNumber} onChange={(e) => setNewPayment({ ...newPayment, checkNumber: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'تاريخ الشيك' : 'Check Date'}</Label>
                    <Input type="date" value={newPayment.checkDate} onChange={(e) => setNewPayment({ ...newPayment, checkDate: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'البنك' : 'Bank'}</Label>
                    <Input value={newPayment.bankCode} onChange={(e) => setNewPayment({ ...newPayment, bankCode: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="flex justify-end pt-2">
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <Label className="text-xs font-semibold text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</Label>
                      <Input type="number" value={newPayment.totalAmount || ''} onChange={(e) => setNewPayment({ ...newPayment, totalAmount: parseFloat(e.target.value) || 0 })} className="h-8 text-sm text-right font-mono w-[150px]" />
                    </div>
                  </div>
                </TabsContent>

                {/* Bank Transfer Tab Content */}
                <TabsContent value="bank_transfer" className="border rounded-b-lg p-4 space-y-3 min-h-[180px]">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'حساب الأستاذ' : 'G/L Account'}</Label>
                    <Select value={newPayment.bankAccount} onValueChange={(v) => setNewPayment({ ...newPayment, bankAccount: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={language === 'ar' ? 'اختر حساب' : 'Select account'} /></SelectTrigger>
                      <SelectContent>
                        {paymentMeansAccounts?.map((acct) => (
                          <SelectItem key={acct.id} value={acct.acct_code}>
                            {acct.acct_code} - {acct.acct_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'تاريخ التحويل' : 'Transfer Date'}</Label>
                    <Input type="date" value={newPayment.checkDate} onChange={(e) => setNewPayment({ ...newPayment, checkDate: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'المرجع' : 'Reference'}</Label>
                    <Input value={newPayment.reference} onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="flex justify-end pt-2">
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <Label className="text-xs font-semibold text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</Label>
                      <Input type="number" value={newPayment.totalAmount || ''} onChange={(e) => setNewPayment({ ...newPayment, totalAmount: parseFloat(e.target.value) || 0 })} className="h-8 text-sm text-right font-mono w-[150px]" />
                    </div>
                  </div>
                </TabsContent>

                {/* Credit Card Tab Content */}
                <TabsContent value="credit_card" className="border rounded-b-lg p-4 space-y-3 min-h-[180px]">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'حساب الأستاذ' : 'G/L Account'}</Label>
                    <Input value={newPayment.bankAccount} onChange={(e) => setNewPayment({ ...newPayment, bankAccount: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'نوع البطاقة' : 'Card Type'}</Label>
                    <Select value={newPayment.creditCardType} onValueChange={(v) => setNewPayment({ ...newPayment, creditCardType: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visa">Visa</SelectItem>
                        <SelectItem value="mastercard">Mastercard</SelectItem>
                        <SelectItem value="mada">Mada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'رقم البطاقة' : 'Card Number'}</Label>
                    <Input maxLength={4} value={newPayment.creditCardNumber} onChange={(e) => setNewPayment({ ...newPayment, creditCardNumber: e.target.value })} className="h-8 text-sm" placeholder="Last 4 digits" />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowBankPOS(true)}>
                      <Smartphone className="h-4 w-4" />
                      {language === 'ar' ? 'إرسال لجهاز POS' : 'Send to POS Terminal'}
                    </Button>
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <Label className="text-xs font-semibold text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</Label>
                      <Input type="number" value={newPayment.totalAmount || ''} onChange={(e) => setNewPayment({ ...newPayment, totalAmount: parseFloat(e.target.value) || 0 })} className="h-8 text-sm text-right font-mono w-[150px]" />
                    </div>
                  </div>
                </TabsContent>

                {/* Cash Tab Content */}
                <TabsContent value="cash" className="border rounded-b-lg p-4 space-y-3 min-h-[180px]">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'حساب الأستاذ' : 'G/L Account'}</Label>
                    <Input value={newPayment.bankAccount} onChange={(e) => setNewPayment({ ...newPayment, bankAccount: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-md">
                    <Label className="text-xs font-semibold">{language === 'ar' ? 'المرجع' : 'Reference'}</Label>
                    <Input value={newPayment.reference} onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="flex justify-end pt-2">
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <Label className="text-xs font-semibold text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</Label>
                      <Input type="number" value={newPayment.totalAmount || ''} onChange={(e) => setNewPayment({ ...newPayment, totalAmount: parseFloat(e.target.value) || 0 })} className="h-8 text-sm text-right font-mono w-[150px]" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* SAP B1 Summary Footer */}
              <div className="border-t pt-3 space-y-2">
                <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-sm">
                  <Label className="text-xs font-semibold">{language === 'ar' ? 'المبلغ الإجمالي' : 'Overall Amount'}</Label>
                  <Input type="number" value={newPayment.totalAmount || ''} onChange={(e) => setNewPayment({ ...newPayment, totalAmount: parseFloat(e.target.value) || 0 })} className="h-8 text-sm text-right font-mono" />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-sm">
                  <Label className="text-xs font-semibold">{language === 'ar' ? 'الرصيد المستحق' : 'Balance Due'}</Label>
                  <Input value={formatCurrency(0)} disabled className="h-8 text-sm text-right font-mono bg-primary/5 text-primary font-bold" />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-sm">
                  <Label className="text-xs font-semibold">{language === 'ar' ? 'رسوم بنكية' : 'Bank Charge'}</Label>
                  <Input value="0.00" disabled className="h-8 text-sm text-right font-mono bg-muted/50" />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2 max-w-sm ml-auto">
                  <Label className="text-xs font-semibold text-right">{language === 'ar' ? 'المدفوع' : 'Paid'}</Label>
                  <Input value={formatCurrency(newPayment.totalAmount)} disabled className="h-8 text-sm text-right font-mono bg-primary/5 text-primary font-bold" />
                </div>
              </div>
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="mt-3">
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm">{language === 'ar' ? 'لا توجد مرفقات' : 'No attachments'}</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* SAP B1 Footer Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 pt-3 border-t">
            {/* Left: Remarks */}
            <div className="space-y-3">
              <div className="grid grid-cols-[120px_1fr] items-start gap-2">
                <Label className="text-xs font-semibold pt-2">{language === 'ar' ? 'ملاحظات' : 'Remarks'}</Label>
                <Textarea
                  value={newPayment.remarks}
                  onChange={(e) => setNewPayment({ ...newPayment, remarks: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-start gap-2">
                <Label className="text-xs font-semibold pt-2">{language === 'ar' ? 'ملاحظات القيد' : 'Journal Remarks'}</Label>
                <Input
                  value={newPayment.journalRemarks}
                  onChange={(e) => setNewPayment({ ...newPayment, journalRemarks: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Right: Totals */}
            <div className="space-y-2">
              <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold text-right">{language === 'ar' ? 'إجمالي المبلغ المستحق' : 'Total Amount Due'}</Label>
                <Input
                  type="number"
                  value={newPayment.totalAmount || ''}
                  onChange={(e) => setNewPayment({ ...newPayment, totalAmount: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-sm text-right font-mono font-bold"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                <Label className="text-xs font-semibold text-right">{language === 'ar' ? 'الرصيد المفتوح' : 'Open Balance'}</Label>
                <Input
                  value={formatCurrency(0)}
                  disabled
                  className="h-8 text-sm text-right font-mono bg-muted/50"
                />
              </div>
            </div>
          </div>

          <div className="mt-2">
            <AccountingValidationPanel
              documentType="incoming_payment"
              getDocumentData={() => ({ document_type: 'incoming_payment', total: newPayment.totalAmount, subtotal: newPayment.totalAmount, tax_amount: 0, conditions: { customer: newPayment.cardCode } })}
              compact
            />
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleAddPayment} disabled={createPayment.isPending}>
              {createPayment.isPending
                ? (language === 'ar' ? 'جاري التسجيل...' : 'Recording...')
                : (language === 'ar' ? 'إضافة' : 'Add')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="enterprise-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <FileText className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payments'}</p>
              <p className="text-xl font-bold">{payments?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="enterprise-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مسودة' : 'Draft'}</p>
              <p className="text-xl font-bold">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="enterprise-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مرحّل' : 'Posted'}</p>
              <p className="text-xl font-bold">{postedCount}</p>
            </div>
          </div>
        </div>
        <div className="enterprise-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Banknote className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المُستلم' : 'Total Received'}</p>
              <p className="text-xl font-bold">{formatCurrency(totalReceived)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="enterprise-card">
        <div className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث...' : 'Search payments...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {language === 'ar' ? 'تصفية' : 'Filter'}
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              {language === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="enterprise-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'رقم المستند' : 'Doc #'}</TableHead>
                <TableHead className="col-mobile-hidden">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                <TableHead className="col-mobile-hidden">{language === 'ar' ? 'أمر البيع' : 'Sales Order'}</TableHead>
                <TableHead className="col-tablet-hidden">{language === 'ar' ? 'طريقة الدفع' : 'Method'}</TableHead>
                <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="col-tablet-hidden">{language === 'ar' ? 'المزامنة' : 'Sync'}</TableHead>
                <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'لا توجد مدفوعات' : 'No payments found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <span className="font-mono text-sm">IP-{payment.doc_num}</span>
                      {payment.reference && (
                        <p className="text-xs text-muted-foreground">{payment.reference}</p>
                      )}
                    </TableCell>
                    <TableCell className="col-mobile-hidden">{payment.doc_date}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{payment.customer_code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="col-mobile-hidden">
                      {payment.sales_order ? (
                        <div className="flex items-center gap-1">
                          {payment.sales_order.is_contract ? (
                            <FileSignature className="h-3 w-3 text-primary" />
                          ) : (
                            <FileText className="h-3 w-3" />
                          )}
                          <span className="text-sm font-mono">SO-{payment.sales_order.doc_num}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="col-tablet-hidden">
                      <div className="flex items-center gap-1">
                        {getPaymentMethodIcon(payment.payment_type)}
                        <span className="text-sm">{getPaymentMethodLabel(payment.payment_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(payment.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[payment.status?.toLowerCase() || 'draft']}>
                        {payment.status === 'posted'
                          ? (language === 'ar' ? 'مرحّل' : 'Posted')
                          : payment.status === 'cancelled'
                            ? (language === 'ar' ? 'ملغي' : 'Cancelled')
                            : (language === 'ar' ? 'مسودة' : 'Draft')
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="col-tablet-hidden">
                      <Badge variant="outline" className={`text-xs ${
                        payment.sync_status === 'synced' ? 'border-success text-success' :
                        payment.sync_status === 'error' ? 'border-destructive text-destructive' :
                        'border-muted-foreground text-muted-foreground'
                      }`}>
                        {payment.sync_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setNewPayment({
                              customerId: payment.customer_id || '',
                              cardCode: payment.customer_code,
                              cardName: payment.customer_name,
                              salesOrderId: payment.sales_order_id || '',
                              docDate: payment.doc_date,
                              postingDate: payment.doc_date,
                              dueDate: payment.due_date || payment.doc_date,
                              paymentType: payment.payment_type || 'bank_transfer',
                              remarks: payment.remarks || '',
                              journalRemarks: '',
                              totalAmount: payment.total_amount,
                              reference: payment.reference || '',
                              checkNumber: payment.check_number || '',
                              checkDate: payment.check_date || '',
                              bankCode: payment.bank_code || '',
                              bankAccount: payment.bank_account || '',
                              creditCardType: payment.credit_card_type || '',
                              creditCardNumber: payment.credit_card_number || '',
                              contactPerson: '',
                              project: '',
                              series: null,
                            });
                            setSelectedCustomer({
                              id: payment.customer_id || '',
                              code: payment.customer_code,
                              name: payment.customer_name,
                              phone: '',
                              type: 'business_partner',
                            });
                            setEditingPaymentId(payment.id);
                            setIsDialogOpen(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'تعديل' : 'Edit'}
                          </DropdownMenuItem>
                          {payment.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handlePostPayment(payment.id)} className="text-success">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'ترحيل' : 'Post'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            toast({ title: language === 'ar' ? 'جاري الإرسال...' : 'Sending...' });
                            supabase.functions.invoke('send-quote-email', {
                              body: { quoteId: payment.id, documentType: 'incoming_payment' },
                            }).then(({ error }) => {
                              if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                              else toast({ title: language === 'ar' ? 'تم الإرسال' : 'Email Sent' });
                            });
                          }}>
                            <Mail className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'إرسال بالبريد' : 'Send by Email'}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageCircle className="h-4 w-4 mr-2 text-success" />
                            {language === 'ar' ? 'إرسال واتساب' : 'Send via WhatsApp'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => syncPayment('incoming_payment', 'to_sap', payment.id)}>
                            <ArrowUp className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'دفع إلى SAP' : 'Push to SAP'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => syncPayment('incoming_payment', 'from_sap', payment.id)}>
                            <ArrowDown className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'سحب من SAP' : 'Pull from SAP'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeletePayment(payment.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'حذف' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <BankPOSPaymentDialog
        open={showBankPOS}
        onOpenChange={setShowBankPOS}
        amount={newPayment.totalAmount || 0}
        sourceModule="incoming_payments"
        sourceDocumentNumber={newPayment.salesOrderId ? `IP-${newPayment.salesOrderId}` : undefined}
        customerName={newPayment.cardName || undefined}
        onPaymentComplete={(payment) => {
          setNewPayment(prev => ({
            ...prev,
            creditCardType: payment.card_type?.toLowerCase() || '',
            creditCardNumber: payment.card_last_four || '',
            totalAmount: payment.amount,
            reference: payment.auth_code || payment.transaction_ref,
          }));
          setShowBankPOS(false);
        }}
      />
    </div>
  );
}
