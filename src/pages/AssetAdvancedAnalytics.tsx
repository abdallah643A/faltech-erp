import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssetAdvancedAnalytics } from '@/hooks/useAssetAdvancedAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area, ScatterChart,
  Scatter, ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Brain, TrendingUp, DollarSign, Users, Clock, Target, BarChart3,
  AlertTriangle, Lightbulb, ArrowUp, ArrowDown, Minus, RefreshCw,
  Download, Zap, Shield, Shuffle, Activity, Calendar, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(142,71%,45%)',
  'hsl(38,92%,50%)', 'hsl(280,65%,60%)',
];

export default function AssetAdvancedAnalytics() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const {
    getSeasonalAnalysis, getDemandForecasts, getUtilizationPrediction,
    getAssetROI, getUtilizationVsMaintenanceCost,
    getOperatorMetrics, getSharingEfficiency,
    getAgingAnalysis, getDeclineCurve, getReplacementRecommendations,
    getAssetComparisons, getVarianceAnalysis,
    getAvailabilityOverview, getConflictDetection,
    getExecutiveSummary,
  } = useAssetAdvancedAnalytics();

  const [period, setPeriod] = useState('90');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiType, setAiType] = useState<'recommendations' | 'what_if' | 'anomaly' | 'optimization'>('recommendations');
  const [whatIfScenario, setWhatIfScenario] = useState('');

  const days = parseInt(period);
  const seasonal = getSeasonalAnalysis();
  const forecasts = getDemandForecasts();
  const prediction = getUtilizationPrediction(days);
  const roiData = getAssetROI(days);
  const utilVsMaint = getUtilizationVsMaintenanceCost();
  const operators = getOperatorMetrics(days);
  const sharing = getSharingEfficiency(days);
  const aging = getAgingAnalysis(days);
  const declineCurve = getDeclineCurve();
  const replacements = getReplacementRecommendations();
  const variance = getVarianceAnalysis(days);
  const availability = getAvailabilityOverview(days);
  const conflicts = getConflictDetection(days);
  const executive = getExecutiveSummary(days);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v);

  const getUtilColor = (pct: number) => {
    if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const runAiAnalysis = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const payload: any = { type: aiType };
      if (aiType === 'recommendations') {
        payload.data = {
          totalAssets: executive.totalAssets,
          avgUtilization: executive.avgUtilization,
          top5: executive.top10.slice(0, 5).map(a => ({ name: a.name, utilization: a.utilizationPct, department: a.department })),
          bottom5: executive.bottom10.slice(0, 5).map(a => ({ name: a.name, utilization: a.utilizationPct, department: a.department })),
          departments: operators.map(o => ({ department: o.department, utilization: o.avgUtilization, assets: o.assetCount })),
          forecasts: forecasts.slice(0, 5),
        };
      } else if (aiType === 'what_if') {
        payload.data = {
          current: { totalAssets: executive.totalAssets, avgUtilization: executive.avgUtilization, departments: operators },
          scenario: whatIfScenario || 'Redistribute 3 idle assets from low-utilization departments to high-demand departments',
        };
      } else if (aiType === 'anomaly') {
        payload.data = {
          anomalies: executive.anomalies.slice(0, 10).map(a => ({
            name: a.name, department: a.department, utilization30d: a.utilizationPct,
          })),
          operators: operators.slice(0, 5),
        };
      } else {
        payload.data = {
          totalAssets: executive.totalAssets, avgUtilization: executive.avgUtilization,
          categories: forecasts, aging: aging, replacementCandidates: replacements.length,
        };
      }

      const { data, error } = await supabase.functions.invoke('asset-ai-insights', { body: payload });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'AI Analysis', description: data.error, variant: 'destructive' });
      } else {
        setAiResult(data?.result);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Advanced Asset Analytics', 'التحليلات المتقدمة للأصول')}</h1>
          <p className="text-muted-foreground text-sm">{t('Predictive insights, cost analysis, AI recommendations, and operational intelligence', 'رؤى تنبؤية وتحليل التكاليف وتوصيات ذكية')}</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">{t('30 days', '30 يوم')}</SelectItem>
            <SelectItem value="90">{t('90 days', '90 يوم')}</SelectItem>
            <SelectItem value="180">{t('6 months', '6 أشهر')}</SelectItem>
            <SelectItem value="365">{t('1 year', 'سنة')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">{t('Avg Utilization', 'متوسط الاستخدام')}</span></div>
          <p className={`text-2xl font-bold ${getUtilColor(executive.avgUtilization)}`}>{executive.avgUtilization.toFixed(1)}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">{t('Portfolio Value', 'قيمة المحفظة')}</span></div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(executive.totalValue)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">{t('Trend', 'الاتجاه')}</span></div>
          <div className="flex items-center gap-1">
            {prediction.trend === 'increasing' ? <ArrowUp className="h-5 w-5 text-emerald-500" /> :
             prediction.trend === 'decreasing' ? <ArrowDown className="h-5 w-5 text-red-500" /> :
             <Minus className="h-5 w-5 text-amber-500" />}
            <span className="text-lg font-bold text-foreground capitalize">{prediction.trend}</span>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">{t('Anomalies', 'شذوذات')}</span></div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{executive.anomalies.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Shuffle className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">{t('Sharing Rate', 'معدل المشاركة')}</span></div>
          <p className="text-2xl font-bold text-foreground">{sharing.sharingRate.toFixed(0)}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><RefreshCw className="h-4 w-4 text-red-500" /><span className="text-xs text-muted-foreground">{t('Replace Soon', 'استبدال قريب')}</span></div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{replacements.length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="predictive">
        <TabsList className="flex-wrap">
          <TabsTrigger value="predictive"><TrendingUp className="h-3.5 w-3.5 mr-1" />{t('Predictive', 'تنبؤي')}</TabsTrigger>
          <TabsTrigger value="cost"><DollarSign className="h-3.5 w-3.5 mr-1" />{t('Cost-Benefit', 'تكلفة-فائدة')}</TabsTrigger>
          <TabsTrigger value="operators"><Users className="h-3.5 w-3.5 mr-1" />{t('Operators', 'المشغلون')}</TabsTrigger>
          <TabsTrigger value="lifecycle"><Clock className="h-3.5 w-3.5 mr-1" />{t('Lifecycle', 'دورة الحياة')}</TabsTrigger>
          <TabsTrigger value="comparative"><BarChart3 className="h-3.5 w-3.5 mr-1" />{t('Comparative', 'مقارنة')}</TabsTrigger>
          <TabsTrigger value="executive"><Target className="h-3.5 w-3.5 mr-1" />{t('Executive', 'تنفيذي')}</TabsTrigger>
          <TabsTrigger value="ai"><Brain className="h-3.5 w-3.5 mr-1" />{t('AI Insights', 'رؤى ذكية')}</TabsTrigger>
        </TabsList>

        {/* ═══ PREDICTIVE ═══ */}
        <TabsContent value="predictive" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Forecast */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Utilization Forecast (30-day Projection)', 'توقع الاستخدام')}</CardTitle>
                <CardDescription className="text-xs">
                  {t(`30d: ${prediction.predicted30.toFixed(1)}% | 60d: ${prediction.predicted60.toFixed(1)}% | 90d: ${prediction.predicted90.toFixed(1)}%`,
                     `30ي: ${prediction.predicted30.toFixed(1)}% | 60ي: ${prediction.predicted60.toFixed(1)}% | 90ي: ${prediction.predicted90.toFixed(1)}%`)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {prediction.points.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">{t('Insufficient data for prediction', 'بيانات غير كافية')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={prediction.points}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => format(new Date(d), 'dd/MM')} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                      <Area type="monotone" dataKey="predicted" fill="hsl(var(--chart-2) / 0.3)" stroke="hsl(var(--chart-2))" strokeDasharray="5 5" name={t('Predicted', 'متوقع')} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Seasonal */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Seasonal Utilization Patterns', 'أنماط الاستخدام الموسمية')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={seasonal}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="totalHours" fill="hsl(var(--primary) / 0.3)" name={t('Hours', 'ساعات')} />
                    <Line type="monotone" dataKey="avgUtilization" stroke="hsl(var(--primary))" strokeWidth={2} name={t('Avg %', '%')} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {seasonal.filter(s => s.isPeak).map(s => (
                    <Badge key={s.month} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      🔥 {s.month} - Peak
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demand Forecasts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('Demand Forecast by Category', 'توقع الطلب حسب الفئة')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Category', 'الفئة')}</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Current', 'حالي')}</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Utilization', 'الاستخدام')}</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Projected Need', 'الحاجة المتوقعة')}</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Gap', 'الفجوة')}</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Recommendation', 'التوصية')}</th>
                  </tr></thead>
                  <tbody>
                    {forecasts.map((f, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium text-foreground">{f.category}</td>
                        <td className="py-2 px-3 text-center">{f.currentAssets}</td>
                        <td className="py-2 px-3 text-center"><span className={getUtilColor(f.currentUtilization)}>{f.currentUtilization.toFixed(1)}%</span></td>
                        <td className="py-2 px-3 text-center font-medium">{f.projectedDemand}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={f.assetsNeeded > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {f.assetsNeeded > 0 ? `+${f.assetsNeeded}` : f.projectedDemand - f.currentAssets}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{f.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ COST-BENEFIT ═══ */}
        <TabsContent value="cost" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ROI Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Asset ROI Distribution', 'توزيع عائد الاستثمار')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={roiData.slice(0, 15)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="asset.name" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Bar dataKey="roi" name="ROI %" radius={[0, 4, 4, 0]}>
                      {roiData.slice(0, 15).map((r, i) => (
                        <Cell key={i} fill={r.roi >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Utilization vs Maintenance Scatter */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Utilization vs Maintenance Cost', 'الاستخدام مقابل تكلفة الصيانة')}</CardTitle>
              </CardHeader>
              <CardContent>
                {utilVsMaint.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">{t('No data', 'لا بيانات')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" dataKey="utilization" name="Util %" unit="%" tick={{ fontSize: 10 }} />
                      <YAxis type="number" dataKey="maintenanceCost" name="Maint Cost" tick={{ fontSize: 10 }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number) => formatCurrency(v)} />
                      <Scatter data={utilVsMaint} fill="hsl(var(--primary))" />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ROI Table with Break-Even */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('Break-Even & Cost Analysis', 'تحليل نقطة التعادل والتكلفة')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Asset', 'الأصل')}</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Revenue', 'الإيراد')}</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Total Cost', 'التكلفة')}</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('ROI', 'عائد')}</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Rev/Hr', 'إيراد/ساعة')}</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Cost/Hr', 'تكلفة/ساعة')}</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Break-Even', 'نقطة التعادل')}</th>
                  </tr></thead>
                  <tbody>
                    {roiData.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium text-foreground">{r.asset.name}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(r.totalRevenue)}</td>
                        <td className="py-2 px-3 text-right text-red-600 dark:text-red-400">{formatCurrency(r.totalCost)}</td>
                        <td className="py-2 px-3 text-right font-bold">
                          <span className={r.roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{r.roi.toFixed(1)}%</span>
                        </td>
                        <td className="py-2 px-3 text-right">{formatCurrency(r.revenuePerHour)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(r.costPerHour)}</td>
                        <td className="py-2 px-3 text-center">
                          {r.breakEvenMet ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">✓ Met ({r.currentHours.toFixed(0)}h/{r.breakEvenHours.toFixed(0)}h)</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">✗ {r.currentHours.toFixed(0)}h/{r.breakEvenHours.toFixed(0)}h needed</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ OPERATORS ═══ */}
        <TabsContent value="operators" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Department Performance Scorecards', 'بطاقات أداء الأقسام')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {operators.map((op, i) => (
                    <div key={i} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{op.department}</span>
                        <Badge className={
                          op.tier === 'power_user' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : op.tier === 'underutilizer' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-muted text-muted-foreground'
                        }>
                          {op.tier === 'power_user' ? '⭐ Power User' : op.tier === 'underutilizer' ? '⚠️ Underutilizer' : '○ Average'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Utilization</span><p className={`font-bold ${getUtilColor(op.avgUtilization)}`}>{op.avgUtilization.toFixed(1)}%</p></div>
                        <div><span className="text-muted-foreground">Efficiency</span><p className="font-bold text-foreground">{op.efficiency.toFixed(0)}%</p></div>
                        <div><span className="text-muted-foreground">Assets</span><p className="font-bold text-foreground">{op.assetCount}</p></div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                        <div className={`h-1.5 rounded-full ${op.tier === 'power_user' ? 'bg-emerald-500' : op.tier === 'underutilizer' ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(op.efficiency, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Asset Sharing Efficiency', 'كفاءة مشاركة الأصول')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 border border-border rounded-lg">
                    <p className="text-3xl font-bold text-primary">{sharing.sharedAssets}</p>
                    <p className="text-xs text-muted-foreground">{t('Shared Assets', 'أصول مشتركة')}</p>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <p className="text-3xl font-bold text-foreground">{sharing.exclusiveAssets}</p>
                    <p className="text-xs text-muted-foreground">{t('Exclusive Assets', 'أصول حصرية')}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={[
                      { name: t('Shared', 'مشتركة'), value: sharing.sharedAssets },
                      { name: t('Exclusive', 'حصرية'), value: sharing.exclusiveAssets },
                    ]} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}>
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--chart-3))" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {t('Usage Conflicts Detected', 'تعارضات الاستخدام')}
                  <Badge variant="secondary">{conflicts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {conflicts.slice(0, 10).map((c, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-border/50 py-2">
                      <div>
                        <span className="font-medium text-foreground">{c.asset?.name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground ml-2">{c.date}</span>
                      </div>
                      <div className="flex gap-1">
                        {c.departments.map(d => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ LIFECYCLE ═══ */}
        <TabsContent value="lifecycle" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aging Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Utilization by Asset Age', 'الاستخدام حسب عمر الأصل')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={aging}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="ageGroup" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgUtilization" fill="hsl(var(--primary))" name={t('Avg Util %', 'متوسط %')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgConditionScore" fill="hsl(var(--chart-3))" name={t('Condition Score', 'حالة')} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Decline Curve */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Utilization Decline Curve', 'منحنى انخفاض الاستخدام')}</CardTitle>
              </CardHeader>
              <CardContent>
                {declineCurve.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">{t('No data', 'لا بيانات')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" dataKey="ageMonths" name="Age (months)" unit="m" tick={{ fontSize: 10 }} />
                      <YAxis type="number" dataKey="utilization" name="Util %" unit="%" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Scatter data={declineCurve} fill="hsl(var(--primary))" />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Replacement Recommendations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-red-500" />
                {t('Replacement Timing Recommendations', 'توصيات توقيت الاستبدال')}
                <Badge variant="secondary">{replacements.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {replacements.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">{t('No replacements needed currently', 'لا حاجة لاستبدالات حالياً')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Asset', 'الأصل')}</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Age', 'العمر')}</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Remaining Life', 'العمر المتبقي')}</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Utilization', 'الاستخدام')}</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Value Ratio', 'نسبة القيمة')}</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Timing', 'التوقيت')}</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Reason', 'السبب')}</th>
                    </tr></thead>
                    <tbody>
                      {replacements.slice(0, 15).map((r, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-2 px-3 font-medium text-foreground">{r.asset.name}</td>
                          <td className="py-2 px-3 text-center">{r.ageYears.toFixed(1)}y</td>
                          <td className="py-2 px-3 text-center">{r.remainingLife.toFixed(1)}y</td>
                          <td className="py-2 px-3 text-center"><span className={getUtilColor(r.utilization)}>{r.utilization.toFixed(1)}%</span></td>
                          <td className="py-2 px-3 text-center">{(r.valueRatio * 100).toFixed(0)}%</td>
                          <td className="py-2 px-3 text-center">
                            <Badge className={
                              r.timing === 'immediate' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : r.timing === 'within_1_year' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                            }>{r.timing.replace(/_/g, ' ')}</Badge>
                          </td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ COMPARATIVE ═══ */}
        <TabsContent value="comparative" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground">{t('High Variance', 'تباين عالي')}</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{variance.highVariance.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground">{t('Best Practices', 'أفضل الممارسات')}</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{variance.bestPractices.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground">{t('Underperformers', 'أداء منخفض')}</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{variance.underperformers.length}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('Asset Variance Analysis', 'تحليل التباين')}</CardTitle>
              <CardDescription className="text-xs">{t('Comparing similar assets within the same category', 'مقارنة أصول مماثلة ضمن نفس الفئة')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Asset', 'الأصل')}</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Utilization', 'الاستخدام')}</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Category Avg', 'متوسط الفئة')}</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Variance', 'التباين')}</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Rank', 'الترتيب')}</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Status', 'الحالة')}</th>
                  </tr></thead>
                  <tbody>
                    {variance.highVariance.slice(0, 20).map((c, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium text-foreground">{c.asset.name}</td>
                        <td className="py-2 px-3 text-center"><span className={getUtilColor(c.utilization)}>{c.utilization.toFixed(1)}%</span></td>
                        <td className="py-2 px-3 text-center text-muted-foreground">{c.categoryAvg.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-center font-bold">
                          <span className={c.variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                            {c.variance > 0 ? '+' : ''}{c.variance.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">{c.rank}/{c.totalInCategory}</td>
                        <td className="py-2 px-3 text-center">
                          {c.isBestPractice ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">⭐ Best</Badge>
                           : c.variance < -20 ? <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">↓ Under</Badge>
                           : <Badge variant="outline">Normal</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ EXECUTIVE ═══ */}
        <TabsContent value="executive" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('Top 10 Most Utilized', 'أعلى 10 استخداماً')}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {executive.top10.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(a.utilizationPct, 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{a.utilizationPct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('Top 10 Least Utilized', 'أقل 10 استخداماً')}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {executive.bottom10.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.max(a.utilizationPct, 2)}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400">{a.utilizationPct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Anomalies */}
          {executive.anomalies.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {t('Utilization Anomalies', 'شذوذات الاستخدام')}
                  <Badge variant="secondary">{executive.anomalies.length}</Badge>
                </CardTitle>
                <CardDescription className="text-xs">{t('Assets with >30% utilization change (30d vs 90d)', 'أصول بتغير >30% في الاستخدام')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {executive.anomalies.slice(0, 10).map((a, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-border/50 py-2">
                      <div>
                        <span className="font-medium text-foreground">{a.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{a.department || ''}</span>
                      </div>
                      <span className={`font-bold ${getUtilColor(a.utilizationPct)}`}>{a.utilizationPct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Availability */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('Fleet Availability Overview', 'نظرة عامة على التوفر')}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={[
                    { name: t('In Use', 'قيد الاستخدام'), value: availability.inUse },
                    { name: t('Available', 'متاح'), value: availability.available },
                    { name: t('Maintenance', 'صيانة'), value: availability.maintenance },
                  ]} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}>
                    <Cell fill="hsl(var(--primary))" />
                    <Cell fill="hsl(var(--chart-3))" />
                    <Cell fill="hsl(var(--chart-4))" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ AI INSIGHTS ═══ */}
        <TabsContent value="ai" className="space-y-6 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                {t('AI-Powered Asset Intelligence', 'ذكاء الأصول المدعوم بالذكاء الاصطناعي')}
              </CardTitle>
              <CardDescription className="text-xs">{t('Get actionable insights powered by AI analysis of your asset portfolio', 'احصل على رؤى قابلة للتنفيذ')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {([
                  { type: 'recommendations' as const, icon: Lightbulb, label: t('Recommendations', 'توصيات'), desc: t('Actionable suggestions', 'اقتراحات') },
                  { type: 'what_if' as const, icon: Zap, label: t('What-If', 'ماذا لو'), desc: t('Scenario analysis', 'تحليل سيناريو') },
                  { type: 'anomaly' as const, icon: AlertTriangle, label: t('Anomalies', 'شذوذات'), desc: t('Unusual patterns', 'أنماط غير عادية') },
                  { type: 'optimization' as const, icon: Target, label: t('Optimize', 'تحسين'), desc: t('Portfolio rightsizing', 'ضبط المحفظة') },
                ] as const).map(item => (
                  <button key={item.type} onClick={() => setAiType(item.type)}
                    className={`p-3 rounded-lg border text-left transition-colors ${aiType === item.type ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                    <item.icon className={`h-5 w-5 mb-1 ${aiType === item.type ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </button>
                ))}
              </div>

              {aiType === 'what_if' && (
                <div className="mb-4">
                  <Textarea placeholder={t('Describe your scenario (e.g., "What if we move 5 vehicles from Sales to Operations?")', 'صف سيناريوك...')}
                    value={whatIfScenario} onChange={e => setWhatIfScenario(e.target.value)} className="mb-2" />
                </div>
              )}

              <Button onClick={runAiAnalysis} disabled={aiLoading} className="w-full">
                {aiLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('Analyzing...', 'جاري التحليل...')}</> :
                  <><Brain className="h-4 w-4 mr-2" />{t('Run AI Analysis', 'تشغيل التحليل')}</>}
              </Button>

              {aiResult && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-medium text-foreground">{t('AI Analysis Results', 'نتائج التحليل')}</h3>

                  {/* Recommendations */}
                  {Array.isArray(aiResult) && aiResult.map((r: any, i: number) => (
                    <div key={i} className={`border rounded-lg p-4 ${
                      r.impact === 'high' ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                      : r.impact === 'medium' ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-border'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">{r.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={r.impact === 'high' ? 'destructive' : 'secondary'}>{r.impact}</Badge>
                          {r.savingsEstimate > 0 && (
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(r.savingsEstimate)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* What-If / Optimization object results */}
                  {!Array.isArray(aiResult) && typeof aiResult === 'object' && (
                    <div className="border border-border rounded-lg p-4 space-y-3">
                      {aiResult.recommendation && <p className="text-sm text-foreground">{aiResult.recommendation}</p>}
                      {aiResult.impact && <p className="text-sm text-muted-foreground"><strong>Impact:</strong> {aiResult.impact}</p>}
                      {aiResult.totalPotentialSavings && (
                        <div className="bg-primary/5 border border-primary/20 rounded p-3 text-center">
                          <p className="text-xs text-muted-foreground">{t('Total Potential Savings', 'إجمالي التوفير')}</p>
                          <p className="text-2xl font-bold text-primary">{formatCurrency(aiResult.totalPotentialSavings)}</p>
                        </div>
                      )}
                      {aiResult.benefits && (
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">{t('Benefits', 'الفوائد')}</p>
                          {aiResult.benefits.map((b: string, i: number) => (
                            <p key={i} className="text-sm text-emerald-600 dark:text-emerald-400">✓ {b}</p>
                          ))}
                        </div>
                      )}
                      {aiResult.risks && (
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">{t('Risks', 'المخاطر')}</p>
                          {aiResult.risks.map((r: string, i: number) => (
                            <p key={i} className="text-sm text-red-600 dark:text-red-400">⚠ {r}</p>
                          ))}
                        </div>
                      )}
                      {aiResult.suggestions && Array.isArray(aiResult.suggestions) && (
                        <div className="space-y-2">
                          {aiResult.suggestions.map((s: any, i: number) => (
                            <div key={i} className="flex items-center justify-between border-b border-border/50 py-2">
                              <div>
                                <Badge variant="outline" className="mr-2 capitalize">{s.action}</Badge>
                                <span className="text-sm text-foreground">{s.assetCategory} × {s.count}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">{s.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Fallback for raw text */}
                      {aiResult.raw && <p className="text-sm text-foreground whitespace-pre-wrap">{aiResult.raw}</p>}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
