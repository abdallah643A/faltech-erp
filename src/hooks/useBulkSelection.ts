import { useState, useCallback, useMemo } from 'react';

/**
 * Bulk Selection Hook — Module 1 / Enhancement #11
 *
 * Manages selection state for any list of records. Designed to work with
 * `BulkActionsToolbar` and any table/list component.
 *
 * Usage:
 *   const sel = useBulkSelection(rows, r => r.id);
 *   <Checkbox checked={sel.isAllSelected} onCheckedChange={sel.toggleAll} />
 *   <Checkbox checked={sel.isSelected(r.id)} onCheckedChange={() => sel.toggle(r.id)} />
 *   <BulkActionsToolbar selection={sel} actions={[...]} />
 */
export function useBulkSelection<T>(
  items: T[],
  getId: (item: T) => string,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => items.map(getId), [items, getId]);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(allIds));
  }, [allIds]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === allIds.length ? new Set() : new Set(allIds)
    );
  }, [allIds]);

  const isAllSelected = allIds.length > 0 && selectedIds.size === allIds.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < allIds.length;

  const selectedItems = useMemo(
    () => items.filter(it => selectedIds.has(getId(it))),
    [items, selectedIds, getId]
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedItems,
    selectedCount: selectedIds.size,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    toggle,
    toggleAll,
    selectAll,
    clear,
  };
}

export type BulkSelection<T = unknown> = ReturnType<typeof useBulkSelection<T>>;
