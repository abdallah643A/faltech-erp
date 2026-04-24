import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDeliveryDispatch } from '@/hooks/useDeliveryDispatch';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Plus, MapPin, Phone, User, Package, CheckCircle, XCircle } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Delivery Dispatch', ar: 'إرسال التوصيل' },
  orders: { en: 'Delivery Orders', ar: 'طلبات التوصيل' },
  drivers: { en: 'Drivers', ar: 'السائقين' },
  newOrder: { en: 'New Delivery', ar: 'توصيل جديد' },
  newDriver: { en: 'Add Driver', ar: 'إضافة سائق' },
  customer: { en: 'Customer', ar: 'العميل' },
  phone: { en: 'Phone', ar: 'الهاتف' },
  address: { en: 'Address', ar: 'العنوان' },
  driver: { en: 'Driver', ar: 'السائق' },
  status: { en: 'Status', ar: 'الحالة' },
  charge: { en: 'Delivery Charge', ar: 'رسوم التوصيل' },
  collection: { en: 'COD Amount', ar: 'الدفع عند الاستلام' },
  assign: { en: 'Assign', ar: 'تعيين' },
  driverName: { en: 'Driver Name', ar: 'اسم السائق' },
  vehicle: { en: 'Vehicle', ar: 'المركبة' },
  available: { en: 'Available', ar: 'متاح' },
  noOrders: { en: 'No delivery orders', ar: 'لا توجد طلبات توصيل' },
  create: { en: 'Create', ar: 'إنشاء' },
  pending: { en: 'Pending', ar: 'في الانتظار' },
  inTransit: { en: 'In Transit', ar: 'في الطريق' },
  delivered: { en: 'Delivered', ar: 'تم التوصيل' },
  failed: { en: 'Failed', ar: 'فشل' },
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800', assigned: 'bg-blue-100 text-blue-800',
  picked_up: 'bg-indigo-100 text-indigo-800', in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800',
  returned: 'bg-orange-100 text-orange-800', cancelled: 'bg-gray-100 text-gray-800',
};

