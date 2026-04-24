import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrencies, useExchangeRates } from '@/hooks/useBanking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Loader2, ArrowLeftRight, Trash2, RefreshCw } from 'lucide-react';

export default function ExchangeRates() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ from_currency: 'SAR', to_currency: '', rate_date: new Date().toISOString().split('T')[0], rate: '' });

  const { data: currencies } = useCurrencies();
  const { data: rates, isLoading, upsert, remove } = useExchangeRates();

  const filtered = (rates || []).filter(r =>
    r.from_currency?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.to_currency?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    upsert.mutate({ ...form, rate: Number(form.rate) }, { onSuccess: () => setDialogOpen(false) });
  };

  const getCurrencyName = (code: string) => {
    const c = (currencies || []).find(c => c.code === code);
    return language === 'ar' ? c?.name_ar || code : c?.name || code;
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'أسعار صرف العملات' : 'Exchange Rates'}</h1>
          <p className="text-muted-foreground">{language === 'ar' ? 'إدارة أسعار الصرف اليومية (ORTT)' : 'Daily exchange rate management (ORTT)'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setForm({ from_currency: 'SAR', to_currency: '', rate_date: new Date().toISOString().split('T')[0], rate: '' }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />{language === 'ar' ? 'إضافة سعر' : 'Add Rate'}
          </Button>
        </div>
      </div>

      {/* Currency Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {(currencies || []).filter(c => !c.is_system_currency && c.is_active).slice(0, 7).map(c => {
          const latestRate = (rates || []).find(r => r.to_currency === c.code);
          return (
            <Card key={c.code} className="text-center">
              <CardContent className="pt-4 pb-3">
                <p className="text-lg font-bold">{c.symbol} {c.code}</p>
                <p className="text-sm text-muted-foreground">{latestRate ? Number(latestRate.rate).toFixed(4) : '—'}</p>
                {latestRate && <p className="text-xs text-muted-foreground">{latestRate.rate_date}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              <CardTitle>{language === 'ar' ? 'جدول الأسعار' : 'Rate Table'}</CardTitle>
            </div>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={language === 'ar' ? 'بحث...' : 'Search currency...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد أسعار صرف' : 'No exchange rates found.'}</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead>{language === 'ar' ? 'من' : 'From'}</TableHead>
                    <TableHead>{language === 'ar' ? 'إلى' : 'To'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'السعر' : 'Rate'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'العكسي' : 'Inverse'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المصدر' : 'Source'}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.rate_date}</TableCell>
                      <TableCell><Badge variant="outline">{r.from_currency}</Badge> {getCurrencyName(r.from_currency)}</TableCell>
                      <TableCell><Badge variant="outline">{r.to_currency}</Badge> {getCurrencyName(r.to_currency)}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{Number(r.rate).toFixed(6)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{Number(r.inverse_rate).toFixed(6)}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.source}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{language === 'ar' ? 'إضافة سعر صرف' : 'Add Exchange Rate'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{language === 'ar' ? 'من عملة' : 'From Currency'}</Label>
              <Select value={form.from_currency} onValueChange={v => setForm({ ...form, from_currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(currencies || []).filter(c => c.is_active).map(c => <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'ar' ? 'إلى عملة' : 'To Currency'}</Label>
              <Select value={form.to_currency} onValueChange={v => setForm({ ...form, to_currency: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(currencies || []).filter(c => c.is_active && c.code !== form.from_currency).map(c => <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'ar' ? 'التاريخ' : 'Rate Date'}</Label>
              <Input type="date" value={form.rate_date} onChange={e => setForm({ ...form, rate_date: e.target.value })} />
            </div>
            <div>
              <Label>{language === 'ar' ? 'السعر' : 'Rate'}</Label>
              <Input type="number" step="0.000001" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} placeholder="e.g. 3.7500" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={!form.to_currency || !form.rate || upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
