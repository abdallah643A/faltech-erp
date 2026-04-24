import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ArrowLeft, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const BUCKETS = [
  { key: 'current', label: 'Current', labelAr: 'حالي', min: 0, max: 30, color: 'hsl(var(--chart-2))' },
  { key: '31-60', label: '31-60 Days', labelAr: '31-60 يوم', min: 31, max: 60, color: 'hsl(var(--chart-3))' },
  { key: '61-90', label: '61-90 Days', labelAr: '61-90 يوم', min: 61, max: 90, color: 'hsl(var(--chart-1))' },
  { key: '90+', label: '90+ Days', labelAr: '+90 يوم', min: 91, max: 9999, color: 'hsl(var(--chart-4))' },
];

export function ReceivablesAgingDrillDown() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['aging-drilldown-ar'],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoices').select('id, total, balance_due, status, doc_date, doc_due_date, customer_name, doc_num, currency').limit(1000);
      return data || [];
    },
  });

  const openInvoices = useMemo(() => {
    const now = new Date();
    return arInvoices
      .filter(i => (i.balance_due || 0) > 0)
      .map(i => {
        const days = differenceInDays(now, new Date(i.doc_due_date || i.doc_date));
        const bucket = BUCKETS.find(b => days >= b.min && days <= b.max) || BUCKETS[3];
        return { ...i, agingDays: Math.max(0, days), bucket: bucket.key };
      });
  }, [arInvoices]);

  const chartData = useMemo(() => {
    return BUCKETS.map(b => {
      const invoices = openInvoices.filter(i => i.bucket === b.key);
      return {
        name: isAr ? b.labelAr : b.label,
        key: b.key,
        amount: invoices.reduce((s, i) => s + (i.balance_due || 0), 0),
        count: invoices.length,
        color: b.color,
      };
    });
  }, [openInvoices, isAr]);

  const drillInvoices = selectedBucket
    ? openInvoices.filter(i => i.bucket === selectedBucket).sort((a, b) => (b.balance_due || 0) - (a.balance_due || 0))
    : [];

  const selectedBucketInfo = BUCKETS.find(b => b.key === selectedBucket);
  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          {isAr ? 'تقادم الذمم المدينة (تفصيلي)' : 'Receivables Aging (Drill-Down)'}
          {selectedBucket && (
            <Button variant="ghost" size="sm" className="h-6 text-xs ml-auto" onClick={() => setSelectedBucket(null)}>
              <ArrowLeft className="h-3 w-3 mr-1" /> {isAr ? 'عودة' : 'Back'}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedBucket ? (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} onClick={(e: any) => { if (e?.activePayload?.[0]) setSelectedBucket(e.activePayload[0].payload.key); }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} cursor="pointer">
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {chartData.map(d => (
                <button key={d.key} onClick={() => setSelectedBucket(d.key)} className="text-center p-2 rounded-lg bg-muted/50 hover:bg-accent transition-colors cursor-pointer">
                  <p className="text-[10px] text-muted-foreground">{d.name}</p>
                  <p className="text-sm font-bold">SAR {fmt(d.amount)}</p>
                  <p className="text-[10px] text-muted-foreground">{d.count} {isAr ? 'فاتورة' : 'invoices'}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge style={{ backgroundColor: selectedBucketInfo?.color, color: '#fff' }}>
                {isAr ? selectedBucketInfo?.labelAr : selectedBucketInfo?.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {drillInvoices.length} {isAr ? 'فاتورة' : 'invoices'} • SAR {fmt(drillInvoices.reduce((s, i) => s + (i.balance_due || 0), 0))}
              </span>
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">{isAr ? 'رقم' : '#'}</th>
                    <th className="text-left p-2">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="text-right p-2">{isAr ? 'المستحق' : 'Balance Due'}</th>
                    <th className="text-center p-2">{isAr ? 'الأيام' : 'Days'}</th>
                    <th className="text-center p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {drillInvoices.map(inv => (
                    <tr key={inv.id} className="border-t hover:bg-accent/30">
                      <td className="p-2 font-mono">{inv.doc_num}</td>
                      <td className="p-2 truncate max-w-[150px]">{inv.customer_name}</td>
                      <td className="p-2 text-right font-mono font-bold text-destructive">SAR {fmt(inv.balance_due || 0)}</td>
                      <td className="p-2 text-center">
                        <Badge variant={inv.agingDays > 90 ? 'destructive' : inv.agingDays > 60 ? 'default' : 'secondary'} className="text-[10px]">
                          {inv.agingDays}d
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate('/ar-invoices')}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
