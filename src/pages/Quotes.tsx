import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotes, useQuoteLines, type Quote, type QuoteLineInsert } from '@/hooks/useQuotes';
import { useOpportunities } from '@/hooks/useOpportunities';
import { QuoteConversionTracker } from '@/components/crm/QuoteConversionTracker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Search,
  Plus,
  Filter,
  Download,
  MoreVertical,
  FileText,
  Loader2,
  Trash2,
  Eye,
  Edit,
  Mail,
  Send,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  Copy,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SendWhatsAppDialog } from '@/components/whatsapp/SendWhatsAppDialog';
import { useToast } from '@/hooks/use-toast';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { LineDimensionSelectors } from '@/components/dimensions/LineDimensionSelectors';
import { CustomerSelector, SelectedCustomer } from '@/components/customers/CustomerSelector';
import { useQuery } from '@tanstack/react-query';
import { ItemCombobox, type ItemOption } from '@/components/items/ItemCombobox';
import { DocumentSeriesSelector, SAP_OBJECT_CODES } from '@/components/series/DocumentSeriesSelector';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const quoteColumns: ColumnDef[] = [
  { key: 'quote_number', header: 'Quote #' },
  { key: 'customer_code', header: 'Customer Code' },
  { key: 'customer_name', header: 'Customer Name' },
  { key: 'doc_date', header: 'Date' },
  { key: 'total', header: 'Total' },
  { key: 'status', header: 'Status' },
  { key: 'valid_until', header: 'Valid Until' },
];

const statusColors: Record<string, string> = {
  'draft': 'bg-muted text-muted-foreground',
  'sent': 'bg-info/10 text-info',
  'accepted': 'bg-success/10 text-success',
  'rejected': 'bg-destructive/10 text-destructive',
  'expired': 'bg-warning/10 text-warning',
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  'draft': { en: 'Draft', ar: 'مسودة' },
  'sent': { en: 'Sent', ar: 'مرسل' },
  'accepted': { en: 'Accepted', ar: 'مقبول' },
  'rejected': { en: 'Rejected', ar: 'مرفوض' },
  'expired': { en: 'Expired', ar: 'منتهي' },
};

interface LineItem {
  id: string;
  item_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  tax_code: string;
  uom_code: string;
  line_total: number;
  dim_employee_id: string | null;
  dim_branch_id: string | null;
  dim_business_line_id: string | null;
  dim_factory_id: string | null;
}

function useSalesEmployees() {
  const { t } = useLanguage();

  return useQuery({
    queryKey: ['sales-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_employees')
        .select('id, slp_code, slp_name, is_active')
        .eq('is_active', true)
        .order('slp_name');
      if (error) throw error;
      return data || [];
    },
  });
}

