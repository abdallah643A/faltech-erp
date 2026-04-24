import { useState, useEffect, useSyncExternalStore, useMemo } from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getShortcuts, subscribeShortcuts, formatShortcut,
  installGlobalShortcutListener, useRegisterShortcut,
} from '@/lib/keyboardShortcuts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

/**
 * Mounts the global keydown listener, registers default app shortcuts,
 * and renders the cheat-sheet (opened with `?`).
 */
export function KeyboardShortcutsProvider() {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  // Install dispatcher once.
  useEffect(() => installGlobalShortcutListener(), []);

  // Default app-wide shortcuts.
  useRegisterShortcut([
    {
      id: 'sc-help',
      keys: 'shift+/',
      label: 'Show keyboard shortcuts',
      labelAr: 'عرض اختصارات لوحة المفاتيح',
      group: 'General',
      priority: 100,
      perform: () => setOpen(o => !o),
    },
    {
      id: 'sc-spotlight',
      keys: 'mod+k',
      label: 'Open command palette',
      labelAr: 'فتح لوحة الأوامر',
      group: 'General',
      priority: 95,
      perform: () => {
        // Spotlight already listens to mod+k; this entry only documents it.
      },
      allowInInput: true,
    },
    {
      id: 'sc-home', keys: 'g then h', label: 'Go to Dashboard', labelAr: 'الذهاب للوحة',
      group: 'Navigation', priority: 80, perform: () => navigate('/'),
    },
    {
      id: 'sc-quotes', keys: 'g then q', label: 'Go to Quotes', labelAr: 'عروض الأسعار',
      group: 'Navigation', priority: 75, perform: () => navigate('/quotes'),
    },
    {
      id: 'sc-so', keys: 'g then s', label: 'Go to Sales Orders', labelAr: 'أوامر البيع',
      group: 'Navigation', priority: 74, perform: () => navigate('/sales-orders'),
    },
    {
      id: 'sc-ar', keys: 'g then i', label: 'Go to AR Invoices', labelAr: 'فواتير العملاء',
      group: 'Navigation', priority: 73, perform: () => navigate('/ar-invoices'),
    },
    {
      id: 'sc-po', keys: 'g then p', label: 'Go to Purchase Orders', labelAr: 'أوامر الشراء',
      group: 'Navigation', priority: 72, perform: () => navigate('/purchase-orders'),
    },
    {
      id: 'sc-bp', keys: 'g then b', label: 'Go to Business Partners', labelAr: 'الشركاء التجاريون',
      group: 'Navigation', priority: 70, perform: () => navigate('/business-partners'),
    },
    {
      id: 'sc-emp', keys: 'g then e', label: 'Go to Employees', labelAr: 'الموظفون',
      group: 'Navigation', priority: 68, perform: () => navigate('/employees'),
    },
    {
      id: 'sc-prj', keys: 'g then j', label: 'Go to Projects', labelAr: 'المشاريع',
      group: 'Navigation', priority: 66, perform: () => navigate('/projects'),
    },
    {
      id: 'sc-new', keys: 'mod+shift+n', label: 'Quick create…', labelAr: 'إنشاء سريع',
      group: 'Create', priority: 60,
      perform: () => {
        const fab = document.querySelector<HTMLButtonElement>('[aria-label="Quick create"], [aria-label="إنشاء سريع"]');
        fab?.click();
      },
    },
  ]);

  const shortcuts = useSyncExternalStore(subscribeShortcuts, getShortcuts, getShortcuts);
  const grouped = useMemo(() => {
    const out = new Map<string, typeof shortcuts>();
    shortcuts.forEach(s => {
      (out.get(s.group) ?? out.set(s.group, []).get(s.group)!).push(s);
    });
    return Array.from(out.entries());
  }, [shortcuts]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl" dir={isAr ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {isAr ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
          </DialogTitle>
          <DialogDescription>
            {isAr
              ? 'اضغط ؟ في أي وقت لفتح هذه القائمة.'
              : 'Press ? anywhere to open this list.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-6">
            {grouped.map(([group, items]) => (
              <div key={group}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </h4>
                <div className="rounded-md border divide-y">
                  {items.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm">
                        {isAr ? (s.labelAr ?? s.label) : s.label}
                      </span>
                      <div className="flex gap-1">
                        {s.keys.split(' then ').map((part, i, arr) => (
                          <span key={i} className="flex items-center gap-1">
                            <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                              {formatShortcut(part)}
                            </Badge>
                            {i < arr.length - 1 && (
                              <span className="text-xs text-muted-foreground">
                                {isAr ? 'ثم' : 'then'}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
