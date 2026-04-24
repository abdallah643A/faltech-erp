import { useSyncExternalStore, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, X, FileText, ShoppingCart, Receipt, Package, Users,
  Briefcase, Wallet, ClipboardList, UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getQuickActions, subscribeQuickActions, QuickAction,
} from '@/lib/quickActions';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * App-wide defaults — always visible. Pages can register additional
 * context-specific quick actions via `useRegisterQuickAction`.
 */
function useDefaultQuickActions(): QuickAction[] {
  const navigate = useNavigate();
  return useMemo(() => [
    { id: 'qc-quote', label: 'New Quote', labelAr: 'عرض سعر جديد', icon: FileText, group: 'Sales', priority: 100, color: 'primary', perform: () => navigate('/quotes/new') },
    { id: 'qc-so', label: 'New Sales Order', labelAr: 'أمر بيع جديد', icon: ShoppingCart, group: 'Sales', priority: 95, color: 'primary', perform: () => navigate('/sales-orders/new') },
    { id: 'qc-ar', label: 'New AR Invoice', labelAr: 'فاتورة عميل', icon: Receipt, group: 'Sales', priority: 90, color: 'success', perform: () => navigate('/ar-invoices/new') },
    { id: 'qc-po', label: 'New Purchase Order', labelAr: 'أمر شراء جديد', icon: Package, group: 'Procurement', priority: 80, color: 'warning', perform: () => navigate('/purchase-orders/new') },
    { id: 'qc-ap', label: 'New AP Invoice', labelAr: 'فاتورة مورد', icon: Receipt, group: 'Procurement', priority: 75, color: 'warning', perform: () => navigate('/ap-invoices/new') },
    { id: 'qc-bp', label: 'New Business Partner', labelAr: 'شريك تجاري', icon: Users, group: 'Master Data', priority: 60, color: 'info', perform: () => navigate('/business-partners/new') },
    { id: 'qc-emp', label: 'New Employee', labelAr: 'موظف جديد', icon: UserPlus, group: 'HR', priority: 55, color: 'info', perform: () => navigate('/employees/new') },
    { id: 'qc-prj', label: 'New Project', labelAr: 'مشروع جديد', icon: Briefcase, group: 'Projects', priority: 50, color: 'info', perform: () => navigate('/projects/new') },
    { id: 'qc-je', label: 'New Journal Entry', labelAr: 'قيد جديد', icon: Wallet, group: 'Finance', priority: 45, color: 'primary', perform: () => navigate('/journal-entries/new') },
    { id: 'qc-act', label: 'New Activity', labelAr: 'نشاط جديد', icon: ClipboardList, group: 'CRM', priority: 40, color: 'info', perform: () => navigate('/activities/new') },
  ], [navigate]);
}

const COLOR_CLASSES: Record<NonNullable<QuickAction['color']>, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
  info: 'bg-info text-info-foreground hover:bg-info/90',
};

export function QuickActionsFab() {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const registered = useSyncExternalStore(
    subscribeQuickActions, getQuickActions, getQuickActions
  );
  const defaults = useDefaultQuickActions();

  // Registered actions take precedence (page context > defaults), de-dup by id.
  const merged = useMemo(() => {
    const map = new Map<string, QuickAction>();
    [...defaults, ...registered].forEach(a => map.set(a.id, a));
    return Array.from(map.values()).sort((a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0) || a.label.localeCompare(b.label)
    );
  }, [defaults, registered]);

  // Group, preserving the priority-sorted order within each group.
  const grouped = useMemo(() => {
    const out = new Map<string, QuickAction[]>();
    merged.forEach(a => {
      const k = a.group ?? (isAr ? 'إجراءات' : 'Actions');
      (out.get(k) ?? out.set(k, []).get(k)!).push(a);
    });
    return Array.from(out.entries());
  }, [merged, isAr]);

  const triggerLabel = isAr ? 'إنشاء سريع' : 'Quick create';

  return (
    <div className={cn(
      'fixed bottom-6 z-40 print:hidden',
      isAr ? 'left-6' : 'right-6'
    )}>
      {/* Action sheet */}
      {open && (
        <div className={cn(
          'mb-3 w-72 max-h-[60vh] overflow-y-auto rounded-lg border bg-popover shadow-xl',
          'animate-in fade-in-0 slide-in-from-bottom-2'
        )}
        dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">{triggerLabel}</span>
            <Badge variant="outline" className="text-xs">{merged.length}</Badge>
          </div>
          <div className="py-1">
            {grouped.map(([group, items]) => (
              <div key={group} className="mb-1">
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </div>
                {items.map(a => {
                  const Icon = a.icon;
                  const colorCls = COLOR_CLASSES[a.color ?? 'primary'];
                  return (
                    <button
                      key={a.id}
                      onClick={async () => { setOpen(false); await a.perform(); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent text-left transition-colors"
                    >
                      <span className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md shrink-0',
                        colorCls
                      )}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 truncate">
                        {isAr ? (a.labelAr ?? a.label) : a.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB trigger */}
      <Button
        size="icon"
        onClick={() => setOpen(o => !o)}
        title={triggerLabel}
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-transform',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          open && 'rotate-45'
        )}
        aria-label={triggerLabel}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </div>
  );
}
