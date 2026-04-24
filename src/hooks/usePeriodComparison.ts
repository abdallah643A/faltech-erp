import { useMemo } from 'react';
import { useDashboardPeriod, DateRange } from '@/contexts/DashboardPeriodContext';

/**
 * usePeriodComparison
 * --------------------------------
 * Pure helper that, given a current and (optional) prior numeric value,
 * returns variance metrics ready for KPI display.
 *
 * Background behavior:
 *  - No data fetching here — keep this hook pure so it can be used inside
 *    any data-source (Supabase queries, SAP middleware, materialized views).
 *  - Date ranges come from the global DashboardPeriodContext so all KPI
 *    tiles on a dashboard share a single source of truth.
 */

export interface ComparisonResult {
  current: number;
  prior: number | null;
  delta: number | null;
  deltaPct: number | null;
  trend: 'up' | 'down' | 'flat' | 'na';
  ranges: { current: DateRange; prior: DateRange | null };
  label: string;
  priorLabel: string | null;
}

interface Options {
  /** When true (default), increases are good (revenue). When false, increases are bad (cost, overdue). */
  higherIsBetter?: boolean;
  /** Minimum absolute delta % to be considered non-flat. Defaults to 0.5%. */
  flatThresholdPct?: number;
}

export function usePeriodComparison(
  current: number | null | undefined,
  prior: number | null | undefined,
  opts: Options = {}
): ComparisonResult {
  const { ranges } = useDashboardPeriod();
  const { flatThresholdPct = 0.5 } = opts;

  return useMemo<ComparisonResult>(() => {
    const cur = typeof current === 'number' && isFinite(current) ? current : 0;
    const pr = typeof prior === 'number' && isFinite(prior) ? prior : null;

    if (pr === null) {
      return {
        current: cur, prior: null, delta: null, deltaPct: null,
        trend: 'na',
        ranges: { current: ranges.current, prior: ranges.prior },
        label: ranges.label,
        priorLabel: ranges.priorLabel,
      };
    }

    const delta = cur - pr;
    const deltaPct = pr === 0 ? (cur === 0 ? 0 : 100) : (delta / Math.abs(pr)) * 100;
    const trend: ComparisonResult['trend'] =
      Math.abs(deltaPct) < flatThresholdPct ? 'flat' : deltaPct > 0 ? 'up' : 'down';

    return {
      current: cur, prior: pr, delta, deltaPct,
      trend,
      ranges: { current: ranges.current, prior: ranges.prior },
      label: ranges.label,
      priorLabel: ranges.priorLabel,
    };
  }, [current, prior, ranges, flatThresholdPct]);
}
