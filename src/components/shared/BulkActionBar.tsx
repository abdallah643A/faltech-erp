import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { X, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Bulk Action Bar — Module 1 / Enhancement #16
 *
 * A floating toolbar that appears when rows are selected in a list view.
 * Sticks to the bottom of the viewport with a slide-in animation, shows
 * the selection count, and exposes a configurable set of bulk actions
 * (delete, export, approve, assign, etc.).
 *
 * Pair with a `Set<string>` selection state in the parent list component.
 */

export interface BulkAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
  /** Optional extra content rendered before the actions (e.g. a status filter). */
  leading?: ReactNode;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  onClear,
  actions,
  leading,
  className,
}: BulkActionBarProps) {
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';

  if (selectedCount <= 0) return null;

  const visibleActions = actions.filter(a => !a.hidden);

  return (
    <div
      role="toolbar"
      aria-label={isAr ? 'إجراءات جماعية' : 'Bulk actions'}
      dir={direction}
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-40',
        'flex items-center gap-2 px-3 py-2',
        'bg-card border border-border rounded-full shadow-lg',
        'animate-in slide-in-from-bottom-4 fade-in duration-200',
        'max-w-[calc(100vw-2rem)] overflow-x-auto',
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClear}
        className="h-8 w-8 rounded-full shrink-0"
        aria-label={isAr ? 'إلغاء التحديد' : 'Clear selection'}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1.5 px-2 shrink-0 border-e border-border pe-3">
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
          {selectedCount}
        </span>
        <span className="text-sm text-muted-foreground">
          {isAr
            ? selectedCount === 1
              ? 'محدد'
              : 'محددة'
            : `selected`}
        </span>
      </div>

      {leading && <div className="flex items-center gap-2 shrink-0">{leading}</div>}

      <div className="flex items-center gap-1 shrink-0">
        {visibleActions.map(action => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant={action.variant ?? 'ghost'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
              className="h-8 gap-1.5"
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Helper hook for managing row selection state.
 * Returns a Set plus convenience toggle / select-all helpers.
 */
import { useCallback, useMemo, useState } from 'react';

export function useRowSelection<T extends { id: string }>(rows: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev =>
      prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id)),
    );
  }, [rows]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isAllSelected = useMemo(
    () => rows.length > 0 && selected.size === rows.length,
    [rows.length, selected.size],
  );

  const isSomeSelected = useMemo(
    () => selected.size > 0 && selected.size < rows.length,
    [rows.length, selected.size],
  );

  return {
    selected,
    selectedIds: useMemo(() => Array.from(selected), [selected]),
    count: selected.size,
    toggle,
    toggleAll,
    clear,
    isAllSelected,
    isSomeSelected,
    isSelected: useCallback((id: string) => selected.has(id), [selected]),
  };
}
