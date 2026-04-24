import { useDashboardPeriod, PeriodKey, ComparisonKey } from '@/contexts/DashboardPeriodContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarRange, GitCompareArrows } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * PeriodSelector
 * --------------------------------
 * Compact toolbar control that mounts on any dashboard to let the user
 * pick the analysis window and the comparison basis. The selected values
 * propagate to every KPI tile/chart that uses `usePeriodComparison` or
 * reads `useDashboardPeriod`.
 */

const PERIODS: { key: PeriodKey; en: string; ar: string }[] = [
  { key: 'mtd', en: 'Month to date', ar: 'الشهر حتى اليوم' },
  { key: 'qtd', en: 'Quarter to date', ar: 'الربع حتى اليوم' },
  { key: 'ytd', en: 'Year to date', ar: 'السنة حتى اليوم' },
  { key: 'last30', en: 'Last 30 days', ar: 'آخر 30 يومًا' },
  { key: 'last90', en: 'Last 90 days', ar: 'آخر 90 يومًا' },
  { key: 'lastyear', en: 'Last year', ar: 'العام الماضي' },
];

const COMPARISONS: { key: ComparisonKey; en: string; ar: string }[] = [
  { key: 'mom', en: 'vs prior month', ar: 'مقابل الشهر السابق' },
  { key: 'qoq', en: 'vs prior quarter', ar: 'مقابل الربع السابق' },
  { key: 'yoy', en: 'vs same period LY', ar: 'مقابل نفس الفترة العام الماضي' },
  { key: 'none', en: 'No comparison', ar: 'بدون مقارنة' },
];

export function PeriodSelector({ className }: { className?: string }) {
  const { period, comparison, setPeriod, setComparison } = useDashboardPeriod();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" />
      </div>
      <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map(p => (
            <SelectItem key={p.key} value={p.key} className="text-xs">
              {isAr ? p.ar : p.en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
        <GitCompareArrows className="h-3.5 w-3.5" />
      </div>
      <Select value={comparison} onValueChange={(v) => setComparison(v as ComparisonKey)}>
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMPARISONS.map(c => (
            <SelectItem key={c.key} value={c.key} className="text-xs">
              {isAr ? c.ar : c.en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
