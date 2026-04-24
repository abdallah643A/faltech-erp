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
  Search, Plus, Filter, Download, MoreVertical, Trash2, Printer,
  Eye, Loader2, Mail, MessageCircle, ArrowUp, ArrowDown,
  Clock, CheckCircle, RotateCcw, Banknote,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { CustomerSelector, SelectedCustomer } from '@/components/customers/CustomerSelector';
import { ItemCombobox } from '@/components/items/ItemCombobox';
import { DocumentSeriesSelector } from '@/components/series/DocumentSeriesSelector';
import { SyncStatusBadge } from '@/components/sap/SyncStatusBadge';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const retColumns: ColumnDef[] = [
  { key: 'doc_num', header: 'Doc #' },
  { key: 'customer_code', header: 'Customer Code' },
  { key: 'customer_name', header: 'Customer Name' },
  { key: 'doc_date', header: 'Date' },
  { key: 'total', header: 'Total' },
  { key: 'return_reason', header: 'Reason' },
  { key: 'status', header: 'Status' },
];

const statusColors: Record<string, string> = {
  open: 'bg-info/10 text-info',
  closed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

interface ReturnLine {
  line_num: number; item_code: string; item_description: string; quantity: number;
  unit_price: number; tax_code: string; line_total: number; warehouse: string;
  serial_batch_no: string; unit: string;
}

export default function ARReturns() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { sync: syncReturn } = useSAPSync();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('contents');
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);
  const [seriesNextNo, setSeriesNextNo] = useState<number | null>(null);

  const [newReturn, setNewReturn] = useState({
    customer_id: '', customer_code: '', customer_name: '',
    doc_date: new Date().toISOString().split('T')[0],
    posting_date: new Date().toISOString().split('T')[0],
    reference_delivery: '', return_reason: '', remarks: '', currency: 'SAR',
    lines: [{
      line_num: 1, item_code: '', item_description: '', quantity: 1,
      unit_price: 0, tax_code: 'VAT15', line_total: 0, warehouse: '',
      serial_batch_no: '', unit: '',
    }] as ReturnLine[],
  });

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['arReturns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ar_returns').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items-for-ret'],
    queryFn: async () => {
      const { data } = await supabase.from('items').select('id, item_code, description, default_price, warehouse');
      return data || [];
    },
  });

  const filtered = returns.filter(r =>
    String(r.doc_num).includes(searchQuery) ||
    r.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalReturns = returns.length;
  const openReturns = returns.filter(r => r.status === 'open').length;
  const closedReturns = returns.filter(r => r.status === 'closed').length;
  const totalAmount = returns.reduce((s, r) => s + Number(r.total || 0), 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(value);

  const handleCustomerChange = (customer: SelectedCustomer | null) => {
    setSelectedCustomer(customer);
    if (customer) setNewReturn(prev => ({ ...prev, customer_id: customer.id || '', customer_code: customer.code, customer_name: customer.name }));
    else setNewReturn(prev => ({ ...prev, customer_id: '', customer_code: '', customer_name: '' }));
  };

  const calculateTotals = () => {
    const subtotal = newReturn.lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
    const taxAmount = subtotal * 0.15;
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const handleAddLine = () => {
    setNewReturn(prev => ({
      ...prev, lines: [...prev.lines, {
        line_num: prev.lines.length + 1, item_code: '', item_description: '', quantity: 1,
        unit_price: 0, tax_code: 'VAT15', line_total: 0, warehouse: '',
        serial_batch_no: '', unit: '',
      }],
    }));
  };

  const handleRemoveLine = (index: number) => {
    setNewReturn(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index).map((l, i) => ({ ...l, line_num: i + 1 })) }));
  };

  const handleLineChange = (index: number, field: string, value: string | number) => {
    setNewReturn(prev => ({
      ...prev, lines: prev.lines.map((line, i) => {
        if (i !== index) return line;
        const updated = { ...line, [field]: value };
        if (field === 'item_code') {
          const found = items.find(it => it.item_code === value);
          if (found) { updated.item_description = found.description; updated.unit_price = found.default_price || 0; updated.warehouse = found.warehouse || ''; }
        }
        updated.line_total = updated.quantity * updated.unit_price * 1.15;
        return updated;
      }),
    }));
  };

  const handleCreateReturn = async () => {
    if (!newReturn.customer_code || !newReturn.lines[0]?.item_code) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { subtotal, taxAmount, total } = calculateTotals();

    // Accounting pre-validation
    try {
      const { validateAccounting } = await import('@/services/accountingValidator');
      const res = await validateAccounting({ document_type: 'ar_return', total, subtotal, tax_amount: taxAmount, conditions: { customer: newReturn.customer_code } });
      if (!res.canProceed) {
        toast({ title: 'Accounting Error', description: res.issues.find(i => i.type === 'error')?.message || 'Validation failed', variant: 'destructive' });
        setSaving(false); return;
      }
    } catch { /* proceed */ }

    try {
      const { data: maxDoc } = await supabase.from('ar_returns').select('doc_num').order('doc_num', { ascending: false }).limit(1);
      const nextDocNum = (maxDoc?.[0]?.doc_num || 0) + 1;

      const { data: retData, error: retError } = await supabase.from('ar_returns').insert({
        doc_num: nextDocNum, doc_date: newReturn.doc_date, posting_date: newReturn.posting_date,
        customer_id: newReturn.customer_id || null, customer_code: newReturn.customer_code,
        customer_name: newReturn.customer_name, reference_delivery: newReturn.reference_delivery || null,
        return_reason: newReturn.return_reason || null, currency: newReturn.currency,
        subtotal, tax_amount: taxAmount, total, remarks: newReturn.remarks || null,
        series: selectedSeries || null, status: 'open', created_by: user?.id,
      }).select().single();
      if (retError) throw retError;

      if (newReturn.lines.length > 0) {
        const linesData = newReturn.lines.map(l => ({
          return_id: retData.id, line_num: l.line_num, item_code: l.item_code,
          item_description: l.item_description, quantity: l.quantity, unit_price: l.unit_price,
          tax_code: l.tax_code || null, line_total: l.line_total, warehouse: l.warehouse || null,
          serial_batch_no: l.serial_batch_no || null, unit: l.unit || null,
        }));
        const { error: linesError } = await supabase.from('ar_return_lines').insert(linesData);
        if (linesError) throw linesError;
      }
      toast({ title: 'Return Created', description: `RET-${nextDocNum} created successfully` });
      queryClient.invalidateQueries({ queryKey: ['arReturns'] });
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDeleteReturn = async (id: string) => {
    try {
      await supabase.from('ar_return_lines').delete().eq('return_id', id);
      const { error } = await supabase.from('ar_returns').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['arReturns'] });
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  const resetForm = () => {
  const { t } = useLanguage();

    setNewReturn({
      customer_id: '', customer_code: '', customer_name: '',
      doc_date: new Date().toISOString().split('T')[0], posting_date: new Date().toISOString().split('T')[0],
      reference_delivery: '', return_reason: '', remarks: '', currency: 'SAR',
      lines: [{ line_num: 1, item_code: '', item_description: '', quantity: 1, unit_price: 0, tax_code: 'VAT15', line_total: 0, warehouse: '', serial_batch_no: '', unit: '' }],
    });
    setSelectedCustomer(null);
    setSelectedSeries(null);
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{language === 'ar' ? 'مرتجعات' : 'A/R Returns'}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'مرتجعات البضاعة من العملاء' : 'Goods returns from customers'}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={filtered} columns={retColumns} filename="ar-returns" title="A/R Returns" />
          <SAPSyncButton entity="ar_invoice" />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />{language === 'ar' ? 'مرتجع جديد' : 'New Return'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  {language === 'ar' ? 'مرتجع مبيعات جديد' : 'New A/R Return'}
                </DialogTitle>
                <DialogDescription>{language === 'ar' ? 'إنشاء مرتجع مبيعات جديد بأسلوب SAP B1' : 'Create a new A/R return (SAP B1 style)'}</DialogDescription>
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
                    <Input value={newReturn.customer_name} disabled className="h-8 text-sm bg-muted/20" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'مرجع التسليم' : 'Ref. Delivery'}</Label>
                    <Input value={newReturn.reference_delivery} onChange={(e) => setNewReturn(prev => ({ ...prev, reference_delivery: e.target.value }))} placeholder={language === 'ar' ? 'رقم مذكرة التسليم' : 'Delivery note number'} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                    <Input value="SAR" disabled className="h-8 text-sm w-[120px] bg-muted/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <DocumentSeriesSelector objectCode={'16'} value={selectedSeries} onChange={(s, n) => { setSelectedSeries(s); setSeriesNextNo(n); }} compact label={language === 'ar' ? 'السلسلة / رقم' : 'Series / No.'} />
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                    <Input value="Open" disabled className="h-8 text-sm bg-muted/20" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'تاريخ الترحيل' : 'Posting Date'}</Label>
                    <Input type="date" value={newReturn.doc_date} onChange={(e) => setNewReturn(prev => ({ ...prev, doc_date: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'تاريخ المستند' : 'Document Date'}</Label>
                    <Input type="date" value={newReturn.posting_date} onChange={(e) => setNewReturn(prev => ({ ...prev, posting_date: e.target.value }))} className="h-8 text-sm" />
                  </div>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="contents">{language === 'ar' ? 'المحتويات' : 'Contents'}</TabsTrigger>
                  <TabsTrigger value="logistics">{language === 'ar' ? 'اللوجستيات' : 'Logistics'}</TabsTrigger>
                  <TabsTrigger value="accounting">{language === 'ar' ? 'المحاسبة' : 'Accounting'}</TabsTrigger>
                </TabsList>

                <TabsContent value="contents" className="space-y-3 mt-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">{language === 'ar' ? 'بنود المرتجع' : 'Return Items'}</h3>
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
                        {newReturn.lines.map((line, index) => (
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
                              {newReturn.lines.length > 1 && (
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

                <TabsContent value="logistics" className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'سبب المرتجع' : 'Return Reason'}</Label>
                      <Select value={newReturn.return_reason || 'not_selected'} onValueChange={(v) => setNewReturn(prev => ({ ...prev, return_reason: v === 'not_selected' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select reason'} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_selected">{language === 'ar' ? 'اختر' : 'Select'}</SelectItem>
                          <SelectItem value="defective">{language === 'ar' ? 'منتج معيب' : 'Defective Product'}</SelectItem>
                          <SelectItem value="wrong_item">{language === 'ar' ? 'صنف خاطئ' : 'Wrong Item'}</SelectItem>
                          <SelectItem value="damaged">{language === 'ar' ? 'تالف' : 'Damaged'}</SelectItem>
                          <SelectItem value="customer_request">{language === 'ar' ? 'طلب العميل' : 'Customer Request'}</SelectItem>
                          <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{language === 'ar' ? 'ملاحظات' : 'Remarks'}</Label>
                    <Textarea value={newReturn.remarks} onChange={(e) => setNewReturn(prev => ({ ...prev, remarks: e.target.value }))} rows={3} />
                  </div>
                </TabsContent>

                <TabsContent value="accounting" className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                      <Input value={newReturn.currency} disabled className="h-8 text-sm bg-muted/20" />
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
                  documentType="ar_return"
                  getDocumentData={() => { const { subtotal, taxAmount, total } = calculateTotals(); return { document_type: 'ar_return', total, subtotal, tax_amount: taxAmount, conditions: { customer: newReturn.customer_code } }; }}
                  compact
                />
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
                <Button onClick={handleCreateReturn} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {language === 'ar' ? 'إنشاء المرتجع' : 'Create Return'}
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
            <div className="p-1.5 md:p-2 bg-info/10 rounded-lg"><RotateCcw className="h-4 w-4 md:h-5 md:w-5 text-info" /></div>
            <div><p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</p><p className="text-lg md:text-xl font-bold">{totalReturns}</p></div>
          </div>
        </div>
        <div className="enterprise-card p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-warning/10 rounded-lg"><Clock className="h-4 w-4 md:h-5 md:w-5 text-warning" /></div>
            <div><p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'مفتوحة' : 'Open'}</p><p className="text-lg md:text-xl font-bold">{openReturns}</p></div>
          </div>
        </div>
        <div className="enterprise-card p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-success/10 rounded-lg"><CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-success" /></div>
            <div><p className="text-xs md:text-sm text-muted-foreground">{language === 'ar' ? 'مغلقة' : 'Closed'}</p><p className="text-lg md:text-xl font-bold">{closedReturns}</p></div>
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
            <Input placeholder={language === 'ar' ? 'بحث في المرتجعات...' : 'Search returns...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
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
                <TableHead className="col-tablet-hidden">{language === 'ar' ? 'مرجع التسليم' : 'Ref Delivery'}</TableHead>
                <TableHead className="col-tablet-hidden">{language === 'ar' ? 'سبب المرتجع' : 'Return Reason'}</TableHead>
                <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="col-tablet-hidden">{language === 'ar' ? 'المزامنة' : 'Sync'}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد مرتجعات' : 'No returns found'}</TableCell></TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium font-mono">RET-{r.doc_num}</TableCell>
                    <TableCell className="col-mobile-hidden">{r.customer_code}</TableCell>
                    <TableCell><p className="font-medium">{r.customer_name}</p></TableCell>
                    <TableCell className="col-mobile-hidden">{format(new Date(r.doc_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="col-tablet-hidden">{r.reference_delivery || '-'}</TableCell>
                    <TableCell className="col-tablet-hidden">{r.return_reason || '-'}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(r.total || 0))}</TableCell>
                    <TableCell><Badge className={statusColors[r.status || ''] || ''}>{(r.status || 'open').charAt(0).toUpperCase() + (r.status || 'open').slice(1)}</Badge></TableCell>
                    <TableCell className="col-tablet-hidden"><SyncStatusBadge syncStatus={r.sync_status} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />{language === 'ar' ? 'عرض' : 'View'}</DropdownMenuItem>
                          <DropdownMenuItem><Printer className="h-4 w-4 mr-2" />{language === 'ar' ? 'طباعة' : 'Print'}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteReturn(r.id)}>
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
    </div>
  );
}
