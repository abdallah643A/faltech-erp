import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { usePOSItems, usePostPOSTransaction, usePOSHoldCarts } from '@/hooks/usePOSData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Search, Trash2, Minus, Plus, CreditCard, Banknote, ArrowRightLeft, ShoppingCart, X, Pause, Play, User, Grid3X3, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface CartItem {
  item_code: string; item_name: string; quantity: number; unit_price: number;
  discount_percent: number; tax_percent: number; line_total: number;
}

export default function POSTerminal() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: items } = usePOSItems();
  const postTxn = usePostPOSTransaction();
  const { data: holdCarts, holdCart, resumeCart } = usePOSHoldCarts();

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F12' && cart.length) { e.preventDefault(); setShowPayment(true); }
      if (e.key === 'Escape') { setShowPayment(false); setShowHeld(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length]);

  const categories = ['all', ...new Set((items || []).map((i: any) => i.item_group || 'Uncategorized'))];
  const filtered = (items || []).filter((i: any) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || i.description?.toLowerCase().includes(q) || i.item_code?.toLowerCase().includes(q) || i.barcode?.toLowerCase().includes(q);
    const matchCat = selectedCategory === 'all' || i.item_group === selectedCategory;
    return matchSearch && matchCat;
  });

  const addToCart = useCallback((item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_code === item.item_code);
      if (existing) return prev.map(c => c.item_code === item.item_code ? { ...c, quantity: c.quantity + 1, line_total: (c.quantity + 1) * c.unit_price * (1 - c.discount_percent / 100) } : c);
      const price = Number(item.default_price || item.unit_price || 0);
      return [...prev, { item_code: item.item_code, item_name: item.description, quantity: 1, unit_price: price, discount_percent: 0, tax_percent: 15, line_total: price }];
    });
    setSearchQuery('');
    searchRef.current?.focus();
  }, []);

  const updateQty = (code: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.item_code !== code) return c;
      const qty = Math.max(1, c.quantity + delta);
      return { ...c, quantity: qty, line_total: qty * c.unit_price * (1 - c.discount_percent / 100) };
    }));
  };

  const removeFromCart = (code: string) => setCart(prev => prev.filter(c => c.item_code !== code));

  const subtotal = cart.reduce((s, c) => s + c.line_total, 0);
  const taxTotal = cart.reduce((s, c) => s + (c.line_total * c.tax_percent / 100), 0);
  const grandTotal = subtotal + taxTotal;
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, Number(amountTendered || 0) - grandTotal) : 0;

  const handlePayment = async () => {
    if (!cart.length) return;
    try {
      await postTxn.mutateAsync({ lines: cart, payments: [{ method: paymentMethod, amount: grandTotal }], customerName });
      setCart([]); setAmountTendered(''); setShowPayment(false); setCustomerName('Walk-in Customer');
    } catch {}
  };

  const handleHold = async () => {
    if (!cart.length) return;
    await holdCart.mutateAsync({ cashier_id: user?.id, cashier_name: user?.email, customer_name: customerName, cart_items: cart, cart_total: grandTotal });
    setCart([]);
  };

  const handleResume = async (held: any) => {
    setCart(held.cart_items || []);
    setCustomerName(held.customer_name || 'Walk-in Customer');
    await resumeCart.mutateAsync(held.id);
    setShowHeld(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="h-12 bg-primary text-primary-foreground flex items-center px-4 gap-3 shrink-0">
        <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate('/pos')}>
          <X className="h-4 w-4 mr-1" /> Exit
        </Button>
        <Separator orientation="vertical" className="h-6 bg-primary-foreground/20" />
        <ShoppingCart className="h-4 w-4" />
        <span className="font-semibold text-sm">POS Terminal</span>
        <div className="flex-1" />
        <Badge variant="outline" className="text-primary-foreground border-primary-foreground/30 text-xs">{user?.email}</Badge>
        <span className="text-xs opacity-70">{new Date().toLocaleDateString()}</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r min-w-0">
          <div className="p-3 space-y-2 border-b">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input ref={searchRef} placeholder="Scan barcode or search items (F2)" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-10" autoFocus />
              </div>
              <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" className="h-10 w-10" onClick={() => setViewMode('grid')}><Grid3X3 className="h-4 w-4" /></Button>
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" className="h-10 w-10" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-1 pb-1">
                {categories.slice(0, 12).map(c => (
                  <Button key={c} variant={selectedCategory === c ? 'default' : 'outline'} size="sm" className="text-xs whitespace-nowrap h-7 px-3"
                    onClick={() => setSelectedCategory(c)}>{c === 'all' ? 'All Items' : c}</Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <ScrollArea className="flex-1 p-3">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {filtered.slice(0, 100).map((item: any) => (
                  <button key={item.item_code} onClick={() => addToCart(item)}
                    className="p-3 border rounded-lg hover:bg-accent/50 hover:border-primary/30 transition-all text-left active:scale-95">
                    <p className="text-xs font-medium truncate">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{item.item_code}</p>
                    <p className="text-sm font-bold text-primary mt-1">SAR {Number(item.default_price || 0).toFixed(2)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.slice(0, 100).map((item: any) => (
                  <button key={item.item_code} onClick={() => addToCart(item)}
                    className="w-full flex items-center justify-between p-2 border rounded hover:bg-accent/50 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.item_code} {item.barcode ? `| ${item.barcode}` : ''}</p>
                    </div>
                    <span className="text-sm font-bold text-primary ml-2">SAR {Number(item.default_price || 0).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
            {!filtered.length && <p className="text-center text-muted-foreground py-12">No items found</p>}
          </ScrollArea>
        </div>

        <div className="w-[380px] lg:w-[420px] flex flex-col bg-card shrink-0">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-8 text-sm" placeholder="Customer name" />
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="text-xs gap-1 flex-1" onClick={handleHold} disabled={!cart.length}><Pause className="h-3 w-3" /> Hold</Button>
              <Button variant="outline" size="sm" className="text-xs gap-1 flex-1" onClick={() => setShowHeld(true)}><Play className="h-3 w-3" /> Resume ({holdCarts?.length || 0})</Button>
              <Button variant="outline" size="sm" className="text-xs text-destructive gap-1" onClick={() => setCart([])} disabled={!cart.length}><Trash2 className="h-3 w-3" /> Clear</Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {cart.map((item) => (
                <div key={item.item_code} className="flex items-center gap-2 p-2 rounded border bg-background">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.item_name}</p>
                    <p className="text-[10px] text-muted-foreground">SAR {item.unit_price.toFixed(2)} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.item_code, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.item_code, 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <span className="text-sm font-bold w-20 text-right">SAR {item.line_total.toFixed(2)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.item_code)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
              {!cart.length && <p className="text-center text-muted-foreground py-12 text-sm">Cart is empty<br /><span className="text-xs">Search or scan items to begin</span></p>}
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-muted/30 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>SAR {subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax (15%)</span><span>SAR {taxTotal.toFixed(2)}</span></div>
            <Separator />
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">SAR {grandTotal.toFixed(2)}</span></div>
            <Button className="w-full h-12 text-base gap-2" disabled={!cart.length} onClick={() => setShowPayment(true)}>
              <CreditCard className="h-5 w-5" /> Pay (F12)
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Complete Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-primary">SAR {grandTotal.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">{cart.length} items • {customerName}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{ method: 'cash', icon: Banknote, label: 'Cash' }, { method: 'card', icon: CreditCard, label: 'Card' }, { method: 'transfer', icon: ArrowRightLeft, label: 'Transfer' }].map(p => (
                <Button key={p.method} variant={paymentMethod === p.method ? 'default' : 'outline'} className="h-16 flex-col gap-1" onClick={() => setPaymentMethod(p.method)}>
                  <p.icon className="h-5 w-5" /><span className="text-xs">{p.label}</span>
                </Button>
              ))}
            </div>
            {paymentMethod === 'cash' && (
              <div>
                <label className="text-sm font-medium">Amount Tendered</label>
                <Input type="number" value={amountTendered} onChange={e => setAmountTendered(e.target.value)} placeholder="0.00" className="text-lg h-12 mt-1" autoFocus />
                {Number(amountTendered) >= grandTotal && <p className="text-lg font-bold text-green-600 mt-2 text-center">Change: SAR {changeAmount.toFixed(2)}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button onClick={handlePayment} disabled={postTxn.isPending || (paymentMethod === 'cash' && Number(amountTendered) < grandTotal)} className="gap-2">
              {postTxn.isPending ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHeld} onOpenChange={setShowHeld}>
        <DialogContent>
          <DialogHeader><DialogTitle>Held Transactions</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(holdCarts || []).map((h: any) => (
              <div key={h.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="text-sm font-medium">{h.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{(h.cart_items as any[])?.length || 0} items • SAR {Number(h.cart_total || 0).toFixed(2)}</p>
                </div>
                <Button size="sm" onClick={() => handleResume(h)}>Resume</Button>
              </div>
            ))}
            {!holdCarts?.length && <p className="text-center text-muted-foreground py-4">No held transactions</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
