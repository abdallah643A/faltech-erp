import { useState, useCallback } from 'react';
import { AccountingValidationPanel } from '@/components/accounting/AccountingValidationPanel';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Search, Plus, Filter, Download, MoreVertical, FileText, Trash2, Printer,
  Eye, Loader2, Mail, MessageCircle, Banknote, ArrowUp, ArrowDown,
  Clock, CheckCircle, FileX,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { SendWhatsAppDialog } from '@/components/whatsapp/SendWhatsAppDialog';
import { CustomerSelector, SelectedCustomer } from '@/components/customers/CustomerSelector';
import { ItemCombobox } from '@/components/items/ItemCombobox';
import { DocumentSeriesSelector } from '@/components/series/DocumentSeriesSelector';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const cmColumns: ColumnDef[] = [
  { key: 'doc_num', header: 'Doc #' },
  { key: 'customer_code', header: 'Customer Code' },
  { key: 'customer_name', header: 'Customer Name' },
  { key: 'doc_date', header: 'Date' },
  { key: 'total', header: 'Total' },
  { key: 'status', header: 'Status' },
];

const statusColors: Record<string, string> = {
  open: 'bg-info/10 text-info',
  closed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

interface CreditMemoLine {
  line_num: number; item_code: string; item_description: string; quantity: number;
  unit_price: number; discount_percent: number; tax_code: string; tax_percent: number;
  line_total: number; warehouse: string; unit: string;
}

export default function ARCreditMemos() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { sync: syncMemo } = useSAPSync();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('contents');
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);
  const [seriesNextNo, setSeriesNextNo] = useState<number | null>(null);
  const [whatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
  const [selectedMemoForWhatsApp, setSelectedMemoForWhatsApp] = useState<any>(null);

  const [newMemo, setNewMemo] = useState({
    customer_id: '', customer_code: '', customer_name: '',
    doc_date: new Date().toISOString().split('T')[0],
    posting_date: new Date().toISOString().split('T')[0],
    reference_invoice: '', reason_code: '', contact_person: '',
    remarks: '', currency: 'SAR',
    lines: [{
      line_num: 1, item_code: '', item_description: '', quantity: 1,
      unit_price: 0, discount_percent: 0, tax_code: 'VAT15', tax_percent: 15,
      line_total: 0, warehouse: '', unit: '',
    }] as CreditMemoLine[],
  });

  const { data: memos = [], isLoading } = useQuery({
    queryKey: ['arCreditMemos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ar_credit_memos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items-for-cm'],
    queryFn: async () => {
      const { data } = await supabase.from('items').select('id, item_code, description, default_price, warehouse');
      return data || [];
    },
  });

  const filtered = memos.filter(m =>
    String(m.doc_num).includes(searchQuery) ||
    m.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.customer_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMemos = memos.length;
  const openMemos = memos.filter(m => m.status === 'open').length;
  const closedMemos = memos.filter(m => m.status === 'closed').length;
  const totalAmount = memos.reduce((s, m) => s + Number(m.total || 0), 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(value);

  const handleCustomerChange = (customer: SelectedCustomer | null) => {
    setSelectedCustomer(customer);
    if (customer) setNewMemo(prev => ({ ...prev, customer_id: customer.id || '', customer_code: customer.code, customer_name: customer.name }));
    else setNewMemo(prev => ({ ...prev, customer_id: '', customer_code: '', customer_name: '' }));
  };

  const calculateTotals = () => {
    const subtotal = newMemo.lines.reduce((sum, line) => sum + line.quantity * line.unit_price * (1 - line.discount_percent / 100), 0);
    const taxAmount = subtotal * 0.15;
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const handleAddLine = () => {
    setNewMemo(prev => ({
      ...prev, lines: [...prev.lines, {
        line_num: prev.lines.length + 1, item_code: '', item_description: '', quantity: 1,
        unit_price: 0, discount_percent: 0, tax_code: 'VAT15', tax_percent: 15,
        line_total: 0, warehouse: '', unit: '',
      }],
    }));
  };

  const handleRemoveLine = (index: number) => {
    setNewMemo(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index).map((l, i) => ({ ...l, line_num: i + 1 })) }));
  };

  const handleLineChange = (index: number, field: string, value: string | number) => {
    setNewMemo(prev => ({
      ...prev, lines: prev.lines.map((line, i) => {
        if (i !== index) return line;
        const updated = { ...line, [field]: value };
        if (field === 'item_code') {
          const found = items.find(it => it.item_code === value);
          if (found) { updated.item_description = found.description; updated.unit_price = found.default_price || 0; updated.warehouse = found.warehouse || ''; }
        }
        updated.line_total = updated.quantity * updated.unit_price * (1 - updated.discount_percent / 100) * (1 + updated.tax_percent / 100);
        return updated;
      }),
    }));
  };

  const handleCreateMemo = async () => {
    if (!newMemo.customer_code || !newMemo.lines[0]?.item_code) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { subtotal, taxAmount, total } = calculateTotals();

    // Accounting pre-validation
    try {
      const { validateAccounting } = await import('@/services/accountingValidator');
      const res = await validateAccounting({ document_type: 'credit_memo', total, subtotal, tax_amount: taxAmount, conditions: { customer: newMemo.customer_code } });
      if (!res.canProceed) {
        toast({ title: 'Accounting Error', description: res.issues.find(i => i.type === 'error')?.message || 'Validation failed', variant: 'destructive' });
        setSaving(false); return;
      }
    } catch { /* proceed */ }

    try {
      const { data: maxDoc } = await supabase.from('ar_credit_memos').select('doc_num').order('doc_num', { ascending: false }).limit(1);
      const nextDocNum = (maxDoc?.[0]?.doc_num || 0) + 1;
      const { data: memoData, error: memoError } = await supabase.from('ar_credit_memos').insert({
        doc_num: nextDocNum, doc_date: newMemo.doc_date, posting_date: newMemo.posting_date,
        customer_id: newMemo.customer_id || null, customer_code: newMemo.customer_code,
        customer_name: newMemo.customer_name, contact_person: newMemo.contact_person || null,
        reference_invoice: newMemo.reference_invoice || null, reason_code: newMemo.reason_code || null,
        currency: newMemo.currency, subtotal, discount_percent: 0, discount_amount: 0,
        tax_amount: taxAmount, total, remarks: newMemo.remarks || null,
        series: selectedSeries || null, status: 'open', created_by: user?.id,
      }).select().single();
      if (memoError) throw memoError;

      if (newMemo.lines.length > 0) {
        const linesData = newMemo.lines.map(l => ({
          credit_memo_id: memoData.id, line_num: l.line_num, item_code: l.item_code,
          item_description: l.item_description, quantity: l.quantity, unit_price: l.unit_price,
          discount_percent: l.discount_percent, tax_code: l.tax_code || null,
          tax_percent: l.tax_percent, line_total: l.line_total, warehouse: l.warehouse || null, unit: l.unit || null,
        }));
        const { error: linesError } = await supabase.from('ar_credit_memo_lines').insert(linesData);
        if (linesError) throw linesError;
      }
      toast({ title: 'Credit Memo Created', description: `CM-${nextDocNum} created successfully` });
      queryClient.invalidateQueries({ queryKey: ['arCreditMemos'] });
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDeleteMemo = async (id: string) => {
    try {
      await supabase.from('ar_credit_memo_lines').delete().eq('credit_memo_id', id);
      const { error } = await supabase.from('ar_credit_memos').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['arCreditMemos'] });
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  const resetForm = () => {
  const { t } = useLanguage();

    setNewMemo({
      customer_id: '', customer_code: '', customer_name: '',
      doc_date: new Date().toISOString().split('T')[0], posting_date: new Date().toISOString().split('T')[0],
      reference_invoice: '', reason_code: '', contact_person: '', remarks: '', currency: 'SAR',
      lines: [{ line_num: 1, item_code: '', item_description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_code: 'VAT15', tax_percent: 15, line_total: 0, warehouse: '', unit: '' }],
    });
    setSelectedCustomer(null);
    setSelectedSeries(null);
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{language === 'ar' ? 'إشعارات دائنة' : 'A/R Credit Memos'}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'إشعارات دائنة للعملاء - عكس فواتير المبيعات' : 'Customer credit memos — reverses A/R invoices'}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={filtered} columns={cmColumns} filename="ar-credit-memos" title="A/R Credit Memos" />
          <SAPSyncButton entity="ar_invoice" />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />{language === 'ar' ? 'إشعار دائن جديد' : 'New Credit Memo'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileX className="h-5 w-5" />
                  {language === 'ar' ? 'إشعار دائن جديد' : 'New A/R Credit Memo'}
                </DialogTitle>
                <DialogDescription>{language === 'ar' ? 'إنشاء إشعار دائن جديد بأسلوب SAP B1' : 'Create a new A/R credit memo (SAP B1 style)'}</DialogDescription>
              </DialogHeader>

              {/* SAP B1 Style Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 p-3 md:p-4 border rounded-lg bg-muted/10 mb-3">
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'العميل' : 'Customer'}</Label>
                    <CustomerSelector value={selectedCustomer} onChange={handleCustomerChange} required />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'الاسم' : 'Name'}</Label>
                    <Input value={newMemo.customer_name} disabled className="h-8 text-sm bg-muted/20" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'جهة الاتصال' : 'Contact Person'}</Label>
                    <Input value={newMemo.contact_person} onChange={(e) => setNewMemo(prev => ({ ...prev, contact_person: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'فاتورة مرجعية' : 'Ref. Invoice'}</Label>
                    <Input value={newMemo.reference_invoice} onChange={(e) => setNewMemo(prev => ({ ...prev, reference_invoice: e.target.value }))} placeholder={language === 'ar' ? 'رقم الفاتورة' : 'Invoice number'} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                    <Input value="SAR" disabled className="h-8 text-sm w-[120px] bg-muted/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <DocumentSeriesSelector objectCode={'14'} value={selectedSeries} onChange={(s, n) => { setSelectedSeries(s); setSeriesNextNo(n); }} compact label={language === 'ar' ? 'السلسلة / رقم' : 'Series / No.'} />
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                    <Input value="Open" disabled className="h-8 text-sm bg-muted/20" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'تاريخ الترحيل' : 'Posting Date'}</Label>
                    <Input type="date" value={newMemo.doc_date} onChange={(e) => setNewMemo(prev => ({ ...prev, doc_date: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'تاريخ المستند' : 'Document Date'}</Label>
                    <Input type="date" value={newMemo.posting_date} onChange={(e) => setNewMemo(prev => ({ ...prev, posting_date: e.target.value }))} className="h-8 text-sm" />
                  </div>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="contents">{language === 'ar' ? 'المحتويات' : 'Contents'}</TabsTrigger>
                  <TabsTrigger value="reason">{language === 'ar' ? 'السبب' : 'Reason'}</TabsTrigger>
                  <TabsTrigger value="accounting">{language === 'ar' ? 'المحاسبة' : 'Accounting'}</TabsTrigger>
                </TabsList>

                <TabsContent value="contents" className="space-y-3 mt-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">{language === 'ar' ? 'بنود الإشعار' : 'Credit Memo Items'}</h3>
                    <Button variant="outline" size="sm" onClick={handleAddLine}>
                      <Plus className="h-4 w-4 mr-1" />{language === 'ar' ? 'إضافة بند' : 'Add Item'}
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
                          <TableHead className="w-[50px]">{language === 'ar' ? 'ضريبة' : 'Tax'}</TableHead>
                          <TableHead className="w-[85px]">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                          <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newMemo.lines.map((line, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-xs">{line.line_num}</TableCell>
                            <TableCell>
                              <ItemCombobox value={line.item_code} onSelect={(selected) => {
                                if (selected) handleLineChange(index, 'item_code', selected.item_code);
                                else handleLineChange(index, 'item_code', '');
                              }} className="w-[110px]" />
                            </TableCell>
                            <TableCell><Input value={line.item_description} onChange={(e) => handleLineChange(index, 'item_description', e.target.value)} className="w-full min-w-0 h-7 text-xs" /></TableCell>
                            <TableCell><Input type="number" value={line.quantity} onChange={(e) => handleLineChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-[55px] h-7 text-xs" /></TableCell>
                            <TableCell><Input type="number" value={line.unit_price} onChange={(e) => handleLineChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-[80px] h-7 text-xs" /></TableCell>
                            <TableCell><span className="text-xs font-mono">S15</span></TableCell>
                            <TableCell className="font-semibold text-xs whitespace-nowrap">{formatCurrency(line.line_total)}</TableCell>
                            <TableCell>
                              {newMemo.lines.length > 1 && (
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

                <TabsContent value="reason" className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'رمز السبب' : 'Reason Code'}</Label>
                      <Select value={newMemo.reason_code || 'not_selected'} onValueChange={(v) => setNewMemo(prev => ({ ...prev, reason_code: v === 'not_selected' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select reason'} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_selected">{language === 'ar' ? 'اختر' : 'Select'}</SelectItem>
                          <SelectItem value="defective">{language === 'ar' ? 'منتج معيب' : 'Defective Product'}</SelectItem>
                          <SelectItem value="wrong_item">{language === 'ar' ? 'صنف خاطئ' : 'Wrong Item Shipped'}</SelectItem>
                          <SelectItem value="overcharge">{language === 'ar' ? 'زيادة في السعر' : 'Overcharge'}</SelectItem>
                          <SelectItem value="return">{language === 'ar' ? 'مرتجع' : 'Return'}</SelectItem>
                          <SelectItem value="discount">{language === 'ar' ? 'خصم لاحق' : 'Post-sale Discount'}</SelectItem>
                          <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{language === 'ar' ? 'ملاحظات' : 'Remarks'}</Label>
                    <Textarea value={newMemo.remarks} onChange={(e) => setNewMemo(prev => ({ ...prev, remarks: e.target.value }))} placeholder={language === 'ar' ? 'سبب الإشعار الدائن' : 'Reason for credit memo'} rows={3} />
                  </div>
                </TabsContent>

                <TabsContent value="accounting" className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                      <Input value={newMemo.currency} disabled className="h-8 text-sm bg-muted/20" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* SAP B1 Style Footer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t mt-3">
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'مندوب المبيعات' : 'Sales Employee'}</Label>
                    <Select>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={language === 'ar' ? '-بدون مندوب-' : '-No Sales Employee-'} /></SelectTrigger>
                      <SelectContent><SelectItem value="not_selected">{language === 'ar' ? '-بدون مندوب-' : '-No Sales Employee-'}</SelectItem></SelectContent>
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
                </div>
              </div>

              <div className="mt-2">
                <AccountingValidationPanel
                  documentType="credit_memo"
                  getDocumentData={() => { const { subtotal, taxAmount, total } = calculateTotals(); return { document_type: 'credit_memo', total, subtotal, tax_amount: taxAmount, conditions: { customer: newMemo.customer_code } }; }}
                  compact
                />
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
                <Button onClick={handleCreateMemo} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {language === 'ar' ? 'إنشاء الإشعار' : 'Create Credit Memo'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="enterprise-card p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-info/10 rounded-lg"><FileX className="h-4 w-4 md:h-5 md:w-5 text-info" /></div>
            <div><p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الإشعارات' : 'Total Memos'}</p><p className="text-lg md:text-xl font-bold">{totalMemos}</p></div>
          </div>
        </div>
        <div className="enterprise-card p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-warning/10 rounded-lg"><Clock className="h-4 w-4 md:h-5 md:w-5 text-warning" /></div>
            <div><p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'مفتوحة' : 'Open'}</p><p className="text-lg md:text-xl font-bold">{openMemos}</p></div>
          </div>
        </div>
        <div className="enterprise-card p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-success/10 rounded-lg"><CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-success" /></div>
            <div><p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'مغلقة' : 'Closed'}</p><p className="text-lg md:text-xl font-bold">{closedMemos}</p></div>
          </div>
        </div>
        <div className="enterprise-card p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-destructive/10 rounded-lg"><Banknote className="h-4 w-4 md:h-5 md:w-5 text-destructive" /></div>
            <div><p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}</p><p className="text-lg md:text-xl font-bold">{formatCurrency(totalAmount)}</p></div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="enterprise-card">
        <div className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={language === 'ar' ? 'بحث في الإشعارات...' : 'Search credit memos...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" />{language === 'ar' ? 'تصفية' : 'Filter'}</Button>
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
                <TableHead className="col-mobile-hidden">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead className="col-tablet-hidden">{language === 'ar' ? 'فاتورة مرجعية' : 'Ref Invoice'}</TableHead>
                <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="col-tablet-hidden">{language === 'ar' ? 'المزامنة' : 'Sync'}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد إشعارات دائنة' : 'No credit memos found'}</TableCell></TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium font-mono">CM-{m.doc_num}</TableCell>
                    <TableCell className="col-mobile-hidden">{m.customer_code}</TableCell>
                    <TableCell><p className="font-medium">{m.customer_name}</p></TableCell>
                    <TableCell className="col-mobile-hidden">{format(new Date(m.doc_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="col-tablet-hidden">{m.reference_invoice || '-'}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(m.total || 0))}</TableCell>
                    <TableCell><Badge className={statusColors[m.status || ''] || ''}>{(m.status || 'open').charAt(0).toUpperCase() + (m.status || 'open').slice(1)}</Badge></TableCell>
                    <TableCell className="col-tablet-hidden">
                      <Badge variant="outline" className={`text-xs ${m.sync_status === 'synced' ? 'border-success text-success' : m.sync_status === 'error' ? 'border-destructive text-destructive' : 'border-muted-foreground text-muted-foreground'}`}>
                        {m.sync_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />{language === 'ar' ? 'عرض' : 'View'}</DropdownMenuItem>
                          <DropdownMenuItem><Printer className="h-4 w-4 mr-2" />{language === 'ar' ? 'طباعة' : 'Print'}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            toast({ title: language === 'ar' ? 'جاري الإرسال...' : 'Sending...' });
                            supabase.functions.invoke('send-quote-email', { body: { quoteId: m.id, documentType: 'ar_credit_memo' } }).then(({ error }) => {
                              if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                              else toast({ title: language === 'ar' ? 'تم الإرسال' : 'Email Sent' });
                            });
                          }}>
                            <Mail className="h-4 w-4 mr-2" />{language === 'ar' ? 'إرسال بالبريد' : 'Send by Email'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedMemoForWhatsApp(m); setWhatsAppDialogOpen(true); }}>
                            <MessageCircle className="h-4 w-4 mr-2 text-success" />{language === 'ar' ? 'إرسال واتساب' : 'Send via WhatsApp'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => syncMemo('ar_invoice' as any, 'to_sap', m.id)}><ArrowUp className="h-4 w-4 mr-2" />{language === 'ar' ? 'دفع إلى SAP' : 'Push to SAP'}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => syncMemo('ar_invoice' as any, 'from_sap', m.id)}><ArrowDown className="h-4 w-4 mr-2" />{language === 'ar' ? 'سحب من SAP' : 'Pull from SAP'}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMemo(m.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />{language === 'ar' ? 'حذف' : 'Delete'}
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

      {selectedMemoForWhatsApp && (
        <SendWhatsAppDialog open={whatsAppDialogOpen} onOpenChange={setWhatsAppDialogOpen} documentType="ar_invoice"
          documentId={selectedMemoForWhatsApp.id} documentNumber={String(selectedMemoForWhatsApp.doc_num)}
          customerName={selectedMemoForWhatsApp.customer_name} total={Number(selectedMemoForWhatsApp.total || 0)}
          sapDocEntry={selectedMemoForWhatsApp.sap_doc_entry} />
      )}
    </div>
  );
}
