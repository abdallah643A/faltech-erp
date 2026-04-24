import { useState, useMemo, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Search, ChevronDown, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  sub?: string;
}

interface LineFieldComboboxProps {
  value: string;
  options: ComboboxOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
  width?: string;
}

export function LineFieldCombobox({ value, options, onSelect, placeholder = 'Select...', className, width = 'w-[220px]' }: LineFieldComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options.slice(0, 50);
    const q = search.toLowerCase().trim();
    return options.filter(o =>
      o.value.toLowerCase().includes(q) ||
      o.label.toLowerCase().includes(q) ||
      (o.sub || '').toLowerCase().includes(q)
    ).slice(0, 50);
  }, [options, search]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch('');
  }, [open]);

  const displayLabel = value || '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring h-7 text-left',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{displayLabel || placeholder}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn('p-0', width)} align="start">
        <div className="flex items-center border-b px-2 py-1.5">
          <Search className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex h-7 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          {value && (
            <button type="button" onClick={e => { e.stopPropagation(); onSelect(''); setOpen(false); }} className="ml-1 shrink-0 opacity-50 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted-foreground">No results</div>
          ) : filtered.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onSelect(opt.value); setOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground',
                value === opt.value && 'bg-accent/50'
              )}
            >
              <span className="font-mono font-medium shrink-0">{opt.value}</span>
              <span className="truncate text-muted-foreground">{opt.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
