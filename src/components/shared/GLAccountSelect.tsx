import { useState, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function GLAccountSelect({ value, onChange, placeholder = 'Select GL Account', className }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { activeCompanyId } = useActiveCompany();

  const { data: accounts = [] } = useQuery({
    queryKey: ['gl-accounts-lookup', activeCompanyId],
    queryFn: async () => {
      let q = supabase
        .from('chart_of_accounts')
        .select('acct_code, acct_name, acct_type')
        .eq('is_active', true)
        .order('acct_code');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(2000);
      return (data || []) as { acct_code: string; acct_name: string; acct_type: string }[];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return accounts.slice(0, 100);
    const s = search.toLowerCase();
    return accounts.filter(a =>
      a.acct_code.toLowerCase().includes(s) || a.acct_name.toLowerCase().includes(s)
    ).slice(0, 100);
  }, [accounts, search]);

  const selectedAccount = accounts.find(a => a.acct_code === value);
  const displayLabel = selectedAccount
    ? `${selectedAccount.acct_code} - ${selectedAccount.acct_name}`
    : value || '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-7 justify-between text-xs font-normal w-full', !value && 'text-muted-foreground', className)}
        >
          <span className="truncate">{displayLabel || placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <div className="flex items-center gap-1 border-b px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 border-0 text-xs focus-visible:ring-0 shadow-none"
          />
        </div>
        <ScrollArea className="h-[240px]">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No accounts found</div>
          ) : (
            <div className="p-1">
              {filtered.map(a => (
                <button
                  key={a.acct_code}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent cursor-pointer',
                    value === a.acct_code && 'bg-accent'
                  )}
                  onClick={() => { onChange(a.acct_code); setOpen(false); setSearch(''); }}
                >
                  <Check className={cn('h-3 w-3 shrink-0', value === a.acct_code ? 'opacity-100' : 'opacity-0')} />
                  <span className="font-mono text-muted-foreground">{a.acct_code}</span>
                  <span className="truncate">{a.acct_name}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
