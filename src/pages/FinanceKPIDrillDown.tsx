import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Download, Filter, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

type MetricType = 'revenue' | 'expenses' | 'receivables' | 'payables' | 'collected' | 'net';

export default function FinanceKPIDrillDown() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const metricType = (searchParams.get('metric') || 'revenue') as MetricType;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const { data: arInvoices = [], isLoading: arLoading } = useQuery({
    queryKey: ['kpi-drill-ar'],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoices')
        .select('id, doc_num, total, balance_due, status, doc_date, doc_due_date, customer_name, customer_code, currency')
        .order('doc_date', { ascending: false })
        .limit(1000);
      return data || [];
    },
    enabled: ['revenue', 'receivables', 'net'].includes(metricType),
  });

  const { data: apInvoices = [], isLoading: apLoading } = useQuery({
    queryKey: ['kpi-drill-ap'],
    queryFn: async () => {
      const { data } = await supabase.from('ap_invoices')
        .select('id, invoice_number, total, status, doc_date, doc_due_date, vendor_name, vendor_code, currency')
        .order('doc_date', { ascending: false })
        .limit(1000);
      return data || [];
    },
    enabled: ['expenses', 'payables', 'net'].includes(metricType),
  });

  const { data: payments = [], isLoading: payLoading } = useQuery({
    queryKey: ['kpi-drill-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('incoming_payments')
        .select('id, doc_num, total_amount, doc_date, status, customer_name, payment_type, currency')
        .order('doc_date', { ascending: false })
        .limit(1000);
      return (data || []) as any[];
    },
    enabled: metricType === 'collected',
  });

  const isLoading = arLoading || apLoading || payLoading;

  const metricConfig: Record<MetricType, { title: string; titleAr: string; color: string }> = {
    revenue: { title: 'Total Revenue', titleAr: 'إجمالي الإيرادات', color: 'text-green-600' },
    expenses: { title: 'Total Expenses', titleAr: 'إجمالي المصروفات', color: 'text-red-600' },
    receivables: { title: 'Accounts Receivable', titleAr: 'الذمم المدينة', color: 'text-blue-600' },
    payables: { title: 'Accounts Payable', titleAr: 'الذمم الدائنة', color: 'text-yellow-600' },
    collected: { title: 'Collected Payments', titleAr: 'المدفوعات المحصلة', color: 'text-purple-600' },
    net: { title: 'Net Position', titleAr: 'صافي الوضع', color: 'text-primary' },
  };

  const config = metricConfig[metricType];

  const filteredData = useMemo(() => {
    let rows: any[] = [];

    if (metricType === 'revenue') {
      rows = arInvoices.map(i => ({ id: i.id, docNum: i.doc_num, date: i.doc_date, entity: i.customer_name, amount: i.total, status: i.status, type: 'AR Invoice' }));
    } else if (metricType === 'expenses') {
      rows = apInvoices.map(i => ({ id: i.id, docNum: i.invoice_number, date: i.doc_date, entity: i.vendor_name, amount: i.total, status: i.status, type: 'AP Invoice' }));
    } else if (metricType === 'receivables') {
      rows = arInvoices.filter(i => (i.balance_due || 0) > 0).map(i => ({ id: i.id, docNum: i.doc_num, date: i.doc_date, dueDate: i.doc_due_date, entity: i.customer_name, amount: i.balance_due, status: i.status, type: 'AR Invoice' }));
    } else if (metricType === 'payables') {
      rows = apInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').map(i => ({ id: i.id, docNum: i.invoice_number, date: i.doc_date, dueDate: i.doc_due_date, entity: i.vendor_name, amount: i.total, status: i.status, type: 'AP Invoice' }));
    } else if (metricType === 'collected') {
      rows = payments.filter(p => p.status !== 'cancelled').map(p => ({ id: p.id, docNum: p.doc_num, date: p.doc_date, entity: p.customer_name, amount: p.total_amount, status: p.status, type: p.payment_type || 'Payment' }));
    } else if (metricType === 'net') {
      const arRows = arInvoices.map(i => ({ id: i.id, docNum: i.doc_num, date: i.doc_date, entity: i.customer_name, amount: i.total, status: i.status, type: 'Revenue (AR)' }));
      const apRows = apInvoices.map(i => ({ id: i.id, docNum: i.invoice_number, date: i.doc_date, entity: i.vendor_name, amount: -(i.total || 0), status: i.status, type: 'Expense (AP)' }));
      rows = [...arRows, ...apRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Apply filters
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      rows = rows.filter(r => r.entity?.toLowerCase().includes(s) || String(r.docNum).includes(s));
    }
    if (statusFilter !== 'all') {
      rows = rows.filter(r => r.status === statusFilter);
    }
    if (dateFrom) {
      rows = rows.filter(r => new Date(r.date) >= dateFrom);
    }
    if (dateTo) {
      rows = rows.filter(r => new Date(r.date) <= dateTo);
    }
    if (amountMin) {
      rows = rows.filter(r => Math.abs(r.amount || 0) >= Number(amountMin));
    }
    if (amountMax) {
      rows = rows.filter(r => Math.abs(r.amount || 0) <= Number(amountMax));
    }

    return rows;
  }, [metricType, arInvoices, apInvoices, payments, searchTerm, statusFilter, dateFrom, dateTo, amountMin, amountMax]);

  const totalAmount = filteredData.reduce((s, r) => s + (r.amount || 0), 0);
  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(v));

  const exportCSV = () => {
  const { t } = useLanguage();

    const headers = 'Doc#,Date,Entity,Amount,Status,Type\n';
    const csvRows = filteredData.map(r => `${r.docNum},"${r.date}","${r.entity}",${r.amount},${r.status},"${r.type}"`).join('\n');
    const blob = new Blob([headers + csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finance-drilldown-${metricType}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statuses = [...new Set(filteredData.map(r => r.status).filter(Boolean))];

  return (
    <div className="space-y-4 page-enter">
      {/* Header with back navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/finance-dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">{isAr ? config.titleAr : config.title}</h1>
          <p className="text-xs text-muted-foreground">
            {filteredData.length} {isAr ? 'سجل' : 'records'} • {isAr ? 'الإجمالي' : 'Total'}: <span className={config.color}>SAR {fmt(totalAmount)}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={exportCSV}>
          <Download className="h-3 w-3 mr-1" /> {isAr ? 'تصدير' : 'Export CSV'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={isAr ? 'بحث بالاسم أو الرقم...' : 'Search by name or doc#...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder={isAr ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {dateFrom ? format(dateFrom, 'MMM d') : isAr ? 'من' : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUI mode="single" selected={dateFrom} onSelect={setDateFrom} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {dateTo ? format(dateTo, 'MMM d') : isAr ? 'إلى' : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUI mode="single" selected={dateTo} onSelect={setDateTo} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Input placeholder={isAr ? 'حد أدنى' : 'Min amt'} value={amountMin} onChange={e => setAmountMin(e.target.value)} className="w-[80px] h-8 text-xs" type="number" />
            <Input placeholder={isAr ? 'حد أقصى' : 'Max amt'} value={amountMax} onChange={e => setAmountMax(e.target.value)} className="w-[80px] h-8 text-xs" type="number" />
            {(searchTerm || statusFilter !== 'all' || dateFrom || dateTo || amountMin || amountMax) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDateFrom(undefined); setDateTo(undefined); setAmountMin(''); setAmountMax(''); }}>
                {isAr ? 'مسح' : 'Clear'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2.5 font-medium">{isAr ? 'رقم المستند' : 'Doc #'}</th>
                    <th className="text-left p-2.5 font-medium">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="text-left p-2.5 font-medium">{isAr ? 'الجهة' : 'Entity'}</th>
                    <th className="text-right p-2.5 font-medium">{isAr ? 'المبلغ' : 'Amount'}</th>
                    <th className="text-center p-2.5 font-medium">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="text-center p-2.5 font-medium">{isAr ? 'النوع' : 'Type'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 100).map((row, idx) => (
                    <tr key={row.id || idx} className="border-t hover:bg-accent/30 transition-colors">
                      <td className="p-2.5 font-mono">{row.docNum || '—'}</td>
                      <td className="p-2.5">{row.date ? format(parseISO(row.date), 'MMM d, yyyy') : '—'}</td>
                      <td className="p-2.5 truncate max-w-[200px]">{row.entity || '—'}</td>
                      <td className={`p-2.5 text-right font-mono font-bold ${(row.amount || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {(row.amount || 0) < 0 ? '-' : ''}SAR {fmt(row.amount || 0)}
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge variant={row.status === 'paid' || row.status === 'completed' ? 'default' : row.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {row.status || 'open'}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge variant="outline" className="text-[10px]">{row.type}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredData.length > 100 && (
                <p className="text-center text-xs text-muted-foreground py-2">
                  {isAr ? `عرض 100 من ${filteredData.length}` : `Showing 100 of ${filteredData.length} records`}
                </p>
              )}
              {filteredData.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">{isAr ? 'لا توجد نتائج' : 'No records found'}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
