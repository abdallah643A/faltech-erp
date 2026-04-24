import type { ColumnDef } from '@/utils/exportImportUtils';

/**
 * Auto-generate export column definitions from data array.
 * Picks visible/useful keys, formats headers from snake_case/camelCase.
 */
export function autoColumns(data: any[], exclude: string[] = ['id', 'created_by', 'updated_at', 'company_id', 'branch_id']): ColumnDef[] {
  if (!data || data.length === 0) return [];
  const sample = data[0];
  return Object.keys(sample)
    .filter(k => !exclude.includes(k) && sample[k] !== undefined)
    .slice(0, 20)
    .map(k => ({
      key: k,
      header: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      width: 15,
    }));
}
