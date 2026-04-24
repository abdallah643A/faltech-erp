import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, X, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

interface ExchangeRate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate_date: string;
  exchange_rate: number;
  indirect_rate: number | null;
  rate_type: string;
}

const DEFAULT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
];

export default function ExchangeRates() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [newRow, setNewRow] = useState({ currency_code: 'USD', currency_name: 'US Dollar', rate_date: new Date().toISOString().slice(0, 10), exchange_rate: '1', indirect_rate: '', rate_type: 'daily' });

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['exchange-rates', activeCompanyId, filterCurrency, filterFrom, filterTo],
    queryFn: async () => {
      let q = (supabase as any).from('exchange_rates').select('*').eq('company_id', activeCompanyId!).order('rate_date', { ascending: false });
      if (filterCurrency) q = q.eq('currency_code', filterCurrency);
      if (filterFrom) q = q.gte('rate_date', filterFrom);
      if (filterTo) q = q.lte('rate_date', filterTo);
      const { data, error } = await q;
      if (error) throw error;
      return data as ExchangeRate[];
    },
    enabled: !!activeCompanyId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('exchange_rates').insert({
        currency_code: newRow.currency_code,
        currency_name: newRow.currency_name,
        rate_date: newRow.rate_date,
        exchange_rate: Number(newRow.exchange_rate),
        indirect_rate: newRow.indirect_rate ? Number(newRow.indirect_rate) : null,
        rate_type: newRow.rate_type,
        company_id: activeCompanyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      setIsAdding(false);
      toast.success('Rate added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('exchange_rates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      toast.success('Rate deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6" />
            {language === 'ar' ? 'أسعار الصرف' : 'Exchange Rates & Indexes'}
          </h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'إدارة أسعار صرف العملات' : 'Manage currency exchange rates'}</p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {language === 'ar' ? 'إضافة سعر' : 'Add Rate'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">{language === 'ar' ? 'العملة' : 'Currency'}</label>
          <select className="block w-36 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={filterCurrency} onChange={e => setFilterCurrency(e.target.value)}>
            <option value="">All</option>
            {DEFAULT_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{language === 'ar' ? 'من تاريخ' : 'From Date'}</label>
          <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="h-8 w-40" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{language === 'ar' ? 'إلى تاريخ' : 'To Date'}</label>
          <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="h-8 w-40" />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead>{language === 'ar' ? 'رمز العملة' : 'Currency Code'}</TableHead>
              <TableHead>{language === 'ar' ? 'اسم العملة' : 'Currency Name'}</TableHead>
              <TableHead className="text-right">{language === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}</TableHead>
              <TableHead className="text-right">{language === 'ar' ? 'السعر غير المباشر' : 'Indirect Rate'}</TableHead>
              <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && (
              <TableRow>
                <TableCell><Input type="date" value={newRow.rate_date} onChange={e => setNewRow({ ...newRow, rate_date: e.target.value })} className="h-8" /></TableCell>
                <TableCell>
                  <select className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={newRow.currency_code} onChange={e => {
                      const cur = DEFAULT_CURRENCIES.find(c => c.code === e.target.value);
                      setNewRow({ ...newRow, currency_code: e.target.value, currency_name: cur?.name || e.target.value });
                    }}>
                    {DEFAULT_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </TableCell>
                <TableCell><Input value={newRow.currency_name} onChange={e => setNewRow({ ...newRow, currency_name: e.target.value })} className="h-8" /></TableCell>
                <TableCell><Input type="number" step="0.000001" value={newRow.exchange_rate} onChange={e => setNewRow({ ...newRow, exchange_rate: e.target.value })} className="h-8 text-right" /></TableCell>
                <TableCell><Input type="number" step="0.000001" value={newRow.indirect_rate} onChange={e => setNewRow({ ...newRow, indirect_rate: e.target.value })} className="h-8 text-right" placeholder="—" /></TableCell>
                <TableCell>
                  <select className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={newRow.rate_type} onChange={e => setNewRow({ ...newRow, rate_type: e.target.value })}>
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="closing">Closing</option>
                  </select>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addMutation.mutate()}><Save className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAdding(false)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : rates.length === 0 && !isAdding ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No exchange rates found</TableCell></TableRow>
            ) : (
              rates.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.rate_date}</TableCell>
                  <TableCell className="font-mono font-medium">{r.currency_code}</TableCell>
                  <TableCell>{r.currency_name}</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.exchange_rate).toFixed(6)}</TableCell>
                  <TableCell className="text-right font-mono">{r.indirect_rate ? Number(r.indirect_rate).toFixed(6) : '—'}</TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 rounded bg-muted">{r.rate_type}</span></TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
