import { useState, useRef, useEffect } from 'react';
import DocumentRelationshipMap from '@/components/documents/DocumentRelationshipMap';
import DocumentContextMenu from '@/components/documents/DocumentContextMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ItemCombobox, type ItemOption } from '@/components/items/ItemCombobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  FileText,
  Trash2,
  Copy,
  Printer,
  Send,
  Mail,
  MessageCircle,
  FileSignature,
  Building2,
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IncotermSelect } from '@/components/trading/IncotermSelect';
import { PaymentTermsSelect } from '@/components/trading/PaymentTermsSelect';
import { IncotermInfoPanel } from '@/components/trading/IncotermInfoPanel';
import { getSOIncotermWarning } from '@/components/trading/IncotermConstants';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { SendWhatsAppDialog } from '@/components/whatsapp/SendWhatsAppDialog';
import { SalesOrderWhatsAppWrapper } from '@/components/sales/SalesOrderWhatsAppWrapper';
import { CustomerSelector, SelectedCustomer } from '@/components/customers/CustomerSelector';
import { useSalesOrders, WORKFLOW_STATUS_CONFIG, ContractPaymentTerm, SalesOrderContract } from '@/hooks/useSalesOrderContracts';
import { useNavigate, useLocation } from 'react-router-dom';
import { ContractPrintDialog } from '@/components/sales/ContractPrintDialog';
import { LineDimensionSelectors } from '@/components/dimensions/LineDimensionSelectors';
import { DocumentSeriesSelector, SAP_OBJECT_CODES } from '@/components/series/DocumentSeriesSelector';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';

const soColumns: ColumnDef[] = [
  { key: 'doc_num', header: 'Doc #' },
  { key: 'customer_code', header: 'Customer Code' },
  { key: 'customer_name', header: 'Customer Name' },
  { key: 'doc_date', header: 'Date' },
  { key: 'total', header: 'Total' },
  { key: 'status', header: 'Status' },
  { key: 'workflow_status', header: 'Workflow' },
  { key: 'contract_number', header: 'Contract #' },
];

const PHASE_LABELS: Record<string, { label: string; labelAr: string; color: string }> = {
  sales_initiation: { label: 'Sales', labelAr: 'المبيعات', color: 'bg-info/10 text-info' },
  finance_verification: { label: 'Finance Verification', labelAr: 'التحقق المالي', color: 'bg-warning/10 text-warning' },
  operations_verification: { label: 'Technical Assessment', labelAr: 'التقييم الفني', color: 'bg-accent/10 text-accent-foreground' },
  design_costing: { label: 'Design & Costing', labelAr: 'التصميم والتكلفة', color: 'bg-primary/10 text-primary' },
  finance_gate_2: { label: 'Finance Gate 2', labelAr: 'البوابة المالية 2', color: 'bg-warning/10 text-warning' },
  procurement: { label: 'Procurement', labelAr: 'المشتريات', color: 'bg-info/10 text-info' },
  production: { label: 'Production', labelAr: 'الإنتاج', color: 'bg-primary/10 text-primary' },
  final_payment: { label: 'Final Payment', labelAr: 'الدفعة النهائية', color: 'bg-warning/10 text-warning' },
  logistics: { label: 'Logistics', labelAr: 'اللوجستيات', color: 'bg-info/10 text-info' },
  installation: { label: 'Installation', labelAr: 'التركيب', color: 'bg-primary/10 text-primary' },
  completion: { label: 'Completed', labelAr: 'مكتمل', color: 'bg-success/10 text-success' },
};

const statusColors: Record<string, string> = {
  'draft': 'bg-muted text-muted-foreground',
  'open': 'bg-info/10 text-info',
  'approved': 'bg-primary/10 text-primary',
  'delivered': 'bg-success/10 text-success',
  'closed': 'bg-muted text-muted-foreground',
  'cancelled': 'bg-destructive/10 text-destructive',
};

const workflowStatusColors: Record<string, string> = {
  'draft': 'bg-muted text-muted-foreground',
  'pending_finance': 'bg-warning/10 text-warning',
  'finance_approved': 'bg-success/10 text-success',
  'finance_rejected': 'bg-destructive/10 text-destructive',
  'in_progress': 'bg-info/10 text-info',
  'completed': 'bg-success/10 text-success',
};

// Items are now fetched from the database via ItemCombobox

