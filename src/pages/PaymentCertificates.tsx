import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePaymentCertificates, usePaymentCertificateTypes, PaymentCertificate } from '@/hooks/usePaymentCertificates';
import { useSalesOrders } from '@/hooks/useSalesOrderContracts';
import { useIncomingPayments } from '@/hooks/useIncomingPayments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Plus, FileText, Search, Trash2, Eye, Copy, MoreVertical, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function PaymentCertificates() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const { certificates, isLoading, createCertificate, updateCertificate, deleteCertificate } = usePaymentCertificates();
  const { types } = usePaymentCertificateTypes();
  const { salesOrders } = useSalesOrders();
  const { payments } = useIncomingPayments();
  const [open, setOpen] = useState(false);
  const [viewCert, setViewCert] = useState<PaymentCertificate | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    sales_order_id: '',
    certificate_type_id: '',
    amount: '',
    notes: '',
  });

  const contracts = salesOrders?.filter(so => so.is_contract) || [];

  const handleCreate = () => {
    if (!form.sales_order_id || !form.certificate_type_id || !form.amount) return;
    createCertificate.mutate({
      sales_order_id: form.sales_order_id,
      certificate_type_id: form.certificate_type_id,
      amount: parseFloat(form.amount),
      notes: form.notes || undefined,
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ sales_order_id: '', certificate_type_id: '', amount: '', notes: '' });
      },
    });
  };

  const getContractLabel = (soId: string) => {
    const so = salesOrders?.find(s => s.id === soId);
    return so ? `${so.contract_number || 'SO-' + so.doc_num} - ${so.customer_name}` : soId;
  };

  const getTypeName = (typeId: string) => {
    const t = types?.find(tp => tp.id === typeId);
    return t ? (isAr && t.name_ar ? t.name_ar : t.name) : typeId;
  };

  const getSalesOrder = (soId: string) => salesOrders?.find(s => s.id === soId);

  // Calculate actual collected from incoming payments linked to same SO
  const getCollectedForCert = (cert: PaymentCertificate) => {
    return cert.collected_amount || 0;
  };

  const getCollectionPercent = (cert: PaymentCertificate) => {
    const collected = getCollectedForCert(cert);
    return cert.amount > 0 ? Math.min((collected / cert.amount) * 100, 100) : 0;
  };

  const collectionStatusColor = (status: string) => {
    switch (status) {
      case 'collected': return 'default';
      case 'partial': return 'secondary';
      default: return 'outline';
    }
  };

  const collectionStatusLabel = (status: string) => {
    switch (status) {
      case 'collected': return isAr ? 'محصّل بالكامل' : 'Fully Collected';
      case 'partial': return isAr ? 'محصّل جزئياً' : 'Partially Collected';
      default: return isAr ? 'لم يُحصّل' : 'Pending';
    }
  };

  const handleCopyToPayment = (cert: PaymentCertificate) => {
    const so = getSalesOrder(cert.sales_order_id);
    const remaining = cert.amount - getCollectedForCert(cert);
    // Store data in sessionStorage for the incoming payment page to pick up
    sessionStorage.setItem('prefill_incoming_payment', JSON.stringify({
      sales_order_id: cert.sales_order_id,
      customer_code: so?.customer_code || '',
      customer_name: so?.customer_name || '',
      customer_id: so?.customer_id || '',
      total_amount: remaining > 0 ? remaining : cert.amount,
      remarks: `Payment for certificate ${cert.certificate_number}`,
      certificate_id: cert.id,
    }));
    navigate('/incoming-payments');
  };

  const filtered = certificates?.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.certificate_number.toLowerCase().includes(s)
      || getContractLabel(c.sales_order_id).toLowerCase().includes(s);
  }) || [];

  const statusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'submitted': return 'default';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatCurrency = (v: number) => Number(v).toLocaleString() + ' SAR';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isAr ? 'شهادات الدفع' : 'Payment Certificates'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'إدارة شهادات الدفع المرتبطة بالعقود' : 'Manage payment certificates linked to contracts'}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {isAr ? 'شهادة جديدة' : 'New Certificate'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isAr ? 'شهادات الدفع' : 'Payment Certificates'}
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isAr ? 'بحث...' : 'Search...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {isAr ? 'لا توجد شهادات دفع' : 'No payment certificates found'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? 'رقم الشهادة' : 'Certificate #'}</TableHead>
                  <TableHead>{isAr ? 'العقد' : 'Contract'}</TableHead>
                  <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                  <TableHead>{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead>{isAr ? 'التحصيل' : 'Collection'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(cert => {
                  const collected = getCollectedForCert(cert);
                  const remaining = cert.amount - collected;
                  const pct = getCollectionPercent(cert);
                  return (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.certificate_number}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{getContractLabel(cert.sales_order_id)}</TableCell>
                      <TableCell>{getTypeName(cert.certificate_type_id)}</TableCell>
                      <TableCell>{formatCurrency(cert.amount)}</TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex items-center justify-between text-xs">
                            <span>{formatCurrency(collected)}</span>
                            <Badge variant={collectionStatusColor(cert.collection_status)} className="text-[10px] px-1">
                              {collectionStatusLabel(cert.collection_status)}
                            </Badge>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor(cert.status)}>{cert.status}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(cert.created_at), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewCert(cert)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {isAr ? 'عرض' : 'View'}
                            </DropdownMenuItem>
                            {remaining > 0 && (
                              <DropdownMenuItem onClick={() => handleCopyToPayment(cert)}>
                                <Banknote className="h-4 w-4 mr-2" />
                                {isAr ? 'نسخ إلى دفعة واردة' : 'Copy to Incoming Payment'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteCertificate.mutate(cert.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {isAr ? 'حذف' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewCert} onOpenChange={(o) => !o && setViewCert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تفاصيل شهادة الدفع' : 'Payment Certificate Details'}</DialogTitle>
          </DialogHeader>
          {viewCert && (() => {
            const so = getSalesOrder(viewCert.sales_order_id);
            const collected = getCollectedForCert(viewCert);
            const remaining = viewCert.amount - collected;
            const pct = getCollectionPercent(viewCert);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">{isAr ? 'رقم الشهادة' : 'Certificate #'}</Label>
                    <p className="font-semibold">{viewCert.certificate_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">{isAr ? 'الحالة' : 'Status'}</Label>
                    <div><Badge variant={statusColor(viewCert.status)}>{viewCert.status}</Badge></div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">{isAr ? 'العقد' : 'Contract'}</Label>
                    <p className="font-medium">{getContractLabel(viewCert.sales_order_id)}</p>
                  </div>
                  {so && (
                    <>
                      <div>
                        <Label className="text-muted-foreground text-xs">{isAr ? 'قيمة العقد' : 'Contract Value'}</Label>
                        <p>{formatCurrency(so.contract_value || so.total || 0)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">{isAr ? 'رقم العقد' : 'Contract #'}</Label>
                        <p>{so.contract_number || 'SO-' + so.doc_num}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="text-muted-foreground text-xs">{isAr ? 'النوع' : 'Type'}</Label>
                    <p>{getTypeName(viewCert.certificate_type_id)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">{isAr ? 'التاريخ' : 'Date'}</Label>
                    <p>{format(new Date(viewCert.created_at), 'yyyy-MM-dd')}</p>
                  </div>
                </div>

                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>{isAr ? 'مبلغ الشهادة' : 'Certificate Amount'}</span>
                      <span className="font-bold">{formatCurrency(viewCert.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{isAr ? 'المحصّل' : 'Collected'}</span>
                      <span className="font-semibold text-primary">{formatCurrency(collected)}</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span>{isAr ? 'المتبقي' : 'Remaining'}</span>
                      <span className={remaining > 0 ? 'text-destructive font-semibold' : 'text-primary font-semibold'}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                    <Badge variant={collectionStatusColor(viewCert.collection_status)}>
                      {collectionStatusLabel(viewCert.collection_status)}
                    </Badge>
                  </CardContent>
                </Card>

                {viewCert.notes && (
                  <div>
                    <Label className="text-muted-foreground text-xs">{isAr ? 'ملاحظات' : 'Notes'}</Label>
                    <p className="text-sm mt-1">{viewCert.notes}</p>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            {viewCert && (viewCert.amount - getCollectedForCert(viewCert)) > 0 && (
              <Button onClick={() => { handleCopyToPayment(viewCert); setViewCert(null); }}>
                <Banknote className="h-4 w-4 mr-2" />
                {isAr ? 'نسخ إلى دفعة واردة' : 'Copy to Incoming Payment'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewCert(null)}>{isAr ? 'إغلاق' : 'Close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isAr ? 'إنشاء شهادة دفع' : 'Create Payment Certificate'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? 'رقم العقد' : 'Contract'}</Label>
              <Select value={form.sales_order_id} onValueChange={v => setForm(p => ({ ...p, sales_order_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? 'اختر العقد' : 'Select contract'} />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contract_number || 'SO-' + c.doc_num} - {c.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'نوع الشهادة' : 'Certificate Type'}</Label>
              <Select value={form.certificate_type_id} onValueChange={v => setForm(p => ({ ...p, certificate_type_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? 'اختر النوع' : 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  {types?.filter(t => t.is_active).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {isAr && t.name_ar ? t.name_ar : t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'المبلغ' : 'Amount'}</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder={isAr ? 'ملاحظات اختيارية' : 'Optional notes'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleCreate} disabled={createCertificate.isPending}>
              {isAr ? 'إنشاء وإرسال إشعار' : 'Create & Notify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
