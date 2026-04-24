import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMemo } from 'react';
import type { Account } from './COATreeItem';

interface RootCategory {
  code: string;
  name: string;
  count: number;
}

interface COACategoryTabsProps {
  activeCategory: string | null;
  onSelect: (rootCode: string | null) => void;
  accounts: Account[];
}

export function COACategoryTabs({ activeCategory, onSelect, accounts }: COACategoryTabsProps) {
  const { language } = useLanguage();

  // Derive categories from root-level accounts (father_acct_code is null)
  const categories = useMemo(() => {
    if (!accounts.length) return [];
    const roots = accounts.filter(a => !a.father_acct_code).sort((a, b) => a.acct_code.localeCompare(b.acct_code));

    // Build a map of each account to its root ancestor
    const codeToParent = new Map<string, string>();
    for (const a of accounts) {
      codeToParent.set(a.acct_code, a.father_acct_code || '');
    }

    function findRoot(code: string): string {
      const parent = codeToParent.get(code);
      if (!parent) return code;
      return findRoot(parent);
    }

    // Count descendants per root
    const countMap = new Map<string, number>();
    for (const a of accounts) {
      const root = findRoot(a.acct_code);
      countMap.set(root, (countMap.get(root) || 0) + 1);
    }

    return roots.map(r => ({
      code: r.acct_code,
      name: r.acct_name,
      count: countMap.get(r.acct_code) || 0,
    }));
  }, [accounts]);

  return (
    <div className="flex flex-col gap-1">
      {/* All */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'text-[11px] leading-tight px-2.5 py-2 rounded-sm text-left transition-all border',
          'hover:bg-primary/10 hover:border-primary/30',
          activeCategory === null
            ? 'bg-primary/15 border-primary/40 text-primary font-semibold shadow-sm'
            : 'bg-card border-border text-muted-foreground'
        )}
      >
        {language === 'ar' ? 'الكل' : 'All'}
      </button>
      {categories.map(cat => {
        const isActive = activeCategory === cat.code;
        return (
          <button
            key={cat.code}
            onClick={() => onSelect(cat.code)}
            className={cn(
              'text-[11px] leading-tight px-2.5 py-2 rounded-sm text-left transition-all border',
              'hover:bg-primary/10 hover:border-primary/30',
              isActive
                ? 'bg-primary/15 border-primary/40 text-primary font-semibold shadow-sm'
                : 'bg-card border-border text-muted-foreground'
            )}
          >
            <span className="block">{cat.name}</span>
            <span className="text-[10px] opacity-60">{cat.count}</span>
          </button>
        );
      })}
    </div>
  );
}
