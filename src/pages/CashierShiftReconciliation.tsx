import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCashierShifts } from '@/hooks/useCashierShifts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, DollarSign, CheckCircle, XCircle, Clock, TrendingDown, TrendingUp, Banknote } from 'lucide-react';

export default function CashierShiftReconciliation() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const { shifts, isLoading, openShift, closeShift, approveShift } = useCashierShifts();
  const [tab, setTab] = useState('shifts');
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState<string | null>(null);

  // Open Shift form
  const [newCashier, setNewCashier] = useState('');
  const [newFloat, setNewFloat] = useState('0');

  // Close Shift form
  const [closeCash, setCloseCash] = useState('0');
  const [closeCard, setCloseCard] = useState('0');
  const [closeDigital, setCloseDigital] = useState('0');
  const [closeBankTx, setCloseBankTx] = useState('0');

  const handleOpenShift = () => {
    openShift.mutate({ cashier_name: newCashier, opening_float: parseFloat(newFloat) || 0 }, {
      onSuccess: () => { setOpenDialog(false); setNewCashier(''); setNewFloat('0'); }
    });
  };

  const handleCloseShift = () => {
    if (!closeDialog) return;
    closeShift.mutate({
      shift_id: closeDialog,
      actual_cash: parseFloat(closeCash) || 0,
      actual_card: parseFloat(closeCard) || 0,
      actual_digital_wallet: parseFloat(closeDigital) || 0,
      actual_bank_transfer: parseFloat(closeBankTx) || 0,
    }, {
      onSuccess: () => { setCloseDialog(null); setCloseCash('0'); setCloseCard('0'); setCloseDigital('0'); setCloseBankTx('0'); }
    });
  };

  const openShifts = shifts?.filter(s => s.status === 'open') || [];
  const closedShifts = shifts?.filter(s => s.status !== 'open') || [];

  const varianceBadge = (v: number | null, status: string | null) => {
    if (status === 'balanced' || v === 0 || v === null) return <Badge variant="outline" className="text-success">{t('Balanced', 'متوازن')}</Badge>;
    if (status === 'within_tolerance') return <Badge variant="secondary">{t('Within Tolerance', 'ضمن الحد')}</Badge>;
    if (status === 'over') return <Badge className="bg-blue-500">{t('Over', 'زيادة')} +{v?.toFixed(2)}</Badge>;
    return <Badge variant="destructive">{t('Short', 'نقص')} {v?.toFixed(2)}</Badge>;
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Banknote className="h-6 w-6 text-primary" />
            {t('Cashier Shift Reconciliation', 'تسوية نوبة الصراف')}
          </h1>
          <p className="text-muted-foreground">{t('Open, close, and reconcile cashier shifts', 'فتح وإغلاق وتسوية نوبات الصرافين')}</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t('Open Shift', 'فتح نوبة')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('Open New Shift', 'فتح نوبة جديدة')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t('Cashier Name', 'اسم الصراف')}</Label><Input value={newCashier} onChange={e => setNewCashier(e.target.value)} /></div>
              <div><Label>{t('Opening Float', 'المبلغ الافتتاحي')}</Label><Input type="number" value={newFloat} onChange={e => setNewFloat(e.target.value)} /></div>
              <Button onClick={handleOpenShift} disabled={!newCashier || openShift.isPending} className="w-full">
                {openShift.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{t('Open Shift', 'فتح النوبة')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('Open Shifts', 'النوبات المفتوحة'), value: openShifts.length, icon: Clock, color: 'text-warning' },
          { label: t('Closed Today', 'مغلقة اليوم'), value: closedShifts.filter(s => s.closed_at && new Date(s.closed_at).toDateString() === new Date().toDateString()).length, icon: CheckCircle, color: 'text-success' },
          { label: t('Pending Approval', 'بانتظار الموافقة'), value: closedShifts.filter(s => s.status === 'closed' && !s.manager_approved).length, icon: DollarSign, color: 'text-primary' },
          { label: t('Total Variances', 'إجمالي الفروقات'), value: closedShifts.filter(s => s.variance_status === 'short' || s.variance_status === 'over').length, icon: TrendingDown, color: 'text-destructive' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className={`h-8 w-8 ${s.color}`} /><div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="shifts">{t('Active Shifts', 'النوبات النشطة')}</TabsTrigger>
          <TabsTrigger value="history">{t('History', 'السجل')}</TabsTrigger>
        </TabsList>

        <TabsContent value="shifts">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin mr-2" />{t('Loading...', 'جار التحميل...')}</div>
              ) : openShifts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{t('No open shifts', 'لا توجد نوبات مفتوحة')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Shift #', 'رقم النوبة')}</TableHead>
                      <TableHead>{t('Cashier', 'الصراف')}</TableHead>
                      <TableHead>{t('Opened', 'الفتح')}</TableHead>
                      <TableHead>{t('Float', 'المبلغ')}</TableHead>
                      <TableHead>{t('Actions', 'الإجراءات')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openShifts.map(shift => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-mono text-sm">{shift.shift_number}</TableCell>
                        <TableCell className="font-medium">{shift.cashier_name}</TableCell>
                        <TableCell className="text-xs">{new Date(shift.opened_at).toLocaleString()}</TableCell>
                        <TableCell>{shift.opening_float?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => setCloseDialog(shift.id)}>
                            {t('Close Shift', 'إغلاق النوبة')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Shift #', 'رقم')}</TableHead>
                    <TableHead>{t('Cashier', 'الصراف')}</TableHead>
                    <TableHead>{t('Opened', 'الفتح')}</TableHead>
                    <TableHead>{t('Closed', 'الإغلاق')}</TableHead>
                    <TableHead>{t('Expected', 'المتوقع')}</TableHead>
                    <TableHead>{t('Actual', 'الفعلي')}</TableHead>
                    <TableHead>{t('Variance', 'الفرق')}</TableHead>
                    <TableHead>{t('Status', 'الحالة')}</TableHead>
                    <TableHead>{t('Actions', 'الإجراءات')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedShifts.map(shift => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-mono text-sm">{shift.shift_number}</TableCell>
                      <TableCell>{shift.cashier_name}</TableCell>
                      <TableCell className="text-xs">{new Date(shift.opened_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{shift.closed_at ? new Date(shift.closed_at).toLocaleString() : '-'}</TableCell>
                      <TableCell>{shift.expected_total?.toFixed(2)}</TableCell>
                      <TableCell>{shift.actual_total?.toFixed(2)}</TableCell>
                      <TableCell>{varianceBadge(shift.total_variance, shift.variance_status)}</TableCell>
                      <TableCell>
                        <Badge variant={shift.manager_approved ? 'default' : 'secondary'}>
                          {shift.manager_approved ? t('Approved', 'معتمد') : shift.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {shift.status === 'closed' && !shift.manager_approved && (
                          <Button size="sm" variant="outline" onClick={() => approveShift.mutate({ shift_id: shift.id })}>
                            {t('Approve', 'اعتماد')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Close Shift Dialog */}
      <Dialog open={!!closeDialog} onOpenChange={() => setCloseDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Close Shift — Count Cash & Cards', 'إغلاق النوبة — عد النقد والبطاقات')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('Actual Cash', 'النقد الفعلي')}</Label><Input type="number" value={closeCash} onChange={e => setCloseCash(e.target.value)} /></div>
            <div><Label>{t('Actual Card', 'البطاقات الفعلية')}</Label><Input type="number" value={closeCard} onChange={e => setCloseCard(e.target.value)} /></div>
            <div><Label>{t('Digital Wallet', 'المحفظة الرقمية')}</Label><Input type="number" value={closeDigital} onChange={e => setCloseDigital(e.target.value)} /></div>
            <div><Label>{t('Bank Transfer', 'تحويل بنكي')}</Label><Input type="number" value={closeBankTx} onChange={e => setCloseBankTx(e.target.value)} /></div>
            <Button onClick={handleCloseShift} disabled={closeShift.isPending} className="w-full">
              {closeShift.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{t('Close & Calculate Variance', 'إغلاق وحساب الفرق')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
