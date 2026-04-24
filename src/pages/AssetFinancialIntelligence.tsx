import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssetFinance, calculateStraightLine, calculateDecliningBalance, calculateUnitsOfProduction } from '@/hooks/useAssetFinance';
import { useAssets, type Asset } from '@/hooks/useAssets';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  DollarSign, TrendingDown, TrendingUp, Calculator, Layers,
  Play, Eye, BarChart3, PieChart as PieChartIcon, ArrowDown, Percent,
} from 'lucide-react';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(142, 71%, 45%)',
];

const METHOD_LABELS: Record<string, string> = {
  straight_line: 'Straight Line',
  declining: 'Declining Balance',
  units_of_production: 'Units of Production',
};

export default function AssetFinancialIntelligence() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const { assets } = useAssets();
  const {
    depreciationRuns, getFleetFinancialSummary, getDepreciationSchedule, runDepreciation,
  } = useAssetFinance();

  const [showDepDialog, setShowDepDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [depForm, setDepForm] = useState({
    asset_id: '', method: 'straight_line', useful_life_years: '5', salvage_value: '0',
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    units_produced: '', total_estimated_units: '',
  });

  const activeAssets = useMemo(() => (assets || []).filter(a => a.status !== 'disposed'), [assets]);
  const fleet = useMemo(() => getFleetFinancialSummary(activeAssets), [activeAssets, depreciationRuns.data]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v);

  // Depreciation schedule preview
  const schedulePreview = useMemo(() => {
    if (!selectedAsset) return [];
    return getDepreciationSchedule(
      selectedAsset, depForm.method,
      parseFloat(depForm.useful_life_years) || 5,
      parseFloat(depForm.salvage_value) || 0,
      parseFloat(depForm.total_estimated_units) || 0,
    );
  }, [selectedAsset, depForm.method, depForm.useful_life_years, depForm.salvage_value, depForm.total_estimated_units]);

  // Yearly schedule for chart
  const yearlySchedule = useMemo(() => {
    const yearMap: Record<number, { depreciation: number; accumulated: number; bookValue: number }> = {};
    for (const s of schedulePreview) {
      if (!yearMap[s.year]) yearMap[s.year] = { depreciation: 0, accumulated: 0, bookValue: 0 };
      yearMap[s.year].depreciation += s.depreciation;
      yearMap[s.year].accumulated = s.accumulated;
      yearMap[s.year].bookValue = s.bookValue;
    }
    return Object.entries(yearMap).map(([y, v]) => ({ year: `Year ${y}`, ...v }));
  }, [schedulePreview]);

  // Asset value distribution by condition
  const conditionData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of activeAssets) {
      const c = a.condition || 'unknown';
      map[c] = (map[c] || 0) + (a.current_value || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [activeAssets]);

  // Top depreciating assets
  const topDepreciating = useMemo(() => {
    return activeAssets
      .map(a => ({
        ...a,
        depreciationAmount: (a.purchase_value || 0) - (a.current_value || 0),
        depreciationPct: (a.purchase_value || 0) > 0
          ? (((a.purchase_value || 0) - (a.current_value || 0)) / (a.purchase_value || 0)) * 100
          : 0,
      }))
      .sort((a, b) => b.depreciationAmount - a.depreciationAmount)
      .slice(0, 15);
  }, [activeAssets]);

  const handleRunDepreciation = () => {
    const asset = assets?.find(a => a.id === depForm.asset_id);
    if (!asset) return;
    runDepreciation.mutate({
      asset,
      method: depForm.method,
      periodStart: depForm.period_start,
      periodEnd: depForm.period_end,
      usefulLifeYears: parseFloat(depForm.useful_life_years) || 5,
      salvageValue: parseFloat(depForm.salvage_value) || 0,
      unitsProduced: parseFloat(depForm.units_produced) || undefined,
      totalEstimatedUnits: parseFloat(depForm.total_estimated_units) || undefined,
    });
    setShowDepDialog(false);
  };

  const openSchedulePreview = (asset: Asset) => {
    setSelectedAsset(asset);
    setDepForm(f => ({
      ...f,
      asset_id: asset.id,
      method: asset.depreciation_method || 'straight_line',
      salvage_value: '0',
    }));
    setShowScheduleDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Asset Financial Intelligence', 'الذكاء المالي للأصول')}</h1>
          <p className="text-muted-foreground text-sm">{t('Depreciation, ROI analysis, and cost allocation', 'الإهلاك وتحليل العائد وتخصيص التكاليف')}</p>
        </div>
        <Button onClick={() => setShowDepDialog(true)}>
          <Calculator className="h-4 w-4 mr-2" />{t('Run Depreciation', 'تشغيل الإهلاك')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('Total Purchase Value', 'إجمالي قيمة الشراء')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(fleet.totalPurchaseValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">{t('Current Book Value', 'القيمة الدفترية الحالية')}</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(fleet.totalCurrentValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">{t('Total Depreciation', 'إجمالي الإهلاك')}</span>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(fleet.totalDepreciation)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">{t('Depreciation %', 'نسبة الإهلاك')}</span>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{fleet.depreciationPct.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('Active Assets', 'الأصول النشطة')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{fleet.totalAssets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('Dep. Runs', 'عمليات الإهلاك')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{(depreciationRuns.data || []).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('Overview', 'نظرة عامة')}</TabsTrigger>
          <TabsTrigger value="depreciation">{t('Depreciation', 'الإهلاك')}</TabsTrigger>
          <TabsTrigger value="valuation">{t('Valuation', 'التقييم')}</TabsTrigger>
          <TabsTrigger value="history">{t('Run History', 'سجل العمليات')}</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Category */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Value by Category', 'القيمة حسب الفئة')}</CardTitle>
              </CardHeader>
              <CardContent>
                {fleet.byCategory.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">{t('No data', 'لا توجد بيانات')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={fleet.byCategory}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="purchaseValue" fill="hsl(var(--chart-2))" name={t('Purchase', 'الشراء')} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="currentValue" fill="hsl(var(--primary))" name={t('Current', 'الحالي')} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* By Method */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Depreciation Methods', 'طرق الإهلاك')}</CardTitle>
              </CardHeader>
              <CardContent>
                {fleet.byMethod.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">{t('No data', 'لا توجد بيانات')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={fleet.byMethod.map(m => ({ name: METHOD_LABELS[m.method] || m.method, value: m.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {fleet.byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Condition Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Value by Condition', 'القيمة حسب الحالة')}</CardTitle>
              </CardHeader>
              <CardContent>
                {conditionData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">{t('No data', 'لا توجد بيانات')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={conditionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={({ name }) => name}>
                        {conditionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Depreciating */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('Top Depreciating Assets', 'أكثر الأصول إهلاكاً')}</CardTitle>
              </CardHeader>
              <CardContent>
                {topDepreciating.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">{t('No data', 'لا توجد بيانات')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topDepreciating.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="depreciationAmount" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name={t('Depreciation', 'الإهلاك')} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Depreciation Tab - Asset list with schedule preview */}
        <TabsContent value="depreciation" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('Asset Depreciation Overview', 'نظرة عامة على إهلاك الأصول')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Asset', 'الأصل')}</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Method', 'الطريقة')}</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Purchase', 'الشراء')}</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Current', 'الحالي')}</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Depreciated', 'المُهلك')}</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Rate', 'النسبة')}</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Actions', 'إجراءات')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAssets.map(a => {
                      const dep = (a.purchase_value || 0) - (a.current_value || 0);
                      const depPct = (a.purchase_value || 0) > 0 ? (dep / (a.purchase_value || 1)) * 100 : 0;
                      return (
                        <tr key={a.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-2 px-3">
                            <span className="font-medium text-foreground">{a.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">{a.asset_code}</span>
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="capitalize text-xs">
                              {METHOD_LABELS[a.depreciation_method || 'straight_line'] || a.depreciation_method}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right font-medium">{formatCurrency(a.purchase_value || 0)}</td>
                          <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(a.current_value || 0)}</td>
                          <td className="py-2 px-3 text-right text-red-600 dark:text-red-400">{formatCurrency(dep)}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-xs font-medium">{(a.depreciation_rate || 20)}%</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button variant="ghost" size="sm" onClick={() => openSchedulePreview(a)}>
                              <Eye className="h-3.5 w-3.5 mr-1" />{t('Schedule', 'الجدول')}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Valuation Tab */}
        <TabsContent value="valuation" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Valuation Summary', 'ملخص التقييم')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Gross Value', 'القيمة الإجمالية')}</span><span className="font-bold text-foreground">{formatCurrency(fleet.totalPurchaseValue)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Accumulated Dep.', 'الإهلاك المتراكم')}</span><span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(fleet.totalDepreciation)}</span></div>
                <div className="border-t border-border pt-2 flex justify-between"><span className="text-muted-foreground font-medium">{t('Net Book Value', 'صافي القيمة الدفترية')}</span><span className="font-bold text-lg text-primary">{formatCurrency(fleet.totalCurrentValue)}</span></div>
                <div className="w-full bg-muted rounded-full h-3 mt-2">
                  <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${Math.max(100 - fleet.depreciationPct, 0)}%` }} />
                </div>
                <p className="text-xs text-center text-muted-foreground">{(100 - fleet.depreciationPct).toFixed(1)}% {t('value retained', 'من القيمة المحتفظ بها')}</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Value by Category', 'القيمة حسب الفئة')}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fleet.byCategory.map(c => {
                    const depPct = c.purchaseValue > 0 ? ((c.purchaseValue - c.currentValue) / c.purchaseValue) * 100 : 0;
                    return (
                      <div key={c.category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground font-medium">{c.category} <span className="text-muted-foreground">({c.count})</span></span>
                          <span className="text-foreground font-medium">{formatCurrency(c.currentValue)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.max(100 - depPct, 5)}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{t('Purchase', 'شراء')}: {formatCurrency(c.purchaseValue)}</span>
                          <span>{depPct.toFixed(0)}% {t('depreciated', 'مُهلك')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Run History */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('Depreciation Run History', 'سجل عمليات الإهلاك')}</CardTitle>
            </CardHeader>
            <CardContent>
              {(depreciationRuns.data || []).length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-12">{t('No depreciation runs yet', 'لا توجد عمليات إهلاك بعد')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Date', 'التاريخ')}</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Period', 'الفترة')}</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('Method', 'الطريقة')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Amount', 'المبلغ')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Accumulated', 'المتراكم')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('Book Value After', 'القيمة بعد')}</th>
                        <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t('Status', 'الحالة')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(depreciationRuns.data || []).map(r => (
                        <tr key={r.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-2 px-3">{r.run_date}</td>
                          <td className="py-2 px-3 text-xs">{r.period_start} → {r.period_end}</td>
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs capitalize">{METHOD_LABELS[r.depreciation_method] || r.depreciation_method}</Badge></td>
                          <td className="py-2 px-3 text-right text-red-600 dark:text-red-400 font-medium">{formatCurrency(r.depreciation_amount)}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(r.accumulated_depreciation)}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatCurrency(r.book_value_after)}</td>
                          <td className="py-2 px-3 text-center"><Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{r.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Run Depreciation Dialog */}
      <Dialog open={showDepDialog} onOpenChange={setShowDepDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('Run Depreciation', 'تشغيل الإهلاك')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t('Asset', 'الأصل')} *</Label>
              <Select value={depForm.asset_id} onValueChange={v => setDepForm({ ...depForm, asset_id: v })}>
                <SelectTrigger><SelectValue placeholder={t('Select asset', 'اختر الأصل')} /></SelectTrigger>
                <SelectContent>
                  {activeAssets.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('Method', 'الطريقة')}</Label>
              <Select value={depForm.method} onValueChange={v => setDepForm({ ...depForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">{t('Straight Line', 'خط مستقيم')}</SelectItem>
                  <SelectItem value="declining">{t('Declining Balance', 'القسط المتناقص')}</SelectItem>
                  <SelectItem value="units_of_production">{t('Units of Production', 'وحدات الإنتاج')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Period Start', 'بداية الفترة')}</Label>
                <Input type="date" value={depForm.period_start} onChange={e => setDepForm({ ...depForm, period_start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Period End', 'نهاية الفترة')}</Label>
                <Input type="date" value={depForm.period_end} onChange={e => setDepForm({ ...depForm, period_end: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Useful Life (Years)', 'العمر الإنتاجي (سنوات)')}</Label>
                <Input type="number" value={depForm.useful_life_years} onChange={e => setDepForm({ ...depForm, useful_life_years: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Salvage Value', 'قيمة الخردة')}</Label>
                <Input type="number" value={depForm.salvage_value} onChange={e => setDepForm({ ...depForm, salvage_value: e.target.value })} />
              </div>
            </div>
            {depForm.method === 'units_of_production' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Units Produced', 'الوحدات المنتجة')}</Label>
                  <Input type="number" value={depForm.units_produced} onChange={e => setDepForm({ ...depForm, units_produced: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('Total Est. Units', 'إجمالي الوحدات المقدرة')}</Label>
                  <Input type="number" value={depForm.total_estimated_units} onChange={e => setDepForm({ ...depForm, total_estimated_units: e.target.value })} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepDialog(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleRunDepreciation} disabled={!depForm.asset_id || runDepreciation.isPending}>
              <Play className="h-4 w-4 mr-2" />{t('Run', 'تشغيل')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Preview Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Depreciation Schedule', 'جدول الإهلاك')} - {selectedAsset?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('Method', 'الطريقة')}</Label>
                <Select value={depForm.method} onValueChange={v => setDepForm({ ...depForm, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">{t('Straight Line', 'خط مستقيم')}</SelectItem>
                    <SelectItem value="declining">{t('Declining Balance', 'متناقص')}</SelectItem>
                    <SelectItem value="units_of_production">{t('Units of Production', 'وحدات الإنتاج')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Useful Life (Yrs)', 'العمر (سنوات)')}</Label>
                <Input type="number" value={depForm.useful_life_years} onChange={e => setDepForm({ ...depForm, useful_life_years: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Salvage Value', 'قيمة الخردة')}</Label>
                <Input type="number" value={depForm.salvage_value} onChange={e => setDepForm({ ...depForm, salvage_value: e.target.value })} />
              </div>
            </div>

            {/* Schedule chart */}
            {yearlySchedule.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={yearlySchedule}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="bookValue" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" name={t('Book Value', 'القيمة الدفترية')} />
                  <Area type="monotone" dataKey="accumulated" fill="hsl(var(--destructive) / 0.1)" stroke="hsl(var(--destructive))" name={t('Accumulated Dep.', 'الإهلاك المتراكم')} />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* Schedule table */}
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">{t('Year', 'السنة')}</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">{t('Month', 'الشهر')}</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">{t('Depreciation', 'الإهلاك')}</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">{t('Accumulated', 'المتراكم')}</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">{t('Book Value', 'القيمة الدفترية')}</th>
                  </tr>
                </thead>
                <tbody>
                  {schedulePreview.map(s => (
                    <tr key={s.period} className="border-b border-border/30">
                      <td className="py-1.5 px-2">{s.year}</td>
                      <td className="py-1.5 px-2">{s.month}</td>
                      <td className="py-1.5 px-2 text-right text-red-600 dark:text-red-400">{formatCurrency(s.depreciation)}</td>
                      <td className="py-1.5 px-2 text-right">{formatCurrency(s.accumulated)}</td>
                      <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(s.bookValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