export default function SalesOrders() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { sync: syncSO } = useSAPSync();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  
  const { salesOrders, isLoading, createSalesOrder, updateSalesOrder, deleteSalesOrder, submitToFinance, uploadContractFile } = useSalesOrders();

  // Fetch branches and user's assigned branches
  const { data: allBranches = [] } = useQuery({
    queryKey: ['branches-for-so'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*, companies(name, name_ar)').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: userBranchAssignments = [] } = useQuery({
    queryKey: ['user-branch-assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('user_branch_assignments').select('branch_id').eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch current project phases for contracts
  const { data: projectPhases = [] } = useQuery({
    queryKey: ['project-current-phases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_phases')
        .select('project_id, phase, status')
        .eq('status', 'in_progress');
      if (error) throw error;
      return data;
    },
  });

  // Fetch total payments per sales order
  const { data: paymentTotals = [] } = useQuery({
    queryKey: ['payment-totals-by-order'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incoming_payments')
        .select('sales_order_id, total_amount, status');
      if (error) throw error;
      return data;
    },
  });

  // Build lookup maps
  const currentPhaseByProject = new Map<string, string>();
  projectPhases.forEach(p => {
    if (p.project_id) currentPhaseByProject.set(p.project_id, p.phase);
  });

  const paymentTotalByOrder = new Map<string, number>();
  paymentTotals.forEach(p => {
    if (p.sales_order_id && p.status === 'posted') {
      paymentTotalByOrder.set(p.sales_order_id, (paymentTotalByOrder.get(p.sales_order_id) || 0) + p.total_amount);
    }
  });

  const userBranchIds = userBranchAssignments.map(a => a.branch_id);
  const defaultBranchId = userBranchIds.length === 1 ? userBranchIds[0] : '';
  const availableBranches = isAdmin ? allBranches : allBranches.filter(b => userBranchIds.includes(b.id));
  
  const [searchQuery, setSearchQuery] = useState('');
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('contents');
  const [whatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
  const [selectedOrderForWhatsApp, setSelectedOrderForWhatsApp] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [submitToFinanceDialogOpen, setSubmitToFinanceDialogOpen] = useState(false);
  const [submitToFinanceOrderId, setSubmitToFinanceOrderId] = useState<string | null>(null);
  const [paymentSlipFile, setPaymentSlipFile] = useState<File | null>(null);
  const [isSubmittingToFinance, setIsSubmittingToFinance] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<SalesOrderContract | null>(null);
  const paymentSlipInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);
  const [seriesNextNo, setSeriesNextNo] = useState<number | null>(null);

  const getDefaultDueDate = (docDate: string) => {
  const { t } = useLanguage();

    const d = new Date(docDate);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const formatSaudiMobile = (input: string): string => {
    const digits = input.replace(/\D/g, '');
    if (digits.startsWith('05') || digits.startsWith('5')) {
      const core = digits.startsWith('05') ? digits.slice(1) : digits.startsWith('5') ? digits : digits;
      const num = digits.startsWith('0') ? digits.slice(1) : digits;
      return '+966' + num;
    }
    if (digits.startsWith('00966')) {
      return '+' + digits.slice(2);
    }
    if (digits.startsWith('966')) {
      return '+' + digits;
    }
    return input;
  };

  const defaultDocDate = new Date().toISOString().split('T')[0];

  const [newOrder, setNewOrder] = useState({
    cardCode: '',
    cardName: '',
    customerId: '',
    customerPhone: '',
    customerMobile: '',
    customerCR: '',
    customerNationalId: '',
    customerVatNumber: '',
    customerCity: '',
    docDate: defaultDocDate,
    docDueDate: getDefaultDueDate(defaultDocDate),
    salesEmployee: '',
    remarks: '',
    shippingAddress: '',
    billingAddress: '',
    paymentTerms: '',
    incoterm: '',
    branchId: defaultBranchId,
    branchManagerName: '',
    branchMobile: '',
    items: [{ lineNum: 1, itemCode: '', itemName: '', quantity: 1, unitPrice: 0, taxCode: 'VAT15', lineTotal: 0, dim_employee_id: null as string | null, dim_branch_id: null as string | null, dim_business_line_id: null as string | null, dim_factory_id: null as string | null }],
    // Contract fields
    isContract: true,
    contractNumber: '',
    contractDate: new Date().toISOString().split('T')[0],
    contractSignedDate: '',
    scopeOfWork: '',
    termsAndConditions: '',
    deliveryTerms: '',
    warrantyPeriod: '',
    validityPeriod: 30,
    paymentTermsDetails: [] as ContractPaymentTerm[],
  });

  // Pre-fill from quote copy
  useEffect(() => {
    const state = location.state as any;
    if (state?.fromQuote && state?.quoteData) {
      const q = state.quoteData;
      setSelectedCustomer(q.customer_id ? {
        id: q.customer_id,
        code: q.customer_code,
        name: q.customer_name,
        phone: q.customer_phone || '',
        type: 'business_partner',
      } : null);
      setNewOrder(prev => ({
        ...prev,
        cardCode: q.customer_code || '',
        cardName: q.customer_name || '',
        customerId: q.customer_id || '',
        customerPhone: q.customer_phone || '',
        salesEmployee: q.sales_employee_code?.toString() || '',
        remarks: q.notes || '',
        shippingAddress: q.shipping_address || '',
        billingAddress: q.billing_address || '',
        paymentTerms: q.payment_terms || '',
        items: q.lines && q.lines.length > 0 ? q.lines : prev.items,
      }));
      setIsDialogOpen(true);
      // Clear state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const handleCustomerChange = (customer: SelectedCustomer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setNewOrder({
        ...newOrder,
        cardCode: customer.code,
        cardName: customer.name,
        customerId: customer.id,
        customerPhone: customer.phone,
      });
    } else {
      setNewOrder({
        ...newOrder,
        cardCode: '',
        cardName: '',
        customerId: '',
        customerPhone: '',
      });
    }
  };

  const filteredOrders = (salesOrders || []).filter(
    (order) => {
      const matchesSearch = order.doc_num.toString().includes(searchQuery.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.contract_number && order.contract_number.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!cardFilter) return matchesSearch;
      if (cardFilter === 'contracts') return matchesSearch && order.is_contract;
      if (cardFilter === 'pending_finance') return matchesSearch && order.workflow_status === 'pending_finance';
      if (cardFilter === 'approved') return matchesSearch && order.workflow_status === 'finance_approved';
      return matchesSearch;
    }
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const calculateOrderTotal = () => {
    return newOrder.items.reduce((sum, item) => sum + item.lineTotal, 0);
  };

  const handleAddItem = () => {
    setNewOrder({
      ...newOrder,
      items: [
        ...newOrder.items,
        { lineNum: newOrder.items.length + 1, itemCode: '', itemName: '', quantity: 1, unitPrice: 0, taxCode: 'VAT15', lineTotal: 0, dim_employee_id: null, dim_branch_id: null, dim_business_line_id: null, dim_factory_id: null },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = newOrder.items.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      lineNum: i + 1,
    }));
    setNewOrder({ ...newOrder, items: updatedItems });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = newOrder.items.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.lineTotal = updated.unitPrice * updated.quantity * 1.15;
        }
        return updated;
      }
      return item;
    });
    setNewOrder({ ...newOrder, items: updatedItems });
  };

  const handleAddPaymentTerm = () => {
    const terms = [...newOrder.paymentTermsDetails];
    const total = calculateOrderTotal();
    terms.push({
      payment_number: terms.length + 1,
      description: `Payment ${terms.length + 1}`,
      percentage: 0,
      amount: 0,
      due_date: '',
      milestone: '',
    });
    setNewOrder({ ...newOrder, paymentTermsDetails: terms });
  };

  const handlePaymentTermChange = (index: number, field: string, value: string | number) => {
    const terms = [...newOrder.paymentTermsDetails];
    const total = calculateOrderTotal();
    
    if (field === 'percentage') {
      const percentage = Number(value);
      terms[index] = { 
        ...terms[index], 
        percentage,
        amount: (total * percentage) / 100
      };
    } else if (field === 'amount') {
      const amount = Number(value);
      terms[index] = { 
        ...terms[index], 
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      };
    } else {
      terms[index] = { ...terms[index], [field]: value };
    }
    
    setNewOrder({ ...newOrder, paymentTermsDetails: terms });
  };

  const handleRemovePaymentTerm = (index: number) => {
    const terms = newOrder.paymentTermsDetails.filter((_, i) => i !== index).map((term, i) => ({
      ...term,
      payment_number: i + 1,
    }));
    setNewOrder({ ...newOrder, paymentTermsDetails: terms });
  };

  const handleAddOrder = async () => {
    if (!newOrder.cardCode || newOrder.items.length === 0 || !newOrder.items[0].itemCode) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const total = calculateOrderTotal();
    const subtotal = total / 1.15;
    const taxAmount = total - subtotal;

    try {
      const result = await createSalesOrder.mutateAsync({
        customer_code: newOrder.cardCode,
        customer_name: newOrder.cardName,
        customer_id: newOrder.customerId || undefined,
        doc_date: newOrder.docDate,
        due_date: newOrder.docDueDate || undefined,
        subtotal,
        tax_amount: taxAmount,
        total,
        shipping_address: newOrder.shippingAddress || undefined,
        billing_address: newOrder.billingAddress || undefined,
        payment_terms: newOrder.paymentTerms || undefined,
        incoterm: newOrder.incoterm || undefined,
        remarks: newOrder.remarks || undefined,
        branch_id: newOrder.branchId || null,
        series: selectedSeries || undefined,
        customer_mobile: newOrder.customerMobile || null,
        customer_cr: newOrder.customerCR || null,
        customer_national_id: newOrder.customerNationalId || null,
        customer_vat_number: newOrder.customerVatNumber || null,
        customer_city: newOrder.customerCity || null,
        branch_manager_name: newOrder.branchManagerName || null,
        branch_mobile: newOrder.branchMobile || null,
        // Contract fields
        is_contract: newOrder.isContract,
        contract_number: newOrder.isContract ? newOrder.contractNumber || undefined : undefined,
        contract_date: newOrder.isContract ? newOrder.contractDate || undefined : undefined,
        contract_signed_date: newOrder.isContract ? newOrder.contractSignedDate || undefined : undefined,
        contract_value: newOrder.isContract ? total : undefined,
        scope_of_work: newOrder.isContract ? newOrder.scopeOfWork || undefined : undefined,
        terms_and_conditions: newOrder.isContract ? newOrder.termsAndConditions || undefined : undefined,
        delivery_terms: newOrder.isContract ? newOrder.deliveryTerms || undefined : undefined,
        warranty_period: newOrder.isContract ? newOrder.warrantyPeriod || undefined : undefined,
        validity_period: newOrder.isContract ? newOrder.validityPeriod : undefined,
        payment_terms_details: newOrder.isContract && newOrder.paymentTermsDetails.length > 0 
          ? newOrder.paymentTermsDetails 
          : undefined,
        items: newOrder.items,
      });

      // Upload contract file if provided
      if (contractFile && result?.id) {
        await uploadContractFile.mutateAsync({ orderId: result.id, file: contractFile });
      }

      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteSalesOrder.mutateAsync(id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSubmitToFinance = async (orderId: string) => {
    // Open dialog to upload payment slip first
    setSubmitToFinanceOrderId(orderId);
    setPaymentSlipFile(null);
    setSubmitToFinanceDialogOpen(true);
  };

  const handleConfirmSubmitToFinance = async () => {
    if (!submitToFinanceOrderId) return;
    if (!paymentSlipFile) {
      toast({
        title: language === 'ar' ? 'مطلوب' : 'Required',
        description: language === 'ar' ? 'يرجى إرفاق إيصال الدفع' : 'Please attach the payment slip',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingToFinance(true);
    try {
      // Upload payment slip
      const fileExt = paymentSlipFile.name.split('.').pop();
      const fileName = `payment-slips/${submitToFinanceOrderId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, paymentSlipFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(fileName, 3600 * 24 * 365);

      const paymentSlipUrl = urlData?.signedUrl || fileName;

      // Save payment slip URL to the sales order
      await supabase
        .from('sales_orders')
        .update({ payment_slip_url: paymentSlipUrl })
        .eq('id', submitToFinanceOrderId);

      // Now submit to finance
      await submitToFinance.mutateAsync(submitToFinanceOrderId);

      setSubmitToFinanceDialogOpen(false);
      setSubmitToFinanceOrderId(null);
      setPaymentSlipFile(null);
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingToFinance(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setContractFile(file);
    }
  };

  const handleEditOrder = async (order: any) => {
    setEditingOrderId(order.id);
    setSelectedCustomer({ id: order.customer_id || '', code: order.customer_code, name: order.customer_name, phone: '', type: 'business_partner' });
    
    // Fetch existing line items
    let loadedItems = [{ lineNum: 1, itemCode: '', itemName: '', quantity: 1, unitPrice: 0, taxCode: 'VAT15', lineTotal: 0, dim_employee_id: null as string | null, dim_branch_id: null as string | null, dim_business_line_id: null as string | null, dim_factory_id: null as string | null }];
    try {
      const { data: lines, error } = await supabase
        .from('sales_order_lines')
        .select('*')
        .eq('sales_order_id', order.id)
        .order('line_num');
      if (!error && lines && lines.length > 0) {
        loadedItems = lines.map(l => ({
          lineNum: l.line_num,
          itemCode: l.item_code || '',
          itemName: l.description || '',
          quantity: l.quantity,
          unitPrice: l.unit_price,
          taxCode: l.tax_code || 'VAT15',
          lineTotal: l.line_total,
          dim_employee_id: l.dim_employee_id || null,
          dim_branch_id: l.dim_branch_id || null,
          dim_business_line_id: l.dim_business_line_id || null,
          dim_factory_id: l.dim_factory_id || null,
        }));
      }
    } catch (e) {
      console.error('Failed to load line items', e);
    }

    setNewOrder({
      cardCode: order.customer_code,
      cardName: order.customer_name,
      customerId: order.customer_id || '',
      customerPhone: order.contact_person || '',
      customerMobile: order.customer_mobile || '',
      customerCR: order.customer_cr || '',
      customerNationalId: order.customer_national_id || '',
      customerVatNumber: order.customer_vat_number || '',
      customerCity: order.customer_city || '',
      docDate: order.doc_date,
      docDueDate: order.due_date || '',
      salesEmployee: '',
      remarks: order.remarks || '',
      shippingAddress: order.shipping_address || '',
      billingAddress: order.billing_address || '',
      paymentTerms: order.payment_terms || '',
      incoterm: (order as any).incoterm || '',
      branchId: order.branch_id || defaultBranchId,
      branchManagerName: order.branch_manager_name || '',
      branchMobile: order.branch_mobile || '',
      items: loadedItems,
      isContract: order.is_contract || false,
      contractNumber: order.contract_number || '',
      contractDate: order.contract_date || new Date().toISOString().split('T')[0],
      contractSignedDate: order.contract_signed_date || '',
      scopeOfWork: order.scope_of_work || '',
      termsAndConditions: order.terms_and_conditions || '',
      deliveryTerms: order.delivery_terms || '',
      warrantyPeriod: order.warranty_period || '',
      validityPeriod: order.validity_period || 30,
      paymentTermsDetails: order.payment_terms_details || [],
    });
    setActiveTab('contents');
    setIsDialogOpen(true);
  };

  const handleUpdateOrder = async () => {
    if (!editingOrderId) return;

    const total = calculateOrderTotal();
    const subtotal = total / 1.15;
    const taxAmount = total - subtotal;

    try {
      await updateSalesOrder.mutateAsync({
        id: editingOrderId,
        customer_code: newOrder.cardCode,
        customer_name: newOrder.cardName,
        customer_id: newOrder.customerId || undefined,
        doc_date: newOrder.docDate,
        due_date: newOrder.docDueDate || undefined,
        subtotal,
        tax_amount: taxAmount,
        total,
        shipping_address: newOrder.shippingAddress || undefined,
        billing_address: newOrder.billingAddress || undefined,
        payment_terms: newOrder.paymentTerms || undefined,
        incoterm: newOrder.incoterm || undefined,
        remarks: newOrder.remarks || undefined,
        branch_id: newOrder.branchId || null,
        series: selectedSeries || undefined,
        customer_mobile: newOrder.customerMobile || null,
        customer_cr: newOrder.customerCR || null,
        customer_national_id: newOrder.customerNationalId || null,
        customer_vat_number: newOrder.customerVatNumber || null,
        customer_city: newOrder.customerCity || null,
        branch_manager_name: newOrder.branchManagerName || null,
        branch_mobile: newOrder.branchMobile || null,
        is_contract: newOrder.isContract,
        contract_number: newOrder.isContract ? newOrder.contractNumber || undefined : undefined,
        contract_date: newOrder.isContract ? newOrder.contractDate || undefined : undefined,
        contract_signed_date: newOrder.isContract ? newOrder.contractSignedDate || undefined : undefined,
        contract_value: newOrder.isContract ? total : undefined,
        scope_of_work: newOrder.isContract ? newOrder.scopeOfWork || undefined : undefined,
        terms_and_conditions: newOrder.isContract ? newOrder.termsAndConditions || undefined : undefined,
        delivery_terms: newOrder.isContract ? newOrder.deliveryTerms || undefined : undefined,
        warranty_period: newOrder.isContract ? newOrder.warrantyPeriod || undefined : undefined,
        validity_period: newOrder.isContract ? newOrder.validityPeriod : undefined,
        payment_terms_details: newOrder.isContract && newOrder.paymentTermsDetails.length > 0
          ? newOrder.paymentTermsDetails
          : undefined,
        items: newOrder.items,
      });

      if (contractFile) {
        await uploadContractFile.mutateAsync({ orderId: editingOrderId, file: contractFile });
      }

      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
  const { t } = useLanguage();

    setNewOrder({
      cardCode: '',
      cardName: '',
      customerId: '',
      customerPhone: '',
      customerMobile: '',
      customerCR: '',
      customerNationalId: '',
      customerVatNumber: '',
      customerCity: '',
      docDate: new Date().toISOString().split('T')[0],
      docDueDate: getDefaultDueDate(new Date().toISOString().split('T')[0]),
      salesEmployee: '',
      remarks: '',
      shippingAddress: '',
      billingAddress: '',
      paymentTerms: '',
      incoterm: '',
      branchId: defaultBranchId,
      branchManagerName: '',
      branchMobile: '',
      items: [{ lineNum: 1, itemCode: '', itemName: '', quantity: 1, unitPrice: 0, taxCode: 'VAT15', lineTotal: 0, dim_employee_id: null, dim_branch_id: null, dim_business_line_id: null, dim_factory_id: null }],
      isContract: true,
      contractNumber: '',
      contractDate: new Date().toISOString().split('T')[0],
      contractSignedDate: '',
      scopeOfWork: '',
      termsAndConditions: '',
      deliveryTerms: '',
      warrantyPeriod: '',
      validityPeriod: 30,
      paymentTermsDetails: [],
    });
    setSelectedCustomer(null);
    setContractFile(null);
    setEditingOrderId(null);
    setIsDialogOpen(false);
  };

  const handleViewProject = (projectId: string) => {
    navigate(`/pm/projects/${projectId}`);
  };

  const handleCopyToDeliveryNote = async (order: any) => {
    // Fetch order lines
    const { data: lines } = await (supabase
      .from('sales_order_lines' as any)
      .select('*')
      .eq('order_id', order.id)
      .order('line_num') as any);

    navigate('/delivery-notes', {
      state: {
        fromSalesOrder: true,
        orderData: {
          customer_id: order.customer_id,
          customer_code: order.customer_code,
          customer_name: order.customer_name,
          remarks: order.remarks,
          shipping_address: order.shipping_address,
          billing_address: order.billing_address,
          branch_id: order.branch_id,
          base_doc_type: 'sales_order',
          base_doc_id: order.id,
          base_doc_num: order.doc_num,
          lines: (lines || []).map((l: any, i: number) => ({
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
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            {language === 'ar' ? 'أوامر البيع والعقود' : 'Sales Orders & Contracts'}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {language === 'ar' ? 'إنشاء وإدارة أوامر البيع والعقود الصناعية' : 'Create and manage sales orders and industrial contracts'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SAPSyncButton entity="sales_order" />
          <ClearAllButton tableName="sales_orders" displayName="Sales Orders" queryKeys={['salesOrders']} relatedTables={['sales_order_lines']} />
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else { setEditingOrderId(null); setIsDialogOpen(true); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {language === 'ar' ? 'جديد' : 'New Order/Contract'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {newOrder.isContract ? <FileSignature className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  {editingOrderId
                    ? (language === 'ar' ? 'تعديل' : 'Edit')
                    : newOrder.isContract 
                      ? (language === 'ar' ? 'عقد صناعي جديد' : 'New Industrial Contract')
                      : (language === 'ar' ? 'أمر بيع جديد' : 'New Sales Order')
                  }
                </DialogTitle>
                <DialogDescription>
                  {newOrder.isContract 
                    ? (language === 'ar' ? 'إنشاء عقد صناعي لبدء سير عمل المشروع' : 'Create an industrial contract to initiate project workflow')
                    : (language === 'ar' ? 'إنشاء أمر بيع جديد بأسلوب SAP B1' : 'Create a new sales order (SAP B1 style)')
                  }
                </DialogDescription>
              </DialogHeader>

              {/* Document Relationship Map - show when editing */}
              {editingOrderId && (
                <DocumentRelationshipMap
                  chain="crm"
                  documentType="sales_order"
                  documentId={editingOrderId}
                  compact
                  className="mb-3"
                />
              )}

              {/* Contract Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-3">
                <div className="flex items-center gap-3">
                  <FileSignature className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{language === 'ar' ? 'إنشاء كعقد صناعي' : 'Create as Industrial Contract'}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'يبدأ سير عمل المشروع الصناعي' : 'Initiates industrial project workflow'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={newOrder.isContract}
                  onCheckedChange={(checked) => setNewOrder({ ...newOrder, isContract: checked })}
                />
              </div>

              {/* SAP B1 Style Header - Dual Column */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 p-3 md:p-4 border rounded-lg bg-muted/10 mb-3">
                {/* Left Column - Customer Info */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'العميل' : 'Customer'}</Label>
                    <CustomerSelector
                      value={selectedCustomer}
                      onChange={handleCustomerChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'الاسم' : 'Name'}</Label>
                    <Input value={newOrder.cardName} disabled className="h-8 text-sm bg-muted/20" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'جوال العميل' : 'Customer Mobile'}</Label>
                    <Input
                      value={newOrder.customerMobile}
                      onChange={(e) => setNewOrder({ ...newOrder, customerMobile: e.target.value })}
                      onBlur={(e) => {
                        const formatted = formatSaudiMobile(e.target.value);
                        if (formatted !== e.target.value) {
                          setNewOrder(prev => ({ ...prev, customerMobile: formatted }));
                        }
                      }}
                      placeholder={language === 'ar' ? 'رقم الجوال' : 'Mobile number'}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'المدينة' : 'City'}</Label>
                    <Input
                      value={newOrder.customerCity}
                      onChange={(e) => setNewOrder({ ...newOrder, customerCity: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                    <Input value="SAR" disabled className="h-8 text-sm w-[120px] bg-muted/20" />
                  </div>
                </div>

                {/* Right Column - Document Info */}
                <div className="space-y-2">
                  <DocumentSeriesSelector
                    objectCode={SAP_OBJECT_CODES.SalesOrders}
                    value={selectedSeries}
                    onChange={(s, n) => { setSelectedSeries(s); setSeriesNextNo(n); }}
                    compact
                    label={language === 'ar' ? 'السلسلة / رقم' : 'Series / No.'}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                    <Input value="Open" disabled className="h-8 text-sm bg-muted/20" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'تاريخ الإرسال' : 'Posting Date'}</Label>
                    <Input
                      type="date"
                      value={newOrder.docDate}
                      onChange={(e) => setNewOrder({ ...newOrder, docDate: e.target.value, docDueDate: getDefaultDueDate(e.target.value) })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'صالح حتى' : 'Valid Until'}</Label>
                    <Input
                      type="date"
                      value={newOrder.docDueDate}
                      onChange={(e) => setNewOrder({ ...newOrder, docDueDate: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'تاريخ المستند' : 'Document Date'}</Label>
                    <Input
                      type="date"
                      value={newOrder.docDate}
                      disabled
                      className="h-8 text-sm bg-muted/20"
                    />
                  </div>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={`grid w-full ${newOrder.isContract ? 'grid-cols-3 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
                  <TabsTrigger value="contents">{language === 'ar' ? 'المحتويات' : 'Contents'}</TabsTrigger>
                  {newOrder.isContract && (
                    <TabsTrigger value="contract">{language === 'ar' ? 'العقد' : 'Contract'}</TabsTrigger>
                  )}
                  <TabsTrigger value="logistics">{language === 'ar' ? 'اللوجستيات' : 'Logistics'}</TabsTrigger>
                  <TabsTrigger value="accounting">{language === 'ar' ? 'المحاسبة' : 'Accounting'}</TabsTrigger>
                  <TabsTrigger value="attachments">{language === 'ar' ? 'المرفقات' : 'Attachments'}</TabsTrigger>
                </TabsList>

                {/* Contents Tab - Line Items */}
                <TabsContent value="contents" className="space-y-3 mt-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">{language === 'ar' ? 'بنود الطلب' : 'Order Items'}</h3>
                    <Button variant="outline" size="sm" onClick={handleAddItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'إضافة بند' : 'Add Item'}
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table className="table-fixed [&_th]:px-1.5 [&_td]:px-1.5">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30px]">#</TableHead>
                          <TableHead className="w-[110px]">{language === 'ar' ? 'رقم الصنف' : 'Item No.'}</TableHead>
                          <TableHead className="w-[130px]">{language === 'ar' ? 'وصف الصنف' : 'Item Description'}</TableHead>
                          <TableHead className="w-[60px]">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                          <TableHead className="w-[85px]">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                          <TableHead className="w-[50px] col-tablet-hidden max-[1366px]:hidden">{language === 'ar' ? 'خصم%' : 'Disc.'}</TableHead>
                          <TableHead className="w-[50px]">{language === 'ar' ? 'ضريبة' : 'Tax'}</TableHead>
                          <TableHead className="w-[85px]">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                          <TableHead className="w-[84px] col-tablet-hidden max-[1366px]:hidden">{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
                          <TableHead className="w-[84px] col-tablet-hidden max-[1366px]:hidden">{language === 'ar' ? 'الفروع' : 'Branch'}</TableHead>
                          <TableHead className="w-[84px] col-tablet-hidden max-[1366px]:hidden">{language === 'ar' ? 'خط الأعمال' : 'Biz Line'}</TableHead>
                          <TableHead className="w-[84px] col-tablet-hidden max-[1366px]:hidden">{language === 'ar' ? 'المصنع' : 'Factory'}</TableHead>
                          <TableHead className="w-[35px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newOrder.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-xs">{item.lineNum}</TableCell>
                            <TableCell>
                              <ItemCombobox
                                value={item.itemCode}
                                onSelect={(selected) => {
                                  if (selected) {
                                    handleItemChange(index, 'itemCode', selected.item_code);
                                    handleItemChange(index, 'itemName', selected.description);
                                    handleItemChange(index, 'unitPrice', selected.default_price || 0);
                                    const updatedItems = [...newOrder.items];
                                    updatedItems[index] = { ...updatedItems[index], itemCode: selected.item_code, itemName: selected.description, unitPrice: selected.default_price || 0, lineTotal: (selected.default_price || 0) * updatedItems[index].quantity * 1.15 };
                                    setNewOrder({ ...newOrder, items: updatedItems });
                                  } else {
                                    handleItemChange(index, 'itemCode', '');
                                    handleItemChange(index, 'itemName', '');
                                  }
                                }}
                                className="w-[110px] lg:w-[120px] xl:w-[130px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input value={item.itemName} disabled className="w-full min-w-0 h-7 text-xs bg-muted/20" />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-[55px] h-7 text-xs"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-[80px] h-7 text-xs"
                              />
                            </TableCell>
                            <TableCell className="col-tablet-hidden max-[1366px]:hidden">
                              <Input
                                type="number"
                                value="0.0"
                                disabled
                                className="w-[50px] h-7 text-xs bg-muted/20"
                              />
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono">S15</span>
                            </TableCell>
                            <TableCell className="font-semibold text-xs whitespace-nowrap">
                              {formatCurrency(item.lineTotal)}
                            </TableCell>
                            <LineDimensionSelectors
                              dimensions={{
                                dim_employee_id: item.dim_employee_id,
                                dim_branch_id: item.dim_branch_id,
                                dim_business_line_id: item.dim_business_line_id,
                                dim_factory_id: item.dim_factory_id,
                              }}
                              onChange={(dims) => {
                                const updated = newOrder.items.map((it, i) => i === index ? { ...it, ...dims } : it);
                                setNewOrder({ ...newOrder, items: updated });
                              }}
                            />
                            <TableCell>
                              {newOrder.items.length > 1 && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveItem(index)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Contract Tab */}
                {newOrder.isContract && (
                  <TabsContent value="contract" className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'رقم العقد' : 'Contract Number'}</Label>
                        <Input
                          value={newOrder.contractNumber}
                          onChange={(e) => setNewOrder({ ...newOrder, contractNumber: e.target.value })}
                          placeholder="e.g., CNT-2024-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'تاريخ العقد' : 'Contract Date'}</Label>
                        <Input
                          type="date"
                          value={newOrder.contractDate}
                          onChange={(e) => setNewOrder({ ...newOrder, contractDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'تاريخ التوقيع' : 'Signed Date'}</Label>
                        <Input
                          type="date"
                          value={newOrder.contractSignedDate}
                          onChange={(e) => setNewOrder({ ...newOrder, contractSignedDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'فترة الصلاحية (أيام)' : 'Validity Period (days)'}</Label>
                        <Input
                          type="number"
                          value={newOrder.validityPeriod}
                          onChange={(e) => setNewOrder({ ...newOrder, validityPeriod: parseInt(e.target.value) || 30 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'شروط التسليم' : 'Delivery Terms'}</Label>
                        <Select
                          value={newOrder.deliveryTerms || 'not_selected'}
                          onValueChange={(value) => setNewOrder({ ...newOrder, deliveryTerms: value === 'not_selected' ? '' : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_selected">{language === 'ar' ? 'اختر' : 'Select'}</SelectItem>
                            <SelectItem value="EXW">EXW - Ex Works</SelectItem>
                            <SelectItem value="FOB">FOB - Free On Board</SelectItem>
                            <SelectItem value="CIF">CIF - Cost Insurance Freight</SelectItem>
                            <SelectItem value="DDP">DDP - Delivered Duty Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'فترة الضمان' : 'Warranty Period'}</Label>
                        <Select
                          value={newOrder.warrantyPeriod || 'not_selected'}
                          onValueChange={(value) => setNewOrder({ ...newOrder, warrantyPeriod: value === 'not_selected' ? '' : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_selected">{language === 'ar' ? 'اختر' : 'Select'}</SelectItem>
                            <SelectItem value="6 months">6 Months</SelectItem>
                            <SelectItem value="1 year">1 Year</SelectItem>
                            <SelectItem value="2 years">2 Years</SelectItem>
                            <SelectItem value="3 years">3 Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'نطاق العمل' : 'Scope of Work'}</Label>
                      <Textarea
                        value={newOrder.scopeOfWork}
                        onChange={(e) => setNewOrder({ ...newOrder, scopeOfWork: e.target.value })}
                        placeholder={language === 'ar' ? 'وصف نطاق العمل والتسليمات' : 'Describe the scope of work and deliverables'}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</Label>
                      <Textarea
                        value={newOrder.termsAndConditions}
                        onChange={(e) => setNewOrder({ ...newOrder, termsAndConditions: e.target.value })}
                        placeholder={language === 'ar' ? 'الشروط والأحكام الخاصة بالعقد' : 'Contract-specific terms and conditions'}
                        rows={4}
                      />
                    </div>

                    {/* Payment Terms */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold">{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</Label>
                        <Button variant="outline" size="sm" onClick={handleAddPaymentTerm}>
                          <Plus className="h-4 w-4 mr-1" />
                          {language === 'ar' ? 'إضافة دفعة' : 'Add Payment'}
                        </Button>
                      </div>
                      {newOrder.paymentTermsDetails.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                                <TableHead className="w-[100px]">{language === 'ar' ? 'النسبة %' : '% Rate'}</TableHead>
                                <TableHead className="w-[120px]">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                                <TableHead className="w-[140px]">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {newOrder.paymentTermsDetails.map((term, index) => (
                                <TableRow key={index}>
                                  <TableCell>{term.payment_number}</TableCell>
                                  <TableCell>
                                    <Input
                                      value={term.description}
                                      onChange={(e) => handlePaymentTermChange(index, 'description', e.target.value)}
                                      placeholder="e.g., Advance payment"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={term.percentage}
                                      onChange={(e) => handlePaymentTermChange(index, 'percentage', e.target.value)}
                                      className="w-[80px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={term.amount}
                                      onChange={(e) => handlePaymentTermChange(index, 'amount', e.target.value)}
                                      className="w-[100px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="date"
                                      value={term.due_date || ''}
                                      onChange={(e) => handlePaymentTermChange(index, 'due_date', e.target.value)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemovePaymentTerm(index)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}

                {/* Logistics Tab */}
                <TabsContent value="logistics" className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">{language === 'ar' ? 'عنوان الشحن' : 'Shipping Address'}</h3>
                      <Textarea
                        value={newOrder.shippingAddress}
                        onChange={(e) => setNewOrder({ ...newOrder, shippingAddress: e.target.value })}
                        placeholder={language === 'ar' ? 'أدخل عنوان الشحن' : 'Enter shipping address'}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">{language === 'ar' ? 'عنوان الفوترة' : 'Billing Address'}</h3>
                      <Textarea
                        value={newOrder.billingAddress}
                        onChange={(e) => setNewOrder({ ...newOrder, billingAddress: e.target.value })}
                        placeholder={language === 'ar' ? 'أدخل عنوان الفوترة' : 'Enter billing address'}
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
                      <Select
                        value={newOrder.branchId || 'no_branch'}
                        onValueChange={(v) => setNewOrder({ ...newOrder, branchId: v === 'no_branch' ? '' : v })}
                        disabled={!isAdmin && availableBranches.length <= 1}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select Branch'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_branch">{language === 'ar' ? 'بدون فرع' : 'No Branch'}</SelectItem>
                          {availableBranches.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              {language === 'ar' && b.name_ar ? b.name_ar : b.name}
                              {b.companies ? ` (${language === 'ar' && (b.companies as any).name_ar ? (b.companies as any).name_ar : (b.companies as any).name})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'مدير الفرع' : 'Branch Manager'}</Label>
                      <Input
                        value={newOrder.branchManagerName}
                        onChange={(e) => setNewOrder({ ...newOrder, branchManagerName: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'جوال الفرع' : 'Branch Mobile'}</Label>
                      <Input
                        value={newOrder.branchMobile}
                        onChange={(e) => setNewOrder({ ...newOrder, branchMobile: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Accounting Tab */}
                <TabsContent value="accounting" className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</Label>
                      <PaymentTermsSelect
                        value={newOrder.paymentTerms || ''}
                        onValueChange={(value) => setNewOrder({ ...newOrder, paymentTerms: value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'شروط التسليم' : 'Incoterm'}</Label>
                      <IncotermSelect
                        value={newOrder.incoterm || ''}
                        onValueChange={(value) => setNewOrder({ ...newOrder, incoterm: value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    {newOrder.incoterm && (
                      <div className="col-span-2">
                        <IncotermInfoPanel incoterm={newOrder.incoterm} />
                        {getSOIncotermWarning(newOrder.incoterm) && (
                          <div className="flex items-center gap-2 mt-2 text-sm text-warning">
                            <AlertTriangle className="h-4 w-4" />
                            {getSOIncotermWarning(newOrder.incoterm)}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
                      <Select>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'السجل التجاري' : 'Commercial Registration'}</Label>
                      <Input
                        value={newOrder.customerCR}
                        onChange={(e) => setNewOrder({ ...newOrder, customerCR: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'رقم الهوية' : 'National ID'}</Label>
                      <Input
                        value={newOrder.customerNationalId}
                        onChange={(e) => setNewOrder({ ...newOrder, customerNationalId: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'الرقم الضريبي' : 'VAT Number'}</Label>
                      <Input
                        value={newOrder.customerVatNumber}
                        onChange={(e) => setNewOrder({ ...newOrder, customerVatNumber: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{language === 'ar' ? 'ملاحظات' : 'Remarks'}</Label>
                    <Textarea
                      value={newOrder.remarks}
                      onChange={(e) => setNewOrder({ ...newOrder, remarks: e.target.value })}
                      placeholder={language === 'ar' ? 'ملاحظات إضافية' : 'Additional remarks'}
                      rows={2}
                    />
                  </div>
                </TabsContent>

                {/* Attachments Tab */}
                <TabsContent value="attachments" className="space-y-3 mt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {contractFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        <div>
                          <p className="font-medium text-sm text-foreground">{contractFile.name}</p>
                          <p className="text-xs">{(contractFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-sm">{language === 'ar' ? 'انقر لتحميل ملف العقد' : 'Click to upload contract file'}</p>
                        <p className="text-xs mt-1">PDF, DOC, DOCX</p>
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* SAP B1 Style Footer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t mt-3">
                {/* Left - Sales Employee & Owner */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'مندوب المبيعات' : 'Sales Employee'}</Label>
                    <Select
                      value={newOrder.salesEmployee || 'not_selected'}
                      onValueChange={(value) => setNewOrder({ ...newOrder, salesEmployee: value === 'not_selected' ? '' : value })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={language === 'ar' ? '-بدون مندوب-' : '-No Sales Employee-'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_selected">{language === 'ar' ? '-بدون مندوب-' : '-No Sales Employee-'}</SelectItem>
                        <SelectItem value="Mohammed Ali">Mohammed Ali</SelectItem>
                        <SelectItem value="Sara Ahmed">Sara Ahmed</SelectItem>
                        <SelectItem value="Omar Khalil">Omar Khalil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Right - Financial Summary */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">{language === 'ar' ? 'الإجمالي قبل الخصم' : 'Total Before Discount'}</span>
                    <span className="font-mono">{formatCurrency(calculateOrderTotal() / 1.15)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">{language === 'ar' ? 'خصم' : 'Discount'}</span>
                    <div className="flex items-center gap-2">
                      <Input className="w-[60px] h-6 text-xs text-right" value="0" disabled />
                      <span className="text-xs text-muted-foreground">%</span>
                      <Input className="w-[90px] h-6 text-xs text-right" value="0.00" disabled />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">{language === 'ar' ? 'الضريبة' : 'Tax'}</span>
                    <span className="font-mono">{formatCurrency(calculateOrderTotal() - calculateOrderTotal() / 1.15)}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold border-t pt-1.5">
                    <span className="text-xs">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="font-mono text-primary">{formatCurrency(calculateOrderTotal())}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => resetForm()}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={editingOrderId ? handleUpdateOrder : handleAddOrder} 
                  disabled={createSalesOrder.isPending || updateSalesOrder.isPending}
                >
                  {(createSalesOrder.isPending || updateSalesOrder.isPending)
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : editingOrderId
                      ? (language === 'ar' ? 'تحديث' : 'Update')
                      : newOrder.isContract 
                        ? (language === 'ar' ? 'إنشاء العقد' : 'Create Contract')
                        : (language === 'ar' ? 'إنشاء أمر البيع' : 'Create Sales Order')
                  }
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className={`enterprise-card p-3 md:p-4 cursor-pointer transition-all hover:shadow-md ${cardFilter === null ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter(null)}>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-info/10 rounded-lg">
              <FileText className="h-4 w-4 md:h-5 md:w-5 text-info" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الأوامر' : 'Total Orders'}</p>
              <p className="text-lg md:text-xl font-bold">{salesOrders?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className={`enterprise-card p-3 md:p-4 cursor-pointer transition-all hover:shadow-md ${cardFilter === 'contracts' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter(cardFilter === 'contracts' ? null : 'contracts')}>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg">
              <FileSignature className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'العقود' : 'Contracts'}</p>
              <p className="text-lg md:text-xl font-bold">{salesOrders?.filter(o => o.is_contract).length || 0}</p>
            </div>
          </div>
        </div>
        <div className={`enterprise-card p-3 md:p-4 cursor-pointer transition-all hover:shadow-md ${cardFilter === 'pending_finance' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter(cardFilter === 'pending_finance' ? null : 'pending_finance')}>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-warning/10 rounded-lg">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'في انتظار المالية' : 'Pending Finance'}</p>
              <p className="text-lg md:text-xl font-bold">{salesOrders?.filter(o => o.workflow_status === 'pending_finance').length || 0}</p>
            </div>
          </div>
        </div>
        <div className={`enterprise-card p-3 md:p-4 cursor-pointer transition-all hover:shadow-md ${cardFilter === 'approved' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter(cardFilter === 'approved' ? null : 'approved')}>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-success/10 rounded-lg">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-success" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'تمت الموافقة' : 'Approved'}</p>
              <p className="text-lg md:text-xl font-bold">{salesOrders?.filter(o => o.workflow_status === 'finance_approved').length || 0}</p>
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
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {t('common.filter')}
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              {t('common.export')}
            </Button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="enterprise-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'رقم المستند' : 'Doc #'}</TableHead>
                <TableHead className="col-mobile-hidden">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                <TableHead className="col-mobile-hidden">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="col-mobile-hidden">{language === 'ar' ? 'المرحلة الحالية' : 'Current Stage'}</TableHead>
                <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                <TableHead className="col-tablet-hidden">{language === 'ar' ? 'المدفوعات' : 'Total Payment'}</TableHead>
                <TableHead className="col-tablet-hidden">{language === 'ar' ? 'المزامنة' : 'Sync'}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                   <TableCell colSpan={10} className="text-center py-8">
                    {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'لا توجد أوامر بيع' : 'No sales orders found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <DocumentContextMenu key={order.id} chain="crm" documentType="sales_order" documentId={order.id} documentNumber={`SO-${order.doc_num}`} onOpen={() => handleEditOrder(order)}>
                  <TableRow className="cursor-pointer">
                    <TableCell>
                      <span className="font-mono text-sm">SO-{order.doc_num}</span>
                      {order.contract_number && (
                        <p className="text-xs text-muted-foreground">{order.contract_number}</p>
                      )}
                    </TableCell>
                    <TableCell className="col-mobile-hidden">
                      {order.is_contract ? (
                        <Badge variant="outline" className="gap-1">
                          <FileSignature className="h-3 w-3" />
                          {language === 'ar' ? 'عقد' : 'Contract'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <FileText className="h-3 w-3" />
                          {language === 'ar' ? 'أمر' : 'Order'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="col-mobile-hidden">{order.doc_date}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{order.customer_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status?.toLowerCase() || 'draft']}>
                        {order.status || 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="col-mobile-hidden">
                      {order.is_contract && order.project_id ? (() => {
                        const currentPhase = currentPhaseByProject.get(order.project_id);
                        const phaseConfig = currentPhase ? PHASE_LABELS[currentPhase] : null;
                        return phaseConfig ? (
                          <Badge className={phaseConfig.color}>
                            {language === 'ar' ? phaseConfig.labelAr : phaseConfig.label}
                          </Badge>
                        ) : (
                          <Badge className={workflowStatusColors[order.workflow_status || 'draft']}>
                            {WORKFLOW_STATUS_CONFIG[order.workflow_status || 'draft']?.label || 'Draft'}
                          </Badge>
                        );
                      })() : order.is_contract ? (
                        <Badge className={workflowStatusColors[order.workflow_status || 'draft']}>
                          {WORKFLOW_STATUS_CONFIG[order.workflow_status || 'draft']?.label || 'Draft'}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(order.total || 0)}
                    </TableCell>
                    <TableCell className="col-tablet-hidden">
                      {order.is_contract ? (
                        <span className="font-semibold text-success">
                          {formatCurrency(paymentTotalByOrder.get(order.id) || 0)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="col-tablet-hidden">
                      <Badge variant="outline" className={`text-xs ${
                        order.sync_status === 'synced' ? 'border-success text-success' :
                        order.sync_status === 'error' ? 'border-destructive text-destructive' :
                        'border-muted-foreground text-muted-foreground'
                      }`}>
                        {order.sync_status || 'pending'}
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
                          <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                            <FileText className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'نسخ' : 'Duplicate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyToDeliveryNote(order)}>
                            <Truck className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'نسخ إلى مذكرة تسليم' : 'Copy to Delivery Note'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            const { data: lines } = await (supabase.from('sales_order_lines' as any).select('*').eq('order_id', order.id).order('line_num') as any);
                            navigate('/ar-invoices', {
                              state: {
                                fromSalesOrder: true,
                                orderData: {
                                  customer_id: order.customer_id, customer_code: order.customer_code,
                                  customer_name: order.customer_name,
                                  remarks: order.remarks,
                                  shipping_address: order.shipping_address, billing_address: order.billing_address,
                                  branch_id: order.branch_id,
                                  lines: (lines || []).map((l: any, i: number) => ({
                                    lineNum: i + 1, itemCode: l.item_code, itemName: l.description,
                                    quantity: l.quantity, unitPrice: l.unit_price, taxCode: l.tax_code || 'VAT15',
                                    lineTotal: l.line_total, warehouse: l.warehouse || '',
                                  })),
                                },
                              },
                            });
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'نسخ إلى فاتورة' : 'Copy to A/R Invoice'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedOrderForPrint(order);
                            setPrintDialogOpen(true);
                          }}>
                            <Printer className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'طباعة' : 'Print'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            toast({ title: language === 'ar' ? 'جاري الإرسال...' : 'Sending...', description: language === 'ar' ? 'جاري إرسال البريد الإلكتروني' : 'Sending email to customer' });
                            supabase.functions.invoke('send-quote-email', {
                              body: { quoteId: order.id, documentType: 'sales_order' },
                            }).then(({ error }) => {
                              if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                              else toast({ title: language === 'ar' ? 'تم الإرسال' : 'Email Sent', description: language === 'ar' ? 'تم إرسال أمر البيع للعميل' : 'Sales order sent to customer' });
                            });
                          }}>
                            <Mail className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'إرسال بالبريد' : 'Send by Email'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedOrderForWhatsApp(order);
                              setWhatsAppDialogOpen(true);
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2 text-success" />
                            {language === 'ar' ? 'إرسال واتساب' : 'Send via WhatsApp'}
                          </DropdownMenuItem>
                          
                          {order.is_contract && order.workflow_status === 'draft' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleSubmitToFinance(order.id)}
                                className="text-primary"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {language === 'ar' ? 'إرسال للمالية' : 'Submit to Finance'}
                              </DropdownMenuItem>
                            </>
                          )}

                          {order.project_id && (
                            <DropdownMenuItem onClick={() => handleViewProject(order.project_id!)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'عرض المشروع' : 'View Project'}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            const prefill = encodeURIComponent(JSON.stringify({
                              sales_order_id: order.id,
                              customer_code: order.customer_code,
                              customer_name: order.customer_name,
                              customer_id: order.customer_id || '',
                              total_amount: order.total || 0,
                              reference: `SO-${order.doc_num}`,
                            }));
                            navigate(`/incoming-payments?prefill=${prefill}`);
                          }}>
                            <Banknote className="h-4 w-4 mr-2" />
                            {language === 'ar' ? '+ دفعة' : '+ Payment'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => syncSO('sales_order', 'to_sap', order.id)}>
                            <ArrowUp className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'دفع إلى SAP' : 'Push to SAP'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => syncSO('sales_order', 'from_sap', order.id)}>
                            <ArrowDown className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'سحب من SAP' : 'Pull from SAP'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteOrder(order.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete')}
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
      </div>

      {/* WhatsApp Dialog with auto-generated PDF */}
      {selectedOrderForWhatsApp && (
        <SalesOrderWhatsAppWrapper
          open={whatsAppDialogOpen}
          onOpenChange={(val) => {
            setWhatsAppDialogOpen(val);
            if (!val) setSelectedOrderForWhatsApp(null);
          }}
          order={selectedOrderForWhatsApp}
        />
      )}

      {/* Contract Print Dialog */}
      <ContractPrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        order={selectedOrderForPrint}
      />

      {/* Payment Slip Upload Dialog */}
      <Dialog open={submitToFinanceDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setSubmitToFinanceDialogOpen(false);
          setSubmitToFinanceOrderId(null);
          setPaymentSlipFile(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'إرفاق إيصال الدفع' : 'Attach Payment Slip'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'يرجى إرفاق إيصال الدفع قبل الإرسال للمالية' 
                : 'Please attach the payment slip before submitting to finance'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => paymentSlipInputRef.current?.click()}
            >
              {paymentSlipFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-start">
                    <p className="font-medium text-sm">{paymentSlipFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(paymentSlipFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'اضغط لرفع إيصال الدفع' : 'Click to upload payment slip'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG
                  </p>
                </>
              )}
            </div>
            <input
              ref={paymentSlipInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPaymentSlipFile(file);
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitToFinanceDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleConfirmSubmitToFinance} 
              disabled={!paymentSlipFile || isSubmittingToFinance}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmittingToFinance 
                ? (language === 'ar' ? 'جاري الإرسال...' : 'Submitting...') 
                : (language === 'ar' ? 'إرسال للمالية' : 'Submit to Finance')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
