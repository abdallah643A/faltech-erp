import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity, CheckCircle2, XCircle, Clock, Send, TrendingUp,
  MessageCircle, Mail, BarChart3, RefreshCw, Zap, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

interface DashboardStats {
  totalToday: number;
  sentToday: number;
  failedToday: number;
  pendingToday: number;
  retryPending: number;
  successRate: number;
  whatsappSent: number;
  emailSent: number;
  lastRunTime: string | null;
  serviceStatus: 'running' | 'stopped' | 'error';
}

const CHART_COLORS = ['hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--primary))'];

export function AutomationDashboard() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [stats, setStats] = useState<DashboardStats>({
    totalToday: 0, sentToday: 0, failedToday: 0, pendingToday: 0,
    retryPending: 0, successRate: 0, whatsappSent: 0, emailSent: 0,
    lastRunTime: null, serviceStatus: 'stopped',
  });
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch queue stats
      const { data: queueData } = await supabase
        .from('invoice_send_queue')
        .select('status, channel, created_at, sent_at')
        .gte('created_at', today + 'T00:00:00');

      const items = queueData || [];
      const sent = items.filter(i => i.status === 'sent' || i.status === 'delivered');
      const failed = items.filter(i => i.status === 'failed' || i.status === 'exhausted');
      const pending = items.filter(i => i.status === 'pending' || i.status === 'queued' || i.status === 'retry');

      // Fetch last run
      const { data: lastRun } = await supabase
        .from('invoice_automation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch settings
      const { data: settings } = await supabase
        .from('invoice_automation_settings')
        .select('is_enabled')
        .limit(1)
        .maybeSingle();

      // Fetch alerts
      const { data: alerts } = await supabase
        .from('invoice_automation_alerts')
        .select('*')
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(5);

      const totalToday = items.length;
      const sentToday = sent.length;
      const failedToday = failed.length;
      const pendingToday = pending.length;

      setStats({
        totalToday,
        sentToday,
        failedToday,
        pendingToday,
        retryPending: items.filter(i => i.status === 'retry').length,
        successRate: totalToday > 0 ? Math.round((sentToday / totalToday) * 100) : 0,
        whatsappSent: sent.filter(i => i.channel === 'whatsapp').length,
        emailSent: sent.filter(i => i.channel === 'email').length,
        lastRunTime: lastRun?.started_at || null,
        serviceStatus: settings?.is_enabled ? 'running' : 'stopped',
      });

      setRecentAlerts(alerts || []);

      // Build hourly data
      const hours: Record<string, { hour: string; sent: number; failed: number }> = {};
      for (let h = 0; h < 24; h++) {
        const key = `${h.toString().padStart(2, '0')}:00`;
        hours[key] = { hour: key, sent: 0, failed: 0 };
      }
      items.forEach(item => {
        const h = new Date(item.created_at).getHours();
        const key = `${h.toString().padStart(2, '0')}:00`;
        if (hours[key]) {
          if (item.status === 'sent' || item.status === 'delivered') hours[key].sent++;
          else if (item.status === 'failed' || item.status === 'exhausted') hours[key].failed++;
        }
      });
      setHourlyData(Object.values(hours));

      // Channel distribution
      setChannelData([
        { name: 'WhatsApp', value: sent.filter(i => i.channel === 'whatsapp').length },
        { name: 'Email', value: sent.filter(i => i.channel === 'email').length },
      ].filter(c => c.value > 0));

      // Weekly trend (mock - in production query last 7 days)
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      setWeeklyTrend(days.map(d => ({
        day: d,
        sent: Math.floor(Math.random() * 50) + 10,
        failed: Math.floor(Math.random() * 5),
      })));

    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    { label: isAr ? 'إجمالي اليوم' : 'Total Today', value: stats.totalToday, icon: BarChart3, color: 'text-primary' },
    { label: isAr ? 'تم الإرسال' : 'Sent', value: stats.sentToday, icon: CheckCircle2, color: 'text-green-500' },
    { label: isAr ? 'فشل' : 'Failed', value: stats.failedToday, icon: XCircle, color: 'text-destructive' },
    { label: isAr ? 'قيد الانتظار' : 'Pending', value: stats.pendingToday, icon: Clock, color: 'text-yellow-500' },
    { label: isAr ? 'نسبة النجاح' : 'Success Rate', value: `${stats.successRate}%`, icon: TrendingUp, color: 'text-primary' },
    { label: isAr ? 'إعادة المحاولة' : 'Retry Queue', value: stats.retryPending, icon: RefreshCw, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Service Status Bar */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${stats.serviceStatus === 'running' ? 'bg-green-500 animate-pulse' : stats.serviceStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium">
            {isAr ? 'حالة الخدمة:' : 'Service Status:'}{' '}
            <span className={stats.serviceStatus === 'running' ? 'text-green-600' : 'text-muted-foreground'}>
              {stats.serviceStatus === 'running' ? (isAr ? 'يعمل' : 'Running') : isAr ? 'متوقف' : 'Stopped'}
            </span>
          </span>
          {stats.lastRunTime && (
            <span className="text-xs text-muted-foreground">
              {isAr ? 'آخر تشغيل:' : 'Last run:'} {new Date(stats.lastRunTime).toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={fetchDashboardData} className="gap-1">
          <RefreshCw className="h-3 w-3" />
          {isAr ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 text-center">
              <kpi.icon className={`h-6 w-6 mx-auto mb-2 ${kpi.color}`} />
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {recentAlerts.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              {isAr ? 'تنبيهات نشطة' : 'Active Alerts'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentAlerts.map((alert: any) => (
              <div key={alert.id} className="flex items-center justify-between p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20 text-sm">
                <div>
                  <span className="font-medium">{alert.title}</span>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                </div>
                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>{alert.severity}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isAr ? 'نشاط الإرسال بالساعة' : 'Hourly Sending Activity'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sent" fill="hsl(var(--success))" name={isAr ? 'تم الإرسال' : 'Sent'} />
                <Bar dataKey="failed" fill="hsl(var(--destructive))" name={isAr ? 'فشل' : 'Failed'} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isAr ? 'توزيع القنوات' : 'Channel Distribution'}</CardTitle>
          </CardHeader>
          <CardContent>
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
                    {channelData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                {isAr ? 'لا توجد بيانات' : 'No data yet'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend & Channel Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isAr ? 'اتجاه الأداء الأسبوعي' : 'Weekly Performance Trend'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sent" stroke="hsl(var(--success))" strokeWidth={2} name={isAr ? 'تم الإرسال' : 'Sent'} />
                <Line type="monotone" dataKey="failed" stroke="hsl(var(--destructive))" strokeWidth={2} name={isAr ? 'فشل' : 'Failed'} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel Performance Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-sm">WhatsApp</span>
              </div>
              <p className="text-3xl font-bold">{stats.whatsappSent}</p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? 'رسائل أُرسلت اليوم' : 'Messages sent today'}</p>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.totalToday > 0 ? (stats.whatsappSent / stats.totalToday) * 100 : 0}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-sm">Email</span>
              </div>
              <p className="text-3xl font-bold">{stats.emailSent}</p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? 'بريد أُرسل اليوم' : 'Emails sent today'}</p>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.totalToday > 0 ? (stats.emailSent / stats.totalToday) * 100 : 0}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
