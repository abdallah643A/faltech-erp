import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAccountingDetermination } from '@/hooks/useAccountingDetermination';
import { useGLAdvancedRules } from '@/hooks/useGLAdvancedRules';
import { useGLAccountDefaults } from '@/hooks/useGLAccountDefaults';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, XCircle, TrendingUp, FileText, Shield, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, subDays, isAfter } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#94a3b8'];

export default function AccountingDashboard() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { rules, exceptions, postingRuns } = useAccountingDetermination();
  const { rules: advRules, postingLogs } = useGLAdvancedRules();
  const { defaults } = useGLAccountDefaults();

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const logsToday = postingLogs.filter((l: any) => l.created_at?.startsWith(today));
    const failedToday = logsToday.filter((l: any) => l.status === 'error');
    const postedToday = logsToday.filter((l: any) => l.status === 'posted');
    const openExceptions = exceptions.filter((e: any) => e.status === 'open');
    const missingAccts = defaults.filter((d: any) => !d.acct_code);
    const overrideCount = postingLogs.filter((l: any) => l.account_source === 'manual_override').length;
    const autoCount = postingLogs.filter((l: any) => l.account_source !== 'manual_override').length;

    return {
      postedToday: postedToday.length,
      failedToday: failedToday.length,
      openExceptions: openExceptions.length,
      missingRules: missingAccts.length,
      pendingReview: postingRuns.filter((r: any) => r.status === 'pending').length,
      totalRules: rules.length + advRules.length,
      overridePct: autoCount + overrideCount > 0 ? Math.round((overrideCount / (autoCount + overrideCount)) * 100) : 0,
      totalLogs: postingLogs.length,
    };
  }, [postingLogs, exceptions, defaults, postingRuns, rules, advRules]);

  const jeByModule = useMemo(() => {
    const map: Record<string, number> = {};
    postingLogs.forEach((l: any) => {
      const t = l.document_type || 'unknown';
      const area = t.includes('ar') || t.includes('incoming') || t.includes('delivery') ? 'Sales'
        : t.includes('ap') || t.includes('outgoing') || t.includes('goods_receipt_po') || t.includes('goods_return') ? 'Purchasing'
        : t.includes('inventory') || t.includes('goods') || t.includes('production') || t.includes('landed') ? 'Inventory'
        : t.includes('payroll') ? 'Payroll'
        : t.includes('asset') || t.includes('depreciation') ? 'Assets'
        : t.includes('project') || t.includes('progress') ? 'Projects'
        : 'General';
      map[area] = (map[area] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [postingLogs]);

  const failureByType = useMemo(() => {
    const map: Record<string, number> = {};
    postingLogs.filter((l: any) => l.status === 'error').forEach((l: any) => {
      const t = l.document_type || 'unknown';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [postingLogs]);

  const monthlyTrend = useMemo(() => {
    const map: Record<string, { posted: number; failed: number }> = {};
    postingLogs.forEach((l: any) => {
      const month = l.created_at?.substring(0, 7) || 'unknown';
      if (!map[month]) map[month] = { posted: 0, failed: 0 };
      if (l.status === 'posted') map[month].posted++;
      else map[month].failed++;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, data]) => ({ month, ...data }));
  }, [postingLogs]);

  const kpis = [
    { label: isAr ? 'ترحيلات اليوم' : 'Posted Today', value: stats.postedToday, icon: CheckCircle2, color: 'text-green-600' },
    { label: isAr ? 'فشل اليوم' : 'Failed Today', value: stats.failedToday, icon: XCircle, color: 'text-destructive' },
    { label: isAr ? 'استثناءات مفتوحة' : 'Open Exceptions', value: stats.openExceptions, icon: AlertTriangle, color: 'text-yellow-600' },
    { label: isAr ? 'حسابات ناقصة' : 'Missing Accounts', value: stats.missingRules, icon: Shield, color: 'text-orange-600' },
    { label: isAr ? 'قيد المراجعة' : 'Pending Review', value: stats.pendingReview, icon: FileText, color: 'text-blue-600' },
    { label: isAr ? 'إجمالي القواعد' : 'Total Rules', value: stats.totalRules, icon: Zap, color: 'text-purple-600' },
    { label: isAr ? 'تعديل يدوي %' : 'Override %', value: `${stats.overridePct}%`, icon: TrendingUp, color: 'text-muted-foreground' },
    { label: isAr ? 'إجمالي السجلات' : 'Total Logs', value: stats.totalLogs, icon: Activity, color: 'text-foreground' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <Card key={i} className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
              <kpi.icon className={`h-8 w-8 ${kpi.color} shrink-0`} />
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isAr ? 'حجم القيود حسب الوحدة' : 'JE Volume by Module'}</CardTitle>
          </CardHeader>
          <CardContent>
            {jeByModule.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={jeByModule}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isAr ? 'معدل الفشل حسب نوع المعاملة' : 'Failure Rate by Transaction Type'}</CardTitle>
          </CardHeader>
          <CardContent>
            {failureByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={failureByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {failureByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No failures</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{isAr ? 'اتجاه الترحيل الشهري' : 'Monthly GL Posting Trend'}</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="posted" stroke="hsl(var(--primary))" strokeWidth={2} name="Posted" />
                <Line type="monotone" dataKey="failed" stroke="hsl(var(--destructive))" strokeWidth={2} name="Failed" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No trend data yet</div>
          )}
        </CardContent>
      </Card>

      {/* Recent Exceptions */}
      {exceptions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              {isAr ? 'أحدث الاستثناءات' : 'Recent Exceptions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {exceptions.slice(0, 5).map((ex: any) => (
                <div key={ex.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={ex.status === 'open' ? 'destructive' : 'secondary'} className="text-xs">{ex.status}</Badge>
                    <span className="font-medium">{ex.document_type}</span>
                    <span className="text-muted-foreground truncate max-w-[300px]">{ex.error_message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{ex.created_at ? format(new Date(ex.created_at), 'MM/dd HH:mm') : ''}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