export default function DeliveryDispatchPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const { deliveries, drivers, isLoading, createDelivery, updateDelivery, createDriver } = useDeliveryDispatch();
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showNewDriver, setShowNewDriver] = useState(false);
  const [newOrder, setNewOrder] = useState<any>({ customer_name: '', customer_phone: '', delivery_address: '', delivery_charge: 0, collection_amount: 0 });
  const [newDriverForm, setNewDriverForm] = useState<any>({ driver_name: '', phone: '', vehicle_type: '', vehicle_number: '' });

  const stats = {
    pending: (deliveries || []).filter((d: any) => d.status === 'pending').length,
    inTransit: (deliveries || []).filter((d: any) => ['assigned', 'picked_up', 'in_transit'].includes(d.status)).length,
    delivered: (deliveries || []).filter((d: any) => d.status === 'delivered').length,
    failed: (deliveries || []).filter((d: any) => d.status === 'failed').length,
  };

  return (
    <div className="p-6 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6" />{t.title[lang]}</h1>
        <div className="flex gap-2">
          <Dialog open={showNewDriver} onOpenChange={setShowNewDriver}>
            <DialogTrigger asChild><Button variant="outline"><User className="h-4 w-4 mr-2" />{t.newDriver[lang]}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t.newDriver[lang]}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{t.driverName[lang]}</Label><Input value={newDriverForm.driver_name} onChange={e => setNewDriverForm((p: any) => ({ ...p, driver_name: e.target.value }))} /></div>
                <div><Label>{t.phone[lang]}</Label><Input value={newDriverForm.phone} onChange={e => setNewDriverForm((p: any) => ({ ...p, phone: e.target.value }))} /></div>
                <div><Label>{t.vehicle[lang]}</Label><Input value={newDriverForm.vehicle_type} onChange={e => setNewDriverForm((p: any) => ({ ...p, vehicle_type: e.target.value }))} /></div>
                <Button className="w-full" onClick={() => { createDriver.mutate(newDriverForm, { onSuccess: () => setShowNewDriver(false) }); }}>{t.create[lang]}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t.newOrder[lang]}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t.newOrder[lang]}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{t.customer[lang]}</Label><Input value={newOrder.customer_name} onChange={e => setNewOrder((p: any) => ({ ...p, customer_name: e.target.value }))} /></div>
                <div><Label>{t.phone[lang]}</Label><Input value={newOrder.customer_phone} onChange={e => setNewOrder((p: any) => ({ ...p, customer_phone: e.target.value }))} /></div>
                <div><Label>{t.address[lang]}</Label><Input value={newOrder.delivery_address} onChange={e => setNewOrder((p: any) => ({ ...p, delivery_address: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t.charge[lang]}</Label><Input type="number" value={newOrder.delivery_charge} onChange={e => setNewOrder((p: any) => ({ ...p, delivery_charge: Number(e.target.value) }))} /></div>
                  <div><Label>{t.collection[lang]}</Label><Input type="number" value={newOrder.collection_amount} onChange={e => setNewOrder((p: any) => ({ ...p, collection_amount: Number(e.target.value) }))} /></div>
                </div>
                {drivers?.length > 0 && (
                  <div><Label>{t.driver[lang]}</Label>
                    <Select onValueChange={v => setNewOrder((p: any) => ({ ...p, driver_id: v, status: 'assigned' }))}>
                      <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                      <SelectContent>{(drivers || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.driver_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <Button className="w-full" onClick={() => { createDelivery.mutate(newOrder, { onSuccess: () => setShowNewOrder(false) }); }}>{t.create[lang]}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><Package className="h-5 w-5 mx-auto mb-1 text-yellow-500" /><p className="text-xs text-muted-foreground">{t.pending[lang]}</p><p className="text-xl font-bold">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Truck className="h-5 w-5 mx-auto mb-1 text-blue-500" /><p className="text-xs text-muted-foreground">{t.inTransit[lang]}</p><p className="text-xl font-bold">{stats.inTransit}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" /><p className="text-xs text-muted-foreground">{t.delivered[lang]}</p><p className="text-xl font-bold">{stats.delivered}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><XCircle className="h-5 w-5 mx-auto mb-1 text-red-500" /><p className="text-xs text-muted-foreground">{t.failed[lang]}</p><p className="text-xl font-bold">{stats.failed}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList><TabsTrigger value="orders">{t.orders[lang]}</TabsTrigger><TabsTrigger value="drivers">{t.drivers[lang]}</TabsTrigger></TabsList>
        <TabsContent value="orders">
          {!(deliveries?.length) ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{t.noOrders[lang]}</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">{t.customer[lang]}</th>
              <th className="p-3 text-left">{t.address[lang]}</th>
              <th className="p-3">{t.status[lang]}</th>
              <th className="p-3 text-right">{t.charge[lang]}</th>
              <th className="p-3 text-right">{t.collection[lang]}</th>
              <th className="p-3">Actions</th>
            </tr></thead><tbody>
              {(deliveries || []).map((d: any) => (
                <tr key={d.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{d.delivery_number || d.id.slice(0, 8)}</td>
                  <td className="p-3"><div>{d.customer_name}</div><div className="text-xs text-muted-foreground">{d.customer_phone}</div></td>
                  <td className="p-3 text-xs max-w-[200px] truncate">{d.delivery_address}</td>
                  <td className="p-3"><Badge className={statusColors[d.status] || ''}>{d.status}</Badge></td>
                  <td className="p-3 text-right">{d.delivery_charge || 0}</td>
                  <td className="p-3 text-right">{d.collection_amount || 0}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {d.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateDelivery.mutate({ id: d.id, status: 'assigned' })}>Assign</Button>}
                      {d.status === 'assigned' && <Button size="sm" variant="outline" onClick={() => updateDelivery.mutate({ id: d.id, status: 'in_transit' })}>Dispatch</Button>}
                      {d.status === 'in_transit' && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateDelivery.mutate({ id: d.id, status: 'delivered' })}>✓</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateDelivery.mutate({ id: d.id, status: 'failed' })}>✗</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody></table></div></CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="drivers">
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>
            <th className="p-3 text-left">{t.driverName[lang]}</th>
            <th className="p-3 text-left">{t.phone[lang]}</th>
            <th className="p-3 text-left">{t.vehicle[lang]}</th>
            <th className="p-3">{t.available[lang]}</th>
          </tr></thead><tbody>
            {(drivers || []).map((d: any) => (
              <tr key={d.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium">{d.driver_name}</td>
                <td className="p-3">{d.phone || '-'}</td>
                <td className="p-3">{d.vehicle_type} {d.vehicle_number}</td>
                <td className="p-3"><Badge className={d.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{d.is_available ? 'Yes' : 'No'}</Badge></td>
              </tr>
            ))}
          </tbody></table></div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
