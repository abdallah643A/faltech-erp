import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Filter, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

interface FilterableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Current filter value for this column */
  filterValue?: string;
  /** Called when filter value changes */
  onFilterChange?: (value: string) => void;
  /** Column key for sorting */
  sortKey?: string;
  /** Current sort direction for this column */
  sortDirection?: SortDirection;
  /** Called when sort changes */
  onSort?: (key: string, direction: SortDirection) => void;
  /** Column label */
  children?: React.ReactNode;
}

export function FilterableTableHead({
  filterValue = "",
  onFilterChange,
  sortKey,
  sortDirection,
  onSort,
  children,
  className,
  ...props
}: FilterableTableHeadProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFilter = filterValue.length > 0;
  const isSortable = !!sortKey && !!onSort;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleDoubleClick = () => {
    if (!isSortable) return;
    if (!sortDirection) {
      onSort!(sortKey!, "asc");
    } else if (sortDirection === "asc") {
      onSort!(sortKey!, "desc");
    } else {
      onSort!(sortKey!, null);
    }
  };

  const SortIcon = sortDirection === "asc" ? ArrowUp : sortDirection === "desc" ? ArrowDown : null;

  return (
    <TableHead
      className={cn("relative select-none", isSortable && "cursor-pointer", className)}
      onDoubleClick={handleDoubleClick}
      {...props}
    >
      <div className="flex items-center gap-1">
        <span className="truncate">{children}</span>
        {isSortable && (
          SortIcon ? (
            <SortIcon className="h-3 w-3 text-primary shrink-0" />
          ) : (
            <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          )
        )}
        {onFilterChange && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent/80 transition-colors shrink-0",
                  hasFilter ? "text-primary" : "text-muted-foreground/60"
                )}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <Filter className="h-3 w-3" fill={hasFilter ? "currentColor" : "none"} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-52 p-2"
              align="start"
              side="bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                ref={inputRef}
                placeholder="Filter..."
                value={filterValue}
                onChange={(e) => onFilterChange(e.target.value)}
                className="h-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  if (e.key === "Enter") setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TableHead>
  );
}

/**
 * Hook to manage column filter state for a table.
 */
export function useColumnFilters<T extends Record<string, any>>(
  data: T[],
  filterableKeys: (keyof T)[]
) {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredData = React.useMemo(() => {
    return data.filter((row) => {
      return filterableKeys.every((key) => {
        const filterVal = filters[key as string]?.toLowerCase();
        if (!filterVal) return true;
        const cellVal = row[key];
        if (cellVal == null) return false;
        return String(cellVal).toLowerCase().includes(filterVal);
      });
    });
  }, [data, filters, filterableKeys]);

  return { filters, setFilter, filteredData };
}

/**
 * Hook to manage column sorting state for a table.
 */
export function useColumnSort<T extends Record<string, any>>(data: T[]) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);

  const handleSort = (key: string, direction: SortDirection) => {
    if (direction === null) {
      setSortKey(null);
      setSortDirection(null);
    } else {
      setSortKey(key);
      setSortDirection(direction);
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDirection) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === "asc" ? -1 : 1;
      if (bVal == null) return sortDirection === "asc" ? 1 : -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDirection]);

  const getSortDirection = (key: string): SortDirection => {
    return sortKey === key ? sortDirection : null;
  };

  return { sortedData, handleSort, getSortDirection, sortKey, sortDirection };
}