import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAbandonedCarts } from '@/hooks/useAbandonedCarts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, DollarSign, TrendingUp, Phone, CheckCircle, XCircle } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Abandoned Cart Recovery', ar: 'استرداد السلات المهجورة' },
  abandoned: { en: 'Abandoned', ar: 'مهجور' },
  contacted: { en: 'Contacted', ar: 'تم التواصل' },
  recovered: { en: 'Recovered', ar: 'مسترد' },
  totalValue: { en: 'Total Value', ar: 'القيمة الإجمالية' },
  recoveredValue: { en: 'Recovered Value', ar: 'القيمة المستردة' },
  recoveryRate: { en: 'Recovery Rate', ar: 'معدل الاسترداد' },
  all: { en: 'All', ar: 'الكل' },
};

const statusColors: Record<string, string> = {
  abandoned: 'bg-red-100 text-red-800', contacted: 'bg-blue-100 text-blue-800',
  follow_up: 'bg-yellow-100 text-yellow-800', recovered: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800', declined: 'bg-red-100 text-red-800',
};

export default function AbandonedCartRecoveryPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const [statusFilter, setStatusFilter] = useState('all');
  const { carts, isLoading, stats, updateRecovery } = useAbandonedCarts({ status: statusFilter });
  const recoveryRate = stats.total ? Math.round((stats.recovered / stats.total) * 100) : 0;

  return (
    <div className="p-6 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6" />{t.title[lang]}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.abandoned[lang], value: stats.abandoned, icon: XCircle },
          { label: t.contacted[lang], value: stats.contacted, icon: Phone },
          { label: t.recovered[lang], value: stats.recovered, icon: CheckCircle },
          { label: t.recoveryRate[lang], value: `${recoveryRate}%`, icon: TrendingUp },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><s.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" /><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="bg-primary/10 rounded-lg px-4 py-2"><p className="text-xs text-muted-foreground">{t.totalValue[lang]}</p><p className="text-lg font-bold text-primary">{stats.totalValue.toLocaleString()} SAR</p></div>
        <div className="bg-green-50 rounded-lg px-4 py-2"><p className="text-xs text-muted-foreground">{t.recoveredValue[lang]}</p><p className="text-lg font-bold text-green-700">{stats.recoveredValue.toLocaleString()} SAR</p></div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'abandoned', 'contacted', 'follow_up', 'recovered', 'expired', 'declined'].map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>{s === 'all' ? t.all[lang] : s.replace('_', ' ')}</Button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? <p>Loading...</p> : carts.map(cart => (
          <Card key={cart.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={statusColors[cart.recovery_status || 'abandoned']}>{cart.recovery_status}</Badge>
                    <Badge variant="outline">{cart.cart_type}</Badge>
                  </div>
                  <p className="text-sm font-medium">{cart.customer_name || 'Walk-in'} {cart.customer_phone && `• ${cart.customer_phone}`}</p>
                  <p className="text-xs text-muted-foreground">{Array.isArray(cart.cart_items) ? `${(cart.cart_items as any[]).length} items` : '0 items'} • {new Date(cart.created_at).toLocaleDateString()}</p>
                  {cart.follow_up_notes && <p className="text-xs mt-1 text-muted-foreground">{cart.follow_up_notes}</p>}
                </div>
                <div className="text-right space-y-1">
                  <p className="text-lg font-bold">{cart.cart_total} SAR</p>
                  <Select onValueChange={v => updateRecovery.mutate({ id: cart.id, recovery_status: v })}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Update" /></SelectTrigger>
                    <SelectContent>
                      {['contacted', 'follow_up', 'recovered', 'declined'].map(s => (
                        <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
