import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Trash2, Minus, Plus, CreditCard, Banknote, ArrowRightLeft, SplitSquareVertical, ShoppingCart, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import BankPOSPaymentDialog from '@/components/pos/BankPOSPaymentDialog';
import type { BankPOSPayment } from '@/hooks/useBankPOS';

interface CartItem {
  item_code: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
}

interface SplitLine {
  method: 'cash' | 'card' | 'transfer';
  amount: number;
  status: 'pending' | 'approved' | 'declined';
  paymentResult?: BankPOSPayment;
  reference?: string;
}

export default function POSQuickSale() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'split'>('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [showBankPOS, setShowBankPOS] = useState(false);
  const [cardPaymentApproved, setCardPaymentApproved] = useState(false);
  const [cardPaymentResult, setCardPaymentResult] = useState<BankPOSPayment | null>(null);
  const [splitLines, setSplitLines] = useState<SplitLine[]>([{ method: 'cash', amount: 0, status: 'pending' }, { method: 'card', amount: 0, status: 'pending' }]);
  const [showSplitCardDialog, setShowSplitCardDialog] = useState(false);
  const [activeSplitIdx, setActiveSplitIdx] = useState<number>(-1);
  const [transactionNo, setTransactionNo] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const lang = language === 'ar' ? 'ar' : 'en';

  const { data: items } = useQuery({
    queryKey: ['items-pos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select('item_code, description, unit_price, barcode, item_group').eq('is_sales_item', true).order('description');
      if (error) throw error;
      return data || [];
    },
  });

  const filteredItems = (items || []).filter(i =>
    i.item_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 20);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_code === item.item_code);
      if (existing) return prev.map(c => c.item_code === item.item_code ? { ...c, quantity: c.quantity + 1, line_total: (c.quantity + 1) * c.unit_price * (1 - c.discount_percent / 100) } : c);
      const price = Number(item.unit_price || 0);
      return [...prev, { item_code: item.item_code, item_name: item.description, quantity: 1, unit_price: price, discount_percent: 0, tax_percent: 15, line_total: price }];
    });
    setSearchQuery('');
    searchRef.current?.focus();
  };

  const updateQty = (itemCode: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.item_code !== itemCode) return c;
      const newQty = Math.max(1, c.quantity + delta);
      return { ...c, quantity: newQty, line_total: newQty * c.unit_price * (1 - c.discount_percent / 100) };
    }));
  };

  const removeFromCart = (itemCode: string) => setCart(prev => prev.filter(c => c.item_code !== itemCode));

  const subtotal = cart.reduce((s, c) => s + c.line_total, 0);
  const taxAmount = cart.reduce((s, c) => s + c.line_total * (c.tax_percent / 100), 0);
  const grandTotal = subtotal + taxAmount;
  const tendered = Number(amountTendered) || 0;
  const changeAmount = Math.max(0, tendered - grandTotal);

  const splitTotal = splitLines.reduce((s, l) => s + l.amount, 0);
  const splitRemaining = grandTotal - splitTotal;
  const allSplitPaid = paymentMethod === 'split' && Math.abs(splitRemaining) < 0.01 && splitLines.every(l => l.status === 'approved');

  const canCheckout = () => {
    if (cart.length === 0) return false;
    if (paymentMethod === 'card') return cardPaymentApproved;
    if (paymentMethod === 'split') return allSplitPaid;
    return true;
  };

  const handleCheckout = async () => {
    if (!canCheckout()) {
      if (paymentMethod === 'card' && !cardPaymentApproved) {
        toast({ title: lang === 'ar' ? 'يجب الدفع بالبطاقة أولاً' : 'Card payment required first', variant: 'destructive' });
        return;
      }
      toast({ title: 'Cannot complete', description: 'Payment validation failed', variant: 'destructive' });
      return;
    }

    const txnNo = transactionNo || 'POS-' + Date.now();
    setTransactionNo(txnNo);

    const { data: txn, error } = await supabase.from('pos_transactions').insert({
      transaction_no: txnNo, customer_name: customerName, subtotal, tax_amount: taxAmount,
      grand_total: grandTotal, payment_method: paymentMethod,
      amount_tendered: paymentMethod === 'cash' ? tendered : grandTotal,
      change_amount: paymentMethod === 'cash' ? changeAmount : 0,
      company_id: activeCompanyId, cashier_id: user?.id, status: 'completed',
    } as any).select().single();

    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    // Link card payment to POS transaction
    if (paymentMethod === 'card' && cardPaymentResult) {
      await supabase.from('bank_pos_payments').update({ pos_transaction_id: txn.id } as any).eq('id', cardPaymentResult.id);
    }

    // Save split payment lines
    if (paymentMethod === 'split') {
      for (const line of splitLines) {
        await supabase.from('pos_split_payments').insert({
          pos_transaction_id: txn.id, payment_method: line.method, amount: line.amount,
          status: line.status, bank_pos_payment_id: line.paymentResult?.id || null,
          card_last_four: line.paymentResult?.card_last_four, auth_code: line.paymentResult?.auth_code,
          reference: line.reference,
        } as any);
      }
    }

    toast({ title: lang === 'ar' ? 'تمت العملية' : 'Sale Complete', description: `${txnNo} — ${grandTotal.toFixed(2)} SAR` });
    resetSale();
  };

  const resetSale = () => {
    setCart([]); setAmountTendered(''); setCardPaymentApproved(false); setCardPaymentResult(null);
    setSplitLines([{ method: 'cash', amount: 0, status: 'pending' }, { method: 'card', amount: 0, status: 'pending' }]);
    setTransactionNo(''); searchRef.current?.focus();
  };

  const handleCardPaymentComplete = (payment: BankPOSPayment) => {
    setCardPaymentApproved(true);
    setCardPaymentResult(payment);
    setShowBankPOS(false);
  };

  const handleSplitCardPayment = (idx: number) => {
    if (splitLines[idx].amount <= 0) { toast({ title: 'Enter amount first', variant: 'destructive' }); return; }
    setActiveSplitIdx(idx);
    setShowSplitCardDialog(true);
  };

  const handleSplitCardComplete = (payment: BankPOSPayment) => {
    setSplitLines(prev => prev.map((l, i) => i === activeSplitIdx ? { ...l, status: 'approved', paymentResult: payment } : l));
    setShowSplitCardDialog(false);
  };

  const addSplitLine = () => setSplitLines(prev => [...prev, { method: 'cash', amount: 0, status: 'pending' }]);
  const removeSplitLine = (idx: number) => setSplitLines(prev => prev.filter((_, i) => i !== idx));
  const updateSplitLine = (idx: number, updates: Partial<SplitLine>) => setSplitLines(prev => prev.map((l, i) => i === idx ? { ...l, ...updates } : l));

  useEffect(() => { searchRef.current?.focus(); }, []);

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 page-enter p-0">
      {/* Left - Items */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 pb-2">
          <h1 className="text-xl font-bold text-foreground mb-2">{lang === 'ar' ? 'نقطة البيع' : 'POS Quick Sale'}</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input ref={searchRef} placeholder={lang === 'ar' ? 'مسح الباركود أو بحث...' : 'Scan barcode or search items...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-12 text-lg" autoFocus />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-2">
          {searchQuery.length > 0 && filteredItems.length > 0 && (
            <Card className="mb-4"><CardContent className="p-2">
              {filteredItems.map(item => (
                <button key={item.item_code} onClick={() => addToCart(item)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors text-left">
                  <div><p className="font-medium">{item.description}</p><p className="text-xs text-muted-foreground">{item.item_code} {item.barcode ? `• ${item.barcode}` : ''}</p></div>
                  <span className="font-bold text-primary">{Number(item.unit_price || 0).toFixed(2)} SAR</span>
                </button>
              ))}
            </CardContent></Card>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {(items || []).slice(0, 16).map(item => (
              <button key={item.item_code} onClick={() => addToCart(item)} className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-center">
                <p className="font-medium text-sm truncate">{item.description}</p>
                <p className="text-xs text-muted-foreground">{item.item_code}</p>
                <p className="font-bold text-primary mt-1">{Number(item.unit_price || 0).toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Cart & Payment */}
      <div className="w-[420px] flex flex-col border-l bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /><h2 className="font-bold">{lang === 'ar' ? 'السلة' : 'Current Basket'}</h2></div>
            <Badge variant="secondary">{cart.length} {lang === 'ar' ? 'صنف' : 'items'}</Badge>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{lang === 'ar' ? 'العميل:' : 'Customer:'}</span>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-7 text-sm" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">{lang === 'ar' ? 'السلة فارغة' : 'Cart is empty'}</div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.item_code} className="flex items-center gap-2 p-2 rounded-lg border bg-background">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">{item.unit_price.toFixed(2)} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.item_code, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-8 text-center text-sm font-mono">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.item_code, 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <span className="font-bold text-sm w-20 text-right">{item.line_total.toFixed(2)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.item_code)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary & Payment */}
        <div className="border-t p-4 space-y-2">
          <div className="flex justify-between text-sm"><span>{lang === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span><span>{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>{lang === 'ar' ? 'الضريبة' : 'Tax (15%)'}</span><span>{taxAmount.toFixed(2)}</span></div>
          <Separator />
          <div className="flex justify-between text-lg font-bold"><span>{lang === 'ar' ? 'الإجمالي' : 'TOTAL'}</span><span>{grandTotal.toFixed(2)} SAR</span></div>

          {/* Payment Method Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {([['cash', Banknote, lang === 'ar' ? 'نقدي' : 'Cash'], ['card', CreditCard, lang === 'ar' ? 'بطاقة' : 'Card'], ['transfer', ArrowRightLeft, lang === 'ar' ? 'تحويل' : 'Transfer'], ['split', SplitSquareVertical, lang === 'ar' ? 'مقسم' : 'Split']] as const).map(([m, Icon, label]) => (
              <Button key={m} variant={paymentMethod === m ? 'default' : 'outline'} size="sm" onClick={() => { setPaymentMethod(m); setCardPaymentApproved(false); setCardPaymentResult(null); }} className="flex flex-col h-auto py-2">
                <Icon className="h-4 w-4" /><span className="text-xs mt-1">{label}</span>
              </Button>
            ))}
          </div>

          {/* Cash input */}
          {paymentMethod === 'cash' && (
            <div className="flex gap-2 items-center">
              <Input placeholder={lang === 'ar' ? 'المبلغ المدفوع' : 'Amount tendered'} value={amountTendered} onChange={e => setAmountTendered(e.target.value)} className="h-9" type="number" />
              {changeAmount > 0 && <span className="text-sm font-bold text-primary whitespace-nowrap">{lang === 'ar' ? 'الباقي' : 'Change'}: {changeAmount.toFixed(2)}</span>}
            </div>
          )}

          {/* Card payment status */}
          {paymentMethod === 'card' && (
            <div className="space-y-2">
              {cardPaymentApproved ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{lang === 'ar' ? 'تم الدفع بالبطاقة' : 'Card Payment Approved'}</p>
                    <p className="text-xs text-green-600">{cardPaymentResult?.card_type} ****{cardPaymentResult?.card_last_four} • Auth: {cardPaymentResult?.auth_code}</p>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full gap-2" onClick={() => setShowBankPOS(true)} disabled={cart.length === 0}>
                  <Smartphone className="h-4 w-4" />{lang === 'ar' ? 'إرسال لجهاز POS البنكي' : 'Send to Bank POS Terminal'}
                </Button>
              )}
            </div>
          )}

          {/* Split payment */}
          {paymentMethod === 'split' && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {splitLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border bg-background">
                  <select value={line.method} onChange={e => updateSplitLine(idx, { method: e.target.value as any, status: 'pending', paymentResult: undefined })} className="h-7 text-xs border rounded px-1 bg-background">
                    <option value="cash">{lang === 'ar' ? 'نقدي' : 'Cash'}</option>
                    <option value="card">{lang === 'ar' ? 'بطاقة' : 'Card'}</option>
                    <option value="transfer">{lang === 'ar' ? 'تحويل' : 'Transfer'}</option>
                  </select>
                  <Input type="number" value={line.amount || ''} onChange={e => updateSplitLine(idx, { amount: Number(e.target.value) || 0 })} className="h-7 text-sm w-24" placeholder="Amount" />
                  {line.method === 'card' && line.status !== 'approved' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSplitCardPayment(idx)}><CreditCard className="h-3 w-3 mr-1" />Pay</Button>
                  )}
                  {line.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {line.method !== 'card' && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateSplitLine(idx, { status: 'approved' })}>✓</Button>}
                  {splitLines.length > 2 && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeSplitLine(idx)}><X className="h-3 w-3" /></Button>}
                </div>
              ))}
              <div className="flex justify-between text-xs">
                <Button size="sm" variant="ghost" onClick={addSplitLine}>+ Add</Button>
                <span className={splitRemaining > 0.01 ? 'text-destructive font-bold' : 'text-green-600 font-bold'}>
                  {lang === 'ar' ? 'المتبقي' : 'Remaining'}: {splitRemaining.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Button className="w-full h-12 text-lg" onClick={handleCheckout} disabled={!canCheckout()}>
            {lang === 'ar' ? 'إتمام البيع' : 'Complete Sale'} — {grandTotal.toFixed(2)} SAR
          </Button>
        </div>
      </div>

      {/* Bank POS Dialog for full card payment */}
      <BankPOSPaymentDialog
        open={showBankPOS} onOpenChange={setShowBankPOS}
        amount={grandTotal} sourceModule="pos_quick_sale"
        customerName={customerName} sourceDocumentNumber={transactionNo || undefined}
        onPaymentComplete={handleCardPaymentComplete}
      />

      {/* Bank POS Dialog for split card payment */}
      <BankPOSPaymentDialog
        open={showSplitCardDialog} onOpenChange={setShowSplitCardDialog}
        amount={activeSplitIdx >= 0 ? splitLines[activeSplitIdx]?.amount || 0 : 0}
        sourceModule="pos_split" customerName={customerName}
        onPaymentComplete={handleSplitCardComplete}
      />
    </div>
  );
}
