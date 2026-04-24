import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, ChevronDown, X } from 'lucide-react';

export interface ItemOption {
  id: string;
  item_code: string;
  description: string;
  default_price: number | null;
  warehouse: string | null;
  uom: string | null;
}

interface ItemComboboxProps {
  value: string;
  onSelect: (item: ItemOption | null) => void;
  className?: string;
}

function useItemsList() {
  return useQuery({
    queryKey: ['items-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, item_code, description, default_price, warehouse, uom')
        .order('item_code');
      if (error) throw error;
      return (data || []) as ItemOption[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function ItemCombobox({ value, onSelect, className }: ItemComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: items = [] } = useItemsList();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return items.slice(0, 50);
    const q = search.toLowerCase().trim();
    // Try reversing dimension patterns like "150 * 100" → "100 * 150"
    const dimMatch = q.match(/^([\d.]+)\s*[x×*]\s*([\d.]+)$/i);
    const reversedVariants: string[] = [];
    if (dimMatch) {
      const sep = q.includes('×') ? '×' : q.includes('x') ? 'x' : '*';
      reversedVariants.push(`${dimMatch[2]}${sep}${dimMatch[1]}`);
      reversedVariants.push(`${dimMatch[2]} ${sep} ${dimMatch[1]}`);
    }
    return items
      .filter((i) => {
        const code = i.item_code.toLowerCase();
        const desc = i.description.toLowerCase();
        if (code.includes(q) || desc.includes(q)) return true;
        return reversedVariants.some(r => code.includes(r) || desc.includes(r));
      })
      .slice(0, 50);
  }, [items, search]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  const displayLabel = value || '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring h-7 w-[140px] text-left',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{displayLabel || 'Select item...'}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="flex items-center border-b px-2 py-1.5">
          <Search className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="flex h-7 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
                setOpen(false);
              }}
              className="ml-1 shrink-0 opacity-50 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="max-h-[240px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No items found
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground',
                  value === item.item_code && 'bg-accent/50'
                )}
              >
                <span className="font-mono font-medium shrink-0 w-[80px]">{item.item_code}</span>
                <span className="truncate text-muted-foreground">{item.description}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
