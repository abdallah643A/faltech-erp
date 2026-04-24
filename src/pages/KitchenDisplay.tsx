import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useKitchenDisplay } from '@/hooks/useKitchenDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChefHat, Clock, AlertTriangle, CheckCircle, Plus, Timer } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Kitchen / Preparation Display', ar: 'شاشة المطبخ / التحضير' },
  pending: { en: 'Pending', ar: 'في الانتظار' },
  preparing: { en: 'Preparing', ar: 'قيد التحضير' },
  ready: { en: 'Ready', ar: 'جاهز' },
  delayed: { en: 'Delayed', ar: 'متأخر' },
  accept: { en: 'Accept', ar: 'قبول' },
  start: { en: 'Start', ar: 'بدء' },
  done: { en: 'Done', ar: 'تم' },
  pickup: { en: 'Picked Up', ar: 'تم الاستلام' },
  customer: { en: 'Customer', ar: 'العميل' },
  items: { en: 'Items', ar: 'العناصر' },
  instructions: { en: 'Special Instructions', ar: 'تعليمات خاصة' },
  stations: { en: 'Stations', ar: 'المحطات' },
  addStation: { en: 'Add Station', ar: 'إضافة محطة' },
  stationName: { en: 'Station Name', ar: 'اسم المحطة' },
  stationType: { en: 'Type', ar: 'النوع' },
  noOrders: { en: 'No orders in queue', ar: 'لا توجد طلبات' },
  markDelay: { en: 'Mark Delay', ar: 'تسجيل تأخير' },
  estReady: { en: 'Est. Ready', ar: 'الجاهزية المتوقعة' },
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  accepted: 'bg-blue-100 text-blue-800 border-blue-300',
  preparing: 'bg-purple-100 text-purple-800 border-purple-300',
  ready: 'bg-green-100 text-green-800 border-green-300',
  delayed: 'bg-red-100 text-red-800 border-red-300',
  picked_up: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function KitchenDisplayPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const { stations, orders, isLoading, updateOrderStatus, createStation } = useKitchenDisplay();
  const [showAddStation, setShowAddStation] = useState(false);
  const [newStation, setNewStation] = useState({ station_name: '', station_type: 'kitchen' });

  const grouped = {
    pending: (orders || []).filter((o: any) => o.status === 'pending'),
    preparing: (orders || []).filter((o: any) => ['accepted', 'preparing'].includes(o.status)),
    ready: (orders || []).filter((o: any) => o.status === 'ready'),
    delayed: (orders || []).filter((o: any) => o.status === 'delayed'),
  };

  const getTimeSince = (created: string) => {
    const mins = Math.floor((Date.now() - new Date(created).getTime()) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const OrderCard = ({ order }: { order: any }) => (
    <Card className={`border-2 ${statusColors[order.status] || ''}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg">#{order.order_number || order.id.slice(0, 6)}</span>
          <div className="flex items-center gap-1 text-sm">
            <Timer className="h-3 w-3" />
            {getTimeSince(order.created_at)}
          </div>
        </div>
        {order.customer_name && <p className="text-sm text-muted-foreground">{order.customer_name}</p>}
        {order.priority !== 'normal' && <Badge variant={order.priority === 'urgent' || order.priority === 'vip' ? 'destructive' : 'secondary'}>{order.priority}</Badge>}
        {order.items && Array.isArray(order.items) && (
          <ul className="text-sm space-y-1">
            {order.items.map((item: any, i: number) => (
              <li key={i} className="flex justify-between"><span>{item.name || item.item_name}</span><span className="font-medium">x{item.qty || item.quantity || 1}</span></li>
            ))}
          </ul>
        )}
        {order.special_instructions && <p className="text-xs italic bg-yellow-50 p-2 rounded">{order.special_instructions}</p>}
        <div className="flex gap-2 pt-2">
          {order.status === 'pending' && <Button size="sm" onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'accepted' })}>{t.accept[lang]}</Button>}
          {order.status === 'accepted' && <Button size="sm" onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'preparing' })}>{t.start[lang]}</Button>}
          {order.status === 'preparing' && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'ready' })}>{t.done[lang]}</Button>
              <Button size="sm" variant="destructive" onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'delayed' })}>{t.markDelay[lang]}</Button>
            </>
          )}
          {order.status === 'ready' && <Button size="sm" variant="outline" onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'picked_up' })}>{t.pickup[lang]}</Button>}
          {order.status === 'delayed' && <Button size="sm" onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'preparing' })}>{t.start[lang]}</Button>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ChefHat className="h-6 w-6" />{t.title[lang]}</h1>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">{t.pending[lang]}: {grouped.pending.length}</Badge>
          <Badge variant="outline">{t.preparing[lang]}: {grouped.preparing.length}</Badge>
          <Badge className="bg-green-100 text-green-800">{t.ready[lang]}: {grouped.ready.length}</Badge>
          {grouped.delayed.length > 0 && <Badge variant="destructive">{t.delayed[lang]}: {grouped.delayed.length}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Column */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-yellow-500" />{t.pending[lang]} ({grouped.pending.length})</h2>
          {grouped.pending.length === 0 ? <p className="text-sm text-muted-foreground">{t.noOrders[lang]}</p> : grouped.pending.map((o: any) => <OrderCard key={o.id} order={o} />)}
        </div>
        {/* Preparing Column */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><ChefHat className="h-4 w-4 text-purple-500" />{t.preparing[lang]} ({grouped.preparing.length})</h2>
          {grouped.preparing.map((o: any) => <OrderCard key={o.id} order={o} />)}
        </div>
        {/* Ready Column */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />{t.ready[lang]} ({grouped.ready.length})</h2>
          {grouped.ready.map((o: any) => <OrderCard key={o.id} order={o} />)}
        </div>
        {/* Delayed Column */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />{t.delayed[lang]} ({grouped.delayed.length})</h2>
          {grouped.delayed.map((o: any) => <OrderCard key={o.id} order={o} />)}
        </div>
      </div>
    </div>
  );
}
