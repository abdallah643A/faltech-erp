import { useState, useEffect, useCallback } from 'react';
import { AccountingValidationPanel, useAccountingGuard } from '@/components/accounting/AccountingValidationPanel';
import { PreviewJEModal } from '@/components/accounting/PreviewJEModal';
import type { SimulationInput } from '@/services/postingEngine';
import DocumentContextMenu from '@/components/documents/DocumentContextMenu';
import { useLocation, useNavigate } from 'react-router-dom';
import { ItemCombobox, type ItemOption } from '@/components/items/ItemCombobox';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
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
  Search, Plus, Filter, Download, MoreVertical, FileText, Trash2, Copy, Printer,
  Eye, Loader2, MessageCircle, Mail, Edit, Banknote, ArrowUp, ArrowDown,
  Database, Clock, CheckCircle, BookOpen,
} from 'lucide-react';
import JEPreviewPanel from '@/components/finance/JEPreviewPanel';
import { useToast } from '@/hooks/use-toast';
import { useARInvoices, ARInvoice, ARInvoiceLine } from '@/hooks/useARInvoices';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { SendWhatsAppDialog } from '@/components/whatsapp/SendWhatsAppDialog';
import { CustomerSelector, SelectedCustomer } from '@/components/customers/CustomerSelector';
import { LineDimensionSelectors, DimensionTableHeaders } from '@/components/dimensions/LineDimensionSelectors';
import { DocumentSeriesSelector, SAP_OBJECT_CODES } from '@/components/series/DocumentSeriesSelector';
import { ExternalItemSelector } from '@/components/sales/ExternalItemSelector';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const arInvColumns: ColumnDef[] = [
  { key: 'doc_num', header: 'Doc #' },
  { key: 'customer_code', header: 'Customer Code' },
  { key: 'customer_name', header: 'Customer Name' },
  { key: 'doc_date', header: 'Date' },
  { key: 'subtotal', header: 'Subtotal' },
  { key: 'tax_amount', header: 'Tax' },
  { key: 'total', header: 'Total' },
  { key: 'balance_due', header: 'Balance Due' },
  { key: 'status', header: 'Status' },
];
import { useExternalSAPDatabase } from '@/hooks/useExternalSAPDatabase';

