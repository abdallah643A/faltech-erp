import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGiftCards } from '@/hooks/useGiftCards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Gift, Plus, RefreshCw, DollarSign, AlertTriangle } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'date', header: 'Date' },
  { key: 'before', header: 'Before' },
  { key: 'after', header: 'After' },
];


const t: Record<string, Record<string, string>> = {
  title: { en: 'Gift Cards & Store Credit', ar: 'بطاقات الهدايا والرصيد' },
  giftCards: { en: 'Gift Cards', ar: 'بطاقات الهدايا' },
  storeCredits: { en: 'Store Credits', ar: 'أرصدة المتجر' },
  transactions: { en: 'Transactions', ar: 'المعاملات' },
  newCard: { en: 'New Gift Card', ar: 'بطاقة جديدة' },
  cardNumber: { en: 'Card Number', ar: 'رقم البطاقة' },
  balance: { en: 'Balance', ar: 'الرصيد' },
  status: { en: 'Status', ar: 'الحالة' },
  type: { en: 'Type', ar: 'النوع' },
  issuedTo: { en: 'Issued To', ar: 'صادرة إلى' },
  expiry: { en: 'Expiry', ar: 'انتهاء الصلاحية' },
  initialBalance: { en: 'Initial Balance', ar: 'الرصيد الأولي' },
  create: { en: 'Create', ar: 'إنشاء' },
  recharge: { en: 'Recharge', ar: 'شحن' },
  redeem: { en: 'Redeem', ar: 'استرداد' },
  amount: { en: 'Amount', ar: 'المبلغ' },
  totalOutstanding: { en: 'Total Outstanding', ar: 'إجمالي المعلق' },
  activeCards: { en: 'Active Cards', ar: 'بطاقات نشطة' },
  noCards: { en: 'No gift cards yet', ar: 'لا توجد بطاقات هدايا بعد' },
  customer: { en: 'Customer', ar: 'العميل' },
  reason: { en: 'Reason', ar: 'السبب' },
  remaining: { en: 'Remaining', ar: 'المتبقي' },
};

