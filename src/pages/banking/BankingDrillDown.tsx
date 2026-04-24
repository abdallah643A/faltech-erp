import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, ArrowLeft, Filter, FileSpreadsheet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'doc', header: 'Doc #' },
  { key: 'partner', header: 'Partner' },
  { key: 'due_date', header: 'Due Date' },
  { key: 'currency', header: 'Currency' },
];


const METRIC_TYPES = [
  { value: 'receivables', label: 'Receivables' },
  { value: 'payables', label: 'Payables' },
  { value: 'incoming', label: 'Incoming Payments' },
  { value: 'outgoing', label: 'Outgoing Payments' },
];

const STATUS_FILTERS = ['all', 'open', 'paid', 'posted', 'draft', 'cancelled', 'overdue'];

export default function BankingDrillDown() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const [metricType, setMetricType] = useState('receivables');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['drill-ar', activeCompanyId, dateFrom, dateTo],
    enabled: metricType === 'receivables',
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('id, doc_num, customer_name, customer_code, total, balance_due, doc_date, doc_due_date, status, currency').gte('doc_date', dateFrom).lte('doc_date', dateTo).order('doc_date', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['drill-ap', activeCompanyId, dateFrom, dateTo],
    enabled: metricType === 'payables',
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('id, invoice_number, vendor_name, vendor_code, total, doc_date, doc_due_date, status, currency').gte('doc_date', dateFrom).lte('doc_date', dateTo).order('doc_date', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: inPayments = [] } = useQuery({
    queryKey: ['drill-in', activeCompanyId, dateFrom, dateTo],
    enabled: metricType === 'incoming',
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('id, doc_num, customer_name, total_amount, doc_date, status, payment_type, currency').gte('doc_date', dateFrom).lte('doc_date', dateTo).order('doc_date', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: outPayments = [] } = useQuery({
    queryKey: ['drill-out', activeCompanyId, dateFrom, dateTo],
    enabled: metricType === 'outgoing',
    queryFn: async () => {
      let q = (supabase.from('outgoing_payments' as any).select('id, doc_num, vendor_name, total_amount, doc_date, status, payment_type, currency').gte('doc_date', dateFrom).lte('doc_date', dateTo).order('doc_date', { ascending: false }).limit(500) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 2 }).format(v);

  // Normalize data to unified format
  const rows = useMemo(() => {
    let data: { id: string; docNum: string; partner: string; amount: number; date: string; dueDate?: string; status: string; currency: string; type: string }[] = [];
    if (metricType === 'receivables') {
      data = arInvoices.map(i => ({ id: i.id, docNum: `AR-${i.doc_num}`, partner: i.customer_name, amount: i.total || 0, date: i.doc_date, dueDate: i.doc_due_date || undefined, status: i.status || 'open', currency: i.currency || 'SAR', type: 'AR Invoice' }));
    } else if (metricType === 'payables') {
      data = apInvoices.map(i => ({ id: i.id, docNum: i.invoice_number, partner: i.vendor_name, amount: i.total || 0, date: i.doc_date, dueDate: i.doc_due_date || undefined, status: i.status, currency: i.currency || 'SAR', type: 'AP Invoice' }));
    } else if (metricType === 'incoming') {
      data = inPayments.map((p: any) => ({ id: p.id, docNum: `IP-${p.doc_num}`, partner: p.customer_name || '', amount: p.total_amount || 0, date: p.doc_date, status: p.status || 'draft', currency: p.currency || 'SAR', type: p.payment_type || 'Payment' }));
    } else {
      data = outPayments.map((p: any) => ({ id: p.id, docNum: `OP-${p.doc_num}`, partner: p.vendor_name || '', amount: p.total_amount || 0, date: p.doc_date, status: p.status || 'draft', currency: p.currency || 'SAR', type: p.payment_type || 'Payment' }));
    }

    // Apply filters
    return data.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search && !r.partner.toLowerCase().includes(search.toLowerCase()) && !r.docNum.toLowerCase().includes(search.toLowerCase())) return false;
      if (minAmount && r.amount < Number(minAmount)) return false;
      if (maxAmount && r.amount > Number(maxAmount)) return false;
      return true;
    });
  }, [metricType, arInvoices, apInvoices, inPayments, outPayments, statusFilter, search, minAmount, maxAmount]);

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  const exportToCSV = () => {
  const { t } = useLanguage();

    const headers = 'Doc Number,Partner,Amount,Date,Due Date,Status,Currency,Type\n';
    const csv = headers + rows.map(r => `${r.docNum},${r.partner},${r.amount},${r.date},${r.dueDate || ''},${r.status},${r.currency},${r.type}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banking-drilldown-${metricType}-${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    toast({ title: 'Exported', description: `${rows.length} rows exported to CSV` });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drill-Down Reports</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="banking-drill-down" title="Banking Drill Down" />
          <p className="text-sm text-muted-foreground">Click any metric to view underlying transactions</p>
        </div>
        <Button size="sm" onClick={exportToCSV}>
          <FileSpreadsheet className="h-3 w-3 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Metric Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {METRIC_TYPES.map(mt => (
          <Card key={mt.value} className={`cursor-pointer transition-all ${metricType === mt.value ? 'ring-2 ring-primary' : 'hover:bg-muted/30'}`} onClick={() => setMetricType(mt.value)}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{mt.label}</p>
              <p className="text-lg font-bold">
                {mt.value === 'receivables' ? arInvoices.length : mt.value === 'payables' ? apInvoices.length : mt.value === 'incoming' ? inPayments.length : outPayments.length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search partner or doc..." value={search} onChange={e => setSearch(e.target.value)} className="w-52 h-8 text-xs" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">From:</span>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8 text-xs" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">To:</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8 text-xs" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input type="number" placeholder="Min" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="w-24 h-8 text-xs" />
            <span className="text-xs">—</span>
            <Input type="number" placeholder="Max" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="w-24 h-8 text-xs" />
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{rows.length} transaction(s) found</span>
        <span className="text-sm font-bold">Total: SAR {fmt(totalAmount)}</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3">Doc #</th>
                  <th className="text-left p-3">Partner</th>
                  <th className="text-right p-3">{t('common.amount')}</th>
                  <th className="text-left p-3">{t('common.date')}</th>
                  <th className="text-left p-3">Due Date</th>
                  <th className="text-center p-3">{t('common.status')}</th>
                  <th className="text-center p-3">Currency</th>
                  <th className="text-left p-3">{t('common.type')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={r.id} className="border-b hover:bg-muted/20">
                    <td className="p-3 font-medium">{r.docNum}</td>
                    <td className="p-3 max-w-[200px] truncate">{r.partner}</td>
                    <td className="p-3 text-right font-medium">SAR {fmt(r.amount)}</td>
                    <td className="p-3">{r.date}</td>
                    <td className="p-3">{r.dueDate || '—'}</td>
                    <td className="p-3 text-center">
                      <Badge variant={r.status === 'posted' || r.status === 'paid' ? 'default' : r.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-center"><Badge variant="outline" className="text-[10px]">{r.currency}</Badge></td>
                    <td className="p-3">{r.type}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No transactions found for selected criteria</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
