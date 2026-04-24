import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AlertTriangle, RefreshCw, Search, CheckCircle2, Trash2, Loader2, Clock, XCircle, RotateCcw
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';

interface FailedItem {
  id: string;
  doc_num: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  channel: string | null;
  status: string;
  send_attempts: number;
  max_attempts: number;
  last_failure_reason: string | null;
  next_retry_at: string | null;
  amount: number | null;
  created_at: string;
  updated_at: string;
}

const FAILURE_COLORS = ['#ef4444', '#f97316', '#eab308', '#6366f1', '#8b5cf6'];

export function FailedInvoicesManager() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const [items, setItems] = useState<FailedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => { fetchFailed(); }, []);

  const fetchFailed = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoice_send_queue')
      .select('*')
      .in('status', ['failed', 'exhausted', 'retry'])
      .order('created_at', { ascending: false })
      .limit(200);
    setItems((data || []) as FailedItem[]);
    setLoading(false);
  };

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      await supabase.from('invoice_send_queue').update({
        status: 'retry',
        next_retry_at: new Date().toISOString(),
        send_attempts: 0,
      }).eq('id', id);
      toast({ title: isAr ? 'تمت إعادة الجدولة' : 'Rescheduled', description: isAr ? 'ستتم إعادة المحاولة' : 'Will be retried soon' });
      fetchFailed();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setRetrying(null);
  };

  const handleBulkRetry = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await supabase.from('invoice_send_queue').update({
      status: 'retry',
      next_retry_at: new Date().toISOString(),
      send_attempts: 0,
    }).in('id', ids);
    toast({ title: isAr ? 'تمت إعادة الجدولة' : 'Rescheduled', description: `${ids.length} items rescheduled` });
    setSelected(new Set());
    fetchFailed();
  };

  const handleMarkSent = async (id: string) => {
    await supabase.from('invoice_send_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id);
    toast({ title: isAr ? 'تم التحديث' : 'Updated' });
    fetchFailed();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('invoice_send_queue').delete().eq('id', id);
    fetchFailed();
  };

  // Failure reason breakdown
  const reasonCounts: Record<string, number> = {};
  items.forEach(i => {
    const reason = i.last_failure_reason?.split(':')[0] || 'Unknown';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });
  const reasonData = Object.entries(reasonCounts).map(([name, value]) => ({ name, value }));

  const filteredItems = items.filter(i => {
    if (filter !== 'all' && i.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (i.customer_name?.toLowerCase().includes(s) || String(i.doc_num).includes(s) || i.customer_phone?.includes(s));
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filteredItems.length) setSelected(new Set());
    else setSelected(new Set(filteredItems.map(i => i.id)));
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{items.filter(i => i.status === 'failed').length}</p>
            <p className="text-xs text-muted-foreground">{isAr ? 'فشل' : 'Failed'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{items.filter(i => i.status === 'exhausted').length}</p>
            <p className="text-xs text-muted-foreground">{isAr ? 'استنفذت المحاولات' : 'Exhausted'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <RefreshCw className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold">{items.filter(i => i.status === 'retry').length}</p>
            <p className="text-xs text-muted-foreground">{isAr ? 'قيد إعادة المحاولة' : 'Pending Retry'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">{isAr ? 'أسباب الفشل' : 'Failure Reasons'}</p>
            {reasonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={reasonData} cx="50%" cy="50%" outerRadius={40} dataKey="value" label={false}>
                    {reasonData.map((_, i) => <Cell key={i} fill={FAILURE_COLORS[i % FAILURE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-center text-muted-foreground">{isAr ? 'لا بيانات' : 'No data'}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              {isAr ? 'الفواتير الفاشلة' : 'Failed Invoices'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-48" />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="failed">{isAr ? 'فشل' : 'Failed'}</SelectItem>
                  <SelectItem value="exhausted">{isAr ? 'استنفذت' : 'Exhausted'}</SelectItem>
                  <SelectItem value="retry">{isAr ? 'إعادة' : 'Retry'}</SelectItem>
                </SelectContent>
              </Select>
              {selected.size > 0 && (
                <Button size="sm" variant="outline" onClick={handleBulkRetry} className="gap-1">
                  <RotateCcw className="h-3 w-3" />{isAr ? 'إعادة المحاولة' : 'Retry'} ({selected.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>{isAr ? 'لا توجد فواتير فاشلة' : 'No failed invoices'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"><Checkbox checked={selected.size === filteredItems.length && filteredItems.length > 0} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead>{isAr ? 'الفاتورة' : 'Invoice'}</TableHead>
                  <TableHead>{isAr ? 'العميل' : 'Customer'}</TableHead>
                  <TableHead>{isAr ? 'القناة' : 'Channel'}</TableHead>
                  <TableHead>{isAr ? 'المحاولات' : 'Attempts'}</TableHead>
                  <TableHead>{isAr ? 'سبب الفشل' : 'Failure Reason'}</TableHead>
                  <TableHead>{isAr ? 'إعادة المحاولة' : 'Next Retry'}</TableHead>
                  <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell><Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} /></TableCell>
                    <TableCell className="font-medium">#{item.doc_num}</TableCell>
                    <TableCell className="text-sm">{item.customer_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 text-xs">
                        {item.channel === 'email' ? '📧' : '💬'}{item.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${(item.send_attempts || 0) >= (item.max_attempts || 5) ? 'text-destructive font-semibold' : ''}`}>
                        {item.send_attempts}/{item.max_attempts}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{item.last_failure_reason || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {item.next_retry_at ? new Date(item.next_retry_at).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleRetry(item.id)} disabled={retrying === item.id} title={isAr ? 'إعادة المحاولة' : 'Retry'}>
                          {retrying === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleMarkSent(item.id)} title={isAr ? 'وسم كمرسل' : 'Mark as sent'}>
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} title={isAr ? 'حذف' : 'Delete'}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
