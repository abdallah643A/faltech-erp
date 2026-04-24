import { useState, useMemo } from 'react';
import { useRestaurantMenuItems, useRestaurantMenuCategories, useRestaurantOrders } from '@/hooks/useRestaurantData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, Utensils, Coffee, Truck, Car } from 'lucide-react';

interface CartItem { id: string; name: string; nameAr?: string; price: number; qty: number; modifiers: string; notes: string; station?: string; }

const ORDER_TYPES = [
  { value: 'dine_in', label: 'Dine In', icon: Utensils },
  { value: 'takeaway', label: 'Takeaway', icon: Coffee },
  { value: 'delivery', label: 'Delivery', icon: Truck },
  { value: 'drive_thru', label: 'Drive Thru', icon: Car },
];

export default function RestaurantPOS() {
  const { data: items } = useRestaurantMenuItems();
  const { data: categories } = useRestaurantMenuCategories();
  const { createOrder, addOrderLine, addPayment } = useRestaurantOrders();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [orderType, setOrderType] = useState('dine_in');
  const [customerName, setCustomerName] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [payMethod, setPayMethod] = useState('cash');
  const [cashGiven, setCashGiven] = useState('');

  const TAX_RATE = 0.15;

  const filtered = useMemo(() => {
    return (items || []).filter((i: any) => {
      if (!i.is_available || !i.is_active) return false;
      const q = search.toLowerCase();
      const matchSearch = !q || i.item_name?.toLowerCase().includes(q) || i.item_code?.toLowerCase().includes(q);
      const matchCat = activeCat === 'all' || i.category_id === activeCat;
      return matchSearch && matchCat;
    });
  }, [items, search, activeCat]);

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const change = Math.max(0, parseFloat(cashGiven || '0') - total);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.item_name, nameAr: item.item_name_ar, price: Number(item.base_price), qty: 1, modifiers: '', notes: '', station: item.kitchen_station }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const handleCheckout = async () => {
    if (!cart.length) return;
    try {
      const order = await createOrder.mutateAsync({
        order_type: orderType,
        customer_name: customerName || 'Walk-in',
        status: 'completed',
        subtotal,
        tax_amount: tax,
        grand_total: total,
        closed_at: new Date().toISOString(),
      });
      if (order?.id) {
        for (const item of cart) {
          await addOrderLine.mutateAsync({
            order_id: order.id,
            menu_item_id: item.id,
            item_name: item.name,
            item_name_ar: item.nameAr,
            quantity: item.qty,
            unit_price: item.price,
            line_total: item.price * item.qty,
            tax_amount: item.price * item.qty * TAX_RATE,
            kitchen_station: item.station,
            status: 'completed',
          });
        }
        await addPayment.mutateAsync({
          order_id: order.id,
          payment_method: payMethod,
          amount: total,
        });
      }
      setCart([]);
      setShowPayment(false);
      setCustomerName('');
      setCashGiven('');
    } catch {}
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left: Menu */}
      <div className="flex-1 flex flex-col overflow-hidden border-r">
        {/* Search + Order Type */}
        <div className="p-3 border-b space-y-2">
          <div className="flex gap-2">
            {ORDER_TYPES.map(t => (
              <Button key={t.value} variant={orderType === t.value ? 'default' : 'outline'} size="sm" onClick={() => setOrderType(t.value)} className="gap-1 text-xs">
                <t.icon className="h-3.5 w-3.5" />{t.label}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search or scan barcode..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" autoFocus />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 p-2 overflow-x-auto border-b bg-muted/30">
          <Badge variant={activeCat === 'all' ? 'default' : 'outline'} className="cursor-pointer whitespace-nowrap text-xs" onClick={() => setActiveCat('all')}>All</Badge>
          {(categories || []).map((c: any) => (
            <Badge key={c.id} variant={activeCat === c.id ? 'default' : 'outline'} className="cursor-pointer whitespace-nowrap text-xs" onClick={() => setActiveCat(c.id)}>{c.category_name}</Badge>
          ))}
        </div>

        {/* Item grid */}
        <ScrollArea className="flex-1 p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filtered.map((item: any) => (
              <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow border" onClick={() => addToCart(item)}>
                <CardContent className="p-3 text-center">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Utensils className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs font-medium truncate">{item.item_name}</p>
                  <p className="text-sm font-bold text-primary mt-1">SAR {Number(item.base_price).toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Cart */}
      <div className="w-[340px] flex flex-col bg-card">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Current Order</h2>
            <Badge variant="outline" className="text-xs">{cart.length} items</Badge>
          </div>
          <Input placeholder="Customer name..." value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-2 text-sm" />
        </div>

        <ScrollArea className="flex-1 p-3">
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No items in order</p>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">SAR {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <p className="text-xs font-bold w-16 text-right">{(item.price * item.qty).toFixed(2)}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setCart(c => c.filter(x => x.id !== item.id))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Totals */}
        <div className="border-t p-3 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>SAR {subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">VAT (15%)</span><span>SAR {tax.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span className="text-primary">SAR {total.toFixed(2)}</span></div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" disabled={!cart.length} onClick={() => { setCart([]); }}>Clear</Button>
            <Button size="sm" disabled={!cart.length} onClick={() => setShowPayment(true)} className="gap-1"><CreditCard className="h-3.5 w-3.5" /> Pay</Button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold text-primary">SAR {total.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'cash', label: 'Cash', icon: Banknote },
                { value: 'card', label: 'Card', icon: CreditCard },
                { value: 'digital', label: 'Digital', icon: Smartphone },
              ].map(m => (
                <Button key={m.value} variant={payMethod === m.value ? 'default' : 'outline'} className="flex-col h-16 gap-1" onClick={() => setPayMethod(m.value)}>
                  <m.icon className="h-5 w-5" /><span className="text-xs">{m.label}</span>
                </Button>
              ))}
            </div>
            {payMethod === 'cash' && (
              <div>
                <label className="text-sm font-medium">Cash Given</label>
                <Input type="number" value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="0.00" className="mt-1" />
                {parseFloat(cashGiven) >= total && <p className="text-sm text-green-600 mt-1">Change: SAR {change.toFixed(2)}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button onClick={handleCheckout} disabled={createOrder.isPending}>
              {createOrder.isPending ? 'Processing...' : 'Complete Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
