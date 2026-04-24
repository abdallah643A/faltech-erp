import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssetUtilization } from '@/hooks/useAssetUtilization';
import { useAssets } from '@/hooks/useAssets';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart
} from 'recharts';
import {
  Activity, AlertTriangle, BarChart3, Clock, DollarSign, TrendingUp,
  Plus, Gauge, ArrowDown, ArrowUp, Package, Shuffle, Trash2, Eye,
  Building2, Target, Zap, Calendar, MapPin, ArrowRight, Lightbulb
} from 'lucide-react';
import { format } from 'date-fns';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)', 'hsl(280, 65%, 60%)',
];

export default function AssetUtilization() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const { assets, categories } = useAssets();
  const {
    logs, logUsage, getFleetSummary, getDepartmentUtilization,
    getUtilizationTrend, getIdleAssets, getAssetUtilization,
    getIdleAssetsByPeriod, getIdleCostBreakdown, getReallocationRecommendations,
    getDepartmentHeatmap, getCapacityRecommendations, getBenchmarkComparison,
    getWeeklyTrend, getMonthlyTrend,
  } = useAssetUtilization();

  const [period, setPeriod] = useState('30');
  const [trendView, setTrendView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [logForm, setLogForm] = useState({
    asset_id: '', hours_used: '', hours_available: '8', usage_type: 'active',
    department: '', log_date: new Date().toISOString().split('T')[0], notes: '',
  });

  const days = parseInt(period);
  const fleet = getFleetSummary(days);
  const deptData = getDepartmentUtilization(days);
  const trendData = getUtilizationTrend(days);
  const idleAssets = getIdleAssets(days);
  const idlePeriods = getIdleAssetsByPeriod();
  const idleCostBreakdown = getIdleCostBreakdown(days);
  const recommendations = getReallocationRecommendations(days);
  const heatmapData = getDepartmentHeatmap(days);
  const capacityRecs = getCapacityRecommendations(days);
  const benchmarkData = getBenchmarkComparison(days);
  const weeklyData = getWeeklyTrend(90);
  const monthlyData = getMonthlyTrend(365);

  const assetUtils = (assets || [])
    .filter(a => a.status !== 'disposed')
    .map(a => ({ ...a, ...getAssetUtilization(a.id, days) }))
    .sort((a, b) => b.utilizationPct - a.utilizationPct);

  const handleLogSubmit = () => {
  const { t } = useLanguage();

    if (!logForm.asset_id) return;
    const selectedAsset = assets?.find(a => a.id === logForm.asset_id);
    logUsage.mutate({
      asset_id: logForm.asset_id,
      hours_used: parseFloat(logForm.hours_used) || 0,
      hours_available: parseFloat(logForm.hours_available) || 8,
      usage_type: logForm.usage_type,
      department: selectedAsset?.department || logForm.department || null,
      log_date: logForm.log_date,
      notes: logForm.notes || null,
    } as any);
    setShowLogDialog(false);
    setLogForm({ asset_id: '', hours_used: '', hours_available: '8', usage_type: 'active', department: '', log_date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const getUtilColor = (pct: number) => {
    if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getUtilBadge = (pct: number) => {
    if (pct >= 75) return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">High</Badge>;
    if (pct >= 50) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Medium</Badge>;
    if (pct > 0) return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Low</Badge>;
    return <Badge className="bg-muted text-muted-foreground">Idle</Badge>;
  };

  const getCapacityBadge = (status: string) => {
    switch (status) {
      case 'over-utilized': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Over-utilized</Badge>;
      case 'optimal': return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Optimal</Badge>;
      case 'under-utilized': return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Under-utilized</Badge>;
      default: return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Critical</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'reallocate': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Shuffle className="h-3 w-3 mr-1" />Reallocate</Badge>;
      case 'dispose': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><Trash2 className="h-3 w-3 mr-1" />Dispose</Badge>;
      case 'lease': return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><DollarSign className="h-3 w-3 mr-1" />Lease</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground"><Eye className="h-3 w-3 mr-1" />Monitor</Badge>;
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v);

  const usageTypeData = (() => {
    const allLogs = logs.data || [];
    const map: Record<string, number> = {};
    for (const l of allLogs) {
      const type = l.usage_type || 'active';
      map[type] = (map[type] || 0) + (l.hours_used || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  const getTrendData = () => {
    switch (trendView) {
      case 'weekly': return weeklyData.map(d => ({ ...d, date: d.week }));
      case 'monthly': return monthlyData.map(d => ({ ...d, date: d.month }));
      default: return trendData;
    }
  };

  const getHeatmapColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500 dark:bg-emerald-600';
    if (pct >= 60) return 'bg-emerald-300 dark:bg-emerald-700';
    if (pct >= 40) return 'bg-amber-300 dark:bg-amber-700';
    if (pct >= 20) return 'bg-amber-200 dark:bg-amber-800';
    if (pct > 0) return 'bg-red-200 dark:bg-red-900';
    return 'bg-muted';
  };

  const totalSavings = recommendations.reduce((s, r) => s + r.savingsPotential, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Asset Utilization Analytics', 'تحليلات استخدام الأصول')}</h1>
          <p className="text-muted-foreground text-sm">{t('Track usage, benchmark performance, detect idle assets, and optimize department allocation', 'تتبع الاستخدام، قياس الأداء، اكتشاف الأصول الخاملة وتحسين توزيع الأقسام')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('Last 7 days', 'آخر 7 أيام')}</SelectItem>
              <SelectItem value="30">{t('Last 30 days', 'آخر 30 يوم')}</SelectItem>
              <SelectItem value="60">{t('Last 60 days', 'آخر 60 يوم')}</SelectItem>
              <SelectItem value="90">{t('Last 90 days', 'آخر 90 يوم')}</SelectItem>
              <SelectItem value="365">{t('Last Year', 'السنة الماضية')}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowLogDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />{t('Log Usage', 'تسجيل الاستخدام')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('Fleet Util.', 'استخدام الأسطول')}</span>
            </div>
            <p className={`text-2xl font-bold ${getUtilColor(fleet.utilizationPct)}`}>{fleet.utilizationPct.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('Hours Used', 'ساعات مستخدمة')}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{fleet.totalUsed.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">/ {fleet.totalAvailable.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">{t('Active', 'نشط')}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{fleet.activeAssets}/{fleet.totalAssets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">{t('Idle 30d', 'خامل 30ي')}</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{idlePeriods.idle30.length}</p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>60d: {idlePeriods.idle60.length}</span>
              <span>90d: {idlePeriods.idle90.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">{t('Idle Cost', 'تكلفة الخمول')}</span>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(fleet.idleCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('Savings Pot.', 'إمكانية التوفير')}</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalSavings)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('Departments', 'الأقسام')}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{deptData.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">{t('Dashboard', 'لوحة القيادة')}</TabsTrigger>
          <TabsTrigger value="benchmarks">{t('Benchmarks', 'المعايير')}</TabsTrigger>
          <TabsTrigger value="idle">{t('Idle Detection', 'كشف الخمول')}</TabsTrigger>
          <TabsTrigger value="departments">{t('Departments', 'الأقسام')}</TabsTrigger>
          <TabsTrigger value="capacity">{t('Capacity', 'السعة')}</TabsTrigger>
          <TabsTrigger value="assets">{t('Per Asset', 'لكل أصل')}</TabsTrigger>
        </TabsList>

        {/* ===== DASHBOARD ===== */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Utilization Trend with multi-view */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{t('Utilization Trend', 'اتجاه الاستخدام')}</CardTitle>
                  <div className="flex gap-1">
                    {(['daily', 'weekly', 'monthly'] as const).map(v => (
                      <Button key={v} size="sm" variant={trendView === v ? 'default' : 'ghost'} className="h-7 text-xs px-2"
                        onClick={() => setTrendView(v)}>{v.charAt(0).toUpperCase() + v.slice(1)}</Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {getTrendData().length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">{t('No utilization data yet', 'لا توجد بيانات')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={getTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => {
                        if (trendView === 'monthly') return d;
                        return format(new Date(d), trendView === 'weekly' ? 'dd MMM' : 'dd/MM');
                      }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="hoursUsed" fill="hsl(var(--primary) / 0.3)" name={t('Hours Used', 'ساعات')} />
                      <Line yAxisId="right" type="monotone" dataKey="utilizationPct" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name={t('Util %', '%')} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Usage Type + Active vs Idle Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Usage Distribution', 'توزيع الاستخدام')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground text-center mb-2">{t('By Type', 'حسب النوع')}</p>
                    {usageTypeData.length === 0 ? (
                      <p className="text-muted-foreground text-xs text-center py-8">{t('No data', 'لا بيانات')}</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={usageTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {usageTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground text-center mb-2">{t('Active vs Idle', 'نشط مقابل خامل')}</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={[
                          { name: t('Active', 'نشط'), value: fleet.activeAssets },
                          { name: t('Idle', 'خامل'), value: fleet.idleAssets },
                        ]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                          label={({ name, value }) => `${name}: ${value}`}>
                          <Cell fill="hsl(var(--primary))" />
                          <Cell fill="hsl(var(--destructive))" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time per-asset utilization rates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('Real-Time Asset Utilization Rates', 'معدلات استخدام الأصول الحية')}</CardTitle>
              <CardDescription className="text-xs">{t('Color-coded alerts: 🟢 ≥75% | 🟡 50-75% | 🔴 <50%', 'تنبيهات ملونة: 🟢 ≥75% | 🟡 50-75% | 🔴 <50%')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {assetUtils.slice(0, 18).map(a => (
                  <div key={a.id} className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <p className="text-xs font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.asset_code}</p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className={`text-xl font-bold ${getUtilColor(a.utilizationPct)}`}>{a.utilizationPct.toFixed(0)}%</span>
                      {a.logCount > 0 && (
                        <span className="text-xs text-muted-foreground mb-0.5">{a.totalUsed.toFixed(0)}h</span>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${
                        a.utilizationPct >= 75 ? 'bg-emerald-500' : a.utilizationPct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`} style={{ width: `${Math.min(a.utilizationPct, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== BENCHMARKS ===== */}
        <TabsContent value="benchmarks" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Utilization vs Industry Benchmarks', 'الاستخدام مقابل معايير الصناعة')}</CardTitle>
              </CardHeader>
              <CardContent>
                {benchmarkData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">{t('No benchmark data. Log usage across categories to compare.', 'لا توجد بيانات للمقارنة')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={benchmarkData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="actual" fill="hsl(var(--primary))" name={t('Actual', 'فعلي')} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="target" fill="hsl(var(--chart-2))" name={t('Target', 'مستهدف')} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="industryAvg" fill="hsl(var(--chart-3))" name={t('Industry Avg', 'متوسط الصناعة')} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Benchmark Status by Category', 'حالة المعيار حسب الفئة')}</CardTitle>
              </CardHeader>
              <CardContent>
                {benchmarkData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">{t('No data available', 'لا توجد بيانات')}</p>
                ) : (
                  <div className="space-y-3">
                    {benchmarkData.map((b, i) => (
                      <div key={i} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-foreground">{b.category}</span>
                          <Badge className={
                            b.status === 'above_target' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : b.status === 'acceptable' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }>
                            {b.status === 'above_target' ? '✓ Above Target' : b.status === 'acceptable' ? '~ Acceptable' : '✗ Below Min'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Actual</span><p className={`font-bold ${getUtilColor(b.actual)}`}>{b.actual.toFixed(1)}%</p></div>
                          <div><span className="text-muted-foreground">Target</span><p className="font-medium text-foreground">{b.target}%</p></div>
                          <div><span className="text-muted-foreground">Industry</span><p className="font-medium text-foreground">{b.industryAvg}%</p></div>
                          <div><span className="text-muted-foreground">Gap</span><p className={`font-bold ${b.gap >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{b.gap > 0 ? '+' : ''}{b.gap.toFixed(1)}%</p></div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2 relative">
                          <div className="absolute h-full w-0.5 bg-foreground/40" style={{ left: `${b.target}%` }} title="Target" />
                          <div className="absolute h-full w-0.5 bg-red-400" style={{ left: `${b.minAcceptable}%` }} title="Min" />
                          <div className={`h-2 rounded-full ${
                            b.actual >= b.target ? 'bg-emerald-500' : b.actual >= b.minAcceptable ? 'bg-amber-500' : 'bg-red-500'
                          }`} style={{ width: `${Math.min(b.actual, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== IDLE DETECTION ===== */}
        <TabsContent value="idle" className="space-y-6 mt-4">
          {/* Multi-period summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: '30 Days', count: idlePeriods.idle30.length, color: 'amber' },
              { label: '60 Days', count: idlePeriods.idle60.length, color: 'orange' },
              { label: '90 Days', count: idlePeriods.idle90.length, color: 'red' },
            ].map(p => (
              <Card key={p.label}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{t(`Idle > ${p.label}`, `خامل > ${p.label}`)}</p>
                      <p className={`text-3xl font-bold text-${p.color}-600 dark:text-${p.color}-400`}>{p.count}</p>
                    </div>
                    <AlertTriangle className={`h-8 w-8 text-${p.color}-500 opacity-50`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Carrying Cost Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-red-500" />
                {t('Idle Asset Carrying Cost Breakdown', 'تفصيل تكلفة حمل الأصول الخاملة')}
              </CardTitle>
              <CardDescription className="text-xs">{t('Depreciation + storage + maintenance costs for idle assets', 'الاستهلاك + التخزين + تكاليف الصيانة')}</CardDescription>
            </CardHeader>
            <CardContent>
              {idleCostBreakdown.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">{t('No idle assets! 🎉', 'لا أصول خاملة! 🎉')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Asset', 'الأصل')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Depreciation', 'الاستهلاك')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Storage', 'التخزين')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Maintenance', 'الصيانة')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Total Cost', 'التكلفة الإجمالية')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Daily Rate', 'المعدل اليومي')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {idleCostBreakdown.slice(0, 20).map(item => (
                        <tr key={item.asset.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-2 px-3">
                            <span className="font-medium text-foreground">{item.asset.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">{item.asset.asset_code}</span>
                          </td>
                          <td className="py-2 px-3 text-right text-red-600 dark:text-red-400">{formatCurrency(item.depreciationCost)}</td>
                          <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">{formatCurrency(item.storageCost)}</td>
                          <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">{formatCurrency(item.maintenanceCost)}</td>
                          <td className="py-2 px-3 text-right font-bold text-red-600 dark:text-red-400">{formatCurrency(item.totalCarryingCost)}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(item.dailyDepreciation)}/d</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border">
                        <td className="py-2 px-3 font-bold text-foreground">{t('Total', 'الإجمالي')}</td>
                        <td className="py-2 px-3 text-right font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(idleCostBreakdown.reduce((s, i) => s + i.depreciationCost, 0))}
                        </td>
                        <td className="py-2 px-3 text-right font-bold">
                          {formatCurrency(idleCostBreakdown.reduce((s, i) => s + i.storageCost, 0))}
                        </td>
                        <td className="py-2 px-3 text-right font-bold">
                          {formatCurrency(idleCostBreakdown.reduce((s, i) => s + i.maintenanceCost, 0))}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(idleCostBreakdown.reduce((s, i) => s + i.totalCarryingCost, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reallocation Recommendations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                {t('Reallocation & Disposal Recommendations', 'توصيات إعادة التخصيص والتخلص')}
              </CardTitle>
              <CardDescription className="text-xs">{t('AI-powered suggestions based on utilization patterns and department demand', 'اقتراحات ذكية بناءً على أنماط الاستخدام')}</CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">{t('All assets are actively utilized', 'جميع الأصول مستخدمة بنشاط')}</p>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((r, i) => (
                    <div key={i} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">{r.asset.name}</span>
                            <span className="text-xs text-muted-foreground">{r.asset.asset_code}</span>
                            {getActionBadge(r.action)}
                            <Badge variant={r.priority === 'high' ? 'destructive' : r.priority === 'medium' ? 'secondary' : 'outline'} className="text-xs">
                              {r.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{r.reason}</p>
                          {r.targetDept && (
                            <p className="text-xs text-primary mt-1 flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" /> {t('Suggested: Move to', 'اقتراح: نقل إلى')} {r.targetDept}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{t('Potential Savings', 'التوفير المحتمل')}</p>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.savingsPotential)}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(r.dailyCost)}/day</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
                    <p className="text-sm text-foreground font-medium">{t('Total Potential Annual Savings', 'إجمالي التوفير السنوي المحتمل')}</p>
                    <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(totalSavings)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DEPARTMENTS ===== */}
        <TabsContent value="departments" className="space-y-6 mt-4">
          {deptData.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t('No department data available', 'لا بيانات أقسام')}</CardContent></Card>
          ) : (
            <>
              {/* Comparison Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t('Department Utilization Ranking', 'ترتيب استخدام الأقسام')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={deptData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="department" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                        <Bar dataKey="utilizationPct" radius={[0, 4, 4, 0]} name={t('Utilization %', '%')}>
                          {deptData.map((d, i) => (
                            <Cell key={i} fill={
                              d.capacityStatus === 'over-utilized' ? 'hsl(var(--destructive))'
                              : d.capacityStatus === 'optimal' ? 'hsl(var(--primary))'
                              : d.capacityStatus === 'under-utilized' ? 'hsl(var(--chart-4))'
                              : 'hsl(var(--muted-foreground))'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Heatmap */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t('Utilization Heatmap (Dept × Weekday)', 'خريطة حرارية (قسم × يوم)')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {heatmapData.departments.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-12">{t('No data', 'لا بيانات')}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              <th className="text-left py-1 px-2 text-muted-foreground">{t('Dept', 'القسم')}</th>
                              {heatmapData.dayNames.map(d => (
                                <th key={d} className="text-center py-1 px-1 text-muted-foreground w-12">{d}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {heatmapData.departments.map(dept => (
                              <tr key={dept}>
                                <td className="py-1 px-2 text-foreground font-medium truncate max-w-[100px]">{dept}</td>
                                {heatmapData.dayNames.map(day => {
                                  const cell = heatmapData.heatmap[dept]?.[day];
                                  const pct = cell && cell.available > 0 ? (cell.used / cell.available) * 100 : 0;
                                  return (
                                    <td key={day} className="py-1 px-1 text-center">
                                      <div className={`rounded h-8 flex items-center justify-center text-xs font-medium ${getHeatmapColor(pct)} ${pct > 0 ? 'text-white dark:text-white' : 'text-muted-foreground'}`}
                                        title={`${dept} - ${day}: ${pct.toFixed(0)}%`}>
                                        {pct > 0 ? `${pct.toFixed(0)}%` : '-'}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground justify-center">
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted" /> 0%</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-200 dark:bg-red-900" /> &lt;20%</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-800" /> 20-40%</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-300 dark:bg-amber-700" /> 40-60%</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-300 dark:bg-emerald-700" /> 60-80%</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500 dark:bg-emerald-600" /> &gt;80%</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Department cards with cost-per-use */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptData.map((d) => (
                  <Card key={d.department}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{d.department}</span>
                        {getCapacityBadge(d.capacityStatus)}
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('Utilization', 'الاستخدام')}</span><span className={`font-bold ${getUtilColor(d.utilizationPct)}`}>{d.utilizationPct.toFixed(1)}%</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('Hours Used', 'ساعات')}</span><span className="font-medium text-foreground">{d.hoursUsed.toFixed(0)}h / {d.hoursAvailable.toFixed(0)}h</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('Assets', 'أصول')}</span><span className="font-medium text-foreground">{d.assetCount}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('Cost/Use Hr', 'تكلفة/ساعة')}</span><span className="font-medium text-foreground">{formatCurrency(d.costPerUse)}</span></div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div className={`h-2 rounded-full transition-all ${
                            d.capacityStatus === 'over-utilized' ? 'bg-red-500' : d.capacityStatus === 'optimal' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} style={{ width: `${Math.min(d.utilizationPct, 100)}%` }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== CAPACITY PLANNING ===== */}
        <TabsContent value="capacity" className="space-y-6 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                {t('Department Capacity Planning Recommendations', 'توصيات تخطيط سعة الأقسام')}
              </CardTitle>
              <CardDescription className="text-xs">{t('Data-driven suggestions for optimizing asset allocation across departments', 'اقتراحات مبنية على البيانات لتحسين توزيع الأصول')}</CardDescription>
            </CardHeader>
            <CardContent>
              {capacityRecs.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">{t('No department data available', 'لا بيانات')}</p>
              ) : (
                <div className="space-y-4">
                  {capacityRecs.map((d, i) => (
                    <div key={i} className={`border rounded-lg p-4 ${
                      d.urgency === 'high' ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                      : d.urgency === 'medium' ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-border'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{d.department}</span>
                            {getCapacityBadge(d.capacityStatus)}
                            <Badge variant={d.urgency === 'high' ? 'destructive' : d.urgency === 'medium' ? 'secondary' : 'outline'} className="text-xs">
                              {d.urgency}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{d.recommendation}</p>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className={`text-2xl font-bold ${getUtilColor(d.utilizationPct)}`}>{d.utilizationPct.toFixed(0)}%</p>
                          <p className="text-xs text-muted-foreground">{d.assetCount} {t('assets', 'أصول')}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{t('Action:', 'الإجراء:')} <span className="text-foreground font-medium capitalize">{d.action.replace('_', ' ')}</span></span>
                        <span>{t('Hours:', 'ساعات:')} {d.hoursUsed.toFixed(0)}/{d.hoursAvailable.toFixed(0)}</span>
                        <span>{t('Logs:', 'سجلات:')} {d.logCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PER ASSET ===== */}
        <TabsContent value="assets" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('Asset Utilization Rankings', 'ترتيب استخدام الأصول')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Asset', 'الأصل')}</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Department', 'القسم')}</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Hours Used', 'ساعات')}</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Available', 'متاح')}</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Utilization', 'الاستخدام')}</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Level', 'المستوى')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetUtils.slice(0, 50).map((a, i) => (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-foreground">{a.name}</span>
                          <span className="text-muted-foreground text-xs ml-2">{a.asset_code}</span>
                        </td>
                        <td className="py-2 px-3">{a.department || '-'}</td>
                        <td className="py-2 px-3 text-right font-medium">{a.totalUsed.toFixed(1)}h</td>
                        <td className="py-2 px-3 text-right">{a.totalAvailable.toFixed(1)}h</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`font-bold ${getUtilColor(a.utilizationPct)}`}>{a.utilizationPct.toFixed(1)}%</span>
                        </td>
                        <td className="py-2 px-3 text-center">{getUtilBadge(a.utilizationPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Usage Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('Log Asset Usage', 'تسجيل استخدام الأصل')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t('Asset', 'الأصل')} *</Label>
              <Select value={logForm.asset_id} onValueChange={v => setLogForm({ ...logForm, asset_id: v })}>
                <SelectTrigger><SelectValue placeholder={t('Select asset', 'اختر الأصل')} /></SelectTrigger>
                <SelectContent>
                  {(assets || []).filter(a => a.status !== 'disposed').map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Date', 'التاريخ')}</Label>
                <Input type="date" value={logForm.log_date} onChange={e => setLogForm({ ...logForm, log_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Usage Type', 'نوع الاستخدام')}</Label>
                <Select value={logForm.usage_type} onValueChange={v => setLogForm({ ...logForm, usage_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('Active', 'نشط')}</SelectItem>
                    <SelectItem value="idle">{t('Idle', 'خامل')}</SelectItem>
                    <SelectItem value="maintenance">{t('Maintenance', 'صيانة')}</SelectItem>
                    <SelectItem value="standby">{t('Standby', 'احتياطي')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Hours Used', 'ساعات مستخدمة')}</Label>
                <Input type="number" value={logForm.hours_used} onChange={e => setLogForm({ ...logForm, hours_used: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>{t('Hours Available', 'ساعات متاحة')}</Label>
                <Input type="number" value={logForm.hours_available} onChange={e => setLogForm({ ...logForm, hours_available: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Notes', 'ملاحظات')}</Label>
              <Textarea value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleLogSubmit} disabled={!logForm.asset_id || logUsage.isPending}>{t('Save', 'حفظ')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
