import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * useUrlFilters — read & write filter state to the URL query string.
 *
 * Enables "drill from KPI to document in ≤2 clicks" by letting any list page
 * pre-apply filters carried over from a dashboard tile (e.g. /ar-invoices?status=overdue).
 *
 * Usage:
 *   const { filters, setFilter, setFilters, clearFilter, clearAll } = useUrlFilters();
 *   const status = filters.status ?? 'all';
 *
 * Values are always strings (URL-safe). Coerce on the consumer side as needed.
 */
export function useUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    searchParams.forEach((v, k) => { obj[k] = v; });
    return obj;
  }, [searchParams]);

  const setFilter = useCallback((key: string, value: string | null | undefined) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === null || value === undefined || value === '' || value === 'all') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setFilters = useCallback((updates: Record<string, string | null | undefined>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '' || v === 'all') next.delete(k);
        else next.set(k, v);
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFilter = useCallback((key: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return { filters, setFilter, setFilters, clearFilter, clearAll };
}

/**
 * Build a deep-link URL with pre-applied filters.
 *  buildFilteredHref('/ar-invoices', { status: 'overdue', aging: '60+' })
 *   → '/ar-invoices?status=overdue&aging=60%2B'
 */
export function buildFilteredHref(
  basePath: string,
  filters?: Record<string, string | number | null | undefined>
): string {
  if (!filters) return basePath;
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '' ) return;
    params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
