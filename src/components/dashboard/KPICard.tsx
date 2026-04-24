import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { ComparisonResult } from '@/hooks/usePeriodComparison';
import { buildFilteredHref } from '@/hooks/useUrlFilters';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface KPICardProps {
  title: string;
  value: string | number;
  /**
   * Legacy simple change indicator. Prefer `comparison` for full PoP behavior.
   * Kept for backward compatibility with all existing dashboard pages.
   */
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  /**
   * Period-over-period comparison block. When present, overrides `change`
   * and renders an arrow + variance % + tooltip showing prior-period value
   * and date ranges (driven by DashboardPeriodContext).
   */
  comparison?: ComparisonResult & {
    higherIsBetter?: boolean;
    /** Optional formatter for prior value display (e.g., currency). */
    formatValue?: (n: number) => string;
  };
  icon: LucideIcon;
  variant?: 'primary' | 'success' | 'warning' | 'info';
  href?: string;
  /**
   * Optional filter map appended as query string to `href`, enabling
   * "drill from KPI to filtered list view in ≤2 clicks".
   * Example: { status: 'overdue', aging: '60+' }
   */
  filter?: Record<string, string | number | null | undefined>;
  subtitle?: string;
}

function trendColor(trend: ComparisonResult['trend'], higherIsBetter: boolean): string {
  if (trend === 'flat' || trend === 'na') return 'text-white/70';
  const isPositive = (trend === 'up') === higherIsBetter;
  return isPositive ? 'text-emerald-200' : 'text-red-200';
}

export function KPICard({ title, value, change, comparison, icon: Icon, variant = 'primary', href, filter, subtitle }: KPICardProps) {
  const navigate = useNavigate();
  const target = href ? buildFilteredHref(href, filter) : undefined;

  const variantClasses = {
    primary: 'kpi-card-primary',
    success: 'kpi-card-success',
    warning: 'kpi-card-warning',
    info: 'kpi-card-info',
  };

  return (
    <div
      onClick={() => target && navigate(target)}
      className={cn(
        'rounded-xl p-4 md:p-6 text-white shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl',
        variantClasses[variant],
        target && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-white/80 text-xs md:text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl md:text-3xl font-bold truncate">{value}</h3>
          {subtitle && (
            <p className="text-white/60 text-xs mt-1">{subtitle}</p>
          )}
          {comparison ? (
            (() => {
              const higherIsBetter = comparison.higherIsBetter ?? true;
              const TrendIcon = comparison.trend === 'up' ? ArrowUpRight
                : comparison.trend === 'down' ? ArrowDownRight
                : Minus;
              const pct = comparison.deltaPct;
              const fmt = comparison.formatValue ?? ((n: number) => n.toLocaleString());
              return (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'text-xs md:text-sm mt-2 flex items-center gap-1 cursor-help w-fit bg-transparent border-0 p-0',
                          trendColor(comparison.trend, higherIsBetter)
                        )}
                      >
                        <TrendIcon className="h-3.5 w-3.5" />
                        <span>
                          {pct === null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}
                        </span>
                        {comparison.priorLabel && (
                          <span className="text-white/60 text-[10px] ml-1 hidden md:inline">
                            {comparison.priorLabel}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div className="space-y-0.5">
                        <div><strong>Current:</strong> {fmt(comparison.current)}</div>
                        <div><strong>Prior:</strong> {comparison.prior !== null ? fmt(comparison.prior) : '—'}</div>
                        <div className="text-muted-foreground">
                          {comparison.ranges.current.from} → {comparison.ranges.current.to}
                        </div>
                        {comparison.ranges.prior && (
                          <div className="text-muted-foreground">
                            Prior: {comparison.ranges.prior.from} → {comparison.ranges.prior.to}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })()
          ) : change ? (
            <p className={cn(
              'text-xs md:text-sm mt-2 flex items-center gap-1',
              change.type === 'increase' ? 'text-green-200' : 'text-red-200'
            )}>
              <span>{change.type === 'increase' ? '↑' : '↓'}</span>
              <span>{Math.abs(change.value)}% from last month</span>
            </p>
          ) : null}
        </div>
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-white/20 flex items-center justify-center shrink-0 ml-2">
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </div>
      </div>
    </div>
  );
}