export default function Quotes() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sync: syncQuote } = useSAPSync();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const { quotes, isLoading, createQuote, updateQuote, deleteQuote } = useQuotes();
  const { opportunities } = useOpportunities();
  const { data: salesEmployees = [] } = useSalesEmployees();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [viewQuoteLines, setViewQuoteLines] = useState<any[]>([]);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [whatsAppQuote, setWhatsAppQuote] = useState<Quote | null>(null);
  
  // Check if we're creating from an opportunity
  const opportunityId = searchParams.get('opportunityId');
  const opportunityCompany = searchParams.get('company');
  const opportunityValue = searchParams.get('value');

  const today = new Date().toISOString().split('T')[0];
  
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);
  const [seriesNextNo, setSeriesNextNo] = useState<number | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [newQuote, setNewQuote] = useState({
    customer_code: '',
    customer_name: opportunityCompany || '',
    customer_phone: '',
    opportunity_id: opportunityId || '',
    valid_until: '',
    notes: '',
    contact_person: '',
    num_at_card: '',
    currency: 'SAR',
    posting_date: today,
    doc_date: today,
    sales_employee_code: '',
    payment_terms: '',
    shipping_address: '',
    billing_address: '',
    shipping_method: '',
  });
  
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: crypto.randomUUID(),
      item_code: '',
      description: '',
      quantity: 1,
      unit_price: opportunityValue ? parseFloat(opportunityValue) : 0,
      discount_percent: 0,
      tax_percent: 15,
      tax_code: 'S15',
      uom_code: '',
      line_total: 0,
      dim_employee_id: null,
      dim_branch_id: null,
      dim_business_line_id: null,
      dim_factory_id: null,
    },
  ]);

  // Auto-open create dialog if coming from opportunity
  useState(() => {
    if (opportunityId && opportunityCompany) {
      setIsCreateDialogOpen(true);
    }
  });

  const filteredQuotes = quotes.filter(
    (quote) =>
      quote.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.quote_number.toString().includes(searchQuery)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const calculateLineTotal = (line: LineItem) => {
    const subtotal = line.quantity * line.unit_price;
    const discount = subtotal * (line.discount_percent / 100);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (line.tax_percent / 100);
    return afterDiscount + tax;
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        updated.line_total = calculateLineTotal(updated);
        return updated;
      }
      return line;
    }));
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, {
      id: crypto.randomUUID(),
      item_code: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_percent: 15,
      tax_code: 'S15',
      uom_code: '',
      line_total: 0,
      dim_employee_id: null,
      dim_branch_id: null,
      dim_business_line_id: null,
      dim_factory_id: null,
    }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(line => line.id !== id));
    }
  };

  const quoteTotals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, line) => {
      return sum + (line.quantity * line.unit_price);
    }, 0);
    
    const discountAmount = lineItems.reduce((sum, line) => {
      return sum + (line.quantity * line.unit_price * line.discount_percent / 100);
    }, 0);
    
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = lineItems.reduce((sum, line) => {
      const lineSubtotal = line.quantity * line.unit_price;
      const lineDiscount = lineSubtotal * (line.discount_percent / 100);
      return sum + ((lineSubtotal - lineDiscount) * line.tax_percent / 100);
    }, 0);
    
    const total = taxableAmount + taxAmount;
    
    return { subtotal, discountAmount, taxAmount, total };
  }, [lineItems]);

  const handleCreateQuote = async () => {
    const customerName = selectedCustomer?.name || newQuote.customer_name;
    const customerCode = selectedCustomer?.code || newQuote.customer_code;
    const customerPhone = newQuote.customer_phone;
    
    if (!customerName) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى اختيار العميل' : 'Please select a customer',
        variant: 'destructive',
      });
      return;
    }
    
    if (!isEditMode && !customerPhone) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'رقم الجوال مطلوب' : 'Mobile number is required',
        variant: 'destructive',
      });
      return;
    }

    const quoteData = {
      customer_code: customerCode || `CUST-${Date.now()}`,
      customer_name: customerName,
      customer_id: selectedCustomer?.id || null,
      customer_phone: customerPhone || null,
      opportunity_id: newQuote.opportunity_id || null,
      status: 'draft' as string,
      valid_until: newQuote.valid_until || null,
      subtotal: quoteTotals.subtotal,
      discount_percent: 0,
      discount_amount: quoteTotals.discountAmount,
      tax_amount: quoteTotals.taxAmount,
      total: quoteTotals.total,
      notes: newQuote.notes || null,
      currency: newQuote.currency || 'SAR',
      created_by: user?.id || null,
      contact_person: newQuote.contact_person || null,
      num_at_card: newQuote.num_at_card || null,
      posting_date: newQuote.posting_date || null,
      doc_date: newQuote.doc_date || null,
      sales_employee_code: newQuote.sales_employee_code ? parseInt(newQuote.sales_employee_code) : null,
      payment_terms: newQuote.payment_terms || null,
      shipping_address: newQuote.shipping_address || null,
      billing_address: newQuote.billing_address || null,
      shipping_method: newQuote.shipping_method || null,
      series: selectedSeries || null,
    };

    let quoteId: string;

    if (isEditMode && editingQuoteId) {
      await updateQuote.mutateAsync({ id: editingQuoteId, ...quoteData });
      quoteId = editingQuoteId;

      // Delete existing lines then re-insert
      const { error: delError } = await supabase
        .from('quote_lines')
        .delete()
        .eq('quote_id', quoteId);
      if (delError) console.error('Error deleting old lines:', delError);
    } else {
      const result = await createQuote.mutateAsync(quoteData);
      quoteId = result.id;
    }

    // Save line items
    const validLines = lineItems.filter(l => l.item_code || l.description);
    if (validLines.length > 0) {
      const linesToInsert = validLines.map((line, idx) => ({
        quote_id: quoteId,
        line_num: idx + 1,
        item_code: line.item_code,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percent: line.discount_percent,
        tax_percent: line.tax_percent,
        line_total: calculateLineTotal(line),
        dim_employee_id: line.dim_employee_id,
        dim_branch_id: line.dim_branch_id,
        dim_business_line_id: line.dim_business_line_id,
        dim_factory_id: line.dim_factory_id,
      }));

      const { error: lineError } = await supabase
        .from('quote_lines')
        .insert(linesToInsert);

      if (lineError) {
        console.error('Error saving quote lines:', lineError);
        toast({
          title: language === 'ar' ? 'تحذير' : 'Warning',
          description: language === 'ar' ? 'تم حفظ العرض لكن فشل حفظ بعض البنود' : 'Quote saved but some line items failed to save',
          variant: 'destructive',
        });
      }
    }

    // Reset form
    resetForm();
    setIsCreateDialogOpen(false);
    
    // Clear URL params
    navigate('/quotes', { replace: true });
  };

  const resetForm = () => {
    setIsEditMode(false);
    setEditingQuoteId(null);
    setSelectedCustomer(null);
    setNewQuote({
      customer_code: '',
      customer_name: '',
      customer_phone: '',
      opportunity_id: '',
      valid_until: '',
      notes: '',
      contact_person: '',
      num_at_card: '',
      currency: 'SAR',
      posting_date: today,
      doc_date: today,
      sales_employee_code: '',
      payment_terms: '',
      shipping_address: '',
      billing_address: '',
      shipping_method: '',
    });
    setLineItems([{
      id: crypto.randomUUID(),
      item_code: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_percent: 15,
      tax_code: 'S15',
      uom_code: '',
      line_total: 0,
      dim_employee_id: null,
      dim_branch_id: null,
      dim_business_line_id: null,
      dim_factory_id: null,
    }]);
  };

  const handleEditQuote = async (quote: Quote) => {
    setIsEditMode(true);
    setEditingQuoteId(quote.id);
    setSelectedCustomer({
      id: quote.customer_id || null,
      code: quote.customer_code,
      name: quote.customer_name,
      phone: quote.customer_phone || '',
      type: 'business_partner',
    });
    setNewQuote({
      customer_code: quote.customer_code,
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone || '',
      opportunity_id: quote.opportunity_id || '',
      valid_until: quote.valid_until || '',
      notes: quote.notes || '',
      contact_person: quote.contact_person || '',
      num_at_card: quote.num_at_card || '',
      currency: quote.currency || 'SAR',
      posting_date: quote.posting_date || today,
      doc_date: quote.doc_date || today,
      sales_employee_code: quote.sales_employee_code?.toString() || '',
      payment_terms: quote.payment_terms || '',
      shipping_address: quote.shipping_address || '',
      billing_address: quote.billing_address || '',
      shipping_method: quote.shipping_method || '',
    });

    // Load existing line items
    const { data: existingLines } = await supabase
      .from('quote_lines')
      .select('*')
      .eq('quote_id', quote.id)
      .order('line_num');

    if (existingLines && existingLines.length > 0) {
      setLineItems(existingLines.map(l => ({
        id: l.id,
        item_code: l.item_code || '',
        description: l.description || '',
        quantity: l.quantity || 1,
        unit_price: l.unit_price || 0,
        discount_percent: l.discount_percent || 0,
        tax_percent: l.tax_percent || 15,
        tax_code: 'S15',
        uom_code: '',
        line_total: l.line_total || 0,
        dim_employee_id: l.dim_employee_id || null,
        dim_branch_id: l.dim_branch_id || null,
        dim_business_line_id: l.dim_business_line_id || null,
        dim_factory_id: l.dim_factory_id || null,
      })));
    }

    setIsCreateDialogOpen(true);
  };

  const handleViewQuote = async (quote: Quote) => {
    setSelectedQuote(quote);
    setIsViewDialogOpen(true);
    // Load line items for view
    const { data: lines } = await supabase
      .from('quote_lines')
      .select('*')
      .eq('quote_id', quote.id)
      .order('line_num');
    setViewQuoteLines(lines || []);
  };

  const handleUpdateStatus = async (quote: Quote, newStatus: string) => {
    await updateQuote.mutateAsync({
      id: quote.id,
      status: newStatus,
    });
  };

  const handleDeleteQuote = async (id: string) => {
    await deleteQuote.mutateAsync(id);
  };

  const handleSendQuoteEmail = async (quote: Quote) => {
    setSelectedQuote(quote);
    setIsSendingEmail(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        body: { quoteId: quote.id },
      });

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الإرسال' : 'Email Sent',
        description: language === 'ar' 
          ? 'تم إرسال عرض السعر إلى العميل بنجاح' 
          : 'Quote sent successfully to customer',
      });

      if (quote.status === 'draft') {
        await updateQuote.mutateAsync({ id: quote.id, status: 'sent' });
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message || (language === 'ar' ? 'فشل في إرسال البريد الإلكتروني' : 'Failed to send email'),
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
      setSelectedQuote(null);
    }
  };

  const handleCopyToSalesOrder = async (quote: Quote) => {
    // Load quote lines
    const { data: lines } = await supabase
      .from('quote_lines')
      .select('*')
      .eq('quote_id', quote.id)
      .order('line_num');

    // Auto-mark quote as accepted when converting to order
    if (quote.status !== 'accepted') {
      await updateQuote.mutateAsync({
        id: quote.id,
        status: 'accepted',
      });
    }

    navigate('/sales-orders', {
      state: {
        fromQuote: true,
        quoteData: {
          customer_code: quote.customer_code,
          customer_name: quote.customer_name,
          customer_id: quote.customer_id,
          customer_phone: quote.customer_phone,
          contact_person: quote.contact_person,
          sales_employee_code: quote.sales_employee_code,
          payment_terms: quote.payment_terms,
          shipping_address: quote.shipping_address,
          billing_address: quote.billing_address,
          notes: quote.notes,
          currency: quote.currency,
          base_quote_id: quote.id,
          base_quote_number: quote.quote_number,
          lines: (lines || []).map((l, idx) => ({
            lineNum: idx + 1,
            itemCode: l.item_code || '',
            itemName: l.description || '',
            quantity: l.quantity || 1,
            unitPrice: l.unit_price || 0,
            taxCode: 'VAT15',
            lineTotal: l.line_total || 0,
            dim_employee_id: l.dim_employee_id || null,
            dim_branch_id: l.dim_branch_id || null,
            dim_business_line_id: l.dim_business_line_id || null,
            dim_factory_id: l.dim_factory_id || null,
          })),
        },
      },
    });

    toast({
      title: language === 'ar' ? 'تحويل إلى أمر بيع' : 'Converted to Sales Order',
      description: language === 'ar' ? 'تم قبول العرض ونسخ البيانات إلى أمر بيع جديد' : 'Quote accepted and data copied to new sales order',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 page-enter">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'عروض الأسعار' : 'Sales Quotations'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إنشاء وإدارة عروض الأسعار' : 'Create and manage sales quotations'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SAPSyncButton entity="quote" />
          <ClearAllButton tableName="quotes" displayName="Quotes" queryKeys={['quotes']} relatedTables={['quote_lines']} />
          <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'عرض سعر جديد' : 'New Quotation'}
          </Button>
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

      {/* Tabs for Table and Analytics */}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">{language === 'ar' ? 'القائمة' : 'List'}</TabsTrigger>
          <TabsTrigger value="analytics">{language === 'ar' ? 'تحليلات التحويل' : 'Conversion Analytics'}</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4">
          <QuoteConversionTracker quotes={quotes} />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusLabels).slice(0, 4).map(([status, labels]) => {
          const count = quotes.filter(q => q.status === status).length;
          const total = quotes.filter(q => q.status === status).reduce((sum, q) => sum + q.total, 0);
          return (
            <div key={status} className="enterprise-card p-4">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? labels.ar : labels.en}</p>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(total)}</p>
            </div>
          );
        })}
      </div>

      {/* Quotes Table */}
      <div className="enterprise-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{language === 'ar' ? 'رقم العرض' : 'Quote #'}</th>
                <th>{language === 'ar' ? 'العميل' : 'Customer'}</th>
                <th>{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="col-mobile-hidden">{language === 'ar' ? 'تاريخ الإيداع' : 'Posting Date'}</th>
                <th>{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                <th className="col-mobile-hidden">{language === 'ar' ? 'صالح حتى' : 'Valid Until'}</th>
                <th className="col-tablet-hidden">{language === 'ar' ? 'المزامنة' : 'Sync'}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'لا توجد عروض أسعار' : 'No quotations found'}
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr key={quote.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Q-{quote.quote_number}</span>
                        {quote.sap_doc_entry && (
                          <Badge variant="outline" className="text-xs">SAP</Badge>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium">{quote.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{quote.customer_code}</p>
                      </div>
                    </td>
                    <td>
                      <Badge className={statusColors[quote.status] || statusColors['draft']}>
                        {language === 'ar' 
                          ? statusLabels[quote.status]?.ar || quote.status
                          : statusLabels[quote.status]?.en || quote.status
                        }
                      </Badge>
                    </td>
                    <td className="col-mobile-hidden">{quote.posting_date ? new Date(quote.posting_date).toLocaleDateString() : quote.doc_date ? new Date(quote.doc_date).toLocaleDateString() : '-'}</td>
                    <td className="font-semibold">{formatCurrency(quote.total)}</td>
                    <td className="col-mobile-hidden">
                      {quote.valid_until 
                        ? new Date(quote.valid_until).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    <td className="col-tablet-hidden">
                      <Badge variant="outline" className={`text-xs ${
                        quote.sync_status === 'synced' ? 'border-success text-success' :
                        quote.sync_status === 'error' ? 'border-destructive text-destructive' :
                        'border-muted-foreground text-muted-foreground'
                      }`}>
                        {quote.sync_status || 'pending'}
                      </Badge>
                    </td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewQuote(quote)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'عرض' : 'View'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditQuote(quote)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'تعديل' : 'Edit'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleSendQuoteEmail(quote)}
                            disabled={isSendingEmail}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'إرسال للعميل' : 'Send to Customer'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setWhatsAppQuote(quote);
                              setIsWhatsAppDialogOpen(true);
                            }}
                          >
                            <MessageCircle className="mr-2 h-4 w-4 text-success" />
                            {language === 'ar' ? 'إرسال واتساب' : 'Send via WhatsApp'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyToSalesOrder(quote)}>
                            <Copy className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'نسخ إلى أمر بيع' : 'Copy to Sales Order'}
                          </DropdownMenuItem>
                          {quote.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote, 'sent')}>
                              <Send className="mr-2 h-4 w-4" />
                              {language === 'ar' ? 'تحديد كمرسل' : 'Mark as Sent'}
                            </DropdownMenuItem>
                          )}
                          {quote.status === 'sent' && (
                            <>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(quote, 'accepted')}>
                                {language === 'ar' ? 'تحديد كمقبول' : 'Mark as Accepted'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(quote, 'rejected')}>
                                {language === 'ar' ? 'تحديد كمرفوض' : 'Mark as Rejected'}
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => syncQuote('quote', 'to_sap', quote.id)}>
                            <ArrowUp className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'دفع إلى SAP' : 'Push to SAP'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => syncQuote('quote', 'from_sap', quote.id)}>
                            <ArrowDown className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'سحب من SAP' : 'Pull from SAP'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteQuote(quote.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </TabsContent>
      </Tabs>

      {/* Create Quote Dialog - SAP B1 Style */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsCreateDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[1100px] max-h-[92vh] overflow-y-auto p-0">
          {/* SAP-style header bar */}
          <div className="bg-primary/5 border-b px-6 py-3">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {language === 'ar' ? (isEditMode ? 'عرض سعر - تعديل' : 'عرض سعر - إضافة') : (isEditMode ? 'Sales Quotation - Edit' : 'Sales Quotation - Add')}
            </DialogTitle>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* SAP B1 Header Section */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {/* Left Column */}
              <div className="space-y-2">
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-sm font-medium">{language === 'ar' ? 'العميل' : 'Customer'}</Label>
                  <CustomerSelector
                    value={selectedCustomer}
                    onChange={(customer) => {
                      setSelectedCustomer(customer);
                      if (customer) {
                        setNewQuote({
                          ...newQuote,
                          customer_name: customer.name,
                          customer_code: customer.code,
                          customer_phone: customer.phone,
                          billing_address: '',
                          shipping_address: '',
                        });
                      }
                    }}
                    required
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-sm">{language === 'ar' ? 'الاسم' : 'Name'}</Label>
                  <Input
                    value={selectedCustomer?.name || newQuote.customer_name}
                    className="h-8 bg-muted/30"
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-sm">{language === 'ar' ? 'جهة الاتصال' : 'Contact Person'}</Label>
                  <Input
                    value={newQuote.contact_person}
                    onChange={(e) => setNewQuote({ ...newQuote, contact_person: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-sm">{language === 'ar' ? 'مرجع العميل' : 'Customer Ref. No.'}</Label>
                  <Input
                    value={newQuote.num_at_card}
                    onChange={(e) => setNewQuote({ ...newQuote, num_at_card: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-sm">{language === 'ar' ? 'رقم الجوال' : 'Mobile No.'}</Label>
                  <Input
                    value={newQuote.customer_phone}
                    onChange={(e) => setNewQuote({ ...newQuote, customer_phone: e.target.value })}
                    placeholder="+966 5XX XXX XXXX"
                    className="h-8"
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-sm">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                  <Select
                    value={newQuote.currency}
                    onValueChange={(v) => setNewQuote({ ...newQuote, currency: v })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">SAR - Local Currency</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                <DocumentSeriesSelector
                  objectCode={SAP_OBJECT_CODES.SalesQuotations}
                  value={selectedSeries}
                  onChange={(s, n) => { setSelectedSeries(s); setSeriesNextNo(n); }}
                  compact
                  label={language === 'ar' ? 'السلسلة / رقم' : 'Series / No.'}
                />
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-sm">{language === 'ar' ? 'تاريخ الإيداع' : 'Posting Date'}</Label>
                  <Input
                    type="date"
                    value={newQuote.posting_date}
                    onChange={(e) => setNewQuote({ ...newQuote, posting_date: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-sm">{language === 'ar' ? 'صالح حتى' : 'Valid Until'}</Label>
                  <Input
                    type="date"
                    value={newQuote.valid_until}
                    onChange={(e) => setNewQuote({ ...newQuote, valid_until: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-sm">{language === 'ar' ? 'تاريخ المستند' : 'Document Date'}</Label>
                  <Input
                    type="date"
                    value={newQuote.doc_date}
                    onChange={(e) => setNewQuote({ ...newQuote, doc_date: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-sm">{language === 'ar' ? 'الفرصة' : 'Opportunity'}</Label>
                  <Select
                    value={newQuote.opportunity_id || "none"}
                    onValueChange={(value) => setNewQuote({ ...newQuote, opportunity_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder={language === 'ar' ? 'اختر فرصة' : 'Select opportunity'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {language === 'ar' ? 'بدون فرصة' : 'No opportunity'}
                      </SelectItem>
                      {opportunities.filter(opp => opp.id).map((opp) => (
                        <SelectItem key={opp.id} value={opp.id}>
                          {opp.name} - {opp.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SAP B1 Tabs */}
            <Tabs defaultValue="contents" className="mt-4">
              <TabsList className="w-auto border-b rounded-none bg-transparent p-0 gap-0">
                <TabsTrigger value="contents" className="rounded-t-md rounded-b-none border border-b-0 data-[state=active]:bg-background data-[state=active]:shadow-none px-6 py-1.5 text-sm">
                  {language === 'ar' ? 'المحتويات' : 'Contents'}
                </TabsTrigger>
                <TabsTrigger value="logistics" className="rounded-t-md rounded-b-none border border-b-0 data-[state=active]:bg-background data-[state=active]:shadow-none px-6 py-1.5 text-sm">
                  {language === 'ar' ? 'اللوجستيات' : 'Logistics'}
                </TabsTrigger>
                <TabsTrigger value="accounting" className="rounded-t-md rounded-b-none border border-b-0 data-[state=active]:bg-background data-[state=active]:shadow-none px-6 py-1.5 text-sm">
                  {language === 'ar' ? 'المحاسبة' : 'Accounting'}
                </TabsTrigger>
              </TabsList>

              {/* Contents Tab */}
              <TabsContent value="contents" className="mt-0 border rounded-b-md rounded-tr-md p-3">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'إضافة بند' : 'Add Line'}
                    </Button>
                  </div>

                  <div className="border rounded overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs">
                          <tr>
                            <th className="p-1.5 text-center w-8">#</th>
                            <th className="p-1.5 text-left min-w-[100px]">{language === 'ar' ? 'رقم الصنف' : 'Item No.'}</th>
                            <th className="p-1.5 text-left min-w-[200px]">{language === 'ar' ? 'وصف الصنف' : 'Item Description'}</th>
                            <th className="p-1.5 text-right w-20">{language === 'ar' ? 'الكمية' : 'Quantity'}</th>
                            <th className="p-1.5 text-right w-24">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th>
                            <th className="p-1.5 text-right w-20">{language === 'ar' ? 'خصم %' : 'Discount %'}</th>
                            <th className="p-1.5 text-center w-20">{language === 'ar' ? 'رمز الضريبة' : 'Tax Code'}</th>
                            <th className="p-1.5 text-right w-28">{language === 'ar' ? 'الإجمالي (م.م)' : 'Total (LC)'}</th>
                            <th className="p-1.5 text-center w-16">{language === 'ar' ? 'و.ق' : 'UoM'}</th>
                            <th className="p-1.5 text-center w-[100px]">Employee</th>
                            <th className="p-1.5 text-center w-[100px]">Branch</th>
                            <th className="p-1.5 text-center w-[100px]">Business Line</th>
                            <th className="p-1.5 text-center w-[100px]">Factory</th>
                            <th className="p-1.5 w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((line, index) => (
                            <tr key={line.id} className="border-t hover:bg-muted/20">
                              <td className="p-1 text-center text-xs text-muted-foreground">{index + 1}</td>
                              <td className="p-1">
                                <ItemCombobox
                                  value={line.item_code}
                                  onSelect={(item) => {
                                    if (item) {
                                      updateLineItem(line.id, 'item_code', item.item_code);
                                      updateLineItem(line.id, 'description', item.description);
                                      updateLineItem(line.id, 'unit_price', item.default_price || 0);
                                      if (item.uom) updateLineItem(line.id, 'uom_code', item.uom);
                                    } else {
                                      updateLineItem(line.id, 'item_code', '');
                                      updateLineItem(line.id, 'description', '');
                                    }
                                  }}
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  value={line.description}
                                  onChange={(e) => updateLineItem(line.id, 'description', e.target.value)}
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min="1"
                                  value={line.quantity}
                                  onChange={(e) => updateLineItem(line.id, 'quantity', parseFloat(e.target.value) || 1)}
                                  className="h-7 text-xs text-right"
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.unit_price}
                                  onChange={(e) => updateLineItem(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs text-right"
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={line.discount_percent}
                                  onChange={(e) => updateLineItem(line.id, 'discount_percent', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs text-right"
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  value={line.tax_code}
                                  onChange={(e) => updateLineItem(line.id, 'tax_code', e.target.value)}
                                  className="h-7 text-xs text-center"
                                />
                              </td>
                              <td className="p-1 text-right text-xs font-medium">
                                {formatCurrency(calculateLineTotal(line))}
                              </td>
                              <td className="p-1">
                                <Input
                                  value={line.uom_code}
                                  onChange={(e) => updateLineItem(line.id, 'uom_code', e.target.value)}
                                  className="h-7 text-xs text-center"
                                />
                              </td>
                              <LineDimensionSelectors
                                dimensions={{
                                  dim_employee_id: line.dim_employee_id,
                                  dim_branch_id: line.dim_branch_id,
                                  dim_business_line_id: line.dim_business_line_id,
                                  dim_factory_id: line.dim_factory_id,
                                }}
                                onChange={(dims) => {
                                  setLineItems(prev => prev.map(l => l.id === line.id ? { ...l, ...dims } : l));
                                }}
                              />
                              <td className="p-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeLineItem(line.id)}
                                  disabled={lineItems.length === 1}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Logistics Tab */}
              <TabsContent value="logistics" className="mt-0 border rounded-b-md rounded-tr-md p-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">{language === 'ar' ? 'عنوان الشحن' : 'Ship To'}</Label>
                      <Textarea
                        value={newQuote.shipping_address}
                        onChange={(e) => setNewQuote({ ...newQuote, shipping_address: e.target.value })}
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">{language === 'ar' ? 'طريقة الشحن' : 'Shipping Method'}</Label>
                      <Input
                        value={newQuote.shipping_method}
                        onChange={(e) => setNewQuote({ ...newQuote, shipping_method: e.target.value })}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">{language === 'ar' ? 'عنوان الفاتورة' : 'Bill To'}</Label>
                      <Textarea
                        value={newQuote.billing_address}
                        onChange={(e) => setNewQuote({ ...newQuote, billing_address: e.target.value })}
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Accounting Tab */}
              <TabsContent value="accounting" className="mt-0 border rounded-b-md rounded-tr-md p-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                      <Label className="text-sm">{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</Label>
                      <Input
                        value={newQuote.payment_terms}
                        onChange={(e) => setNewQuote({ ...newQuote, payment_terms: e.target.value })}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer: Sales Employee + Owner + Totals + Remarks */}
            <div className="grid grid-cols-2 gap-x-8 pt-2 border-t">
              {/* Left: Sales Employee, Owner, Remarks */}
              <div className="space-y-2">
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-sm">{language === 'ar' ? 'موظف المبيعات' : 'Sales Employee'}</Label>
                  <Select
                    value={newQuote.sales_employee_code || "none"}
                    onValueChange={(v) => setNewQuote({ ...newQuote, sales_employee_code: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder={language === 'ar' ? '- لا يوجد موظف مبيعات -' : '-No Sales Employee-'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {language === 'ar' ? '- لا يوجد موظف مبيعات -' : '-No Sales Employee-'}
                      </SelectItem>
                      {salesEmployees.map((se) => (
                        <SelectItem key={se.id} value={String(se.slp_code)}>
                          {se.slp_name} ({se.slp_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 pt-2">
                  <Label className="text-sm">{language === 'ar' ? 'ملاحظات' : 'Remarks'}</Label>
                  <Textarea
                    value={newQuote.notes}
                    onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Right: Totals */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_140px] items-center gap-2">
                  <Label className="text-sm text-right">{language === 'ar' ? 'الإجمالي قبل الخصم' : 'Total Before Discount'}</Label>
                  <Input value={formatCurrency(quoteTotals.subtotal)} className="h-8 text-right bg-muted/30" readOnly />
                </div>
                <div className="grid grid-cols-[1fr_60px_20px_60px] items-center gap-1">
                  <Label className="text-sm text-right">{language === 'ar' ? 'الخصم' : 'Discount'}</Label>
                  <Input value="0" className="h-8 text-right" readOnly />
                  <span className="text-center text-sm">%</span>
                  <Input value={formatCurrency(quoteTotals.discountAmount)} className="h-8 text-right bg-muted/30" readOnly />
                </div>
                <div className="grid grid-cols-[1fr_140px] items-center gap-2">
                  <Label className="text-sm text-right">{language === 'ar' ? 'الضريبة' : 'Tax'}</Label>
                  <Input value={formatCurrency(quoteTotals.taxAmount)} className="h-8 text-right bg-muted/30" readOnly />
                </div>
                <div className="grid grid-cols-[1fr_140px] items-center gap-2 pt-1 border-t">
                  <Label className="text-sm text-right font-bold">{language === 'ar' ? 'الإجمالي' : 'Total'}</Label>
                  <Input 
                    value={formatCurrency(quoteTotals.total)} 
                    className="h-8 text-right font-bold bg-muted/30" 
                    readOnly 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t px-6 py-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateQuote} disabled={createQuote.isPending || updateQuote.isPending}>
              {(createQuote.isPending || updateQuote.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Quote Dialog - SAP B1 Style */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
          <div className="bg-primary/5 border-b px-6 py-3">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {language === 'ar' ? 'عرض سعر' : 'Sales Quotation'} Q-{selectedQuote?.quote_number}
            </DialogTitle>
          </div>
          
          {selectedQuote && (
            <div className="px-6 py-4 space-y-4">
              {/* Header */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'العميل' : 'Customer'}</span>
                    <span className="text-sm font-medium">{selectedQuote.customer_code}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'الاسم' : 'Name'}</span>
                    <span className="text-sm font-medium">{selectedQuote.customer_name}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'جهة الاتصال' : 'Contact Person'}</span>
                    <span className="text-sm">{selectedQuote.contact_person || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'مرجع العميل' : 'Customer Ref. No.'}</span>
                    <span className="text-sm">{selectedQuote.num_at_card || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'العملة' : 'Currency'}</span>
                    <span className="text-sm">{selectedQuote.currency || 'SAR'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'رقم الجوال' : 'Mobile No.'}</span>
                    <span className="text-sm">{selectedQuote.customer_phone || '-'}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'الرقم' : 'No.'}</span>
                    <span className="text-sm font-medium">Q-{selectedQuote.quote_number}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</span>
                    <Badge className={statusColors[selectedQuote.status]}>
                      {language === 'ar' ? statusLabels[selectedQuote.status]?.ar : statusLabels[selectedQuote.status]?.en}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'تاريخ الإيداع' : 'Posting Date'}</span>
                    <span className="text-sm">{selectedQuote.posting_date ? new Date(selectedQuote.posting_date).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'صالح حتى' : 'Valid Until'}</span>
                    <span className="text-sm">{selectedQuote.valid_until ? new Date(selectedQuote.valid_until).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'تاريخ المستند' : 'Document Date'}</span>
                    <span className="text-sm">{selectedQuote.doc_date ? new Date(selectedQuote.doc_date).toLocaleDateString() : '-'}</span>
                  </div>
                  {selectedQuote.sap_doc_entry && (
                    <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                      <span className="text-sm text-muted-foreground">SAP DocEntry</span>
                      <Badge variant="outline">{selectedQuote.sap_doc_entry}</Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              {viewQuoteLines.length > 0 && (
                <div className="border rounded overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs">
                        <tr>
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2 text-left">{language === 'ar' ? 'رقم الصنف' : 'Item No.'}</th>
                          <th className="p-2 text-left">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                          <th className="p-2 text-right">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                          <th className="p-2 text-right">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th>
                          <th className="p-2 text-right">{language === 'ar' ? 'خصم %' : 'Disc %'}</th>
                          <th className="p-2 text-right">{language === 'ar' ? 'ضريبة %' : 'Tax %'}</th>
                          <th className="p-2 text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewQuoteLines.map((line: any, idx: number) => (
                          <tr key={line.id} className="border-t">
                            <td className="p-2 text-center text-muted-foreground">{idx + 1}</td>
                            <td className="p-2">{line.item_code || '-'}</td>
                            <td className="p-2">{line.description || '-'}</td>
                            <td className="p-2 text-right">{line.quantity}</td>
                            <td className="p-2 text-right">{formatCurrency(line.unit_price)}</td>
                            <td className="p-2 text-right">{line.discount_percent || 0}%</td>
                            <td className="p-2 text-right">{line.tax_percent || 0}%</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(line.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewQuoteLines.length === 0 && (
                <div className="border rounded p-4 text-center text-muted-foreground text-sm">
                  {language === 'ar' ? 'لا توجد بنود' : 'No line items'}
                </div>
              )}

              {/* Totals */}
              <div className="border-t pt-3 flex justify-end">
                <div className="w-72 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'ar' ? 'الإجمالي قبل الخصم' : 'Total Before Discount'}:</span>
                    <span>{formatCurrency(selectedQuote.subtotal)}</span>
                  </div>
                  {selectedQuote.discount_amount && selectedQuote.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === 'ar' ? 'الخصم' : 'Discount'}:</span>
                      <span className="text-destructive">-{formatCurrency(selectedQuote.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'ar' ? 'الضريبة' : 'Tax'}:</span>
                    <span>{formatCurrency(selectedQuote.tax_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-1.5">
                    <span>{language === 'ar' ? 'الإجمالي' : 'Total'}:</span>
                    <span className="text-primary">{formatCurrency(selectedQuote.total)}</span>
                  </div>
                </div>
              </div>

              {/* Sales Employee & Remarks */}
              <div className="grid grid-cols-2 gap-x-8 border-t pt-3">
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'موظف المبيعات' : 'Sales Employee'}</span>
                    <span className="text-sm">
                      {selectedQuote.sales_employee_code
                        ? salesEmployees.find(se => se.slp_code === selectedQuote.sales_employee_code)?.slp_name || `Code: ${selectedQuote.sales_employee_code}`
                        : '-'
                      }
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</span>
                    <span className="text-sm">{selectedQuote.payment_terms || '-'}</span>
                  </div>
                </div>
                <div>
                  {selectedQuote.notes && (
                    <div>
                      <span className="text-sm text-muted-foreground">{language === 'ar' ? 'ملاحظات' : 'Remarks'}</span>
                      <p className="text-sm mt-1">{selectedQuote.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="border-t px-6 py-3 flex justify-end">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Send Dialog */}
      {whatsAppQuote && (
        <SendWhatsAppDialog
          open={isWhatsAppDialogOpen}
          onOpenChange={(open) => {
            setIsWhatsAppDialogOpen(open);
            if (!open) setWhatsAppQuote(null);
          }}
          documentType="quote"
          documentId={whatsAppQuote.id}
          documentNumber={whatsAppQuote.quote_number.toString()}
          customerName={whatsAppQuote.customer_name}
          total={whatsAppQuote.total}
          sapDocEntry={null}
        />
      )}
    </div>
  );
}
