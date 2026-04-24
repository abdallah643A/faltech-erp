import { createContext, useContext, useState, useMemo, useCallback, ReactNode, useEffect } from 'react';

/**
 * Dashboard Period Context
 * --------------------------------
 * Provides a global "period" + "comparison basis" for any KPI tile, chart,
 * or report on a dashboard. Persisted per-user in localStorage so the
 * preference survives reloads and tab switches.
 *
 * Background behavior:
 *  - State is shared via React context (no DB writes).
 *  - localStorage key: `dashboard.period.v1` (per browser, per user session).
 *  - `getRanges()` returns ISO date strings for current + prior windows so
 *    hooks like `usePeriodComparison` can fetch both in one round-trip.
 */

export type PeriodKey = 'mtd' | 'qtd' | 'ytd' | 'last30' | 'last90' | 'lastyear' | 'custom';
export type ComparisonKey = 'mom' | 'qoq' | 'yoy' | 'none';

export interface DateRange {
  from: string; // ISO yyyy-mm-dd
  to: string;   // ISO yyyy-mm-dd
}

export interface PeriodRanges {
  current: DateRange;
  prior: DateRange | null;
  label: string;
  priorLabel: string | null;
}

interface Ctx {
  period: PeriodKey;
  comparison: ComparisonKey;
  customRange: DateRange | null;
  setPeriod: (p: PeriodKey) => void;
  setComparison: (c: ComparisonKey) => void;
  setCustomRange: (r: DateRange | null) => void;
  ranges: PeriodRanges;
}

const DashboardPeriodContext = createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = 'dashboard.period.v1';

function loadInitial(): { period: PeriodKey; comparison: ComparisonKey; customRange: DateRange | null } {
  if (typeof window === 'undefined') {
    return { period: 'mtd', comparison: 'mom', customRange: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { period: 'mtd', comparison: 'mom', customRange: null };
    const parsed = JSON.parse(raw);
    return {
      period: parsed.period ?? 'mtd',
      comparison: parsed.comparison ?? 'mom',
      customRange: parsed.customRange ?? null,
    };
  } catch {
    return { period: 'mtd', comparison: 'mom', customRange: null };
  }
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfQuarter(d: Date) { return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d: Date, n: number) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
function addYears(d: Date, n: number) { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; }

function computeRanges(period: PeriodKey, comparison: ComparisonKey, custom: DateRange | null): PeriodRanges {
  const today = new Date();
  let current: DateRange;
  let label = '';

  switch (period) {
    case 'mtd':
      current = { from: fmt(startOfMonth(today)), to: fmt(today) };
      label = 'Month to date';
      break;
    case 'qtd':
      current = { from: fmt(startOfQuarter(today)), to: fmt(today) };
      label = 'Quarter to date';
      break;
    case 'ytd':
      current = { from: fmt(startOfYear(today)), to: fmt(today) };
      label = 'Year to date';
      break;
    case 'last30':
      current = { from: fmt(addDays(today, -29)), to: fmt(today) };
      label = 'Last 30 days';
      break;
    case 'last90':
      current = { from: fmt(addDays(today, -89)), to: fmt(today) };
      label = 'Last 90 days';
      break;
    case 'lastyear':
      current = { from: fmt(new Date(today.getFullYear() - 1, 0, 1)), to: fmt(new Date(today.getFullYear() - 1, 11, 31)) };
      label = 'Last year';
      break;
    case 'custom':
      current = custom ?? { from: fmt(startOfMonth(today)), to: fmt(today) };
      label = 'Custom range';
      break;
  }

  let prior: DateRange | null = null;
  let priorLabel: string | null = null;

  if (comparison !== 'none') {
    const fromDate = new Date(current.from);
    const toDate = new Date(current.to);
    const offsetMonths = comparison === 'mom' ? -1 : comparison === 'qoq' ? -3 : -12;
    const offsetYears = comparison === 'yoy' ? -1 : 0;
    if (comparison === 'yoy') {
      prior = { from: fmt(addYears(fromDate, -1)), to: fmt(addYears(toDate, -1)) };
      priorLabel = 'vs same period last year';
    } else {
      prior = { from: fmt(addMonths(fromDate, offsetMonths)), to: fmt(addMonths(toDate, offsetMonths)) };
      priorLabel = comparison === 'mom' ? 'vs prior month' : 'vs prior quarter';
    }
    void offsetYears;
  }

  return { current, prior, label, priorLabel };
}

export function DashboardPeriodProvider({ children }: { children: ReactNode }) {
  const initial = loadInitial();
  const [period, setPeriodState] = useState<PeriodKey>(initial.period);
  const [comparison, setComparisonState] = useState<ComparisonKey>(initial.comparison);
  const [customRange, setCustomRangeState] = useState<DateRange | null>(initial.customRange);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ period, comparison, customRange }));
    } catch { /* ignore */ }
  }, [period, comparison, customRange]);

  const setPeriod = useCallback((p: PeriodKey) => setPeriodState(p), []);
  const setComparison = useCallback((c: ComparisonKey) => setComparisonState(c), []);
  const setCustomRange = useCallback((r: DateRange | null) => setCustomRangeState(r), []);

  const ranges = useMemo(() => computeRanges(period, comparison, customRange), [period, comparison, customRange]);

  const value = useMemo<Ctx>(() => ({
    period, comparison, customRange,
    setPeriod, setComparison, setCustomRange,
    ranges,
  }), [period, comparison, customRange, setPeriod, setComparison, setCustomRange, ranges]);

  return <DashboardPeriodContext.Provider value={value}>{children}</DashboardPeriodContext.Provider>;
}

/**
 * Safe-default hook (per Context Resilience pattern).
 * Returns a sensible default if used outside provider so dashboards
 * never crash during HMR or while a wrapper provider is missing.
 */
export function useDashboardPeriod(): Ctx {
  const ctx = useContext(DashboardPeriodContext);
  if (ctx) return ctx;
  const fallback = computeRanges('mtd', 'mom', null);
  return {
    period: 'mtd',
    comparison: 'mom',
    customRange: null,
    setPeriod: () => {},
    setComparison: () => {},
    setCustomRange: () => {},
    ranges: fallback,
  };
}
