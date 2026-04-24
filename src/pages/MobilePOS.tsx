import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, Scan, ShoppingCart, CreditCard, Search, Wifi, WifiOff, Receipt } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Mobile Handheld POS', ar: 'نقطة بيع محمولة' },
  scan: { en: 'Scan', ar: 'مسح' },
  cart: { en: 'Cart', ar: 'السلة' },
  pay: { en: 'Pay', ar: 'دفع' },
  search: { en: 'Search Items', ar: 'بحث المنتجات' },
  barcode: { en: 'Barcode', ar: 'الباركود' },
  customer: { en: 'Customer', ar: 'العميل' },
  total: { en: 'Total', ar: 'المجموع' },
  checkout: { en: 'Checkout', ar: 'الدفع' },
  addItem: { en: 'Add Item', ar: 'إضافة منتج' },
  clearCart: { en: 'Clear', ar: 'مسح' },
  qty: { en: 'Qty', ar: 'الكمية' },
  price: { en: 'Price', ar: 'السعر' },
  receipt: { en: 'Receipt', ar: 'الإيصال' },
  offline: { en: 'Offline', ar: 'غير متصل' },
  online: { en: 'Online', ar: 'متصل' },
  emptyCart: { en: 'Cart is empty. Scan or search items.', ar: 'السلة فارغة. قم بمسح أو البحث عن منتجات.' },
  quickItems: { en: 'Quick Items', ar: 'منتجات سريعة' },
  mobileNote: { en: 'Optimized for tablets and phones. Use barcode scanner or search to add items.', ar: 'محسن للأجهزة اللوحية والهواتف. استخدم ماسح الباركود أو البحث لإضافة منتجات.' },
};

interface CartItem {
  code: string;
  name: string;
  price: number;
  qty: number;
}

export default function MobilePOSPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isOnline] = useState(navigator.onLine);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.code === item.code);
      if (existing) return prev.map(i => i.code === item.code ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (code: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.code !== code));
    else setCart(prev => prev.map(i => i.code === code ? { ...i, qty } : i));
  };

  const handleBarcodeScan = () => {
    if (!barcodeInput) return;
    addToCart({ code: barcodeInput, name: `Item ${barcodeInput}`, price: 0, qty: 1 });
    setBarcodeInput('');
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Smartphone className="h-5 w-5" />{t.title[lang]}</h1>
        <Badge variant="outline" className={isOnline ? 'text-green-600' : 'text-red-600'}>
          {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
          {isOnline ? t.online[lang] : t.offline[lang]}
        </Badge>
      </div>

      {/* Barcode Scanner */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder={t.barcode[lang]} value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBarcodeScan()} />
            </div>
            <Button onClick={handleBarcodeScan} size="sm"><Scan className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder={t.search[lang]} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {/* Cart */}
      <Card>
        <CardHeader className="p-3 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" />{t.cart[lang]} ({cart.length})</CardTitle>
            {cart.length > 0 && <Button variant="ghost" size="sm" onClick={() => setCart([])}>{t.clearCart[lang]}</Button>}
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {cart.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-6">{t.emptyCart[lang]}</p>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.code} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.code} • {item.price} SAR</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateQty(item.code, item.qty - 1)}>-</Button>
                    <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateQty(item.code, item.qty + 1)}>+</Button>
                    <span className="text-sm font-bold w-16 text-right">{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total & Checkout */}
      {cart.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold">{t.total[lang]}</span>
              <span className="text-2xl font-bold text-primary">{total.toFixed(2)} SAR</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full"><Receipt className="h-4 w-4 mr-2" />{t.receipt[lang]}</Button>
              <Button className="w-full"><CreditCard className="h-4 w-4 mr-2" />{t.checkout[lang]}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-center text-muted-foreground">{t.mobileNote[lang]}</p>
    </div>
  );
}