const statusColors: Record<string, string> = {
  open: 'bg-info/10 text-info',
  closed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

interface Item {
  id: string;
  item_code: string;
  description: string;
  default_price: number;
  warehouse?: string;
}

export default function ARInvoices() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { sync: syncInvoice } = useSAPSync();
  const { invoices, loading, createInvoice, updateInvoice, deleteInvoice, fetchInvoices } = useARInvoices();
  const { verifyAndCreateDraft, saveReservation } = useExternalSAPDatabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('contents');
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [whatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
  const [selectedInvoiceForWhatsApp, setSelectedInvoiceForWhatsApp] = useState<ARInvoice | null>(null);
  const [jePreviewInvoice, setJePreviewInvoice] = useState<ARInvoice | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<ARInvoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<ARInvoice | null>(null);
  const [printLines, setPrintLines] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);
  const [seriesNextNo, setSeriesNextNo] = useState<number | null>(null);
  const [showExternalSelector, setShowExternalSelector] = useState(false);
  const [externalConnectionId, setExternalConnectionId] = useState<string | null>(null);
  const [externalConnectionName, setExternalConnectionName] = useState<string>('');
  const [lineExternalDb, setLineExternalDb] = useState<Record<number, { connectionId: string; connectionName: string; maxQty: number }>>({});

  // CPMS Project linking
  const [cpmsProjects, setCpmsProjects] = useState<any[]>([]);
  const [selectedCpmsProject, setSelectedCpmsProject] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState('standard');
  const [retentionPct, setRetentionPct] = useState(10);
  const [filterProject, setFilterProject] = useState('all');

  // Accounting validation
  const { guardAction, result: acctResult, showPreview: acctShowPreview, setShowPreview: setAcctShowPreview, isValidating: acctValidating } = useAccountingGuard();

  const [newInvoice, setNewInvoice] = useState({
    customer_id: '',
    customer_code: '',
    customer_name: '',
    customer_phone: '',
    doc_date: new Date().toISOString().split('T')[0],
    doc_due_date: '',
    num_at_card: '',
    payment_terms: '',
    billing_address: '',
    shipping_address: '',
    shipping_method: '',
    remarks: '',
    currency: 'SAR',
    doc_rate: 1,
    lines: [
      {
        line_num: 1, item_id: '', item_code: '', description: '', quantity: 1,
        unit_price: 0, discount_percent: 0, tax_percent: 15, line_total: 0, warehouse: '',
      },
    ] as Omit<ARInvoiceLine, 'id' | 'invoice_id'>[],
  });

  const getARInvoiceSimInput = useCallback((): SimulationInput => {
    const subtotal = newInvoice.lines.reduce((sum, line) => sum + line.quantity * line.unit_price * (1 - line.discount_percent / 100), 0);
    const taxAmount = subtotal * 0.15;
    const total = subtotal + taxAmount;
    const retentionAmt = ['progress_billing', 'final'].includes(invoiceType) ? total * (retentionPct / 100) : 0;
    return {
      document_type: 'ar_invoice', total, subtotal, tax_amount: taxAmount,
      retention_amount: retentionAmt, discount_amount: 0,
      conditions: { customer: newInvoice.customer_code, branch: '' },
    };
  }, [newInvoice, invoiceType, retentionPct]);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from('items').select('id, item_code, description, default_price, warehouse');
      if (data) setItems(data);
    };
    const fetchCpmsProjects = async () => {
      const { data } = await (supabase.from('cpms_projects').select('id, code, name, project_number, client_name, contract_value') as any).order('created_at', { ascending: false });
      if (data) setCpmsProjects(data);
    };
    fetchItems();
    fetchCpmsProjects();
  }, []);

  // Handle copy-from (Sales Order or Delivery Note)
  useEffect(() => {
    const state = location.state as any;
    if (state?.fromProject && state?.projectData) {
      setSelectedCpmsProject(state.projectData.cpms_project_id || '');
      if (state.projectData.customer_name) {
        setNewInvoice(prev => ({ ...prev, customer_name: state.projectData.customer_name }));
      }
      setIsDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    } else if ((state?.fromSalesOrder || state?.fromDeliveryNote) && (state?.orderData || state?.noteData)) {
      const src = state.orderData || state.noteData;
      setSelectedCustomer(src.customer_id ? {
        id: src.customer_id, code: src.customer_code, name: src.customer_name,
        phone: src.customer_phone || '', type: 'business_partner' as const,
      } : null);
      setNewInvoice(prev => ({
        ...prev,
        customer_id: src.customer_id || '',
        customer_code: src.customer_code || '',
        customer_name: src.customer_name || '',
        customer_phone: src.customer_phone || '',
        remarks: src.remarks || '',
        shipping_address: src.shipping_address || '',
        billing_address: src.billing_address || '',
        lines: src.lines && src.lines.length > 0 ? src.lines.map((l: any, i: number) => ({
          line_num: i + 1, item_code: l.itemCode || l.item_code || '', item_id: l.item_id || '',
          description: l.itemName || l.description || '', quantity: l.quantity || 1,
          unit_price: l.unitPrice || l.unit_price || 0, discount_percent: l.discount_percent || 0,
          tax_percent: 15, line_total: l.lineTotal || l.line_total || 0, warehouse: l.warehouse || '',
        })) : prev.lines,
      }));
      setIsDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const handleCustomerChange = (customer: SelectedCustomer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setNewInvoice({ ...newInvoice, customer_id: customer.id || '', customer_code: customer.code, customer_name: customer.name, customer_phone: customer.phone });
    } else {
      setNewInvoice({ ...newInvoice, customer_id: '', customer_code: '', customer_name: '', customer_phone: '' });
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = String(invoice.doc_num).includes(searchQuery) ||
      invoice.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = filterProject === 'all' || (invoice as any).cpms_project_id === filterProject;
    return matchesSearch && matchesProject;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(value);

  const calculateTotals = () => {
    const subtotal = newInvoice.lines.reduce((sum, line) => {
      return sum + line.quantity * line.unit_price * (1 - line.discount_percent / 100);
    }, 0);
    const taxAmount = subtotal * 0.15;
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const handleAddLine = () => {
    setNewInvoice({
      ...newInvoice,
      lines: [...newInvoice.lines, {
        line_num: newInvoice.lines.length + 1, item_id: '', item_code: '', description: '',
        quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 15, line_total: 0, warehouse: '',
      }],
    });
  };

  const handleRemoveLine = (index: number) => {
    const updatedLines = newInvoice.lines.filter((_, i) => i !== index).map((line, i) => ({ ...line, line_num: i + 1 }));
    setNewInvoice({ ...newInvoice, lines: updatedLines });
  };

  const handleLineChange = (index: number, field: string, value: string | number) => {
    const updatedLines = newInvoice.lines.map((line, i) => {
      if (i === index) {
        const updated = { ...line, [field]: value };
        if (field === 'item_code') {
          const selectedItem = items.find((it) => it.item_code === value);
          if (selectedItem) {
            updated.item_id = selectedItem.id;
            updated.description = selectedItem.description;
            updated.unit_price = selectedItem.default_price || 0;
            updated.warehouse = selectedItem.warehouse || '';
          }
        }
        const lineSubtotal = updated.quantity * updated.unit_price * (1 - updated.discount_percent / 100);
        updated.line_total = lineSubtotal * (1 + updated.tax_percent / 100);
        return updated;
      }
      return line;
    });
    setNewInvoice({ ...newInvoice, lines: updatedLines });
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.customer_code || newInvoice.lines.length === 0 || !newInvoice.lines[0].item_code) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    // Accounting pre-validation
    const simInput = getARInvoiceSimInput();
    const canProceed = await (async () => {
      try {
        const { validateAccounting } = await import('@/services/accountingValidator');
        const res = await validateAccounting(simInput);
        if (!res.canProceed) {
          toast({ title: language === 'ar' ? 'خطأ محاسبي' : 'Accounting Error', description: res.issues.find(i => i.type === 'error')?.message || 'Accounting validation failed', variant: 'destructive' });
          return false;
        }
        return true;
      } catch { return true; /* proceed if no rules configured */ }
    })();
    if (!canProceed) return;

    setSaving(true);
    const { subtotal, taxAmount, total } = calculateTotals();

    const retentionAmt = ['progress_billing', 'final'].includes(invoiceType) ? total * (retentionPct / 100) : 0;
    const amountAfterRetention = total - retentionAmt;

    const invoiceData: Omit<ARInvoice, 'id' | 'doc_num'> = {
      doc_date: newInvoice.doc_date, doc_due_date: newInvoice.doc_due_date || undefined,
      customer_id: newInvoice.customer_id || undefined, customer_code: newInvoice.customer_code,
      customer_name: newInvoice.customer_name, num_at_card: newInvoice.num_at_card || undefined,
      currency: newInvoice.currency, doc_rate: newInvoice.doc_rate, subtotal,
      discount_percent: 0, discount_amount: 0, tax_amount: taxAmount, total,
      paid_amount: 0, balance_due: amountAfterRetention, payment_terms: newInvoice.payment_terms || undefined,
      billing_address: newInvoice.billing_address || undefined,
      shipping_address: newInvoice.shipping_address || undefined,
      shipping_method: newInvoice.shipping_method || undefined,
      remarks: newInvoice.remarks || undefined, series: selectedSeries || undefined, status: 'open',
      cpms_project_id: selectedCpmsProject || undefined,
      invoice_type: invoiceType,
      retention_percentage: retentionPct,
      retention_amount: retentionAmt,
      amount_after_retention: amountAfterRetention,
    } as any;

    const result = await createInvoice(invoiceData, newInvoice.lines);

    // Handle external DB reservations
    if (result) {
      const externalLines = Object.entries(lineExternalDb);
      if (externalLines.length > 0) {
        const byConnection = new Map<string, { connectionId: string; connectionName: string; lines: any[] }>();
        externalLines.forEach(([idxStr, ext]) => {
          const idx = parseInt(idxStr);
          const line = newInvoice.lines[idx];
          if (!line) return;
          if (!byConnection.has(ext.connectionId)) {
            byConnection.set(ext.connectionId, { connectionId: ext.connectionId, connectionName: ext.connectionName, lines: [] });
          }
          byConnection.get(ext.connectionId)!.lines.push({
            item_code: line.item_code, item_name: line.description, warehouse_code: line.warehouse,
            quantity: line.quantity, unit_price: line.unit_price, line_total: line.line_total,
          });
        });

        for (const [connId, group] of byConnection) {
          const draftResult = await verifyAndCreateDraft(connId, {
            customer_code: newInvoice.customer_code,
            doc_date: newInvoice.doc_date,
            doc_due_date: newInvoice.doc_due_date || newInvoice.doc_date,
            remarks: newInvoice.remarks || undefined,
          }, group.lines.map(l => ({ item_code: l.item_code, quantity: l.quantity, unit_price: l.unit_price, warehouse: l.warehouse_code })));

          const reservation = await saveReservation({
            ar_invoice_id: result.id, database_connection_id: connId,
            sap_draft_doc_entry: draftResult.docEntry?.toString(), sap_draft_doc_num: draftResult.docNum,
            status: draftResult.success ? 'reserved' : 'failed', lines: group.lines,
          });

          // Update AR invoice with external reservation info
          if (reservation) {
            await supabase.from('ar_invoices').update({
              has_external_items: true,
              external_reservation_id: reservation.id,
            }).eq('id', result.id);
          }

          if (draftResult.success) {
            toast({ title: language === 'ar' ? 'تم الحجز' : 'Stock Reserved', description: `Draft Invoice created in ${group.connectionName} (Doc#: ${draftResult.docNum})` });
          } else {
            toast({ title: language === 'ar' ? 'تحذير' : 'Warning', description: `External reservation failed for ${group.connectionName}: ${draftResult.error}`, variant: 'destructive' });
          }
        }
      }
    }

    setSaving(false);

    if (result) {
      setNewInvoice({
        customer_id: '', customer_code: '', customer_name: '', customer_phone: '',
        doc_date: new Date().toISOString().split('T')[0], doc_due_date: '', num_at_card: '',
        payment_terms: '', billing_address: '', shipping_address: '', shipping_method: '',
        remarks: '', currency: 'SAR', doc_rate: 1,
        lines: [{ line_num: 1, item_id: '', item_code: '', description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 15, line_total: 0, warehouse: '' }],
      });
      setSelectedCustomer(null);
      setLineExternalDb({});
      setShowExternalSelector(false);
      setExternalConnectionId(null);
      setSelectedCpmsProject('');
      setInvoiceType('standard');
      setRetentionPct(10);
      setIsDialogOpen(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => { await deleteInvoice(id); };

  const handleEditInvoice = async (invoice: ARInvoice) => {
    // Fetch lines for this invoice
    const { data: lines } = await supabase
      .from('ar_invoice_lines')
      .select('*')
      .eq('invoice_id', invoice.id!)
      .order('line_num');

    setEditingInvoiceId(invoice.id!);
    setSelectedCustomer(invoice.customer_id ? {
      id: invoice.customer_id, code: invoice.customer_code, name: invoice.customer_name,
    } as any : null);
    setNewInvoice({
      customer_id: invoice.customer_id || '',
      customer_code: invoice.customer_code,
      customer_name: invoice.customer_name,
      customer_phone: '',
      doc_date: invoice.doc_date,
      doc_due_date: invoice.doc_due_date || '',
      num_at_card: invoice.num_at_card || '',
      payment_terms: invoice.payment_terms || '',
      billing_address: invoice.billing_address || '',
      shipping_address: invoice.shipping_address || '',
      shipping_method: invoice.shipping_method || '',
      remarks: invoice.remarks || '',
      currency: invoice.currency || 'SAR',
      doc_rate: invoice.doc_rate || 1,
      lines: (lines || []).map((l: any) => ({
        line_num: l.line_num, item_id: l.item_id || '', item_code: l.item_code,
        description: l.description, quantity: l.quantity, unit_price: l.unit_price,
        discount_percent: l.discount_percent || 0, tax_percent: l.tax_percent || 15,
        line_total: l.line_total, warehouse: l.warehouse || '',
      })),
    });
    setInvoiceType((invoice as any).invoice_type || 'standard');
    setRetentionPct((invoice as any).retention_percentage || 10);
    setSelectedCpmsProject((invoice as any).cpms_project_id || '');
    setIsDialogOpen(true);
  };

  const handlePrintInvoice = async (invoice: ARInvoice) => {
    const { data: lines } = await supabase
      .from('ar_invoice_lines')
      .select('*')
      .eq('invoice_id', invoice.id!)
      .order('line_num');
    setPrintLines(lines || []);
    setPrintInvoice(invoice);
  };

  const handleViewInvoice = (invoice: ARInvoice) => {
    setViewingInvoice(invoice);
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoiceId) return;
    setSaving(true);
    const { subtotal: s, taxAmount: t, total: tot } = calculateTotals();
    const retentionAmt = ['progress_billing', 'final'].includes(invoiceType) ? tot * (retentionPct / 100) : 0;
    await updateInvoice(editingInvoiceId, {
      doc_date: newInvoice.doc_date,
      doc_due_date: newInvoice.doc_due_date || undefined,
      customer_code: newInvoice.customer_code,
      customer_name: newInvoice.customer_name,
      subtotal: s, tax_amount: t, total: tot,
      remarks: newInvoice.remarks || undefined,
      status: 'open',
    } as any, newInvoice.lines);
    setSaving(false);
    setEditingInvoiceId(null);
    setIsDialogOpen(false);
    toast({ title: language === 'ar' ? 'تم التحديث' : 'Invoice Updated' });
  };

  const { subtotal, taxAmount, total } = calculateTotals();
  const totalInvoices = invoices.length;
  const openInvoices = invoices.filter(i => i.status === 'open').length;
  const closedInvoices = invoices.filter(i => i.status === 'closed').length;
  const totalBalance = invoices.reduce((s, i) => s + (i.balance_due || 0), 0);

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            {language === 'ar' ? 'فواتير المبيعات' : 'A/R Invoices'}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {language === 'ar' ? 'إنشاء وإدارة فواتير المبيعات' : 'Create and manage A/R invoices'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SAPSyncButton entity="ar_invoice" />
          <ClearAllButton tableName="ar_invoices" displayName="AR Invoices" queryKeys={['arInvoices']} relatedTables={['ar_invoice_lines']} />
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingInvoiceId(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {language === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {editingInvoiceId
                    ? (language === 'ar' ? 'تعديل فاتورة مبيعات' : 'Edit A/R Invoice')
                    : (language === 'ar' ? 'فاتورة مبيعات جديدة' : 'New A/R Invoice')}
                </DialogTitle>
                <DialogDescription>
                  {language === 'ar' ? 'إنشاء فاتورة مبيعات جديدة بأسلوب SAP B1' : 'Create a new A/R invoice (SAP B1 style)'}
                </DialogDescription>
              </DialogHeader>

              {/* SAP B1 Style Header - Dual Column */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 p-3 md:p-4 border rounded-lg bg-muted/10 mb-3">
                {/* Left Column - Customer Info */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'العميل' : 'Customer'}</Label>
                    <CustomerSelector value={selectedCustomer} onChange={handleCustomerChange} required />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'الاسم' : 'Name'}</Label>
                    <Input value={newInvoice.customer_name} disabled className="h-8 text-sm bg-muted/20" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'مرجع العميل' : 'Customer Ref.'}</Label>
                    <Input value={newInvoice.num_at_card} onChange={(e) => setNewInvoice({ ...newInvoice, num_at_card: e.target.value })} placeholder={language === 'ar' ? 'رقم طلب الشراء' : 'PO Number'} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                    <Input value="SAR" disabled className="h-8 text-sm w-[120px] bg-muted/20" />
                  </div>
                </div>

                {/* Right Column - Document Info */}
                <div className="space-y-2">
                  <DocumentSeriesSelector
                    objectCode={SAP_OBJECT_CODES.ARInvoices}
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
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'تاريخ الترحيل' : 'Posting Date'}</Label>
                    <Input type="date" value={newInvoice.doc_date} onChange={(e) => setNewInvoice({ ...newInvoice, doc_date: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                    <Input type="date" value={newInvoice.doc_due_date} onChange={(e) => setNewInvoice({ ...newInvoice, doc_due_date: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'تاريخ المستند' : 'Document Date'}</Label>
                    <Input type="date" value={newInvoice.doc_date} disabled className="h-8 text-sm bg-muted/20" />
                  </div>
                </div>
              </div>

              {/* Project & Retention Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded-lg bg-orange-50/50 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Construction Project</Label>
                  <Select value={selectedCpmsProject || '__none__'} onValueChange={v => {
                    const pid = v === '__none__' ? '' : v;
                    setSelectedCpmsProject(pid);
                    if (pid) {
                      const proj = cpmsProjects.find((p: any) => p.id === pid);
                      if (proj?.client_name && !newInvoice.customer_name) {
                        setNewInvoice(prev => ({ ...prev, customer_name: proj.client_name }));
                      }
                    }
                  }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— No Project —</SelectItem>
                      {cpmsProjects.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.project_number || p.code} – {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Invoice Type</Label>
                  <Select value={invoiceType} onValueChange={setInvoiceType}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="progress_billing">Progress Billing</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="change_order">Change Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {['progress_billing', 'final'].includes(invoiceType) && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-orange-600">Retention %</Label>
                      <Input type="number" value={retentionPct} onChange={e => setRetentionPct(parseFloat(e.target.value) || 0)} className="h-8 text-sm border-orange-300" min={0} max={100} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-orange-600">Retention Amount</Label>
                      <div className="h-8 flex items-center text-sm font-mono text-orange-600 font-medium">
                        -{formatCurrency(calculateTotals().total * (retentionPct / 100))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="contents">{language === 'ar' ? 'المحتويات' : 'Contents'}</TabsTrigger>
                  <TabsTrigger value="logistics">{language === 'ar' ? 'اللوجستيات' : 'Logistics'}</TabsTrigger>
                  <TabsTrigger value="accounting">{language === 'ar' ? 'المحاسبة' : 'Accounting'}</TabsTrigger>
                  <TabsTrigger value="finance_effect" className="gap-1">
                    <BookOpen className="h-3 w-3" />
                    {language === 'ar' ? 'الأثر المالي' : 'Finance Effect'}
                  </TabsTrigger>
                </TabsList>

                {/* Contents Tab */}
                <TabsContent value="contents" className="space-y-3 mt-3">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="font-semibold text-sm">{language === 'ar' ? 'بنود الفاتورة' : 'Invoice Items'}</h3>
                    <div className="flex items-center gap-2">
                      <Button variant={showExternalSelector ? 'default' : 'outline'} size="sm" onClick={() => setShowExternalSelector(!showExternalSelector)} className="gap-1">
                        <Database className="h-4 w-4" />
                        {language === 'ar' ? 'قاعدة بيانات خارجية' : 'External DB'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleAddLine}>
                        <Plus className="h-4 w-4 mr-1" />
                        {language === 'ar' ? 'إضافة بند' : 'Add Item'}
                      </Button>
                    </div>
                  </div>

                  {showExternalSelector && (
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <ExternalItemSelector
                        selectedConnectionId={externalConnectionId}
                        onConnectionChange={(connId) => setExternalConnectionId(connId)}
                        onSelectItem={(item, connectionId, connectionName) => {
                          setExternalConnectionName(connectionName);
                          const newLineIndex = newInvoice.lines.length;
                          const newLine = {
                            line_num: newLineIndex + 1, item_id: '', item_code: item.item_code,
                            description: item.item_name || item.item_code, quantity: 1,
                            unit_price: item.unit_price || 0, discount_percent: 0, tax_percent: 15,
                            line_total: (item.unit_price || 0) * 1.15, warehouse: item.warehouse_code || '',
                          };
                          setNewInvoice(prev => ({ ...prev, lines: [...prev.lines, newLine] }));
                          setLineExternalDb(prev => ({ ...prev, [newLineIndex]: { connectionId, connectionName, maxQty: item.available_qty } }));
                          toast({ title: language === 'ar' ? 'تمت الإضافة' : 'Item Added', description: `${item.item_code} from ${connectionName} (Available: ${item.available_qty})` });
                        }}
                      />
                    </div>
                  )}

                   <div className="border rounded-lg overflow-x-auto">
                    <Table className="min-w-[900px] [&_th]:px-1.5 [&_td]:px-1.5">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30px]">#</TableHead>
                          <TableHead className="w-[110px]">{language === 'ar' ? 'رقم الصنف' : 'Item No.'}</TableHead>
                          <TableHead className="w-[130px]">{language === 'ar' ? 'وصف الصنف' : 'Item Description'}</TableHead>
                          <TableHead className="w-[60px]">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                          <TableHead className="w-[85px]">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                          <TableHead className="w-[50px]">{language === 'ar' ? 'ضريبة' : 'Tax'}</TableHead>
                          <TableHead className="w-[85px]">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                          <DimensionTableHeaders />
                          <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newInvoice.lines.map((line, index) => (
                          <TableRow key={index} className={lineExternalDb[index] ? 'bg-info/5' : ''}>
                            <TableCell>
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs">{line.line_num}</span>
                                {lineExternalDb[index] && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-info text-info">
                                    <Database className="h-2.5 w-2.5 mr-0.5" />
                                    {lineExternalDb[index].connectionName.substring(0, 6)}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <ItemCombobox value={line.item_code} onSelect={(selected) => {
                                if (selected) handleLineChange(index, 'item_code', selected.item_code);
                                else handleLineChange(index, 'item_code', '');
                              }} className="w-[110px]" />
                            </TableCell>
                            <TableCell>
                              <Input value={line.description} onChange={(e) => handleLineChange(index, 'description', e.target.value)} className="w-full min-w-0 h-7 text-xs" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={line.quantity} onChange={(e) => handleLineChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-[55px] h-7 text-xs" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={line.unit_price} onChange={(e) => handleLineChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-[80px] h-7 text-xs" />
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono">S15</span>
                            </TableCell>
                            <TableCell className="font-semibold text-xs whitespace-nowrap">{formatCurrency(line.line_total)}</TableCell>
                            <LineDimensionSelectors
                              dimensions={{ dim_employee_id: (line as any).dim_employee_id || null, dim_branch_id: (line as any).dim_branch_id || null, dim_business_line_id: (line as any).dim_business_line_id || null, dim_factory_id: (line as any).dim_factory_id || null }}
                              onChange={(dims) => {
                                const updatedLines = newInvoice.lines.map((l, i) => i === index ? { ...l, ...dims } : l);
                                setNewInvoice({ ...newInvoice, lines: updatedLines });
                              }}
                            />
                            <TableCell>
                              {newInvoice.lines.length > 1 && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveLine(index)}>
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

                {/* Logistics Tab */}
                <TabsContent value="logistics" className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">{language === 'ar' ? 'عنوان الشحن' : 'Shipping Address'}</h3>
                      <Textarea value={newInvoice.shipping_address} onChange={(e) => setNewInvoice({ ...newInvoice, shipping_address: e.target.value })} rows={3} />
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">{language === 'ar' ? 'عنوان الفوترة' : 'Billing Address'}</h3>
                      <Textarea value={newInvoice.billing_address} onChange={(e) => setNewInvoice({ ...newInvoice, billing_address: e.target.value })} rows={3} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'طريقة الشحن' : 'Shipping Method'}</Label>
                      <Select value={newInvoice.shipping_method || 'not_selected'} onValueChange={(v) => setNewInvoice({ ...newInvoice, shipping_method: v === 'not_selected' ? '' : v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_selected">{language === 'ar' ? 'اختر' : 'Select'}</SelectItem>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Express">Express</SelectItem>
                          <SelectItem value="Pickup">Customer Pickup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Accounting Tab */}
                <TabsContent value="accounting" className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</Label>
                      <Select value={newInvoice.payment_terms || 'not_selected'} onValueChange={(v) => setNewInvoice({ ...newInvoice, payment_terms: v === 'not_selected' ? '' : v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_selected">{language === 'ar' ? 'اختر' : 'Select'}</SelectItem>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 45">Net 45</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}</Label>
                      <Input type="number" value={newInvoice.doc_rate} onChange={(e) => setNewInvoice({ ...newInvoice, doc_rate: parseFloat(e.target.value) || 1 })} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{language === 'ar' ? 'ملاحظات' : 'Remarks'}</Label>
                    <Textarea value={newInvoice.remarks} onChange={(e) => setNewInvoice({ ...newInvoice, remarks: e.target.value })} placeholder={language === 'ar' ? 'ملاحظات إضافية' : 'Additional remarks'} rows={2} />
                  </div>
                </TabsContent>

                {/* Finance Effect Tab — JE Preview before saving */}
                <TabsContent value="finance_effect" className="mt-3">
                  <JEPreviewPanel
                    documentType="ar_invoice"
                    formData={{
                      total,
                      subtotal,
                      tax_amount: taxAmount,
                      currency: newInvoice.currency,
                      doc_date: newInvoice.doc_date,
                      doc_num: seriesNextNo || 'DRAFT',
                      customer_code: newInvoice.customer_code,
                      customer_name: newInvoice.customer_name,
                    }}
                    documentRef={seriesNextNo ? `INV-${seriesNextNo}` : 'DRAFT'}
                    postingDate={newInvoice.doc_date}
                    collapsible={false}
                  />
                </TabsContent>
              </Tabs>

              {/* SAP B1 Style Footer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t mt-3">
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'مندوب المبيعات' : 'Sales Employee'}</Label>
                    <Select>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={language === 'ar' ? '-بدون مندوب-' : '-No Sales Employee-'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_selected">{language === 'ar' ? '-بدون مندوب-' : '-No Sales Employee-'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">{language === 'ar' ? 'الإجمالي قبل الخصم' : 'Total Before Discount'}</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
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
                    <span className="font-mono">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold border-t pt-1.5">
                    <span className="text-xs">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="font-mono text-primary">{formatCurrency(total)}</span>
                  </div>
                  {['progress_billing', 'final'].includes(invoiceType) && (
                    <>
                      <div className="flex justify-between items-center text-orange-600 pt-1">
                        <span className="text-xs font-semibold flex items-center gap-1">
                          <Banknote className="h-3 w-3" />
                          {language === 'ar' ? 'الاستقطاع' : `Retention (${retentionPct}%)`}
                        </span>
                        <span className="font-mono font-semibold">-{formatCurrency(total * (retentionPct / 100))}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold border-t border-orange-300 pt-1.5 text-success">
                        <span className="text-xs">{language === 'ar' ? 'المبلغ المستحق' : 'Amount Due'}</span>
                        <span className="font-mono">{formatCurrency(total - total * (retentionPct / 100))}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <AccountingValidationPanel
                  documentType="ar_invoice"
                  getDocumentData={getARInvoiceSimInput}
                  compact
                />
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={editingInvoiceId ? handleUpdateInvoice : handleCreateInvoice} disabled={saving || acctValidating}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingInvoiceId
                    ? (language === 'ar' ? 'تحديث الفاتورة' : 'Update Invoice')
                    : (language === 'ar' ? 'إنشاء الفاتورة' : 'Create Invoice')}
                </Button>
              </DialogFooter>
              <PreviewJEModal open={acctShowPreview} onOpenChange={setAcctShowPreview} result={acctResult} isLoading={acctValidating} documentType="ar_invoice" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="enterprise-card p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-info/10 rounded-lg"><FileText className="h-4 w-4 md:h-5 md:w-5 text-info" /></div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices'}</p>
              <p className="text-lg md:text-xl font-bold">{totalInvoices}</p>
            </div>
          </div>
        </div>
        <div className="enterprise-card p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-warning/10 rounded-lg"><Clock className="h-4 w-4 md:h-5 md:w-5 text-warning" /></div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'مفتوحة' : 'Open'}</p>
              <p className="text-lg md:text-xl font-bold">{openInvoices}</p>
            </div>
          </div>
        </div>
        <div className="enterprise-card p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-success/10 rounded-lg"><CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-success" /></div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'مغلقة' : 'Closed'}</p>
              <p className="text-lg md:text-xl font-bold">{closedInvoices}</p>
            </div>
          </div>
        </div>
        <div className="enterprise-card p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-destructive/10 rounded-lg"><Banknote className="h-4 w-4 md:h-5 md:w-5 text-destructive" /></div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'الرصيد المستحق' : 'Total Balance'}</p>
              <p className="text-lg md:text-xl font-bold">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="enterprise-card">
        <div className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={language === 'ar' ? 'بحث في الفواتير...' : 'Search invoices...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {cpmsProjects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.project_number || p.code} – {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />{language === 'ar' ? 'تصدير' : 'Export'}</Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="enterprise-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'رقم المستند' : 'Doc #'}</TableHead>
                 <TableHead className="col-mobile-hidden">{language === 'ar' ? 'كود العميل' : 'Customer Code'}</TableHead>
                 <TableHead>{language === 'ar' ? 'اسم العميل' : 'Customer Name'}</TableHead>
                 <TableHead className="col-tablet-hidden">{language === 'ar' ? 'المشروع' : 'Project'}</TableHead>
                 <TableHead className="col-mobile-hidden">{language === 'ar' ? 'تاريخ الترحيل' : 'Posting Date'}</TableHead>
                 <TableHead className="col-tablet-hidden">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</TableHead>
                 <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                 <TableHead className="col-mobile-hidden">{language === 'ar' ? 'الرصيد المستحق' : 'Balance Due'}</TableHead>
                 <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                 <TableHead className="col-tablet-hidden">{language === 'ar' ? 'المزامنة' : 'Sync'}</TableHead>
                 <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}</TableCell></TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <DocumentContextMenu key={invoice.id} chain="crm" documentType="ar_invoice" documentId={invoice.id} documentNumber={String(invoice.doc_num)}>
                  <TableRow className="cursor-pointer">
                    <TableCell className="font-medium">{invoice.doc_num}</TableCell>
                     <TableCell className="col-mobile-hidden">{invoice.customer_code}</TableCell>
                     <TableCell>{invoice.customer_name}</TableCell>
                     <TableCell className="col-tablet-hidden">
                       {(invoice as any).cpms_project_id ? (() => {
                         const proj = cpmsProjects.find((p: any) => p.id === (invoice as any).cpms_project_id);
                         return proj ? <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">{proj.project_number || proj.code}</Badge> : '—';
                       })() : '—'}
                     </TableCell>
                     <TableCell className="col-mobile-hidden">{format(new Date(invoice.doc_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="col-tablet-hidden">{invoice.doc_due_date ? format(new Date(invoice.doc_due_date), 'MMM d, yyyy') : '-'}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell className="col-mobile-hidden font-medium">{formatCurrency(invoice.balance_due)}</TableCell>
                    <TableCell><Badge className={statusColors[invoice.status] || ''}>{invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}</Badge></TableCell>
                    <TableCell className="col-tablet-hidden">
                      <Badge variant="outline" className={`text-xs ${invoice.sync_status === 'synced' ? 'border-success text-success' : invoice.sync_status === 'error' ? 'border-destructive text-destructive' : 'border-muted-foreground text-muted-foreground'}`}>
                        {invoice.sync_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                            <Eye className="h-4 w-4 mr-2" />{language === 'ar' ? 'عرض' : 'View'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                            <Edit className="h-4 w-4 mr-2" />{language === 'ar' ? 'تعديل' : 'Edit'}
                          </DropdownMenuItem>
                          <DropdownMenuItem><Copy className="h-4 w-4 mr-2" />{language === 'ar' ? 'نسخ إلى' : 'Copy To'}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintInvoice(invoice)}>
                            <Printer className="h-4 w-4 mr-2" />{language === 'ar' ? 'طباعة' : 'Print'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            toast({ title: language === 'ar' ? 'جاري الإرسال...' : 'Sending...' });
                            supabase.functions.invoke('send-quote-email', { body: { quoteId: invoice.id, documentType: 'ar_invoice' } }).then(({ error }) => {
                              if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                              else toast({ title: language === 'ar' ? 'تم الإرسال' : 'Email Sent' });
                            });
                          }}>
                            <Mail className="h-4 w-4 mr-2" />{language === 'ar' ? 'إرسال بالبريد' : 'Send by Email'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedInvoiceForWhatsApp(invoice); setWhatsAppDialogOpen(true); }}>
                            <MessageCircle className="h-4 w-4 mr-2 text-success" />{language === 'ar' ? 'إرسال واتساب' : 'Send via WhatsApp'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            const prefill = encodeURIComponent(JSON.stringify({ customer_code: invoice.customer_code, customer_name: invoice.customer_name, customer_id: invoice.customer_id || '', total_amount: invoice.balance_due || invoice.total || 0, reference: `INV-${invoice.doc_num}` }));
                            window.location.href = `/incoming-payments?prefill=${prefill}`;
                          }}>
                            <Banknote className="h-4 w-4 mr-2" />{language === 'ar' ? '+ دفعة' : '+ Payment'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => invoice.id && syncInvoice('ar_invoice', 'to_sap', invoice.id)}><ArrowUp className="h-4 w-4 mr-2" />{language === 'ar' ? 'دفع إلى SAP' : 'Push to SAP'}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => invoice.id && syncInvoice('ar_invoice', 'from_sap', invoice.id)}><ArrowDown className="h-4 w-4 mr-2" />{language === 'ar' ? 'سحب من SAP' : 'Pull from SAP'}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setJePreviewInvoice(invoice)}>
                            <BookOpen className="h-4 w-4 mr-2 text-primary" />{language === 'ar' ? 'الأثر المالي' : 'Finance Effect'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => invoice.id && handleDeleteInvoice(invoice.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />{language === 'ar' ? 'حذف' : 'Delete'}
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

      {selectedInvoiceForWhatsApp && (
        <SendWhatsAppDialog open={whatsAppDialogOpen} onOpenChange={setWhatsAppDialogOpen} documentType="ar_invoice"
          documentId={selectedInvoiceForWhatsApp.id || ''} documentNumber={String(selectedInvoiceForWhatsApp.doc_num)}
          customerName={selectedInvoiceForWhatsApp.customer_name} total={selectedInvoiceForWhatsApp.total}
          sapDocEntry={selectedInvoiceForWhatsApp.sap_doc_entry} />
      )}

      {/* Finance Effect — JE Preview Dialog */}
      <Dialog open={!!jePreviewInvoice} onOpenChange={(open) => { if (!open) setJePreviewInvoice(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Finance Effect — AR Invoice #{jePreviewInvoice?.doc_num}
            </DialogTitle>
            <DialogDescription>
              Preview the journal entry that will be generated when this invoice is posted. You can edit lines before posting.
            </DialogDescription>
          </DialogHeader>
          {jePreviewInvoice?.id && (
            <JEPreviewPanel
              documentType="ar_invoice"
              documentId={jePreviewInvoice.id}
              documentRef={`INV-${jePreviewInvoice.doc_num}`}
              postingDate={jePreviewInvoice.doc_date}
              collapsible={false}
              onPosted={() => {
                setJePreviewInvoice(null);
                fetchInvoices();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={(open) => { if (!open) setViewingInvoice(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {language === 'ar' ? 'عرض الفاتورة' : 'View Invoice'} #{viewingInvoice?.doc_num}
            </DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold text-muted-foreground">{language === 'ar' ? 'العميل' : 'Customer'}:</span> {viewingInvoice.customer_name}</div>
                <div><span className="font-semibold text-muted-foreground">{language === 'ar' ? 'كود العميل' : 'Code'}:</span> {viewingInvoice.customer_code}</div>
                <div><span className="font-semibold text-muted-foreground">{language === 'ar' ? 'التاريخ' : 'Date'}:</span> {format(new Date(viewingInvoice.doc_date), 'dd/MM/yyyy')}</div>
                <div><span className="font-semibold text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}:</span> <Badge variant="outline">{viewingInvoice.status}</Badge></div>
                <div><span className="font-semibold text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}:</span> {new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(viewingInvoice.total || 0)}</div>
                <div><span className="font-semibold text-muted-foreground">{language === 'ar' ? 'الرصيد' : 'Balance'}:</span> {new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(viewingInvoice.balance_due || 0)}</div>
                {viewingInvoice.remarks && <div className="col-span-2"><span className="font-semibold text-muted-foreground">{language === 'ar' ? 'ملاحظات' : 'Remarks'}:</span> {viewingInvoice.remarks}</div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Invoice Dialog */}
      <Dialog open={!!printInvoice} onOpenChange={(open) => { if (!open) { setPrintInvoice(null); setPrintLines([]); } }}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{language === 'ar' ? 'معاينة الطباعة' : 'Print Preview'}</span>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" />
                {language === 'ar' ? 'طباعة' : 'Print'}
              </Button>
            </DialogTitle>
          </DialogHeader>
          {printInvoice && (
            <div className="border rounded-lg p-6 bg-white print:p-0 print:border-0" dir="rtl">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold">{language === 'ar' ? 'فاتورة مبيعات' : 'A/R Invoice'}</h2>
                <p className="text-sm text-muted-foreground">#{printInvoice.doc_num}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div><strong>{language === 'ar' ? 'العميل' : 'Customer'}:</strong> {printInvoice.customer_name}</div>
                <div><strong>{language === 'ar' ? 'كود العميل' : 'Code'}:</strong> {printInvoice.customer_code}</div>
                <div><strong>{language === 'ar' ? 'التاريخ' : 'Date'}:</strong> {format(new Date(printInvoice.doc_date), 'dd/MM/yyyy')}</div>
                <div><strong>{language === 'ar' ? 'الحالة' : 'Status'}:</strong> {printInvoice.status}</div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{language === 'ar' ? 'الصنف' : 'Item'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {printLines.map((line: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{line.line_num}</TableCell>
                      <TableCell>{line.item_code}</TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">{new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2 }).format(line.unit_price)}</TableCell>
                      <TableCell className="text-right">{new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2 }).format(line.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 border-t pt-3 text-sm space-y-1 text-left">
                <div className="flex justify-between"><span>{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}:</span><span>{new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2 }).format(printInvoice.subtotal || 0)}</span></div>
                <div className="flex justify-between"><span>{language === 'ar' ? 'الضريبة' : 'Tax'}:</span><span>{new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2 }).format(printInvoice.tax_amount || 0)}</span></div>
                <div className="flex justify-between font-bold text-base"><span>{language === 'ar' ? 'الإجمالي' : 'Total'}:</span><span>{new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2 }).format(printInvoice.total || 0)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
