import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePOSReturns } from '@/hooks/usePOSReturns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, RotateCcw, CheckCircle, XCircle, AlertTriangle, TrendingDown, Eye, ShieldAlert, Search } from 'lucide-react';

export default function POSReturnsIntelligence() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const { returns, patterns, isLoading, stats, createReturn, approveReturn, rejectReturn } = usePOSReturns();
  const [tab, setTab] = useState('returns');
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Create form
  const [custName, setCustName] = useState('');
  const [reason, setReason] = useState('changed_mind');
  const [refundAmt, setRefundAmt] = useState('0');
  const [hasReceipt, setHasReceipt] = useState('yes');
  const [reasonDetails, setReasonDetails] = useState('');

  const handleCreate = () => {
    createReturn.mutate({
      customer_name: custName,
      return_reason: reason,
      total_refund_amount: parseFloat(refundAmt) || 0,
      has_receipt: hasReceipt === 'yes',
      reason_details: reasonDetails,
      items: [],
      requires_approval: parseFloat(refundAmt) > 500 || hasReceipt !== 'yes',
      risk_flag: hasReceipt !== 'yes' ? 'no_receipt' : 'normal',
    }, { onSuccess: () => { setCreateOpen(false); setCustName(''); setRefundAmt('0'); setReasonDetails(''); } });
  };

  const filtered = (returns || []).filter(r =>
    !search || r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.return_number?.toLowerCase().includes(search.toLowerCase())
  );

  const riskBadge = (flag: string | null) => {
    if (!flag || flag === 'normal') return null;
    const colors: Record<string, string> = { high_frequency: 'bg-orange-500', high_value: 'bg-red-500', no_receipt: 'bg-yellow-500', suspicious: 'bg-red-700' };
    return <Badge className={`${colors[flag] || ''} text-white text-[10px]`}>{flag.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-primary" />
            {t('POS Returns Intelligence', 'ذكاء المرتجعات')}
          </h1>
          <p className="text-muted-foreground">{t('Track returns, patterns, and detect abuse', 'تتبع المرتجعات والأنماط واكتشاف سوء الاستخدام')}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t('New Return', 'مرتجع جديد')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('Create Return Request', 'إنشاء طلب مرتجع')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t('Customer Name', 'اسم العميل')}</Label><Input value={custName} onChange={e => setCustName(e.target.value)} /></div>
              <div><Label>{t('Return Reason', 'سبب الإرجاع')}</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['defective', 'wrong_item', 'not_as_described', 'changed_mind', 'size_issue', 'duplicate_purchase', 'quality_issue', 'warranty', 'other'].map(r => (
                      <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('Refund Amount', 'مبلغ الاسترداد')}</Label><Input type="number" value={refundAmt} onChange={e => setRefundAmt(e.target.value)} /></div>
              <div><Label>{t('Has Receipt', 'لديه إيصال')}</Label>
                <Select value={hasReceipt} onValueChange={setHasReceipt}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{t('Yes', 'نعم')}</SelectItem>
                    <SelectItem value="no">{t('No', 'لا')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('Details', 'التفاصيل')}</Label><Textarea value={reasonDetails} onChange={e => setReasonDetails(e.target.value)} /></div>
              <Button onClick={handleCreate} disabled={!custName || createReturn.isPending} className="w-full">
                {createReturn.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{t('Submit Return', 'تقديم المرتجع')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: t('Pending', 'معلق'), value: stats.pending, icon: AlertTriangle, color: 'text-warning' },
          { label: t('Approved', 'معتمد'), value: stats.approved, icon: CheckCircle, color: 'text-success' },
          { label: t('Total Refunds', 'إجمالي الاسترداد'), value: stats.totalRefunds.toFixed(0), icon: TrendingDown, color: 'text-destructive' },
          { label: t('No Receipt', 'بدون إيصال'), value: stats.noReceipt, icon: ShieldAlert, color: 'text-orange-500' },
          { label: t('Flagged', 'مُعلَّم'), value: stats.flagged, icon: AlertTriangle, color: 'text-red-500' },
          { label: t('Top Reason', 'السبب الأعلى'), value: stats.topReason.replace(/_/g, ' '), icon: Eye, color: 'text-primary' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className={`h-7 w-7 ${s.color}`} /><div><p className="text-lg font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="returns">{t('Returns', 'المرتجعات')} ({filtered.length})</TabsTrigger>
          <TabsTrigger value="patterns">{t('Patterns & Analytics', 'الأنماط والتحليلات')}</TabsTrigger>
        </TabsList>

        <TabsContent value="returns">
          <Card>
            <div className="p-4 border-b">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('Search returns...', 'بحث في المرتجعات...')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
            </div>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Return #', 'رقم المرتجع')}</TableHead>
                      <TableHead>{t('Customer', 'العميل')}</TableHead>
                      <TableHead>{t('Reason', 'السبب')}</TableHead>
                      <TableHead>{t('Amount', 'المبلغ')}</TableHead>
                      <TableHead>{t('Receipt', 'إيصال')}</TableHead>
                      <TableHead>{t('Risk', 'الخطورة')}</TableHead>
                      <TableHead>{t('Status', 'الحالة')}</TableHead>
                      <TableHead>{t('Actions', 'الإجراءات')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 100).map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.return_number}</TableCell>
                        <TableCell>{r.customer_name || '-'}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.return_reason?.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell className="font-medium">{Number(r.total_refund_amount).toFixed(2)}</TableCell>
                        <TableCell>{r.has_receipt ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}</TableCell>
                        <TableCell>{riskBadge(r.risk_flag)}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                        </TableCell>
                        <TableCell className="space-x-1">
                          {r.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => approveReturn.mutate({ id: r.id })}>
                                <CheckCircle className="h-3 w-3 mr-1" />{t('Approve', 'موافقة')}
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => rejectReturn.mutate({ id: r.id, rejection_reason: 'Policy violation' })}>
                                <XCircle className="h-3 w-3 mr-1" />{t('Reject', 'رفض')}
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardContent className="p-0">
              {(patterns || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{t('No return patterns detected yet', 'لم يتم اكتشاف أنماط بعد')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Pattern Type', 'نوع النمط')}</TableHead>
                      <TableHead>{t('Reference', 'المرجع')}</TableHead>
                      <TableHead>{t('Total Returns', 'إجمالي المرتجعات')}</TableHead>
                      <TableHead>{t('Refund Amount', 'مبلغ الاسترداد')}</TableHead>
                      <TableHead>{t('Return Rate', 'معدل الإرجاع')}</TableHead>
                      <TableHead>{t('Avg Days', 'متوسط الأيام')}</TableHead>
                      <TableHead>{t('Risk', 'الخطورة')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patterns.map(p => (
                      <TableRow key={p.id}>
                        <TableCell><Badge variant="outline">{p.pattern_type}</Badge></TableCell>
                        <TableCell>{p.reference_name || p.reference_id}</TableCell>
                        <TableCell className="font-bold">{p.total_returns}</TableCell>
                        <TableCell>{Number(p.total_refund_amount).toFixed(2)}</TableCell>
                        <TableCell>{Number(p.return_rate).toFixed(1)}%</TableCell>
                        <TableCell>{Number(p.avg_days_to_return).toFixed(0)}</TableCell>
                        <TableCell>
                          <Badge variant={p.risk_level === 'block' ? 'destructive' : p.risk_level === 'high' ? 'destructive' : 'secondary'}>
                            {p.risk_level}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