export default function GiftCardPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const { giftCards, transactions, storeCredits, isLoading, createGiftCard, rechargeGiftCard, redeemGiftCard } = useGiftCards();
  const [showCreate, setShowCreate] = useState(false);
  const [newCard, setNewCard] = useState({ card_number: '', card_type: 'physical', initial_balance: 0, current_balance: 0, issued_to_name: '', expiry_date: '' });

  const activeCards = (giftCards || []).filter((c: any) => c.status === 'active');
  const totalOutstanding = activeCards.reduce((s: number, c: any) => s + (c.current_balance || 0), 0);

  const handleCreate = () => {
    const num = newCard.card_number || `GC-${Date.now().toString(36).toUpperCase()}`;
    createGiftCard.mutate({
      ...newCard, card_number: num, current_balance: newCard.initial_balance,
    }, { onSuccess: () => setShowCreate(false) });
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { active: 'bg-green-100 text-green-800', depleted: 'bg-gray-100 text-gray-800', expired: 'bg-red-100 text-red-800', blocked: 'bg-orange-100 text-orange-800' };
    return map[s] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.title[lang]}</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="gift-card-management" title="Gift Card Management" />
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t.newCard[lang]}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.newCard[lang]}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t.cardNumber[lang]}</Label><Input value={newCard.card_number} onChange={e => setNewCard(p => ({ ...p, card_number: e.target.value }))} placeholder="Auto-generated if empty" /></div>
              <div><Label>{t.type[lang]}</Label>
                <Select value={newCard.card_type} onValueChange={v => setNewCard(p => ({ ...p, card_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t.initialBalance[lang]}</Label><Input type="number" value={newCard.initial_balance} onChange={e => setNewCard(p => ({ ...p, initial_balance: Number(e.target.value) }))} /></div>
              <div><Label>{t.issuedTo[lang]}</Label><Input value={newCard.issued_to_name} onChange={e => setNewCard(p => ({ ...p, issued_to_name: e.target.value }))} /></div>
              <div><Label>{t.expiry[lang]}</Label><Input type="date" value={newCard.expiry_date} onChange={e => setNewCard(p => ({ ...p, expiry_date: e.target.value }))} /></div>
              <Button onClick={handleCreate} disabled={createGiftCard.isPending} className="w-full">{t.create[lang]}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><Gift className="h-6 w-6 mx-auto mb-2 text-purple-500" /><p className="text-sm text-muted-foreground">{t.activeCards[lang]}</p><p className="text-2xl font-bold">{activeCards.length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><DollarSign className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">{t.totalOutstanding[lang]}</p><p className="text-2xl font-bold">{totalOutstanding.toLocaleString()} SAR</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CreditCard className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">{t.storeCredits[lang]}</p><p className="text-2xl font-bold">{(storeCredits || []).length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards">{t.giftCards[lang]}</TabsTrigger>
          <TabsTrigger value="credits">{t.storeCredits[lang]}</TabsTrigger>
          <TabsTrigger value="txns">{t.transactions[lang]}</TabsTrigger>
        </TabsList>
        <TabsContent value="cards">
          {!(giftCards?.length) ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{t.noCards[lang]}</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>
              <th className="p-3 text-left">{t.cardNumber[lang]}</th>
              <th className="p-3 text-left">{t.type[lang]}</th>
              <th className="p-3 text-left">{t.issuedTo[lang]}</th>
              <th className="p-3 text-right">{t.balance[lang]}</th>
              <th className="p-3">{t.status[lang]}</th>
              <th className="p-3">{t.expiry[lang]}</th>
            </tr></thead><tbody>
              {(giftCards || []).map((c: any) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono font-medium">{c.card_number}</td>
                  <td className="p-3 capitalize">{c.card_type}</td>
                  <td className="p-3">{c.issued_to_name || '-'}</td>
                  <td className="p-3 text-right font-bold">{(c.current_balance || 0).toLocaleString()} SAR</td>
                  <td className="p-3"><Badge className={statusColor(c.status)}>{c.status}</Badge></td>
                  <td className="p-3">{c.expiry_date || '-'}</td>
                </tr>
              ))}
            </tbody></table></div></CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="credits">
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>
            <th className="p-3 text-left">{t.customer[lang]}</th>
            <th className="p-3 text-left">{t.reason[lang]}</th>
            <th className="p-3 text-right">{t.amount[lang]}</th>
            <th className="p-3 text-right">{t.remaining[lang]}</th>
            <th className="p-3">{t.status[lang]}</th>
            <th className="p-3">{t.expiry[lang]}</th>
          </tr></thead><tbody>
            {(storeCredits || []).map((c: any) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="p-3">{c.customer_name || '-'}</td>
                <td className="p-3">{c.reason || '-'}</td>
                <td className="p-3 text-right">{(c.credit_amount || 0).toLocaleString()}</td>
                <td className="p-3 text-right font-bold">{(c.remaining_amount || 0).toLocaleString()}</td>
                <td className="p-3"><Badge className={statusColor(c.status)}>{c.status}</Badge></td>
                <td className="p-3">{c.expiry_date || '-'}</td>
              </tr>
            ))}
          </tbody></table></div></CardContent></Card>
        </TabsContent>
        <TabsContent value="txns">
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">{t.type[lang]}</th>
            <th className="p-3 text-right">{t.amount[lang]}</th>
            <th className="p-3 text-right">Before</th>
            <th className="p-3 text-right">After</th>
          </tr></thead><tbody>
            {(transactions || []).map((tx: any) => (
              <tr key={tx.id} className="border-t hover:bg-muted/30">
                <td className="p-3">{new Date(tx.created_at).toLocaleDateString()}</td>
                <td className="p-3 capitalize">{tx.transaction_type}</td>
                <td className="p-3 text-right font-bold">{(tx.amount || 0).toLocaleString()}</td>
                <td className="p-3 text-right">{(tx.balance_before || 0).toLocaleString()}</td>
                <td className="p-3 text-right">{(tx.balance_after || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody></table></div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
