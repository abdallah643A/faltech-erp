import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, CheckCircle, XCircle, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import type { Quote } from '@/hooks/useQuotes';

interface QuoteConversionTrackerProps {
  quotes: Quote[];
}

export function QuoteConversionTracker({ quotes }: QuoteConversionTrackerProps) {
  const total = quotes.length;
  const accepted = quotes.filter(q => q.status === 'accepted').length;
  const rejected = quotes.filter(q => q.status === 'rejected').length;
  const sent = quotes.filter(q => q.status === 'sent').length;
  const draft = quotes.filter(q => q.status === 'draft').length;
  const expired = quotes.filter(q => q.status === 'expired').length;

  const conversionRate = total > 0 ? (accepted / total) * 100 : 0;
  const responseRate = total > 0 ? ((accepted + rejected) / total) * 100 : 0;

  const totalValue = quotes.reduce((s, q) => s + (q.total || 0), 0);
  const wonValue = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total || 0), 0);
  const pendingValue = quotes.filter(q => q.status === 'sent').reduce((s, q) => s + (q.total || 0), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v);

  // Monthly trend (last 6 months)
  const monthlyData: { month: string; sent: number; won: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en', { month: 'short' });
    const monthQuotes = quotes.filter(q => q.created_at?.startsWith(key));
    monthlyData.push({
      month: label,
      sent: monthQuotes.length,
      won: monthQuotes.filter(q => q.status === 'accepted').length,
    });
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Conversion Rate</span>
            </div>
            <p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
            <Progress value={conversionRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Won Value</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(wonValue)}</p>
            <p className="text-xs text-muted-foreground">{accepted} quotes accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(pendingValue)}</p>
            <p className="text-xs text-muted-foreground">{sent} quotes awaiting response</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Response Rate</span>
            </div>
            <p className="text-2xl font-bold">{responseRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">{accepted + rejected} of {total} responded</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRight className="h-4 w-4" /> Quote Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: 'Draft', count: draft, color: 'bg-muted', width: total > 0 ? (draft / total) * 100 : 0 },
              { label: 'Sent', count: sent, color: 'bg-info', width: total > 0 ? (sent / total) * 100 : 0 },
              { label: 'Accepted', count: accepted, color: 'bg-success', width: total > 0 ? (accepted / total) * 100 : 0 },
              { label: 'Rejected', count: rejected, color: 'bg-destructive', width: total > 0 ? (rejected / total) * 100 : 0 },
              { label: 'Expired', count: expired, color: 'bg-warning', width: total > 0 ? (expired / total) * 100 : 0 },
            ].map(stage => (
              <div key={stage.label} className="flex items-center gap-3">
                <span className="text-xs w-16 text-right text-muted-foreground">{stage.label}</span>
                <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden">
                  <div className={`h-full ${stage.color} rounded transition-all`} style={{ width: `${Math.max(stage.width, 2)}%` }} />
                </div>
                <span className="text-xs font-medium w-8">{stage.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Trend (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-24">
            {monthlyData.map(m => {
              const maxVal = Math.max(...monthlyData.map(d => d.sent), 1);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col-reverse items-center gap-0.5">
                    <div className="w-full bg-primary/20 rounded-t" style={{ height: `${(m.sent / maxVal) * 60}px` }} />
                    <div className="w-full bg-success rounded-t" style={{ height: `${(m.won / maxVal) * 60}px` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{m.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 justify-center text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary/20" /> Sent</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-success" /> Won</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
