import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePOSPickup } from '@/hooks/usePOSPickup';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Package, CheckCircle, Clock, MapPin, ShieldCheck, Smartphone } from 'lucide-react';

export default function OmnichannelPickup() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const { pickupOrders, isLoading, stats, createPickupOrder, updatePickupStatus, verifyOTP } = usePOSPickup();
  const [tab, setTab] = useState('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  // Create form
  const [orderNum, setOrderNum] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [source, setSource] = useState('online');

  const handleCreate = () => {
    createPickupOrder.mutate({
      order_number: orderNum,
      customer_name: custName,
      customer_phone: custPhone,
      order_source: source,
      items: [],
    }, { onSuccess: () => { setCreateOpen(false); setOrderNum(''); setCustName(''); setCustPhone(''); } });
  };

  const handleVerify = () => {
    if (!verifyId) return;
    verifyOTP.mutate({ id: verifyId, otp: otpInput }, { onSuccess: () => { setVerifyId(null); setOtpInput(''); } });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'reserved': return 'secondary';
      case 'preparing': return 'outline';
      case 'ready': case 'notified': return 'default';
      case 'completed': case 'handed_over': return 'default';
      case 'cancelled': case 'expired': case 'no_show': return 'destructive';
      default: return 'secondary';
    }
  };

  const active = pickupOrders?.filter(o => !['completed', 'handed_over', 'cancelled', 'expired'].includes(o.status)) || [];
  const completed = pickupOrders?.filter(o => ['completed', 'handed_over'].includes(o.status)) || [];

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            {t('Omnichannel Order Pickup', 'استلام الطلبات متعدد القنوات')}
          </h1>
          <p className="text-muted-foreground">{t('Manage in-store pickup orders from all channels', 'إدارة طلبات الاستلام من جميع القنوات')}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t('New Pickup', 'استلام جديد')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('Create Pickup Order', 'إنشاء طلب استلام')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t('Order Number', 'رقم الطلب')}</Label><Input value={orderNum} onChange={e => setOrderNum(e.target.value)} /></div>
              <div><Label>{t('Customer Name', 'اسم العميل')}</Label><Input value={custName} onChange={e => setCustName(e.target.value)} /></div>
              <div><Label>{t('Phone', 'الهاتف')}</Label><Input value={custPhone} onChange={e => setCustPhone(e.target.value)} /></div>
              <div><Label>{t('Source', 'المصدر')}</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="sales_rep">Sales Rep</SelectItem>
                    <SelectItem value="app">App</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={!orderNum || !custName || createPickupOrder.isPending} className="w-full">
                {createPickupOrder.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{t('Create', 'إنشاء')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('Reserved', 'محجوز'), value: stats.reserved, icon: Clock, color: 'text-warning' },
          { label: t('Preparing', 'قيد التجهيز'), value: stats.preparing, icon: Package, color: 'text-blue-500' },
          { label: t('Ready', 'جاهز'), value: stats.ready, icon: CheckCircle, color: 'text-success' },
          { label: t('Completed', 'مكتمل'), value: stats.completed, icon: ShieldCheck, color: 'text-primary' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className={`h-8 w-8 ${s.color}`} /><div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">{t('Active', 'نشط')} ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">{t('Completed', 'مكتمل')} ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : active.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{t('No active pickup orders', 'لا توجد طلبات استلام نشطة')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Order #', 'رقم الطلب')}</TableHead>
                      <TableHead>{t('Customer', 'العميل')}</TableHead>
                      <TableHead>{t('Source', 'المصدر')}</TableHead>
                      <TableHead>{t('Status', 'الحالة')}</TableHead>
                      <TableHead>{t('Created', 'الإنشاء')}</TableHead>
                      <TableHead>{t('Actions', 'الإجراءات')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.map(o => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono">{o.order_number}</TableCell>
                        <TableCell>
                          <div>{o.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{o.customer_phone}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{o.order_source}</Badge></TableCell>
                        <TableCell><Badge variant={statusColor(o.status) as any}>{o.status}</Badge></TableCell>
                        <TableCell className="text-xs">{new Date(o.created_at).toLocaleString()}</TableCell>
                        <TableCell className="space-x-1">
                          {o.status === 'reserved' && (
                            <Button size="sm" variant="outline" onClick={() => updatePickupStatus.mutate({ id: o.id, status: 'preparing' })}>
                              {t('Prepare', 'تجهيز')}
                            </Button>
                          )}
                          {o.status === 'preparing' && (
                            <Button size="sm" variant="outline" onClick={() => updatePickupStatus.mutate({ id: o.id, status: 'ready' })}>
                              {t('Mark Ready', 'جاهز')}
                            </Button>
                          )}
                          {(o.status === 'ready' || o.status === 'notified' || o.status === 'arrived') && (
                            <Button size="sm" onClick={() => setVerifyId(o.id)}>
                              <ShieldCheck className="h-3 w-3 mr-1" />{t('Verify & Handover', 'تحقق وتسليم')}
                            </Button>
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

        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Order #', 'رقم')}</TableHead>
                    <TableHead>{t('Customer', 'العميل')}</TableHead>
                    <TableHead>{t('Verified', 'تم التحقق')}</TableHead>
                    <TableHead>{t('Handed Over', 'تم التسليم')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completed.map(o => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono">{o.order_number}</TableCell>
                      <TableCell>{o.customer_name}</TableCell>
                      <TableCell>{o.otp_verified ? <CheckCircle className="h-4 w-4 text-success" /> : '-'}</TableCell>
                      <TableCell className="text-xs">{o.handed_over_at ? new Date(o.handed_over_at).toLocaleString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* OTP Verify Dialog */}
      <Dialog open={!!verifyId} onOpenChange={() => setVerifyId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Verify Customer — Enter OTP', 'تحقق من العميل — أدخل رمز OTP')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              {t('Customer received an OTP code. Ask them to provide it.', 'تلقى العميل رمز OTP. اطلب منه تقديمه.')}
            </div>
            <div><Label>{t('OTP Code', 'رمز OTP')}</Label><Input value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="123456" maxLength={6} className="text-center text-2xl tracking-widest" /></div>
            <Button onClick={handleVerify} disabled={otpInput.length < 4 || verifyOTP.isPending} className="w-full">
              {verifyOTP.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{t('Verify & Complete', 'تحقق وأكمل')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
