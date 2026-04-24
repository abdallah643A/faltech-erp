import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  ClipboardList, Search, Download, Loader2, CheckCircle2, XCircle, Clock, RefreshCw, MessageCircle, Mail
} from 'lucide-react';

interface LogEntry {
  id: string;
  doc_num: number | null;
  customer_name: string | null;
  channel: string | null;
  status: string;
  send_attempts: number;
  last_failure_reason: string | null;
  next_retry_at: string | null;
  amount: number | null;
  sent_at: string | null;
  created_at: string;
  account_id: string | null;
}

export function TransactionLog() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');

  useEffect(() => { fetchLogs(); }, [dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case '7days': { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString(); }
      case '30days': { const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString(); }
      default: return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoice_send_queue')
      .select('*')
      .gte('created_at', getDateFilter())
      .order('created_at', { ascending: false })
      .limit(500);
    setLogs((data || []) as LogEntry[]);
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (channelFilter !== 'all' && l.channel !== channelFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return l.customer_name?.toLowerCase().includes(s) || String(l.doc_num).includes(s);
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { icon: React.ReactNode; cls: string }> = {
      sent: { icon: <CheckCircle2 className="h-3 w-3" />, cls: 'bg-green-100 text-green-700' },
      delivered: { icon: <CheckCircle2 className="h-3 w-3" />, cls: 'bg-green-100 text-green-700' },
      failed: { icon: <XCircle className="h-3 w-3" />, cls: 'bg-red-100 text-red-700' },
      exhausted: { icon: <XCircle className="h-3 w-3" />, cls: 'bg-red-100 text-red-700' },
      pending: { icon: <Clock className="h-3 w-3" />, cls: 'bg-yellow-100 text-yellow-700' },
      queued: { icon: <Clock className="h-3 w-3" />, cls: 'bg-blue-100 text-blue-700' },
      retry: { icon: <RefreshCw className="h-3 w-3" />, cls: 'bg-orange-100 text-orange-700' },
      sending: { icon: <Clock className="h-3 w-3" />, cls: 'bg-purple-100 text-purple-700' },
    };
    const cfg = map[status] || map.pending;
    return <Badge className={`${cfg.cls} gap-1 text-xs`}>{cfg.icon}{status}</Badge>;
  };

  const exportCSV = () => {
    const headers = ['Invoice#', 'Customer', 'Channel', 'Status', 'Attempts', 'Amount', 'Failure Reason', 'Sent At', 'Created At'];
    const rows = filtered.map(l => [
      l.doc_num, l.customer_name, l.channel, l.status, l.send_attempts, l.amount,
      l.last_failure_reason?.replace(/,/g, ';'), l.sent_at, l.created_at
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-automation-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {isAr ? 'سجل المعاملات' : 'Transaction Log'}
            <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-40" />
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{isAr ? 'اليوم' : 'Today'}</SelectItem>
                <SelectItem value="7days">{isAr ? '7 أيام' : '7 Days'}</SelectItem>
                <SelectItem value="30days">{isAr ? '30 يوم' : '30 Days'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'كل الحالات' : 'All Status'}</SelectItem>
                <SelectItem value="sent">{isAr ? 'مرسل' : 'Sent'}</SelectItem>
                <SelectItem value="failed">{isAr ? 'فشل' : 'Failed'}</SelectItem>
                <SelectItem value="pending">{isAr ? 'معلق' : 'Pending'}</SelectItem>
                <SelectItem value="retry">{isAr ? 'إعادة' : 'Retry'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'كل القنوات' : 'All Channels'}</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1">
              <Download className="h-3 w-3" />{isAr ? 'تصدير' : 'Export'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? 'الفاتورة' : 'Invoice#'}</TableHead>
                  <TableHead>{isAr ? 'العميل' : 'Customer'}</TableHead>
                  <TableHead>{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead>{isAr ? 'القناة' : 'Channel'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isAr ? 'المحاولات' : 'Attempts'}</TableHead>
                  <TableHead>{isAr ? 'التاريخ' : 'Timestamp'}</TableHead>
                  <TableHead>{isAr ? 'الخطأ' : 'Error'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">#{log.doc_num}</TableCell>
                    <TableCell className="text-sm">{log.customer_name || '-'}</TableCell>
                    <TableCell className="text-sm">{log.amount?.toLocaleString() || '-'} SAR</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs">
                        {log.channel === 'email' ? <Mail className="h-3 w-3 text-blue-500" /> : <MessageCircle className="h-3 w-3 text-green-500" />}
                        {log.channel}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm">{log.send_attempts}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">{log.last_failure_reason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
